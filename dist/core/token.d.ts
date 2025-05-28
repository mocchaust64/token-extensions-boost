import { Connection, PublicKey, Keypair, Signer, TransactionInstruction } from "@solana/web3.js";
export declare class Token {
    protected connection: Connection;
    protected mint: PublicKey;
    constructor(connection: Connection, mint: PublicKey);
    getMint(): PublicKey;
    getConnection(): Connection;
    getProgramId(): PublicKey;
    /**
     * Tạo instruction mint token vào tài khoản
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @returns TransactionInstruction
     */
    createMintToInstruction(destination: PublicKey, authority: PublicKey, amount: bigint): TransactionInstruction;
    /**
     * Mint token vào tài khoản
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
     * @returns Chữ ký của transaction
     */
    mintTo(destination: PublicKey, authority: Signer, amount: bigint, multiSigners?: Signer[]): Promise<string>;
    /**
     * Tạo instruction mint token với kiểm tra decimals
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param decimals - Số decimals của token
     * @returns TransactionInstruction
     */
    createMintToCheckedInstruction(destination: PublicKey, authority: PublicKey, amount: bigint, decimals: number): TransactionInstruction;
    /**
     * Mint token vào tài khoản với kiểm tra decimals
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param decimals - Số decimals của token
     * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
     * @returns Chữ ký của transaction
     */
    mintToChecked(destination: PublicKey, authority: Signer, amount: bigint, decimals: number, multiSigners?: Signer[]): Promise<string>;
    /**
     * Tạo các instructions để tạo tài khoản token và mint token vào tài khoản đó
     *
     * @param owner - Chủ sở hữu tài khoản token
     * @param payer - Payer public key
     * @param amount - Số lượng token cần mint
     * @param mintAuthority - Authority được phép mint token
     * @returns Thông tin về instructions và địa chỉ tài khoản token
     */
    createAccountAndMintToInstructions(owner: PublicKey, payer: PublicKey, amount: bigint, mintAuthority: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
    /**
     * Tạo tài khoản token và mint token vào tài khoản đó
     *
     * @param owner - Chủ sở hữu tài khoản token
     * @param payer - Người trả phí giao dịch
     * @param amount - Số lượng token cần mint
     * @param mintAuthority - Authority được phép mint token
     * @returns Địa chỉ tài khoản token và chữ ký giao dịch
     */
    createAccountAndMintTo(owner: PublicKey, payer: Keypair, amount: bigint, mintAuthority: Signer): Promise<{
        address: PublicKey;
        signature: string;
    }>;
    /**
     * Tạo instruction đốt (burn) một số lượng token từ tài khoản
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu của tài khoản
     * @param amount - Số lượng token cần đốt
     * @param decimals - Số decimals của token
     * @returns TransactionInstruction để đốt token
     */
    createBurnInstruction(account: PublicKey, owner: PublicKey, amount: bigint, decimals: number): TransactionInstruction;
    /**
     * Đốt (burn) một số lượng token từ tài khoản
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu của tài khoản
     * @param amount - Số lượng token cần đốt
     * @returns Chữ ký của transaction
     */
    burnTokens(account: PublicKey, owner: Signer, amount: bigint): Promise<string>;
    /**
     * Đốt (burn) một số lượng token từ tài khoản với kiểm tra decimals
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu của tài khoản
     * @param amount - Số lượng token cần đốt
     * @param decimals - Số decimals của token
     * @returns Chữ ký của transaction
     */
    burnTokensChecked(account: PublicKey, owner: Signer, amount: bigint, decimals: number): Promise<string>;
    /**
     * Tạo instruction chuyển token với kiểm tra decimals
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ tài khoản đích
     * @param owner - Chủ sở hữu tài khoản nguồn
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số decimals của token
     * @returns TransactionInstruction
     */
    createTransferInstruction(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number): TransactionInstruction;
    /**
     * Chuyển token với kiểm tra decimals
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ tài khoản đích
     * @param owner - Chủ sở hữu tài khoản nguồn
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số decimals của token
     * @returns Chữ ký của transaction
     */
    transfer(source: PublicKey, destination: PublicKey, owner: Signer, amount: bigint, decimals: number): Promise<string>;
    /**
     * Tạo hoặc lấy tài khoản token hiện có
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Địa chỉ tài khoản token và chữ ký giao dịch
     */
    createOrGetTokenAccount(payer: Keypair, owner: PublicKey): Promise<{
        address: PublicKey;
        signature: string;
    }>;
}
