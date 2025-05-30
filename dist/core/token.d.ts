import { Connection, PublicKey, Signer, TransactionInstruction, Commitment } from "@solana/web3.js";
import { Account } from "@solana/spl-token";
export declare class Token {
    protected connection: Connection;
    protected mint: PublicKey;
    constructor(connection: Connection, mint: PublicKey);
    getMint(): PublicKey;
    getConnection(): Connection;
    getProgramId(): PublicKey;
    /**
     * Lấy địa chỉ Associated Token Account cho một ví
     *
     * @param owner - Địa chỉ ví chủ sở hữu
     * @param allowOwnerOffCurve - Cho phép owner là địa chỉ ngoài đường cong (mặc định: false)
     * @returns Địa chỉ của Associated Token Account
     */
    getAssociatedAddress(owner: PublicKey, allowOwnerOffCurve?: boolean): Promise<PublicKey>;
    /**
     * Tạo instruction để khởi tạo Associated Token Account
     *
     * @param payer - Người trả phí giao dịch
     * @param associatedAccount - Địa chỉ Associated Token Account
     * @param owner - Địa chỉ ví chủ sở hữu
     * @returns TransactionInstruction để tạo Associated Token Account
     */
    createAssociatedTokenAccountInstruction(payer: PublicKey, associatedAccount: PublicKey, owner: PublicKey): TransactionInstruction;
    /**
     * Tạo instructions để mint token vào tài khoản
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @returns Object chứa instructions
     */
    createMintToInstructions(destination: PublicKey, authority: PublicKey, amount: bigint): {
        instructions: TransactionInstruction[];
    };
    /**
     * Tạo instructions để mint token có kiểm tra decimals
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param decimals - Số decimals của token
     * @returns Object chứa instructions
     */
    createMintToCheckedInstructions(destination: PublicKey, authority: PublicKey, amount: bigint, decimals: number): {
        instructions: TransactionInstruction[];
    };
    /**
     * Tạo instructions để tạo tài khoản token và mint token
     *
     * @param owner - Chủ sở hữu tài khoản token
     * @param payer - Người trả phí giao dịch
     * @param amount - Số lượng token cần mint
     * @param mintAuthority - Authority được phép mint token
     * @returns Object chứa instructions và địa chỉ tài khoản token
     */
    createAccountAndMintToInstructions(owner: PublicKey, payer: PublicKey, amount: bigint, mintAuthority: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
    /**
     * Tạo instructions để đốt token
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu tài khoản
     * @param amount - Số lượng token cần đốt
     * @param decimals - Số decimals của token
     * @returns Object chứa instructions
     */
    createBurnInstructions(account: PublicKey, owner: PublicKey, amount: bigint, decimals: number): {
        instructions: TransactionInstruction[];
    };
    /**
     * Tạo instructions để chuyển token
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ wallet hoặc token account đích
     * @param owner - Chủ sở hữu tài khoản nguồn và người trả phí
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số decimals của token
     * @param options - Các tùy chọn bổ sung
     * @returns Object chứa instructions và địa chỉ tài khoản đích
     */
    createTransferInstructions(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number, options?: {
        memo?: string;
        createDestinationIfNeeded?: boolean;
        feePayer?: PublicKey;
    }): Promise<{
        instructions: TransactionInstruction[];
        destinationAddress: PublicKey;
    }>;
    /**
     * Tạo hoặc lấy tài khoản token
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Object chứa instructions và địa chỉ tài khoản token
     */
    createTokenAccountInstructions(payer: PublicKey, owner: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
        accountExists: boolean;
    }>;
    /**
     * Tạo hoặc lấy tài khoản token liên kết cho một địa chỉ ví
     *
     * @param payer - Người trả phí giao dịch (dạng Keypair)
     * @param owner - Chủ sở hữu tài khoản token
     * @param allowOwnerOffCurve - Cho phép chủ sở hữu nằm ngoài đường cong (mặc định: false)
     * @param commitment - Mức cam kết xác nhận giao dịch (mặc định: "confirmed")
     * @param options - Các tùy chọn giao dịch
     * @returns Thông tin tài khoản token đã tạo hoặc hiện có
     */
    getOrCreateTokenAccount(payer: Signer, owner: PublicKey, allowOwnerOffCurve?: boolean, commitment?: Commitment, options?: any): Promise<Account>;
}
