import { PublicKey } from '@solana/web3.js';
/**
 * Class cho tính năng Interest-Bearing (hưởng lãi) cho token
 */
export declare class InterestBearingExtension {
    /**
     * Tạo instruction để khởi tạo Interest-Bearing cho mint
     * @param mint - Địa chỉ mint
     * @param rateAuthority - Địa chỉ có quyền thay đổi lãi suất
     * @param rate - Lãi suất (basis points, 10000 = 100%)
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo Interest-Bearing
     */
    static createInitializeInterestBearingMintInstruction(mint: PublicKey, rateAuthority: PublicKey, rate: number, programId?: PublicKey): import("@solana/web3.js").TransactionInstruction;
    /**
     * Tạo instruction để cập nhật lãi suất
     * @param mint - Địa chỉ mint
     * @param rateAuthority - Địa chỉ có quyền thay đổi lãi suất
     * @param rate - Lãi suất mới (basis points, 10000 = 100%)
     * @param programId - Program ID của Token Extension
     * @returns Instruction để cập nhật lãi suất
     */
    static createUpdateRateInterestBearingMintInstruction(mint: PublicKey, rateAuthority: PublicKey, rate: number, programId?: PublicKey): {
        programId: PublicKey;
        keys: {
            pubkey: PublicKey;
            isSigner: boolean;
            isWritable: boolean;
        }[];
        data: Buffer<ArrayBuffer>;
    };
    /**
     * Tính toán số lượng token hiện tại bao gồm lãi
     * @param initialAmount - Số lượng ban đầu
     * @param rate - Lãi suất (basis points, 10000 = 100%)
     * @param timeInSeconds - Thời gian đã trôi qua (giây)
     * @returns Số lượng token hiện tại bao gồm lãi
     */
    static calculateInterest(initialAmount: bigint, rate: number, timeInSeconds: number): bigint;
}
