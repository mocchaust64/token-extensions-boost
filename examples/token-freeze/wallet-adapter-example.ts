import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import { TokenFreezeExtension } from '../../src';
import { 
  AccountState,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';

/**
 * Ví dụ minh họa cách sử dụng TokenFreezeExtension với wallet adapter
 * 
 * Lưu ý: Đây là code mẫu để tham khảo, cần được tích hợp vào ứng dụng React/Web thực tế
 * với thư viện wallet adapter (@solana/wallet-adapter-*)
 */

/**
 * Hàm đóng băng tài khoản token với wallet adapter
 */
async function freezeAccountWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState từ useWallet() của @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Đóng băng tài khoản token...");
    
    // Sử dụng phương thức mới để chuẩn bị transaction
    const transaction = TokenFreezeExtension.prepareFreezeAccountTransaction(
      account,         // Tài khoản token cần đóng băng
      mint,            // Địa chỉ mint của token
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Lấy blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Ký transaction với wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Gửi transaction đã ký
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Đợi xác nhận
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Tài khoản token đã được đóng băng!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Lỗi khi đóng băng tài khoản token:", error);
    throw error;
  }
}

/**
 * Hàm mở đóng băng tài khoản token với wallet adapter
 */
async function thawAccountWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState từ useWallet() của @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Mở đóng băng tài khoản token...");
    
    // Sử dụng phương thức mới để chuẩn bị transaction
    const transaction = TokenFreezeExtension.prepareThawAccountTransaction(
      account,         // Tài khoản token cần mở đóng băng
      mint,            // Địa chỉ mint của token
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Lấy blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Ký transaction với wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Gửi transaction đã ký
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Đợi xác nhận
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Tài khoản token đã được mở đóng băng!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Lỗi khi mở đóng băng tài khoản token:", error);
    throw error;
  }
}

/**
 * Hàm cập nhật trạng thái mặc định của token với wallet adapter
 */
async function updateDefaultAccountStateWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState từ useWallet() của @solana/wallet-adapter-react
  mint: PublicKey,
  accountState: AccountState
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log(`Cập nhật trạng thái mặc định của token sang ${accountState === AccountState.Frozen ? 'Frozen' : 'Initialized'}...`);
    
    // Sử dụng phương thức mới để chuẩn bị transaction
    const transaction = TokenFreezeExtension.prepareUpdateDefaultAccountStateTransaction(
      mint,            // Địa chỉ mint của token
      accountState,    // Trạng thái mặc định mới
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Lấy blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Ký transaction với wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Gửi transaction đã ký
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Đợi xác nhận
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Trạng thái mặc định của token đã được cập nhật!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái mặc định của token:", error);
    throw error;
  }
}

/**
 * Tạo instruction để đóng băng và build transaction riêng
 * Ví dụ về cách sử dụng các hàm instruction riêng lẻ
 */
async function buildCustomFreezeTransaction(
  connection: Connection, 
  wallet: any, // WalletContextState từ useWallet() của @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Tạo instruction đóng băng tùy chỉnh...");
    
    // Tạo instruction riêng lẻ
    const freezeInstruction = TokenFreezeExtension.createFreezeAccountInstruction(
      account,
      mint,
      wallet.publicKey,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    // Sử dụng hàm tiện ích để tạo transaction
    const transaction = TokenFreezeExtension.buildTransaction(
      [freezeInstruction],
      wallet.publicKey
    );
    
    // Từ đây, bạn có thể thêm các instruction khác vào transaction
    // transaction.add(...otherInstructions);
    
    // Lấy blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Trả về transaction đã tạo để ký và gửi trong ứng dụng thực tế
    return transaction;
  } catch (error) {
    console.error("Lỗi khi tạo transaction:", error);
    throw error;
  }
}

/**
 * Ví dụ cách sử dụng trong component React với wallet adapter
 * 
 * Đây là giả định code trong component React:
 * 
 * ```tsx
 * import { useConnection, useWallet } from '@solana/wallet-adapter-react';
 * import { Button } from '@/components/ui/button';
 * 
 * export function FreezeTokenButton({ tokenAccount, mintAddress }) {
 *   const { connection } = useConnection();
 *   const wallet = useWallet();
 *   
 *   const handleClick = async () => {
 *     try {
 *       await freezeAccountWithWalletAdapter(
 *         connection,
 *         wallet,
 *         new PublicKey(tokenAccount),
 *         new PublicKey(mintAddress)
 *       );
 *       
 *       // Hiển thị thông báo thành công
 *     } catch (error) {
 *       console.error("Lỗi:", error);
 *       // Hiển thị thông báo lỗi
 *     }
 *   };
 *   
 *   return (
 *     <Button 
 *       onClick={handleClick}
 *       disabled={!wallet.connected}
 *     >
 *       Đóng Băng Token
 *     </Button>
 *   );
 * }
 * ```
 */

// Xuất các hàm để sử dụng trong ứng dụng thực tế
export {
  freezeAccountWithWalletAdapter,
  thawAccountWithWalletAdapter,
  updateDefaultAccountStateWithWalletAdapter,
  buildCustomFreezeTransaction
}; 