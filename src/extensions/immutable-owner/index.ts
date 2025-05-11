import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeImmutableOwnerInstruction,
  createInitializeAccountInstruction,
  getAccountLen,
  setAuthority,
  AuthorityType,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from "@solana/spl-token";

export class ImmutableOwnerToken {
  private connection: Connection;
  private mintAddress: PublicKey;

  constructor(connection: Connection, mintAddress: PublicKey) {
    this.connection = connection;
    this.mintAddress = mintAddress;
  }

  async createTokenAccountWithImmutableOwner(
    payer: Keypair,
    owner: PublicKey,
    tokenAccountKeypair: Keypair
  ): Promise<string> {
    const tokenAccount = tokenAccountKeypair.publicKey;
    
    const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
    
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccount,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      
      createInitializeImmutableOwnerInstruction(
        tokenAccount,
        TOKEN_2022_PROGRAM_ID
      ),
      
      createInitializeAccountInstruction(
        tokenAccount,
        this.mintAddress,
        owner,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, tokenAccountKeypair]
    );
  }
  
  async createAssociatedTokenAccountWithImmutableOwner(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ signature: string, tokenAccount: PublicKey }> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.mintAddress,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    try {
      await getAccount(this.connection, tokenAccount);
      return { signature: "", tokenAccount };
    } catch (error) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          tokenAccount,
          owner,
          this.mintAddress,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer]
      );
      
      return { signature, tokenAccount };
    }
  }
  
  async hasImmutableOwner(tokenAccount: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(tokenAccount);
      if (!accountInfo) {
        throw new Error("Account not found");
      }
      
      try {
        await setAuthority(
          this.connection,
          new Keypair(),
          tokenAccount,
          new PublicKey("11111111111111111111111111111111"),
          AuthorityType.AccountOwner,
          new PublicKey("11111111111111111111111111111111"),
          [],
          { skipPreflight: true },
          TOKEN_2022_PROGRAM_ID
        );
        return false;
      } catch (error: any) {
        const errorMessage = error.toString();
        return errorMessage.includes("0x22") ||
              errorMessage.includes("owner authority cannot be changed");
      }
    } catch (error) {
      console.error("Error checking immutable owner:", error);
      return false;
    }
  }
}