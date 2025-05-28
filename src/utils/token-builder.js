"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBuilder = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const spl_token_metadata_1 = require("@solana/spl-token-metadata");
const token_1 = require("../core/token");
const transfer_fee_1 = require("../extensions/transfer-fee");
const metadata_pointer_1 = require("../extensions/metadata-pointer");
const token_metadata_1 = require("../extensions/token-metadata");
const permanent_delegate_1 = require("../extensions/permanent-delegate");
const confidential_transfer_1 = require("../extensions/confidential-transfer");
const transfer_hook_1 = require("../extensions/transfer-hook");
/**
 * Kiểm tra tính tương thích của các extension
 *
 * @param extensionTypes Mảng các loại extension cần kiểm tra
 * @returns Kết quả kiểm tra tương thích
 */
function checkExtensionCompatibility(extensionTypes) {
    const incompatiblePairs = [];
    if (extensionTypes.includes(spl_token_1.ExtensionType.NonTransferable)) {
        if (extensionTypes.includes(spl_token_1.ExtensionType.TransferFeeConfig)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.TransferFeeConfig]);
        }
        if (extensionTypes.includes(spl_token_1.ExtensionType.TransferHook)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.TransferHook]);
        }
        if (extensionTypes.includes(spl_token_1.ExtensionType.ConfidentialTransferMint)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.ConfidentialTransferMint]);
        }
    }
    if (extensionTypes.includes(spl_token_1.ExtensionType.ConfidentialTransferMint)) {
        if (extensionTypes.includes(spl_token_1.ExtensionType.TransferFeeConfig)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.TransferFeeConfig]);
        }
        if (extensionTypes.includes(spl_token_1.ExtensionType.TransferHook)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.TransferHook]);
        }
        if (extensionTypes.includes(spl_token_1.ExtensionType.PermanentDelegate)) {
            incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.PermanentDelegate]);
        }
    }
    // Kiểm tra tương thích với DefaultAccountState
    // DefaultAccountState không có ràng buộc cụ thể về tương thích với các extension khác
    // Kiểm tra tương thích với MintCloseAuthority
    // MintCloseAuthority cũng không có ràng buộc cụ thể về tương thích với các extension khác
    // Lưu ý: RequiredMemo không nằm trong ExtensionType của @solana/spl-token nên không cần kiểm tra
    if (incompatiblePairs.length > 0) {
        const reasons = incompatiblePairs.map(([a, b]) => `${spl_token_1.ExtensionType[a]} và ${spl_token_1.ExtensionType[b]} không thể dùng cùng nhau`);
        return {
            isCompatible: false,
            incompatiblePairs,
            reason: reasons.join("; ")
        };
    }
    return { isCompatible: true };
}
class TokenBuilder {
    /**
     * Khởi tạo builder với connection
     *
     * @param connection - Connection đến Solana cluster
     */
    constructor(connection) {
        this.extensions = [];
        this.decimals = 9;
        this.mintAuthority = null;
        this.freezeAuthority = null;
        this.connection = connection;
    }
    /**
     * Thiết lập thông tin cơ bản cho token
     *
     * @param decimals - Số decimals của token
     * @param mintAuthority - Mint authority của token
     * @param freezeAuthority - Freeze authority của token (tùy chọn)
     * @returns this - để hỗ trợ method chaining
     */
    setTokenInfo(decimals, mintAuthority, freezeAuthority = null) {
        this.decimals = decimals;
        this.mintAuthority = mintAuthority;
        this.freezeAuthority = freezeAuthority;
        return this;
    }
    /**
     * Thêm extension metadata
     *
     * @param name - Tên token
     * @param symbol - Ký hiệu token
     * @param uri - URI đến metadata
     * @param additionalMetadata - Metadata bổ sung (tùy chọn)
     * @returns this - để hỗ trợ method chaining
     */
    addMetadata(name, symbol, uri, additionalMetadata) {
        this.metadata = { name, symbol, uri, additionalMetadata };
        this.extensions.push(spl_token_1.ExtensionType.MetadataPointer);
        return this;
    }
    /**
     * Thêm extension token metadata (embedded metadata)
     *
     * Khi sử dụng extension này, metadata sẽ được lưu trực tiếp trong mint account
     * và không cần tài khoản metadata riêng biệt
     *
     * @param name - Tên token
     * @param symbol - Ký hiệu token
     * @param uri - URI đến metadata
     * @param additionalMetadata - Metadata bổ sung (tùy chọn)
     * @returns this - để hỗ trợ method chaining
     */
    addTokenMetadata(name, symbol, uri, additionalMetadata) {
        this.tokenMetadata = { name, symbol, uri, additionalMetadata };
        // Metadata cần MetadataPointer extension
        this.extensions.push(spl_token_1.ExtensionType.MetadataPointer);
        return this;
    }
    /**
     * Thêm extension transfer fee
     *
     * @param feeBasisPoints - Phí cơ bản tính theo basis points (1% = 100 basis points)
     * @param maxFee - Phí tối đa
     * @param transferFeeConfigAuthority - Tài khoản có quyền cập nhật cấu hình phí
     * @param withdrawWithheldAuthority - Tài khoản có quyền rút phí đã thu
     * @returns this - để hỗ trợ method chaining
     */
    addTransferFee(feeBasisPoints, maxFee, transferFeeConfigAuthority, withdrawWithheldAuthority) {
        this.transferFee = {
            feeBasisPoints,
            maxFee,
            transferFeeConfigAuthority,
            withdrawWithheldAuthority
        };
        this.extensions.push(spl_token_1.ExtensionType.TransferFeeConfig);
        return this;
    }
    /**
     * Thêm extension permanent delegate
     *
     * @param delegate - Địa chỉ permanent delegate
     * @returns this - để hỗ trợ method chaining
     */
    addPermanentDelegate(delegate) {
        this.permanentDelegate = delegate;
        this.extensions.push(spl_token_1.ExtensionType.PermanentDelegate);
        return this;
    }
    /**
     * Thêm extension interest bearing
     *
     * @param rate - Lãi suất (basis points)
     * @param rateAuthority - Tài khoản có quyền cập nhật lãi suất
     * @returns this - để hỗ trợ method chaining
     */
    addInterestBearing(rate, rateAuthority) {
        this.interestBearing = {
            rate,
            rateAuthority
        };
        this.extensions.push(spl_token_1.ExtensionType.InterestBearingConfig);
        return this;
    }
    /**
     * Thêm extension transfer hook
     *
     * @param programId - Địa chỉ của transfer hook program
     * @param extraMetas - Metadata bổ sung (tùy chọn)
     * @returns this - để hỗ trợ method chaining
     */
    addTransferHook(programId, extraMetas) {
        this.transferHook = {
            programId,
            extraMetas
        };
        this.extensions.push(spl_token_1.ExtensionType.TransferHook);
        return this;
    }
    /**
     * Thêm extension non-transferable
     *
     * @returns this - để hỗ trợ method chaining
     */
    addNonTransferable() {
        this.extensions.push(spl_token_1.ExtensionType.NonTransferable);
        return this;
    }
    /**
     * Thêm extension confidential transfer
     *
     * @param autoEnable - Tự động kích hoạt confidential transfer (mặc định: false)
     * @returns this - để hỗ trợ method chaining
     */
    addConfidentialTransfer(autoEnable = false) {
        this.confidentialTransfer = {
            autoEnable
        };
        this.extensions.push(spl_token_1.ExtensionType.ConfidentialTransferMint);
        return this;
    }
    /**
     * Thêm extension DefaultAccountState
     *
     * Extension này thiết lập trạng thái mặc định cho mọi tài khoản token
     * khi chúng được tạo (frozen hoặc initialized)
     *
     * @param state - Trạng thái mặc định (AccountState.Frozen hoặc AccountState.Initialized)
     * @returns this - để hỗ trợ method chaining
     */
    addDefaultAccountState(state) {
        this.defaultAccountState = state;
        this.extensions.push(spl_token_1.ExtensionType.DefaultAccountState);
        return this;
    }
    /**
     * Thêm extension MintCloseAuthority
     *
     * Extension này cho phép chỉ định authority có quyền đóng mint account
     *
     * @param closeAuthority - Authority có quyền đóng mint account
     * @returns this - để hỗ trợ method chaining
     */
    addMintCloseAuthority(closeAuthority) {
        this.mintCloseAuthority = closeAuthority;
        this.extensions.push(spl_token_1.ExtensionType.MintCloseAuthority);
        return this;
    }
    /**
     * Tạo token với các extension đã cấu hình
     *
     * Phương thức này sẽ tự động nhận biết và xử lý việc tạo token có hoặc không có metadata,
     * kết hợp với các extensions khác theo cách tối ưu.
     *
     * @param payer - Keypair của người trả phí giao dịch
     * @returns Promise với thông tin về token đã tạo
     */
    async createToken(payer) {
        const hasMetadata = this.metadata || this.tokenMetadata;
        const hasOtherExtensions = this.extensions.filter(ext => ext !== spl_token_1.ExtensionType.MetadataPointer).length > 0;
        const hasNonTransferable = this.extensions.includes(spl_token_1.ExtensionType.NonTransferable);
        const hasMetadataPointer = this.extensions.includes(spl_token_1.ExtensionType.MetadataPointer);
        if (hasNonTransferable && hasMetadata) {
            console.log("Xử lý đặc biệt cho cặp NonTransferable + Metadata");
            if (this.tokenMetadata) {
                console.log("Sử dụng MetadataHelper để tạo token với metadata và NonTransferable...");
                const { MetadataHelper } = require('./metadata-helper');
                const result = await MetadataHelper.createTokenWithMetadata(this.connection, payer, {
                    decimals: this.decimals,
                    mintAuthority: this.mintAuthority,
                    name: this.tokenMetadata.name,
                    symbol: this.tokenMetadata.symbol,
                    uri: this.tokenMetadata.uri,
                    additionalMetadata: this.tokenMetadata.additionalMetadata,
                    extensions: this.extensions
                });
                console.log(`Token với NonTransferable và metadata tạo thành công! Mint: ${result.mint.toString()}`);
                return {
                    mint: result.mint,
                    transactionSignature: result.txId,
                    token: new token_metadata_1.TokenMetadataToken(this.connection, result.mint, {
                        name: this.tokenMetadata.name,
                        symbol: this.tokenMetadata.symbol,
                        uri: this.tokenMetadata.uri,
                        additionalMetadata: this.tokenMetadata.additionalMetadata || {}
                    })
                };
            }
        }
        if (hasMetadata && hasOtherExtensions) {
            return this.createTokenWithMetadataAndExtensions(payer);
        }
        else {
            return this.createTokenWithExtensions(payer);
        }
    }
    /**
     * Tạo token với nhiều extension kết hợp - phiên bản đơn giản hóa
     *
     * Phương thức này xử lý việc tạo token với metadata kết hợp với các extensions khác
     * theo cách đơn giản nhất, tập trung vào tính ổn định
     *
     * @param payer - Keypair của người trả phí giao dịch
     * @returns Promise với thông tin về token đã tạo
     */
    async createTokenWithExtensions(payer) {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }
        const compatibilityCheck = checkExtensionCompatibility(this.extensions);
        if (!compatibilityCheck.isCompatible) {
            throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
        }
        try {
            console.log("Tạo token với các extension theo cách đơn giản...");
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);
            if (this.tokenMetadata) {
                console.log("Sử dụng MetadataHelper để tạo token với metadata...");
                const { MetadataHelper } = require('./metadata-helper');
                const result = await MetadataHelper.createTokenWithMetadata(this.connection, payer, {
                    decimals: this.decimals,
                    mintAuthority: this.mintAuthority,
                    name: this.tokenMetadata.name,
                    symbol: this.tokenMetadata.symbol,
                    uri: this.tokenMetadata.uri,
                    additionalMetadata: this.tokenMetadata.additionalMetadata,
                    extensions: this.extensions
                });
                console.log(`Token với metadata tạo thành công! Mint: ${result.mint.toString()}`);
                return {
                    mint: result.mint,
                    transactionSignature: result.txId,
                    token: new token_metadata_1.TokenMetadataToken(this.connection, result.mint, {
                        name: this.tokenMetadata.name,
                        symbol: this.tokenMetadata.symbol,
                        uri: this.tokenMetadata.uri,
                        additionalMetadata: this.tokenMetadata.additionalMetadata || {}
                    })
                };
            }
            console.log("Tạo mint với các extensions khác...");
            const extensionsToUse = [...this.extensions];
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            console.log(`Kích thước mint: ${mintLen} bytes`);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
            const transaction = new web3_js_1.Transaction();
            transaction.add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            if (this.transferFee) {
                console.log("Thêm TransferFee extension...");
                transaction.add((0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mint, this.transferFee.transferFeeConfigAuthority, this.transferFee.withdrawWithheldAuthority, this.transferFee.feeBasisPoints, this.transferFee.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.permanentDelegate) {
                console.log("Thêm PermanentDelegate extension...");
                transaction.add((0, spl_token_1.createInitializePermanentDelegateInstruction)(mint, this.permanentDelegate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.interestBearing) {
                console.log("Thêm InterestBearing extension...");
                transaction.add((0, spl_token_1.createInitializeInterestBearingMintInstruction)(mint, this.interestBearing.rateAuthority, this.interestBearing.rate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferHook) {
                console.log("Thêm TransferHook extension...");
                transaction.add((0, spl_token_1.createInitializeTransferHookInstruction)(mint, payer.publicKey, this.transferHook.programId, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.confidentialTransfer) {
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }
            if (this.defaultAccountState !== undefined) {
                console.log("Thêm DefaultAccountState extension...");
                transaction.add((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(mint, this.defaultAccountState, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.mintCloseAuthority) {
                console.log("Thêm MintCloseAuthority extension...");
                transaction.add((0, spl_token_1.createInitializeMintCloseAuthorityInstruction)(mint, this.mintCloseAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            console.log("Khởi tạo mint sau các extension...");
            transaction.add((0, spl_token_1.createInitializeMintInstruction)(mint, this.decimals, this.mintAuthority, this.freezeAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            console.log("Đang gửi transaction...");
            const transactionSignature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintKeypair], { commitment: 'confirmed' });
            console.log(`Transaction successful! Signature: ${transactionSignature}`);
            let token;
            if (this.permanentDelegate) {
                token = new permanent_delegate_1.PermanentDelegateToken(this.connection, mint, this.permanentDelegate);
            }
            else if (this.transferHook) {
                token = new transfer_hook_1.TransferHookToken(this.connection, mint, this.transferHook.programId);
            }
            else if (this.confidentialTransfer) {
                token = new confidential_transfer_1.ConfidentialTransferToken(this.connection, mint);
            }
            else if (this.transferFee) {
                token = new transfer_fee_1.TransferFeeToken(this.connection, mint, {
                    feeBasisPoints: this.transferFee.feeBasisPoints,
                    maxFee: this.transferFee.maxFee,
                    transferFeeConfigAuthority: this.transferFee.transferFeeConfigAuthority,
                    withdrawWithheldAuthority: this.transferFee.withdrawWithheldAuthority
                });
            }
            else {
                token = new token_1.Token(this.connection, mint);
            }
            return {
                mint,
                transactionSignature,
                token
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token with extensions: ${error.message}`);
            }
            else {
                throw new Error(`Unknown error creating token with extensions: ${String(error)}`);
            }
        }
    }
    /**
     * Tạo token với metadata và các extension khác trong cùng một giao dịch
     *
     * Phương thức này giải quyết vấn đề kết hợp metadata với các extension khác
     * bằng cách đảm bảo thứ tự đúng và kích thước tài khoản phù hợp.
     *
     * @param payer - Keypair của người trả phí giao dịch
     * @returns Promise với thông tin về token đã tạo
     */
    async createTokenWithMetadataAndExtensions(payer) {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }
        const compatibilityCheck = checkExtensionCompatibility(this.extensions);
        if (!compatibilityCheck.isCompatible) {
            throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
        }
        const metadata = this.metadata || this.tokenMetadata;
        if (!metadata) {
            throw new Error("Metadata là bắt buộc cho phương thức này");
        }
        try {
            console.log("Tạo token với metadata và các extension khác...");
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);
            const tokenMetadata = {
                mint: mint,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(([key, value]) => [key, value]),
            };
            let extensionsToUse = [...this.extensions];
            if (!extensionsToUse.includes(spl_token_1.ExtensionType.MetadataPointer)) {
                extensionsToUse.push(spl_token_1.ExtensionType.MetadataPointer);
            }
            const metadataExtension = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE;
            const metadataLen = (0, spl_token_metadata_1.pack)(tokenMetadata).length;
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
            console.log(`Kích thước: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
            const transaction = new web3_js_1.Transaction();
            transaction.add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            transaction.add((0, spl_token_1.createInitializeMetadataPointerInstruction)(mint, payer.publicKey, mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            // Thêm NonTransferable extension nếu có trong danh sách
            if (this.extensions.includes(spl_token_1.ExtensionType.NonTransferable)) {
                console.log("Thêm NonTransferable extension...");
                transaction.add((0, spl_token_1.createInitializeNonTransferableMintInstruction)(mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferFee) {
                transaction.add((0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mint, this.transferFee.transferFeeConfigAuthority, this.transferFee.withdrawWithheldAuthority, this.transferFee.feeBasisPoints, this.transferFee.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.permanentDelegate) {
                transaction.add((0, spl_token_1.createInitializePermanentDelegateInstruction)(mint, this.permanentDelegate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferHook) {
                transaction.add((0, spl_token_1.createInitializeTransferHookInstruction)(mint, payer.publicKey, this.transferHook.programId, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.confidentialTransfer) {
                // Note: The createInitializeConfidentialTransferMintInstruction function
                // is not fully implemented in @solana/spl-token yet
                // In a real implementation, we would use something like:
                // transaction.add(
                //   createInitializeConfidentialTransferMintInstruction(
                //     mint,
                //     payer.publicKey,
                //     this.confidentialTransfer.autoEnable || false,
                //     TOKEN_2022_PROGRAM_ID
                //   )
                // );
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }
            if (this.interestBearing) {
                transaction.add((0, spl_token_1.createInitializeInterestBearingMintInstruction)(mint, this.interestBearing.rateAuthority, this.interestBearing.rate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.defaultAccountState !== undefined) {
                transaction.add((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(mint, this.defaultAccountState, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.mintCloseAuthority) {
                transaction.add((0, spl_token_1.createInitializeMintCloseAuthorityInstruction)(mint, this.mintCloseAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            transaction.add((0, spl_token_1.createInitializeMintInstruction)(mint, this.decimals, this.mintAuthority, this.freezeAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            transaction.add((0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: payer.publicKey,
                mint: mint,
                mintAuthority: this.mintAuthority,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
            }));
            if (metadata.additionalMetadata) {
                for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                    transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                        programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        metadata: mint,
                        updateAuthority: payer.publicKey,
                        field: key,
                        value: value,
                    }));
                }
            }
            console.log("Đang gửi transaction...");
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintKeypair], { commitment: 'confirmed' });
            console.log(`Token tạo thành công! Transaction: ${signature}`);
            let token;
            if (this.metadata) {
                token = new metadata_pointer_1.MetadataPointerToken(this.connection, mint, {
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    additionalMetadata: metadata.additionalMetadata || {}
                });
            }
            else if (this.tokenMetadata) {
                token = new token_metadata_1.TokenMetadataToken(this.connection, mint, {
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    additionalMetadata: metadata.additionalMetadata || {}
                });
            }
            else if (this.transferFee) {
                token = new transfer_fee_1.TransferFeeToken(this.connection, mint, {
                    feeBasisPoints: this.transferFee.feeBasisPoints,
                    maxFee: this.transferFee.maxFee,
                    transferFeeConfigAuthority: this.transferFee.transferFeeConfigAuthority,
                    withdrawWithheldAuthority: this.transferFee.withdrawWithheldAuthority
                });
            }
            else if (this.permanentDelegate) {
                token = new permanent_delegate_1.PermanentDelegateToken(this.connection, mint, this.permanentDelegate);
            }
            else if (this.transferHook) {
                token = new transfer_hook_1.TransferHookToken(this.connection, mint, this.transferHook.programId);
            }
            else if (this.confidentialTransfer) {
                token = new confidential_transfer_1.ConfidentialTransferToken(this.connection, mint);
            }
            else {
                token = new token_1.Token(this.connection, mint);
            }
            return {
                mint,
                transactionSignature: signature,
                token
            };
        }
        catch (error) {
            console.error('Lỗi khi tạo token với metadata và các extension:', error);
            if (error instanceof Error) {
                const errorMessage = error.message;
                console.error('Chi tiết lỗi:', errorMessage);
                throw new Error(`Failed to create token with extensions: ${errorMessage}`);
            }
            else {
                throw new Error(`Unknown error creating token with extensions: ${String(error)}`);
            }
        }
    }
    /**
     * Tạo instructions cho token với các extension đã cấu hình
     *
     * Phương thức này trả về instructions thay vì thực thi transaction,
     * giúp tích hợp dễ dàng với wallet adapter.
     *
     * @param payer - Public key của người trả phí giao dịch
     * @returns Promise với instructions, signers cần thiết và mint address
     */
    async createTokenInstructions(payer) {
        const hasMetadata = this.metadata || this.tokenMetadata;
        const hasOtherExtensions = this.extensions.filter(ext => ext !== spl_token_1.ExtensionType.MetadataPointer).length > 0;
        const hasNonTransferable = this.extensions.includes(spl_token_1.ExtensionType.NonTransferable);
        const hasMetadataPointer = this.extensions.includes(spl_token_1.ExtensionType.MetadataPointer);
        const compatibilityCheck = checkExtensionCompatibility(this.extensions);
        if (!compatibilityCheck.isCompatible) {
            throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
        }
        if (hasMetadata && hasOtherExtensions) {
            return this.createTokenWithMetadataAndExtensionsInstructions(payer);
        }
        else {
            return this.createTokenWithExtensionsInstructions(payer);
        }
    }
    /**
     * Tạo instructions cho token với nhiều extension - phiên bản đơn giản hóa
     *
     * @param payer - Public key của người trả phí giao dịch
     * @returns Promise với instructions, signers cần thiết và mint address
     */
    async createTokenWithExtensionsInstructions(payer) {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }
        try {
            console.log("Tạo instructions cho token với các extension...");
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);
            const instructions = [];
            if (this.tokenMetadata) {
                console.log("Sử dụng MetadataHelper để tạo token với metadata...");
                const { MetadataHelper } = require('./metadata-helper');
                const result = await MetadataHelper.createTokenWithMetadataInstructions(this.connection, payer, {
                    decimals: this.decimals,
                    mintAuthority: this.mintAuthority,
                    name: this.tokenMetadata.name,
                    symbol: this.tokenMetadata.symbol,
                    uri: this.tokenMetadata.uri,
                    additionalMetadata: this.tokenMetadata.additionalMetadata,
                    extensions: this.extensions
                });
                return {
                    instructions: result.instructions,
                    signers: result.signers,
                    mint: result.mint
                };
            }
            console.log("Tạo mint với các extensions khác...");
            const extensionsToUse = [...this.extensions];
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            console.log(`Kích thước mint: ${mintLen} bytes`);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
            instructions.push(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer,
                newAccountPubkey: mint,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            if (this.transferFee) {
                console.log("Thêm TransferFee extension...");
                instructions.push((0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mint, this.transferFee.transferFeeConfigAuthority, this.transferFee.withdrawWithheldAuthority, this.transferFee.feeBasisPoints, this.transferFee.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.permanentDelegate) {
                console.log("Thêm PermanentDelegate extension...");
                instructions.push((0, spl_token_1.createInitializePermanentDelegateInstruction)(mint, this.permanentDelegate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.interestBearing) {
                console.log("Thêm InterestBearing extension...");
                instructions.push((0, spl_token_1.createInitializeInterestBearingMintInstruction)(mint, this.interestBearing.rateAuthority, this.interestBearing.rate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferHook) {
                console.log("Thêm TransferHook extension...");
                instructions.push((0, spl_token_1.createInitializeTransferHookInstruction)(mint, payer, this.transferHook.programId, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.confidentialTransfer) {
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }
            if (this.defaultAccountState !== undefined) {
                console.log("Thêm DefaultAccountState extension...");
                instructions.push((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(mint, this.defaultAccountState, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.mintCloseAuthority) {
                console.log("Thêm MintCloseAuthority extension...");
                instructions.push((0, spl_token_1.createInitializeMintCloseAuthorityInstruction)(mint, this.mintCloseAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            console.log("Khởi tạo mint sau các extension...");
            instructions.push((0, spl_token_1.createInitializeMintInstruction)(mint, this.decimals, this.mintAuthority, this.freezeAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            return {
                instructions,
                signers: [mintKeypair],
                mint
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token instructions: ${error.message}`);
            }
            else {
                throw new Error(`Unknown error creating token instructions: ${String(error)}`);
            }
        }
    }
    /**
     * Tạo instructions cho token với metadata và các extension khác
     *
     * @param payer - Public key của người trả phí giao dịch
     * @returns Promise với instructions, signers cần thiết và mint address
     */
    async createTokenWithMetadataAndExtensionsInstructions(payer) {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }
        const metadata = this.metadata || this.tokenMetadata;
        if (!metadata) {
            throw new Error("Metadata là bắt buộc cho phương thức này");
        }
        try {
            console.log("Tạo instructions cho token với metadata và các extension khác...");
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);
            const tokenMetadata = {
                mint: mint,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(([key, value]) => [key, value]),
            };
            let extensionsToUse = [...this.extensions];
            if (!extensionsToUse.includes(spl_token_1.ExtensionType.MetadataPointer)) {
                extensionsToUse.push(spl_token_1.ExtensionType.MetadataPointer);
            }
            const metadataExtension = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE;
            const metadataLen = (0, spl_token_metadata_1.pack)(tokenMetadata).length;
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
            console.log(`Kích thước: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
            const instructions = [];
            instructions.push(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer,
                newAccountPubkey: mint,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            instructions.push((0, spl_token_1.createInitializeMetadataPointerInstruction)(mint, payer, mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            // Thêm NonTransferable extension nếu có trong danh sách
            if (this.extensions.includes(spl_token_1.ExtensionType.NonTransferable)) {
                console.log("Thêm NonTransferable extension...");
                instructions.push((0, spl_token_1.createInitializeNonTransferableMintInstruction)(mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferFee) {
                instructions.push((0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mint, this.transferFee.transferFeeConfigAuthority, this.transferFee.withdrawWithheldAuthority, this.transferFee.feeBasisPoints, this.transferFee.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.permanentDelegate) {
                instructions.push((0, spl_token_1.createInitializePermanentDelegateInstruction)(mint, this.permanentDelegate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.transferHook) {
                instructions.push((0, spl_token_1.createInitializeTransferHookInstruction)(mint, payer, this.transferHook.programId, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.confidentialTransfer) {
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }
            if (this.interestBearing) {
                instructions.push((0, spl_token_1.createInitializeInterestBearingMintInstruction)(mint, this.interestBearing.rateAuthority, this.interestBearing.rate, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.defaultAccountState !== undefined) {
                instructions.push((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(mint, this.defaultAccountState, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.mintCloseAuthority) {
                instructions.push((0, spl_token_1.createInitializeMintCloseAuthorityInstruction)(mint, this.mintCloseAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            instructions.push((0, spl_token_1.createInitializeMintInstruction)(mint, this.decimals, this.mintAuthority, this.freezeAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            instructions.push((0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: payer,
                mint: mint,
                mintAuthority: this.mintAuthority,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
            }));
            if (metadata.additionalMetadata) {
                for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                    instructions.push((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                        programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        metadata: mint,
                        updateAuthority: payer,
                        field: key,
                        value: value,
                    }));
                }
            }
            return {
                instructions,
                signers: [mintKeypair],
                mint
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token instructions: ${error.message}`);
            }
            else {
                throw new Error(`Unknown error creating token instructions: ${String(error)}`);
            }
        }
    }
    /**
     * Tạo transaction từ instructions cho token
     *
     * Phương thức tiện ích giúp người dùng tạo transaction từ instructions
     *
     * @param instructions - Instructions cần đưa vào transaction
     * @param feePayer - Public key của người trả phí
     * @returns Transaction đã được thiết lập
     */
    buildTransaction(instructions, feePayer) {
        const transaction = new web3_js_1.Transaction();
        instructions.forEach(instruction => transaction.add(instruction));
        transaction.feePayer = feePayer;
        return transaction;
    }
    /**
     * DEPRECATED: Sử dụng createToken() thay thế.
     * Phương thức này được giữ lại để đảm bảo tương thích với mã nguồn cũ.
     *
     * @internal
     * @param payer - Keypair của người trả phí giao dịch
     * @returns Promise với thông tin về token đã tạo
     * @deprecated Sử dụng createToken() để có API đơn giản hơn.
     */
    async build(payer) {
        console.warn('DEPRECATED: build() đã lỗi thời, hãy sử dụng createToken() thay thế');
        return this.createToken(payer);
    }
}
exports.TokenBuilder = TokenBuilder;
