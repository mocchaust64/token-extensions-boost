// Khai báo types cho Phantom wallet
interface PhantomWallet {
  isPhantom: boolean;
  isConnected: boolean;
  publicKey: any;
  connect: () => Promise<{ publicKey: any }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
}

// Global definitions
declare global {
  interface Window {
    solana?: PhantomWallet;
    phantom?: {
      solana?: PhantomWallet;
    };
    Buffer: typeof Buffer;
  }
}

import React, { useState, useEffect } from 'react';
import { Connection, clusterApiUrl, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TokenBuilder, TransferFeeToken, NonTransferableToken } from 'token-extensions-boost';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction, getAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Hàm phân tích lỗi từ Solana để tìm mã lỗi và thông tin chi tiết
const analyzeTransactionError = (error: any): string => {
  try {
    // Kiểm tra nếu đây là TransactionError từ Solana
    if (error && error.logs) {
      console.log('Transaction logs:', error.logs);
      
      // Tìm kiếm mã lỗi trong logs
      const errorLogs = error.logs.filter((log: string) => 
        log.includes('Error:') || log.includes('Program log:') || log.includes('Program failed to complete')
      );
      
      if (errorLogs.length > 0) {
        return `Contract error logs: ${errorLogs.join('\n')}`;
      }
    }
    
    // Kiểm tra xem lỗi có chứa mã lỗi Solana hay không
    if (error && error.code) {
      return `Solana error code: ${error.code} - ${error.message || ''}`;
    }
    
    // Kiểm tra nếu có thông tin chung về lỗi
    if (typeof error === 'string') {
      return `Error message: ${error}`;
    } else if (error instanceof Error) {
      return `Error: ${error.name} - ${error.message}`;
    } else if (error && error.message) {
      return `Error message: ${error.message}`;
    }
    
    return `Unknown error: ${JSON.stringify(error, null, 2)}`;
  } catch (e) {
    return `Error parsing error: ${e instanceof Error ? e.message : String(e)}`;
  }
};

