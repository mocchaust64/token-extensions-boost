import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as web3 from '@solana/web3.js';
import { TransferFeeToken } from '../extensions/transfer-fee';

describe('TransferFeeToken Tests', () => {
  let connection: Connection;
  let payer: Keypair;
  let mintAuthority: Keypair;
  let transferFeeConfigAuthority: Keypair;
  let withdrawWithheldAuthority: Keypair;

  beforeEach(() => {
    connection = new Connection('http://localhost:8899', 'confirmed');
    payer = Keypair.generate();
    mintAuthority = Keypair.generate();
    transferFeeConfigAuthority = Keypair.generate();
    withdrawWithheldAuthority = Keypair.generate();
  });

  test('TransferFeeToken.create initializes with correct parameters', async () => {
    const feeBasisPoints = 100; // 1%
    const maxFee = BigInt(1000000); // Max fee in token base units

    // Mock connection.getMinimumBalanceForRentExemption
    const mockGetMinimumBalanceForRentExemption = jest.fn().mockResolvedValue(10000);
    const mockSendAndConfirmTransaction = jest.fn().mockResolvedValue('transaction-signature');
    
    connection.getMinimumBalanceForRentExemption = mockGetMinimumBalanceForRentExemption;
    // Thay thế sendAndConfirmTransaction trong phạm vi kiểm thử
    jest.spyOn(web3, 'sendAndConfirmTransaction').mockImplementation(mockSendAndConfirmTransaction);

    const token = await TransferFeeToken.create(
      connection,
      payer,
      {
        decimals: 9,
        mintAuthority: mintAuthority.publicKey,
        transferFeeConfig: {
          feeBasisPoints,
          maxFee,
          transferFeeConfigAuthority,
          withdrawWithheldAuthority
        }
      }
    );

    expect(token).toBeInstanceOf(TransferFeeToken);
    expect(mockGetMinimumBalanceForRentExemption).toHaveBeenCalled();
    expect(mockSendAndConfirmTransaction).toHaveBeenCalled();
    
    const config = token.getTransferFeeConfig();
    expect(config.feeBasisPoints).toBe(feeBasisPoints);
    expect(config.maxFee).toBe(maxFee);
  });

  test('calculateFee returns correct fee amount', async () => {
    const feeBasisPoints = 100; // 1%
    const maxFee = BigInt(1000000); // Max fee in token base units
    const transferAmount = BigInt(10000000); // Amount to transfer
    const expectedFee = BigInt(100000); // 1% of 10000000
    
    // Create token instance directly rather than through API
    const token = new TransferFeeToken(
      connection, 
      new PublicKey('11111111111111111111111111111111'), 
      {
        feeBasisPoints,
        maxFee,
        transferFeeConfigAuthority,
        withdrawWithheldAuthority
      }
    );
    
    const calculatedFee = token.calculateFee(transferAmount);
    expect(calculatedFee).toBe(expectedFee);

    // Test max fee limit
    const largeAmount = BigInt(1000000000);
    const cappedFee = token.calculateFee(largeAmount);
    expect(cappedFee).toBe(maxFee); // Fee should be capped at maxFee
  });

  test('withdraw methods require valid authority', async () => {
    // Create token with null authorities
    const token = new TransferFeeToken(
      connection,
      new PublicKey('11111111111111111111111111111111'),
      {
        feeBasisPoints: 100,
        maxFee: BigInt(1000000),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      }
    );

    // Tạo các tham số cho các phương thức
    const accounts = [new PublicKey('11111111111111111111111111111111')];
    const destination = new PublicKey('22222222222222222222222222222222');
    
    // Thử gọi các phương thức mà không có authority
    await expect(token.harvestWithheldTokensToMint(accounts)).rejects.toThrow("Withdrawal authority is required");
    await expect(token.withdrawFeesFromAccounts(accounts, destination)).rejects.toThrow("Withdrawal authority is required");
    await expect(token.withdrawFeesFromMint(destination)).rejects.toThrow("Withdrawal authority is required");

    // Tạo một authority hợp lệ
    const validAuthority = Keypair.generate();
    const mockSendAndConfirmTransaction = jest.fn().mockResolvedValue('transaction-signature');
    jest.spyOn(web3, 'sendAndConfirmTransaction').mockImplementation(mockSendAndConfirmTransaction);

    // Kiểm tra các phương thức chấp nhận authority tùy chọn
    await token.harvestWithheldTokensToMint(accounts, validAuthority);
    expect(mockSendAndConfirmTransaction).toHaveBeenCalledTimes(1);
    
    await token.withdrawFeesFromAccounts(accounts, destination, validAuthority);
    expect(mockSendAndConfirmTransaction).toHaveBeenCalledTimes(2);

    await token.withdrawFeesFromMint(destination, validAuthority);
    expect(mockSendAndConfirmTransaction).toHaveBeenCalledTimes(3);
  });
}); 