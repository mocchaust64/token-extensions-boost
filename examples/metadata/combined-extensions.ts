import {
  Connection,
  Keypair,
  clusterApiUrl,
  Commitment,
  ConfirmOptions,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import fs from 'fs';
import path from 'path';
import {
  TokenBuilder, 
  NonTransferableToken 
} from "../../src";

/**
 * Ví dụ tạo token với metadata và nhiều extension khác nhau
 */
async function main() {
  // Cấu hình connection
  const commitment: Commitment = "confirmed";
  const confirmOptions: ConfirmOptions = {
    skipPreflight: true, // Bỏ qua kiểm tra preflight để giảm lỗi
    commitment,
    maxRetries: 5,
  };
  
  // Kết nối đến devnet với endpoint thay thế và timeout dài hơn
  console.log("Đang kết nối đến Solana devnet...");
  const connection = new Connection(clusterApiUrl("devnet"), {
    commitment,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false,
  });
  
  // Load ví từ file local
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
     const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
     const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
     const payer = Keypair.fromSecretKey(secretKey);
     
  console.log("Địa chỉ ví:", payer.publicKey.toString());
  console.log("\n===== Tạo token với metadata và các extension =====");

  // Cấu hình metadata
  const metadata = {
    name: "OPOS",
    symbol: "OPOS",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: {
         "trait_type": "Item",
    "value": "Developer Portal"
    }
};

  console.log("Đang tạo token với TokenBuilder...");
  
  // Tạo TokenBuilder - Phiên bản 1: Chỉ với NonTransferable
  console.log("--- Thử nghiệm 1: Token với NonTransferable Extension ---");
  const tokenBuilder1 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    .addNonTransferable();
  
  // Tạo TokenBuilder - Phiên bản 2: Chỉ với Metadata
  console.log("--- Thử nghiệm 2: Token với Metadata Extension ---");
  const tokenBuilder2 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    );
  
  // Tạo delegate keypair cho PermanentDelegate extension
  const delegateKeypair = Keypair.generate();
  console.log("Delegate public key:", delegateKeypair.publicKey.toString());
  
  // Tạo TokenBuilder - Phiên bản 3: Kết hợp nhiều extensions
  console.log("--- Thử nghiệm 3: Token với nhiều Extensions kết hợp ---");
  const tokenBuilder3 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    // Extension 1: Metadata
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    // Extension 2: TransferFee (0.5% phí chuyển)
    .addTransferFee(
      50, // 0.5% (50 basis points)
      BigInt(500000), // maxFee (0.5 token với 6 decimals)
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    )
    // Extension 3: PermanentDelegate
    .addPermanentDelegate(
      delegateKeypair.publicKey
    )
    // Extension 4: InterestBearing (lãi suất 0.1%)
    .addInterestBearing(
      0.1, // 0.1% lãi suất
      payer.publicKey // rateAuthority
    );

  // Tạo TokenBuilder - Phiên bản 4: Kết hợp Metadata và NonTransferable (không thể chuyển)
  console.log("--- Thử nghiệm 4: Token với Metadata, NonTransferable và các extension khác ---");
  const tokenBuilder4 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    // Extension 1: NonTransferable - Token không thể chuyển
    .addNonTransferable()
    // Extension 2: Metadata - Thông tin mô tả token
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    // Extension 3: PermanentDelegate - Ủy quyền vĩnh viễn
    // Mặc dù token không thể chuyển bởi chủ sở hữu, permanent delegate vẫn có quyền đặc biệt
    .addPermanentDelegate(
      delegateKeypair.publicKey
    )
    // Extension 4: InterestBearing - Token có thể sinh lãi
    // Token không thể chuyển vẫn có thể sinh lãi
    .addInterestBearing(
      0.2, // 0.2% lãi suất
      payer.publicKey // rateAuthority
    );
  
  // Thực hiện thử nghiệm 1: Chỉ NonTransferable
  const startTime = Date.now();
  
  // Tạo và kiểm tra token với NonTransferable
  await createAndTestToken(tokenBuilder1, payer, connection, "NonTransferable", startTime);
  
  // Thực hiện thử nghiệm 2: Chỉ Metadata
  const startTime2 = Date.now();
  await createAndTestToken(tokenBuilder2, payer, connection, "Metadata", startTime2);
  
  // Thực hiện thử nghiệm 3: Kết hợp nhiều extensions (có thể chuyển)
  const startTime3 = Date.now();
  await createAndTestToken(tokenBuilder3, payer, connection, "Nhiều Extensions kết hợp", startTime3);

  // Thực hiện thử nghiệm 4: Kết hợp Metadata và NonTransferable
  const startTime4 = Date.now();
  await createAndTestToken(tokenBuilder4, payer, connection, "Metadata+NonTransferable", startTime4);
}