// Component chính
const App: React.FC = () => {
  const [wallet, setWallet] = useState<PhantomWallet | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenMint, setTokenMint] = useState<PublicKey | null>(null);
  const [tokenName, setTokenName] = useState('My Test Token');
  const [tokenSymbol, setTokenSymbol] = useState('TEST');
  const [tokenDecimals, setTokenDecimals] = useState(9);
  const [includeTransferFee, setIncludeTransferFee] = useState(false);
  const [includeNonTransferable, setIncludeNonTransferable] = useState(false);
  const [includePermanentDelegate, setIncludePermanentDelegate] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeInterestBearing, setIncludeInterestBearing] = useState(false);
  const [interestRate, setInterestRate] = useState(0.1);
  const [transferFeeRate, setTransferFeeRate] = useState(1.0); // 1% mặc định
  const [transferFeeMax, setTransferFeeMax] = useState(1000000000); // 1 token với 9 decimals
  const [extensionCompatibilityError, setExtensionCompatibilityError] = useState('');
  
  // Kết nối đến Solana
  useEffect(() => {
    try {
      const conn = new Connection(clusterApiUrl('devnet'), 'confirmed');
      setConnection(conn);
      console.log('Đã kết nối đến Solana devnet');
    } catch (error) {
      console.error('Lỗi khi kết nối đến Solana:', error);
      setStatus('Không thể kết nối đến Solana network');
    }
  }, []);

  // Kiểm tra tính tương thích giữa các extension
  useEffect(() => {
    // Kiểm tra xem NonTransferable và TransferFee có được bật cùng lúc không
    if (includeNonTransferable && includeTransferFee) {
      setExtensionCompatibilityError('Error: NonTransferable và TransferFee không thể kết hợp cùng nhau!');
    } else {
      setExtensionCompatibilityError('');
    }
  }, [includeNonTransferable, includeTransferFee]);

  // Phát hiện Phantom wallet
  useEffect(() => {
    const checkPhantom = () => {
      if ('phantom' in window && window.phantom?.solana) {
        const phantomWallet = window.phantom.solana;
        
        if (phantomWallet?.isPhantom) {
          setWallet(phantomWallet);
          console.log('Đã phát hiện Phantom wallet');
          
          // Kiểm tra nếu đã kết nối
          if (phantomWallet.isConnected && phantomWallet.publicKey) {
            setPublicKey(phantomWallet.publicKey);
          }
        }
      } else {
        setStatus('Vui lòng cài đặt Phantom wallet để sử dụng ứng dụng này');
        console.log('Phantom wallet không được cài đặt');
      }
    };

    window.addEventListener('load', checkPhantom);
    return () => window.removeEventListener('load', checkPhantom);
  }, []);

  // Kết nối đến Wallet
  const connectWallet = async () => {
    try {
      if (wallet) {
        setLoading(true);
        
        const resp = await wallet.connect();
        setPublicKey(resp.publicKey);
        console.log('Đã kết nối đến ví:', resp.publicKey.toString());
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Lỗi khi kết nối đến ví:', error);
      setStatus('Lỗi khi kết nối đến ví');
      setLoading(false);
    }
  };

  // Ngắt kết nối Wallet
  const disconnectWallet = async () => {
    if (wallet) {
      await wallet.disconnect();
      setPublicKey(null);
      setTokenMint(null);
      console.log('Đã ngắt kết nối');
    }
  };

  // Hàm tạo sample metadata URI
  const getSampleTokenMetadataUri = () => {
    return 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
  };

  // Xử lý tạo token sử dụng API mới
  const handleCreateToken = async () => {
    if (!publicKey || !connection || !wallet) {
      setStatus('Vui lòng kết nối ví trước!');
      return;
    }
    
    if (extensionCompatibilityError) {
      setStatus(extensionCompatibilityError);
      return;
    }
    
    try {
      setLoading(true);
      setStatus('Đang tạo token với metadata và extensions...');
      
      // Sử dụng TokenBuilder từ SDK một cách trực tiếp
      const tokenBuilder = new TokenBuilder(connection);
      
      // Log cấu hình token dự định tạo
      console.log('=== Cấu hình token ===');
      console.log('Name:', tokenName);
      console.log('Symbol:', tokenSymbol);
      console.log('Decimals:', tokenDecimals);
      console.log('Metadata:', includeMetadata);
      console.log('NonTransferable:', includeNonTransferable);
      console.log('TransferFee:', includeTransferFee);
      console.log('PermanentDelegate:', includePermanentDelegate);
      console.log('InterestBearing:', includeInterestBearing);
      
      // Thiết lập thông tin cơ bản cho token
      tokenBuilder.setTokenInfo(
        tokenDecimals,
        publicKey,
        null // freezeAuthority
      );
      console.log('Đã thiết lập thông tin cơ bản cho token');
      
      // Thêm NonTransferable trước các extension khác (nếu được chọn)
      if (includeNonTransferable) {
        console.log('Đang thêm NonTransferable extension...');
        tokenBuilder.addNonTransferable();
        console.log('Đã thêm NonTransferable extension');
      }
      
      // Sau đó mới thêm Metadata nếu được chọn
      if (includeMetadata) {
        console.log('Đang thêm Metadata extension...');
        const metadataUri = getSampleTokenMetadataUri();
        console.log('Metadata URI:', metadataUri);
        
        tokenBuilder.addTokenMetadata(
          tokenName,
          tokenSymbol,
          metadataUri,
          { description: `${tokenName} là một token thử nghiệm tạo bởi Token Extensions Boost SDK` }
        );
        console.log('Đã thêm Metadata extension');
      }
      
      // Thêm TransferFee (nếu được chọn và không có NonTransferable)
      if (includeTransferFee && !includeNonTransferable) {
        const basisPoints = Math.floor(transferFeeRate * 100); // Chuyển phần trăm sang basis points
        const maxFee = BigInt(transferFeeMax);
        
        tokenBuilder.addTransferFee(
          basisPoints, // basis points
          maxFee, // max fee
          publicKey, // transferFeeConfigAuthority
          publicKey  // withdrawWithheldAuthority
        );
      }
      
      // Thêm PermanentDelegate (hoạt động với cả NonTransferable)
      if (includePermanentDelegate) {
        tokenBuilder.addPermanentDelegate(publicKey);
      }
      
      // Thêm InterestBearing (hoạt động với cả NonTransferable)
      if (includeInterestBearing) {
        tokenBuilder.addInterestBearing(
          interestRate, // tỷ lệ lãi suất
          publicKey // rateAuthority
        );
      }
      
      // Sử dụng phương thức createTokenInstructions từ SDK
      console.log('Đang tạo token instructions...');
      const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(publicKey);
      console.log(`Token mint address: ${mint.toString()}`);
      console.log(`Số lượng instructions: ${instructions.length}`);
      console.log(`Số lượng signers: ${signers.length}`);
      
      // In chi tiết từng instruction
      console.log('Chi tiết các instructions:');
      instructions.forEach((instruction, index) => {
        console.log(`Instruction ${index + 1}:`, {
          programId: instruction.programId.toString(),
          keys: instruction.keys.map(k => ({
            pubkey: k.pubkey.toString(),
            isSigner: k.isSigner,
            isWritable: k.isWritable
          })),
          dataLength: instruction.data.length
        });
      });
      
      // Tạo transaction
      const transaction = new Transaction();
      
      // Thêm recentBlockhash và feePayer
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      console.log('Đã thiết lập blockhash và feePayer cho transaction');
      
      // Thêm instructions
      instructions.forEach((ix) => transaction.add(ix));
      console.log('Đã thêm tất cả instructions vào transaction');
      
      // Ký cho các signers
      if (signers.length > 0) {
        console.log('Đang ký transaction với các signers...');
        transaction.partialSign(...signers);
        console.log('Đã ký transaction với các signers');
      }
      
      // Gửi transaction để ký và thực thi
      console.log('Gửi transaction để ký và thực hiện...');
      let txSignature: string | undefined = undefined;
      
      try {
        // Thử gửi transaction theo cách khác để diagnose lỗi
        // Bước 1: Ký transaction
        console.log('Thử gửi transaction bằng cách tách thành 2 bước ký và gửi...');
        try {
          const signedTx = await wallet.signTransaction(transaction);
          console.log('Transaction đã được ký thành công!');
          
          // Bước 2: Gửi transaction đã ký
          console.log('Đang gửi transaction đã ký...');
          try {
            const rawTx = signedTx.serialize();
            console.log('Transaction được serialize thành công, đang gửi đến blockchain...');
            txSignature = await connection.sendRawTransaction(rawTx, {
              skipPreflight: true, 
              preflightCommitment: 'confirmed'
            });
            console.log(`Transaction đã gửi thành công, signature: ${txSignature}`);
            await connection.confirmTransaction(txSignature, 'confirmed');
      setTokenMint(mint);
      setStatus(`Token đã được tạo thành công! Mint: ${mint.toString()}`);
      console.log(`Token đã được tạo thành công! Mint: ${mint.toString()}`);
            setLoading(false);
            return; // Thoát nếu phương pháp này thành công
          } catch (sendError) {
            console.error('Lỗi khi gửi transaction đã ký:', sendError);
          }
        } catch (signError) {
          console.error('Lỗi khi ký transaction thủ công:', signError);
          console.log('Chuyển sang phương pháp gửi thông thường...');
        }
        
        // Nếu cách trên không thành công, thử cách thông thường
        const { signature } = await wallet.signAndSendTransaction(transaction);
        txSignature = signature;
      } catch (error) {
        console.error('Lỗi khi ký hoặc gửi transaction:', error);
        if (error instanceof Error) {
          console.error('Chi tiết lỗi ký transaction:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          setStatus(`Lỗi khi ký transaction: ${error.name} - ${error.message}`);
        } else {
          console.error('Chi tiết lỗi ký transaction:', JSON.stringify(error, null, 2));
          setStatus(`Lỗi khi ký transaction: ${String(error)}`);
        }
        
        // Nếu có signature, hãy kiểm tra lỗi chi tiết từ blockchain
        if (txSignature) {
          try {
            console.log(`Transaction đã được gửi nhưng có lỗi. Đang kiểm tra chi tiết từ blockchain...`);
            await verifyTransaction(connection, txSignature);
          } catch (verifyError) {
            console.error('Lỗi khi xác minh transaction:', verifyError);
          }
        } else {
          console.log('Không có signature để kiểm tra (có thể transaction không được gửi)');
          
          // Thử phân tích lỗi từ wallet để xem có thông tin hữu ích không
          const errorDetail = analyzeTransactionError(error);
          console.log('Phân tích lỗi từ wallet:', errorDetail);
        }
        
        throw error; // Re-throw lỗi để xử lý trong catch block chung
      }
    } catch (error) {
      console.error('Lỗi khi tạo token:', error);
      
      // Log chi tiết hơn về lỗi
      if (error instanceof Error) {
        console.error('Chi tiết lỗi:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        
        // Hiển thị chi tiết hơn cho người dùng
        setStatus(`Lỗi khi tạo token: ${error.name} - ${error.message}`);
      } else {
        // Log toàn bộ đối tượng lỗi nếu không phải kiểu Error
        console.error('Chi tiết lỗi (không phải Error object):', JSON.stringify(error, null, 2));
        setStatus(`Lỗi khi tạo token: ${String(error)}`);
      }
      
      setLoading(false);
    }
  };
  
  // Hàm mint token sử dụng API mới
  const mintTokens = async (mint: PublicKey) => {
    if (!publicKey || !connection || !wallet) return;
    
    try {
      setStatus('Đang mint tokens...');
      
      if (includeNonTransferable) {
        // Sử dụng NonTransferableToken để mint tokens
        const nonTransferableToken = new NonTransferableToken(connection, mint);
        
        // Tạo instructions để mint token
        const amount = BigInt(100_000_000_000); // 100 tokens với 9 decimals
        
        const { instructions, address } = await nonTransferableToken.createMintToInstructions(
          publicKey,  // owner
          amount,     // amount
          publicKey   // mintAuthority
        );
        
        console.log(`Số lượng mint instructions: ${instructions.length}`);
        console.log(`Token account address: ${address.toString()}`);
        
        // Tạo transaction
        const mintTransaction = new Transaction();
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        mintTransaction.recentBlockhash = blockhash;
        mintTransaction.feePayer = publicKey;
        
        // Thêm instructions
        instructions.forEach((ix: TransactionInstruction) => mintTransaction.add(ix));
        
        // Gửi transaction bằng wallet
        const { signature: mintSignature } = await wallet.signAndSendTransaction(mintTransaction);
        await connection.confirmTransaction(mintSignature, 'confirmed');
        
        setStatus(`Tokens đã được mint thành công!`);
        console.log(`Tokens đã được mint thành công! Signature: ${mintSignature}`);
      } else if (includeTransferFee) {
        // Sử dụng TransferFeeToken để mint tokens (code cũ)
      const transferFeeToken = new TransferFeeToken(
        connection,
        mint,
        {
          feeBasisPoints: includeTransferFee ? 100 : 0,
          maxFee: BigInt(1_000_000_000),
          transferFeeConfigAuthority: publicKey,
          withdrawWithheldAuthority: publicKey
        }
      );
      
      // Sử dụng phương thức trả về instructions thay vì thực thi trực tiếp
      const amount = BigInt(100_000_000_000); // 100 tokens với 9 decimals
      
      // Sử dụng createAccountAndMintToInstructions từ TransferFeeToken
      const { instructions, address } = await transferFeeToken.createAccountAndMintToInstructions(
        publicKey,  // owner
        publicKey,  // payer
        amount,     // amount
        publicKey   // mintAuthority
      );
      
      console.log(`Số lượng mint instructions: ${instructions.length}`);
      console.log(`Token account address: ${address.toString()}`);
      
      // Tạo transaction
      const mintTransaction = new Transaction();
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      mintTransaction.recentBlockhash = blockhash;
      mintTransaction.feePayer = publicKey;
      
      // Thêm instructions
      instructions.forEach((ix: TransactionInstruction) => mintTransaction.add(ix));
      
      // Gửi transaction bằng wallet
      const { signature: mintSignature } = await wallet.signAndSendTransaction(mintTransaction);
      await connection.confirmTransaction(mintSignature, 'confirmed');
      
      setStatus(`Tokens đã được mint thành công!`);
      console.log(`Tokens đã được mint thành công! Signature: ${mintSignature}`);
      } else {
        // Trường hợp token thông thường, tạo account và mint token
        // Tạo instruction cho account và mint riêng biệt
        try {
          const amount = BigInt(100_000_000_000); // 100 tokens với 9 decimals
          
          // Lấy địa chỉ token account
          const tokenAccount = await getAssociatedTokenAddress(
            mint,
            publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
          );
          
          // Tạo transaction
          const mintTransaction = new Transaction();
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          mintTransaction.recentBlockhash = blockhash;
          mintTransaction.feePayer = publicKey;
          
          // Thêm instruction tạo token account và mint token
          try {
            // Kiểm tra xem account đã tồn tại chưa
            await getAccount(connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
          } catch (error) {
            // Account chưa tồn tại, tạo mới
            mintTransaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey, // payer
                tokenAccount,
                publicKey, // owner
                mint,
                TOKEN_2022_PROGRAM_ID
              )
            );
          }
          
          // Thêm instruction mint token
          mintTransaction.add(
            createMintToInstruction(
              mint,
              tokenAccount,
              publicKey, // mint authority
              amount,
              [],
              TOKEN_2022_PROGRAM_ID
            )
          );
          
          // Gửi transaction
          const { signature: mintSignature } = await wallet.signAndSendTransaction(mintTransaction);
          await connection.confirmTransaction(mintSignature, 'confirmed');
          
          console.log(`Token account address: ${tokenAccount.toString()}`);
          setStatus(`Tokens đã được mint thành công!`);
          console.log(`Tokens đã được mint thành công! Signature: ${mintSignature}`);
        } catch (error) {
          console.error('Lỗi khi mint tokens:', error);
          
          // Log chi tiết hơn về lỗi
          if (error instanceof Error) {
            console.error('Chi tiết lỗi mint:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
            });
            
            // Hiển thị chi tiết hơn cho người dùng
            setStatus(`Lỗi khi mint tokens: ${error.name} - ${error.message}`);
          } else {
            // Log toàn bộ đối tượng lỗi nếu không phải kiểu Error
            console.error('Chi tiết lỗi mint (không phải Error object):', 
              JSON.stringify(error, null, 2));
            setStatus(`Lỗi khi mint tokens: ${String(error)}`);
          }
        }
      }
    } catch (error) {
      console.error('Lỗi khi mint tokens:', error);
      
      // Log chi tiết hơn về lỗi
      if (error instanceof Error) {
        console.error('Chi tiết lỗi mint:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        
        // Hiển thị chi tiết hơn cho người dùng
        setStatus(`Lỗi khi mint tokens: ${error.name} - ${error.message}`);
      } else {
        // Log toàn bộ đối tượng lỗi nếu không phải kiểu Error
        console.error('Chi tiết lỗi mint (không phải Error object):', 
          JSON.stringify(error, null, 2));
        setStatus(`Lỗi khi mint tokens: ${String(error)}`);
      }
    }
  };
  
  // Tạo URL để xem token trên explorer
  const getTokenExplorerUrl = (mint: string) => {
    return `https://explorer.solana.com/address/${mint}?cluster=devnet`;
  };

  // Thêm phương thức để debug token extensions
  const debugTokenExtensions = async () => {
    if (!tokenMint || !connection) return;

    try {
      setStatus('Đang kiểm tra token extensions...');
      console.log(`Lấy thông tin cho mint address: ${tokenMint.toString()}`);
      
      // Lấy thông tin tài khoản
      const mintInfo = await connection.getAccountInfo(tokenMint);
      
      if (!mintInfo) {
        console.error('Không tìm thấy thông tin mint');
        return;
      }
      
      console.log('Thông tin mint account:', {
        lamports: mintInfo.lamports,
        owner: mintInfo.owner.toString(),
        executable: mintInfo.executable,
        rentEpoch: mintInfo.rentEpoch,
        dataSize: mintInfo.data.length,
      });
      
      // Phân tích dữ liệu từ token account (cách thô sơ để kiểm tra)
      console.log('Raw data (first 64 bytes):', Buffer.from(mintInfo.data).slice(0, 64).toString('hex'));
      
      // Hiển thị thông tin về token program
      if (mintInfo.owner.toString() === TOKEN_2022_PROGRAM_ID.toString()) {
        console.log('✅ Token sử dụng TOKEN_2022_PROGRAM_ID');
      } else {
        console.error('❌ Token KHÔNG sử dụng TOKEN_2022_PROGRAM_ID');
        console.log('TokenProgram:', mintInfo.owner.toString());
        console.log('Expected:', TOKEN_2022_PROGRAM_ID.toString());
      }
      
      // Thử đọc dữ liệu extensions (đây chỉ là phân tích thô sơ)
      try {
        // Kiểm tra 1 byte đầu tiên, có thể là version
        const version = mintInfo.data[0];
        console.log('Token version (từ byte đầu tiên):', version);
        
        // Thêm các kiểm tra khác tùy thuộc vào cấu trúc dữ liệu token
      } catch (parseError) {
        console.error('Lỗi khi phân tích dữ liệu token:', parseError);
      }
    } catch (error) {
      console.error('Lỗi khi debug token extensions:', error);
      setStatus(`Lỗi khi kiểm tra token extensions: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container">
      <h1>Token Extensions Boost SDK Demo</h1>
      <p className="subtitle">Tạo token với extensions trên Solana</p>
      
      {/* Kết nối ví */}
      <div className="card">
        <h2>Kết nối Wallet</h2>
        {!publicKey ? (
          <button 
            onClick={connectWallet} 
            disabled={!wallet || loading}
            className="button primary"
          >
            {loading ? 'Đang kết nối...' : 'Kết nối Phantom Wallet'}
          </button>
        ) : (
          <div>
            <p className="connected">Đã kết nối: {publicKey.toString().substring(0, 8)}...{publicKey.toString().substring(publicKey.toString().length - 8)}</p>
            <button onClick={disconnectWallet} className="button secondary">
              Ngắt kết nối
            </button>
          </div>
        )}
      </div>
      
      {/* Tạo token */}
      {publicKey && (
        <div className="card">
          <h2>Cấu hình Token</h2>
          
          {/* Các thông tin cơ bản */}
          <div className="form-group">
            <label>Tên Token:</label>
            <input 
              type="text" 
              value={tokenName} 
              onChange={(e) => setTokenName(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Ký hiệu Token:</label>
            <input 
              type="text" 
              value={tokenSymbol} 
              onChange={(e) => setTokenSymbol(e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Decimals:</label>
            <input 
              type="number" 
              value={tokenDecimals} 
              onChange={(e) => setTokenDecimals(Number(e.target.value))} 
              min="0"
              max="9"
            />
          </div>
          
          {/* Chọn extensions */}
          <div className="form-group">
            <h3>Chọn Extensions:</h3>
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="metadata" 
                checked={includeMetadata} 
                onChange={(e) => setIncludeMetadata(e.target.checked)} 
              />
              <label htmlFor="metadata">Metadata</label>
            </div>
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="nonTransferable" 
                checked={includeNonTransferable} 
                onChange={(e) => setIncludeNonTransferable(e.target.checked)} 
              />
              <label htmlFor="nonTransferable">NonTransferable (SoulBound)</label>
            </div>
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="transferFee" 
                checked={includeTransferFee} 
                onChange={(e) => setIncludeTransferFee(e.target.checked)}
                disabled={includeNonTransferable} 
              />
              <label htmlFor="transferFee" className={includeNonTransferable ? 'disabled' : ''}>TransferFee</label>
              {includeNonTransferable && includeTransferFee && (
                <p className="error-notice">NonTransferable và TransferFee không thể kết hợp</p>
              )}
            </div>

            {includeTransferFee && (
              <div className="sub-options">
                <div className="form-group">
                  <label>Phí chuyển (%):</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={transferFeeRate} 
                    onChange={(e) => setTransferFeeRate(Number(e.target.value))} 
                    min="0"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label>Phí tối đa (với {tokenDecimals} decimals):</label>
                  <input 
                    type="number" 
                    value={transferFeeMax} 
                    onChange={(e) => setTransferFeeMax(Number(e.target.value))} 
                    min="0"
                  />
                </div>
              </div>
            )}
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="permanentDelegate" 
                checked={includePermanentDelegate} 
                onChange={(e) => setIncludePermanentDelegate(e.target.checked)} 
              />
              <label htmlFor="permanentDelegate">PermanentDelegate</label>
              <span className="compatibility">(Tương thích với NonTransferable)</span>
            </div>
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="interestBearing" 
                checked={includeInterestBearing} 
                onChange={(e) => setIncludeInterestBearing(e.target.checked)} 
              />
              <label htmlFor="interestBearing">InterestBearing</label>
              <span className="compatibility">(Tương thích với NonTransferable)</span>
            </div>
            
            {includeInterestBearing && (
              <div className="sub-options">
                <div className="form-group">
                  <label>Lãi suất (%):</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={interestRate} 
                    onChange={(e) => setInterestRate(Number(e.target.value))} 
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}
          </div>

          {extensionCompatibilityError && (
            <p className="error-message">{extensionCompatibilityError}</p>
          )}

          <button 
            onClick={handleCreateToken} 
            disabled={loading || !!extensionCompatibilityError}
            className="button primary"
          >
            {loading ? 'Đang tạo token...' : 'Tạo Token'}
          </button>
        </div>
      )}
      
      {/* Hiển thị kết quả và status */}
      {status && (
        <div className="card result-card">
          <h2>Kết quả</h2>
          <p className={status.includes('Error') || status.includes('Lỗi') ? 'error-status' : 'success-status'}>
            {status}
          </p>
          
          {tokenMint && (
            <div className="token-details">
              <p>Token Mint Address: <a href={getTokenExplorerUrl(tokenMint.toString())} target="_blank" rel="noopener noreferrer">{tokenMint.toString()}</a></p>
              <div className="button-group">
                <button onClick={() => mintTokens(tokenMint)} disabled={loading} className="button primary">
                  Mint Tokens
                </button>
                <button onClick={debugTokenExtensions} disabled={loading} className="button secondary">
                  Debug Extensions
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Hàm để kiểm tra transaction trên blockchain và hiển thị lỗi chi tiết
const verifyTransaction = async (connection: Connection, signature: string) => {
  try {
    // Đợi một chút để blockchain xử lý transaction
    console.log(`Đang đợi 2 giây để blockchain xử lý transaction...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Lấy thông tin transaction
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });
    
    console.log(`Transaction status:`, txInfo ? 'Found' : 'Not found');
    
    if (txInfo) {
      console.log(`Transaction details:`, {
        slot: txInfo.slot,
        blockTime: txInfo.blockTime
      });
      
      // Kiểm tra lỗi
      if (txInfo.meta && txInfo.meta.err) {
        console.error('Transaction failed with error:', txInfo.meta.err);
        
        // Phân tích lỗi
        if (typeof txInfo.meta.err === 'object') {
          const errorKeys = Object.keys(txInfo.meta.err);
          if (errorKeys.length > 0) {
            const errorType = errorKeys[0];
            console.error(`Error type: ${errorType}`);
            
            // Lỗi chương trình Solana
            if (errorType === 'InstructionError') {
              const [instructionIdx, instructionErr] = (txInfo.meta.err as any).InstructionError;
              console.error(`Error in instruction ${instructionIdx}:`, instructionErr);
              
              // Phân tích Custom program error
              if (typeof instructionErr === 'object' && instructionErr.Custom !== undefined) {
                console.error(`Custom program error code: ${instructionErr.Custom}`);
                
                // Hiển thị lỗi dựa trên mã lỗi
                if (instructionErr.Custom === 0x25) {
                  console.error('Đây là lỗi NonTransferableToken (0x25)');
                }
              }
            }
          }
        }
      }
      
      // In logs
      if (txInfo.meta && txInfo.meta.logMessages) {
        console.log('Transaction logs:');
        for (const log of txInfo.meta.logMessages) {
          console.log(`  ${log}`);
        }
      }
    } else {
      console.log(`Không thể tìm thấy thông tin về transaction ${signature}`);
    }
  } catch (error) {
    console.error('Lỗi khi kiểm tra transaction:', error);
  }
};

export default App; 