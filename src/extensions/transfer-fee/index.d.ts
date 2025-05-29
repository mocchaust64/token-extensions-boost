import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
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
     * Generate instructions to create a new TransferFeeToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - transferFeeConfig: Transfer fee configuration
     * @returns Instructions, signers and mint address
     */
    static createInstructions(connection: Connection, payer: PublicKey, params: {
        decimals: number;
        mintAuthority: PublicKey;
        transferFeeConfig: {
            feeBasisPoints: number;
            maxFee: bigint;
            transferFeeConfigAuthority: PublicKey;
            withdrawWithheldAuthority: PublicKey;
        };
    }): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }>;
    /**
     * Calculate transfer fee based on token amount and fee configuration
     *
     * @param amount - Token amount to transfer
     * @returns Calculated fee amount
     */
    calculateFee(amount: bigint): bigint;
    /**
     * Create transfer instruction with automatically calculated fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @returns TransactionInstruction
     */
    createTransferInstruction(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number): TransactionInstruction;
    /**
     * Create transfer instruction with specified fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param fee - Specified fee amount
     * @returns TransactionInstruction
     */
    createTransferWithFeeInstruction(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number, fee: number): TransactionInstruction;
    /**
     * Create instruction to harvest withheld tokens from accounts to the mint
     *
     * @param accounts - List of accounts with withheld fees to harvest
     * @returns Transaction instruction
     */
    createHarvestWithheldTokensToMintInstruction(accounts: PublicKey[]): TransactionInstruction;
    /**
     * Create instruction to withdraw withheld tokens from accounts to a destination account
     *
     * @param accounts - List of accounts with withheld fees to withdraw
     * @param destination - Destination account to receive fees
     * @param authority - Withdraw authority public key
     * @returns Transaction instruction
     */
    createWithdrawFeesFromAccountsInstruction(accounts: PublicKey[], destination: PublicKey, authority: PublicKey): TransactionInstruction;
    /**
     * Create instruction to withdraw withheld tokens from mint to a destination account
     *
     * @param destination - Destination account to receive fees
     * @param authority - Withdraw authority public key
     * @returns Transaction instruction
     */
    createWithdrawFeesFromMintInstruction(destination: PublicKey, authority: PublicKey): TransactionInstruction;
    /**
     * Create instructions to create token account and mint tokens to it
     *
     * @param owner - Token account owner address
     * @param payer - Transaction fee payer public key
     * @param amount - Token amount to mint
     * @param mintAuthority - Mint authority
     * @returns Instructions and token account address
     */
    createAccountAndMintToInstructions(owner: PublicKey, payer: PublicKey, amount: bigint, mintAuthority: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
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
}
