import { Connection, Keypair, PublicKey, sendAndConfirmTransaction as sendAndConfirmTransactionOriginal } from "@solana/web3.js";
import { TransferFeeToken } from "./index";
import * as splToken from "@solana/spl-token";

jest.mock("@solana/web3.js", () => {
  const original = jest.requireActual("@solana/web3.js");
  return {
    ...original,
    sendAndConfirmTransaction: jest.fn().mockResolvedValue("mock-signature")
  };
});

jest.mock("@solana/spl-token", () => {
  const original = jest.requireActual("@solana/spl-token");
  return {
    ...original,
    getAssociatedTokenAddress: jest.fn().mockResolvedValue(new PublicKey("11111111111111111111111111111111")),
    getAccount: jest.fn().mockResolvedValue({}),
    getTransferFeeAmount: jest.fn().mockReturnValue({
      withheldAmount: BigInt(1)
    })
  };
});

describe("TransferFeeToken", () => {
  const connection = new Connection("https://api.devnet.solana.com");
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const transferFeeConfigAuthority = Keypair.generate();
  const withdrawWithheldAuthority = Keypair.generate();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it("should create a token with transfer fee", async () => {
    const token = await TransferFeeToken.create(
      connection,
      payer,
      {
        decimals: 9,
        mintAuthority: mintAuthority.publicKey,
        transferFeeConfig: {
          feeBasisPoints: 100, // 1%
          maxFee: BigInt(1000000000), // 1 token
          transferFeeConfigAuthority,
          withdrawWithheldAuthority,
        },
      }
    );

    expect(token.getMint()).toBeDefined();
    expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
  });

  it("should calculate fee correctly", async () => {
    const token = new TransferFeeToken(
      connection,
      Keypair.generate().publicKey,
      {
        feeBasisPoints: 100, // 1%
        maxFee: BigInt(1000000000), // 1 token
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
      }
    );

    // 1% of 10 tokens = 0.1 tokens
    const amount = BigInt(10000000000); // 10 tokens with 9 decimals
    const expectedFee = BigInt(100000000); // 0.1 token
    expect(token.calculateFee(amount)).toEqual(expectedFee);

    // Test max fee cap
    const largeAmount = BigInt(1000000000000); // 1000 tokens
    const expectedMaxFee = BigInt(1000000000); // Max fee is 1 token
    expect(token.calculateFee(largeAmount)).toEqual(expectedMaxFee);
  });

  it("should get connection and program ID correctly", () => {
    const token = new TransferFeeToken(
      connection,
      Keypair.generate().publicKey,
      {
        feeBasisPoints: 100,
        maxFee: BigInt(1000000000),
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
      }
    );

    expect(token.getConnection()).toBe(connection);
    expect(token.getProgramId()).toBeDefined();
  });

  it("should transfer tokens with fee", async () => {
    const token = new TransferFeeToken(
      connection,
      Keypair.generate().publicKey,
      {
        feeBasisPoints: 200, // 2%
        maxFee: BigInt(5000000000), // 5 tokens
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
      }
    );

    const source = Keypair.generate().publicKey;
    const destination = Keypair.generate().publicKey;
    const owner = Keypair.generate();
    const amount = BigInt(10000000000); // 10 tokens with 9 decimals
    const decimals = 9;

    const signature = await token.transfer(source, destination, owner, amount, decimals);
    
    expect(signature).toBe("mock-signature");
    expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
  });

  it("should create account and mint tokens", async () => {
    const token = new TransferFeeToken(
      connection,
      Keypair.generate().publicKey,
      {
        feeBasisPoints: 100,
        maxFee: BigInt(1000000000),
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
      }
    );

    const owner = Keypair.generate().publicKey;
    const amount = BigInt(5000000000); // 5 tokens

    const tokenAccount = await token.createAccountAndMintTo(owner, payer, amount, mintAuthority);
    
    expect(tokenAccount).toBeDefined();
    expect(splToken.getAssociatedTokenAddress).toHaveBeenCalled();
    expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
  });

  // Test các chức năng quản lý phí
  describe("Fee management functions", () => {
    let token: TransferFeeToken;
    
    beforeEach(() => {
      token = new TransferFeeToken(
        connection,
        Keypair.generate().publicKey,
        {
          feeBasisPoints: 100,
          maxFee: BigInt(1000000000),
          transferFeeConfigAuthority,
          withdrawWithheldAuthority,
        }
      );
    });
    
    it("should harvest withheld tokens to mint", async () => {
      const accounts = [Keypair.generate().publicKey, Keypair.generate().publicKey];
      
      const signature = await token.harvestWithheldTokensToMint(accounts);
      
      expect(signature).toBe("mock-signature");
      expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
    });
    
    it("should withdraw fees from accounts", async () => {
      const accounts = [Keypair.generate().publicKey, Keypair.generate().publicKey];
      const destination = Keypair.generate().publicKey;
      
      const signature = await token.withdrawFeesFromAccounts(accounts, destination);
      
      expect(signature).toBe("mock-signature");
      expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
    });
    
    it("should withdraw fees from mint", async () => {
      const destination = Keypair.generate().publicKey;
      
      const signature = await token.withdrawFeesFromMint(destination);
      
      expect(signature).toBe("mock-signature");
      expect(sendAndConfirmTransactionOriginal).toHaveBeenCalled();
    });

    it("should find accounts with withheld fees", async () => {
      connection.getProgramAccounts = jest.fn().mockResolvedValue([
        {
          pubkey: new PublicKey("11111111111111111111111111111111"),
          account: {}
        }
      ]);
      
      const accounts = await token.findAccountsWithWithheldFees();
      
      expect(accounts.length).toBe(1);
      expect(accounts[0].toString()).toBe("11111111111111111111111111111111");
      expect(splToken.getAccount).toHaveBeenCalled();
      expect(splToken.getTransferFeeAmount).toHaveBeenCalled();
    });
  });
}); 