/**
 * Kiểm tra tính năng NonTransferable của token
 */
async function testNonTransferable(connection: Connection, mint: PublicKey, payer: Keypair) {
  console.log("\n===== Kiểm tra tính năng NonTransferable =====");
  
  try {
    // Tạo instance của NonTransferableToken
    const nonTransferableToken = new NonTransferableToken(connection, mint);
    
    // Tạo ví đích
    const destinationWallet = Keypair.generate();
    console.log(`Đang thử chuyển token từ ${payer.publicKey.toString()} đến ${destinationWallet.publicKey.toString()}`);
    
    const transferAmount = BigInt(1000000); // 1 token với 6 decimals
    
    // Mint tokens vào tài khoản nguồn
    console.log("Đang mint tokens vào tài khoản nguồn...");
    
    try {
      // Tạo token account và mint token
      const { instructions: mintInstructions, address: sourceAddress } = 
        await nonTransferableToken.createMintToInstructions(
          payer.publicKey,
          transferAmount,
      payer.publicKey
    );
    
      // Tạo transaction
      const transaction = new Transaction().add(...mintInstructions);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Gửi transaction
      console.log("Đang gửi transaction tạo token...");
      const mintSignature = await connection.sendTransaction(
        transaction, 
        [payer], 
        { skipPreflight: true }
      );
      
      console.log(`Mint transaction đã gửi: ${mintSignature}`);
      try {
        // Xác nhận transaction với cách đơn giản hơn
        await connection.confirmTransaction(mintSignature, "confirmed");
        console.log(`Đã mint ${Number(transferAmount) / 10**6} tokens vào tài khoản: ${sourceAddress.toString()}`);
      } catch (mintConfirmError) {
        console.warn("Không thể xác nhận mint transaction:", mintConfirmError);
        // Kiểm tra trạng thái transaction
        const status = await connection.getSignatureStatus(mintSignature);
        if (status && status.value && !status.value.err) {
          console.log("Mint transaction có vẻ thành công mặc dù không thể xác nhận!");
          console.log(`Đã mint ${Number(transferAmount) / 10**6} tokens vào tài khoản: ${sourceAddress.toString()}`);
        } else {
          throw new Error("Mint transaction không thành công");
        }
      }
      
      // Tạo token account đích
      console.log("Đang tạo tài khoản đích...");
      const { instructions: destInstructions, address: destinationAddress } = 
        await nonTransferableToken.createAccountAndMintToInstructions(
          destinationWallet.publicKey,  // owner - Chủ sở hữu tài khoản token
          payer.publicKey,              // payer - Người trả phí
          BigInt(0),                    // amount - Số lượng token (0)
          payer.publicKey               // mintAuthority - Authority được phép mint
        );
        
      // Tạo transaction - payer sẽ thanh toán phí và ký transaction, không cần destinationWallet ký
      const destTx = new Transaction().add(...destInstructions);
      const destBlockhash = await connection.getLatestBlockhash();
      destTx.recentBlockhash = destBlockhash.blockhash;
      destTx.lastValidBlockHeight = destBlockhash.lastValidBlockHeight;
      destTx.feePayer = payer.publicKey; // Đảm bảo payer là người trả phí
      
      // Gửi transaction
      console.log("Đang gửi transaction tạo tài khoản đích...");
      const destSignature = await connection.sendTransaction(
        destTx, 
        [payer], // Chỉ cần payer ký, không cần destinationWallet
        { skipPreflight: true }
      );
      
      console.log(`Destination transaction đã gửi: ${destSignature}`);
      try {
        // Xác nhận transaction với cách đơn giản hơn
        await connection.confirmTransaction(destSignature, "confirmed");
        console.log(`Đã tạo tài khoản đích: ${destinationAddress.toString()}`);
      } catch (destConfirmError) {
        console.warn("Không thể xác nhận transaction tạo tài khoản:", destConfirmError);
        // Kiểm tra trạng thái transaction
        const status = await connection.getSignatureStatus(destSignature);
        if (status && status.value && !status.value.err) {
          console.log("Transaction tạo tài khoản có vẻ thành công mặc dù không thể xác nhận!");
          console.log(`Đã tạo tài khoản đích: ${destinationAddress.toString()}`);
        } else {
          throw new Error("Transaction tạo tài khoản không thành công");
        }
      }
      
      // Thử chuyển token
      console.log(`Đang thử chuyển ${Number(transferAmount) / 10**6} tokens...`);
      
      try {
        // Tạo transaction chuyển token
        const transferInstruction = nonTransferableToken.createTransferInstruction(
      sourceAddress,
          destinationAddress,
          payer.publicKey,
          transferAmount,
          6
        );
        
        // Tạo và thiết lập transaction
        const transferTx = new Transaction().add(transferInstruction);
        const transferBlockhash = await connection.getLatestBlockhash();
        transferTx.recentBlockhash = transferBlockhash.blockhash;
        transferTx.lastValidBlockHeight = transferBlockhash.lastValidBlockHeight;
        transferTx.feePayer = payer.publicKey;
        
        // Gửi transaction
        console.log("Đang gửi transaction chuyển token...");
        console.log(`Chuyển ${Number(transferAmount) / 10**6} tokens từ ${sourceAddress.toString()} đến ${destinationAddress.toString()}`);
        
        const transferSignature = await connection.sendTransaction(
          transferTx, 
          [payer], 
          { skipPreflight: true }
        );
        
        console.log(`Transfer transaction đã gửi: ${transferSignature}`);
        
        try {
          // Xác nhận transaction với cách đơn giản hơn
          await connection.confirmTransaction(transferSignature, "confirmed");
          
          // Kiểm tra trạng thái chi tiết của transaction
          const txInfo = await connection.getTransaction(transferSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed"
          });
          
          if (txInfo && txInfo.meta && txInfo.meta.err) {
            // Transaction có lỗi - đây là điều mong đợi với NonTransferable
            console.log("✅ Transaction lỗi như mong đợi: ", JSON.stringify(txInfo.meta.err));
            console.log("✅ NonTransferable đang hoạt động đúng! Token KHÔNG thể chuyển.");
            
            // Kiểm tra xem có phải lỗi NonTransferable không (0x25)
            const errorString = JSON.stringify(txInfo.meta.err);
            if (errorString.includes("0x25")) {
              console.log("✅ Xác nhận: Lỗi 0x25 - NonTransferableTokenError");
            }
          } else {
            // Transaction thành công - điều này không nên xảy ra với NonTransferable token
            console.log("⚠️ Token có thể chuyển -> NonTransferable KHÔNG hoạt động!");
            console.log(`Explorer: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
          }
        } catch (confirmError) {
          console.log("Không thể xác nhận transaction chuyển token:", confirmError);
          
          // Kiểm tra trạng thái transaction
          const status = await connection.getSignatureStatus(transferSignature);
          if (status && status.value && status.value.err) {
            console.log("Transaction lỗi:", status.value.err);
            
            const errorString = JSON.stringify(status.value.err);
            if (errorString.includes("NonTransferable") || 
                errorString.includes("0x75") || 
                errorString.includes("non-transferable")) {
              console.log("✅ Xác nhận: Token KHÔNG thể chuyển -> NonTransferable hoạt động đúng!");
            } else {
              console.log("❌ Lỗi khác, không liên quan đến NonTransferable:", errorString);
            }
          }
        }
      } catch (transferError) {
        console.error("Lỗi khi tạo/gửi transaction chuyển token:", transferError);
        
        const errorString = transferError instanceof Error ? 
          transferError.toString() : String(transferError);
      
    if (errorString.includes("NonTransferable") || 
            errorString.includes("0x75") || 
        errorString.includes("non-transferable")) {
          console.log("✅ Xác nhận: Token KHÔNG thể chuyển -> NonTransferable hoạt động đúng!");
    } else {
      console.log("❌ Lỗi khác, không liên quan đến NonTransferable:");
      console.log(errorString);
    }
      }
    } catch (mintError) {
      console.error("Lỗi khi mint token:", mintError);
    }
  } catch (error) {
    console.error("Lỗi khi test NonTransferable:", error);
  }
  
  console.log("\n===== TEST COMPLETED =====");
}

/**
 * Hàm tạo và kiểm tra token với các extension cụ thể
 */
async function createAndTestToken(
  tokenBuilder: any, 
  payer: Keypair, 
  connection: Connection, 
  testName: string,
  startTime: number
) {
  console.log(`\n===== Tạo token với ${testName} extension =====`);
  
  try {
    // Tạo instructions và signers
    console.log("Đang tạo token instructions...");
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Tạo và ký transaction
    console.log("Đang tạo transaction...");
    const transaction = tokenBuilder.buildTransaction(instructions, payer.publicKey);
    
    // Lấy blockhash mới
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Gửi transaction
    console.log("Đang gửi transaction tạo token...");
    const signature = await connection.sendTransaction(
      transaction, 
      [payer, ...signers],
      { skipPreflight: true }
    );
    
    console.log(`Transaction đã gửi: ${signature}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Xác nhận transaction
    console.log("Đang đợi xác nhận transaction...");
    try {
      // Xác nhận transaction với cách đơn giản hơn
      await connection.confirmTransaction(signature, "confirmed");
      
      console.log("Transaction đã được xác nhận thành công!");
      console.log(`Token được tạo thành công!`);
      console.log(`Mint address: ${mint.toString()}`);
      console.log(`Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
      
      const endTime = Date.now();
      console.log(`Tổng thời gian: ${(endTime - startTime)/1000} giây`);
      
      // Nếu là NonTransferable token, kiểm tra tính năng này
      if (testName === "NonTransferable") {
        await testNonTransferable(connection, mint, payer);
      }
      
      return mint;
    } catch (confirmError) {
      console.warn("Không thể xác nhận transaction:", confirmError);
      
      // Kiểm tra thủ công transaction status
      console.log("Kiểm tra trạng thái transaction...");
      
      try {
        const status = await connection.getSignatureStatus(signature);
        console.log("Transaction status:", status);
        
        if (status && status.value && !status.value.err) {
          console.log("Transaction có vẻ thành công mặc dù không thể xác nhận!");
          console.log(`Token có thể đã được tạo thành công.`);
          console.log(`Mint address: ${mint.toString()}`);
          console.log(`Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
          
          // Nếu là NonTransferable token, kiểm tra tính năng này
          if (testName === "NonTransferable") {
            await testNonTransferable(connection, mint, payer);
          }
          
          return mint;
        }
      } catch (statusError) {
        console.error("Không thể kiểm tra trạng thái transaction:", statusError);
      }
    }
  } catch (error) {
    console.error(`Lỗi khi tạo token ${testName}:`, error);
  }
  
  return null;
}

main().catch(error => {
  console.error("Lỗi chung:", error);
}); 