import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  createTransferCheckedWithFeeInstruction,
  createWithdrawWithheldTokensFromAccountsInstruction,
  createWithdrawWithheldTokensFromMintInstruction,
  createHarvestWithheldTokensToMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  getTransferFeeAmount,
} from "@solana/spl-token";
import { Token } from "../../core/token";
import { TransferFeeConfig } from "../../types";

export class TransferFeeToken extends Token {
  private config: TransferFeeConfig;

  constructor(
    connection: Connection,
    mint: PublicKey,
    config: TransferFeeConfig
  ) {
    super(connection, mint);
    this.config = config;
  }

  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      transferFeeConfig: {
        feeBasisPoints: number;
        maxFee: bigint;
        transferFeeConfigAuthority: Keypair;
        withdrawWithheldAuthority: Keypair;
      };
    }
  ): Promise<TransferFeeToken> {
    const mintKeypair = Keypair.generate();
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeTransferFeeConfigInstruction(
        mintKeypair.publicKey,
        params.transferFeeConfig.transferFeeConfigAuthority.publicKey,
        params.transferFeeConfig.withdrawWithheldAuthority.publicKey,
        params.transferFeeConfig.feeBasisPoints,
        params.transferFeeConfig.maxFee,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        params.decimals,
        params.mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [
      payer,
      mintKeypair,
    ]);

    return new TransferFeeToken(connection, mintKeypair.publicKey, {
      feeBasisPoints: params.transferFeeConfig.feeBasisPoints,
      maxFee: params.transferFeeConfig.maxFee,
      transferFeeConfigAuthority: params.transferFeeConfig.transferFeeConfigAuthority,
      withdrawWithheldAuthority: params.transferFeeConfig.withdrawWithheldAuthority,
    });
  }

  calculateFee(amount: bigint): bigint {
    const fee = (amount * BigInt(this.config.feeBasisPoints)) / BigInt(10000);
    return fee > this.config.maxFee ? this.config.maxFee : fee;
  }

  async transfer(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number
  ): Promise<string> {
    const fee = this.calculateFee(amount);
    return this.transferWithFee(source, destination, owner, amount, decimals, Number(fee));
  }

  async transferWithFee(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number,
    fee: number
  ): Promise<string> {
    const transaction = new Transaction().add(
      createTransferCheckedWithFeeInstruction(
        source,
        this.mint,
        destination,
        owner.publicKey,
        amount,
        decimals,
        BigInt(fee),
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    return sendAndConfirmTransaction(this.connection, transaction, [owner]);
  }

  async harvestWithheldTokensToMint(accounts: PublicKey[]): Promise<string> {
    const transaction = new Transaction().add(
      createHarvestWithheldTokensToMintInstruction(
        this.mint,
        accounts,
        TOKEN_2022_PROGRAM_ID
      )
    );

    return sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.config.withdrawWithheldAuthority]
    );
  }

  async withdrawFeesFromAccounts(
    accounts: PublicKey[],
    destination: PublicKey
  ): Promise<string> {
    const transaction = new Transaction().add(
      createWithdrawWithheldTokensFromAccountsInstruction(
        this.mint,
        destination,
        this.config.withdrawWithheldAuthority.publicKey,
        [],
        accounts,
        TOKEN_2022_PROGRAM_ID
      )
    );

    return sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.config.withdrawWithheldAuthority]
    );
  }

  async withdrawFeesFromMint(destination: PublicKey): Promise<string> {
    const transaction = new Transaction().add(
      createWithdrawWithheldTokensFromMintInstruction(
        this.mint,
        destination,
        this.config.withdrawWithheldAuthority.publicKey,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    return sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.config.withdrawWithheldAuthority]
    );
  }

  async createAccountAndMintTo(
    owner: PublicKey,
    payer: Keypair,
    amount: bigint,
    mintAuthority: Keypair
  ): Promise<PublicKey> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const transaction = new Transaction();
    
    try {
      await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
    } catch (error) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          tokenAccount,
          owner,
          this.mint,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    const mintInstruction = createMintToInstruction(
      this.mint,
      tokenAccount,
      mintAuthority.publicKey,
      amount,
      [],
      TOKEN_2022_PROGRAM_ID
    );

    transaction.add(mintInstruction);

    await sendAndConfirmTransaction(this.connection, transaction, [payer, mintAuthority]);
    
    return tokenAccount;
  }

  async findAccountsWithWithheldFees(): Promise<PublicKey[]> {
    const accounts = await this.connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: this.mint.toString(),
          },
        },
      ],
    });

    const accountsWithFees: PublicKey[] = [];

    for (const { pubkey } of accounts) {
      try {
        const tokenAccount = await getAccount(this.connection, pubkey, "confirmed", TOKEN_2022_PROGRAM_ID);
        const feeAmount = getTransferFeeAmount(tokenAccount);
        
        if (feeAmount !== null && feeAmount.withheldAmount > 0) {
          accountsWithFees.push(pubkey);
        }
      } catch (error) {
        
      }
    }

    return accountsWithFees;
  }
} 