import { Connection, Keypair, PublicKey, Signer } from "@solana/web3.js";
import { Token } from "../../core/token";
import { TransferFeeConfig } from "../../types";
/**
 * TransferFeeToken - Extension for Token with transfer fee functionality
 *
 * This extension allows automatic fee collection when transferring tokens,
 * with configurable fee rate and maximum fee amount.
 */
export declare class TransferFeeToken extends Token {
    private config;
    constructor(connection: Connection, mint: PublicKey, config: TransferFeeConfig);
    /**
     * Create a new TransferFeeToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Transaction fee payer keypair
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - transferFeeConfig: Transfer fee configuration
     * @returns Newly created TransferFeeToken object
     */
    static create(connection: Connection, payer: Keypair, params: {
        decimals: number;
        mintAuthority: PublicKey;
        transferFeeConfig: {
            feeBasisPoints: number;
            maxFee: bigint;
            transferFeeConfigAuthority: Keypair;
            withdrawWithheldAuthority: Keypair;
        };
    }): Promise<TransferFeeToken>;
    /**
     * Calculate transfer fee based on token amount and fee configuration
     *
     * @param amount - Token amount to transfer
     * @returns Calculated fee amount
     */
    calculateFee(amount: bigint): bigint;
    /**
     * Execute token transfer with automatically calculated fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @returns Transaction signature
     */
    transfer(source: PublicKey, destination: PublicKey, owner: Signer, amount: bigint, decimals: number): Promise<string>;
    /**
     * Execute token transfer with specified fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param fee - Specified fee amount
     * @returns Transaction signature
     */
    transferWithFee(source: PublicKey, destination: PublicKey, owner: Signer, amount: bigint, decimals: number, fee: number): Promise<string>;
    /**
     * Harvest withheld tokens from accounts to the mint
     *
     * @param accounts - List of accounts with withheld fees to harvest
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    harvestWithheldTokensToMint(accounts: PublicKey[], withdrawAuthority?: Keypair): Promise<string>;
    /**
     * Withdraw withheld tokens from accounts to a destination account
     *
     * @param accounts - List of accounts with withheld fees to withdraw
     * @param destination - Destination account to receive fees
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    withdrawFeesFromAccounts(accounts: PublicKey[], destination: PublicKey, withdrawAuthority?: Keypair): Promise<string>;
    /**
     * Withdraw withheld tokens from mint to a destination account
     *
     * @param destination - Destination account to receive fees
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    withdrawFeesFromMint(destination: PublicKey, withdrawAuthority?: Keypair): Promise<string>;
    /**
     * Get the withdraw authority signer
     *
     * @param providedAuthority - Optional withdraw authority to use
     * @returns Withdraw authority keypair or public key
     * @private
     */
    private getWithdrawAuthority;
    /**
     * Create token account and mint tokens to it
     *
     * @param owner - Token account owner address
     * @param payer - Transaction fee payer keypair
     * @param amount - Token amount to mint
     * @param mintAuthority - Mint authority keypair
     * @returns Created token account address
     */
    createAccountAndMintTo(owner: PublicKey, payer: Keypair, amount: bigint, mintAuthority: Keypair): Promise<PublicKey>;
    /**
     * Find all accounts with withheld fees
     *
     * @returns List of public keys for accounts with withheld fees
     */
    findAccountsWithWithheldFees(): Promise<PublicKey[]>;
    /**
     * Get transfer fee configuration
     *
     * @returns TransferFeeConfig object
     */
    getTransferFeeConfig(): TransferFeeConfig;
    /**
     * Lấy thông tin chi tiết về phí chuyển khoản hiện tại và phí đã giữ lại
     *
     * @param tokenAccount - Địa chỉ tài khoản token cần kiểm tra
     * @returns Đối tượng chứa thông tin về phí
     *   - withheldAmount: Số lượng token đã giữ lại làm phí
     *   - hasOlderTransferFee: Cho biết tài khoản có phí từ giao dịch trước đó chưa được rút
     */
    getAccountTransferFeeInfo(tokenAccount: PublicKey): Promise<{
        withheldAmount: bigint;
        hasOlderTransferFee: boolean;
    }>;
    /**
     * Tính tổng số token đã giữ lại làm phí từ nhiều tài khoản
     *
     * @param accounts - Danh sách các địa chỉ tài khoản token
     * @returns Tổng số token đã giữ lại
     */
    getTotalWithheldAmount(accounts: PublicKey[]): Promise<bigint>;
    /**
     * Kiểm tra xem một địa chỉ có phải là withdraw withheld authority của token không
     *
     * @param address - Địa chỉ cần kiểm tra
     * @returns true nếu là withdraw withheld authority, false nếu không phải
     */
    isWithdrawWithheldAuthority(address: PublicKey): Promise<boolean>;
    /**
     * Tạo token account nếu chưa tồn tại hoặc trả về account đã tồn tại
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Đối tượng chứa địa chỉ tài khoản và chữ ký giao dịch
     */
    createOrGetTokenAccount(payer: Keypair, owner: PublicKey): Promise<{
        address: PublicKey;
        signature: string;
    }>;
}
