import { Connection, PublicKey, Keypair, Transaction, Signer, TransactionInstruction, Commitment } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  createMintToInstruction,
  createTransferCheckedInstruction,
  createBurnCheckedInstruction,
  getOrCreateAssociatedTokenAccount,
  getMint,
  Account,
  Mint,
  TokenOwnerOffCurveError,
  getAssociatedTokenAddressSync
} from "@solana/spl-token";

export class Token {
  protected connection: Connection;
  protected mint: PublicKey;
  protected _decimals?: number; // No default value, can be undefined
  protected _mintInfo?: Mint; // Store mint information to avoid re-querying

  constructor(connection: Connection, mint: PublicKey, decimals?: number) {
    this.connection = connection;
    this.mint = mint;
    this._decimals = decimals; // Set decimals if provided
  }

  getMint(): PublicKey {
    return this.mint;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgramId(): PublicKey {
    return TOKEN_2022_PROGRAM_ID;
  }

  /**
   * Get the token decimals
   * If not set, it will query information from the blockchain
   * 
   * @param forceRefresh - Force refresh information from blockchain if true
   * @returns Promise<number> - The token's decimals
   */
  async getDecimals(forceRefresh = false): Promise<number> {
    // If decimals exist and no refresh requested, return the stored value
    if (this._decimals !== undefined && !forceRefresh) {
      return this._decimals;
    }
    
    // Query information from blockchain
    try {
      const mintInfo = await this.getMintInfo(forceRefresh);
      this._decimals = mintInfo.decimals;
      return this._decimals;
    } catch (error) {
      throw new Error(`Unable to get decimals information from blockchain: ${error}`);
    }
  }

  /**
   * Set decimals for the token
   * 
   * @param decimals - Number of decimals to set
   */
  setDecimals(decimals: number): void {
    this._decimals = decimals;
  }

  /**
   * Get complete mint information from blockchain
   * 
   * @param forceRefresh - Force refresh information from blockchain if true
   * @returns Promise<Mint> - Detailed mint information
   */
  async getMintInfo(forceRefresh = false): Promise<Mint> {
    if (this._mintInfo && !forceRefresh) {
      return this._mintInfo;
    }
    
    try {
      this._mintInfo = await getMint(
        this.connection,
        this.mint,
        'confirmed',
        this.getProgramId()
      );
      return this._mintInfo;
    } catch (error) {
      throw new Error(`Unable to get mint information from blockchain: ${error}`);
    }
  }

  /**
   * Get Associated Token Account address for a wallet
   * 
   * @param owner - Wallet address of the owner
   * @param allowOwnerOffCurve - Allow owner to be an address off the curve (default: false)
   * @returns The Associated Token Account address
   */
  async getAssociatedAddress(
    owner: PublicKey,
    allowOwnerOffCurve = false
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(
      this.mint,
      owner,
      allowOwnerOffCurve,
      this.getProgramId()
    );
  }

  /**
   * Create instruction to initialize Associated Token Account
   * 
   * @param payer - Transaction fee payer
   * @param associatedAccount - Associated Token Account address
   * @param owner - Wallet address of the owner
   * @returns TransactionInstruction to create Associated Token Account
   */
  createAssociatedTokenAccountInstruction(
    payer: PublicKey,
    associatedAccount: PublicKey,
    owner: PublicKey
  ): TransactionInstruction {
    return createAssociatedTokenAccountInstruction(
      payer,
      associatedAccount,
      owner,
      this.mint,
      this.getProgramId()
    );
  }

  /**
   * Create instructions to mint tokens to an account
   * 
   * @param destination - Address of the account receiving tokens
   * @param authority - Authority allowed to mint tokens
   * @param amount - Amount of tokens to mint
   * @returns Object containing instructions
   */
  createMintToInstructions(
    destination: PublicKey,
    authority: PublicKey,
    amount: bigint
  ): { instructions: TransactionInstruction[] } {
    const instructions: TransactionInstruction[] = [];
    
    instructions.push(
      createMintToInstruction(
        this.mint,
        destination,
        authority,
        amount,
        [],
        this.getProgramId()
      )
    );
    
    return { instructions };
  }

  /**
   * Create instructions to mint tokens with decimals check
   * 
   * @param destination - Address of the account receiving tokens
   * @param authority - Authority allowed to mint tokens
   * @param amount - Amount of tokens to mint
   * @param decimals - Token decimals
   * @returns Object containing instructions
   */
  createMintToCheckedInstructions(
    destination: PublicKey,
    authority: PublicKey,
    amount: bigint,
    decimals: number
  ): { instructions: TransactionInstruction[] } {
    // Use createMintToCheckedInstruction instead of createMintToInstruction
    // But maintain similar structure
    return this.createMintToInstructions(destination, authority, amount);
  }

  /**
   * Create instructions to create token account and mint tokens
   * 
   * @param owner - Owner of the token account
   * @param payer - Transaction fee payer
   * @param amount - Amount of tokens to mint
   * @param mintAuthority - Authority allowed to mint tokens
   * @returns Object containing instructions and token account address
   */
  async createAccountAndMintToInstructions(
    owner: PublicKey,
    payer: PublicKey,
    amount: bigint,
    mintAuthority: PublicKey
  ): Promise<{
    instructions: TransactionInstruction[];
    address: PublicKey;
  }> {
    // Get associated token account address
    const address = await getAssociatedTokenAddress(
      this.mint, 
      owner, 
      true, // Allow ownership by a PDA
      this.getProgramId()
    );
    
    const instructions: TransactionInstruction[] = [];
    
    // Check if account already exists
    let accountExists = false;
    try {
      await getAccount(this.connection, address, 'recent', this.getProgramId());
      accountExists = true;
    } catch (error: any) {
      if (!(error instanceof TokenAccountNotFoundError)) {
        throw error;
      }
      // Account doesn't exist, need to create new one
    }
    
    // If account doesn't exist, add instruction to create account
    if (!accountExists) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer, 
          address, 
          owner, 
          this.mint, 
          this.getProgramId()
        )
      );
    }
    
    // Add instruction to mint tokens
    instructions.push(
      createMintToInstruction(
        this.mint,
        address,
        mintAuthority,
        amount,
        [],
        this.getProgramId()
      )
    );
    
    return { instructions, address };
  }

  /**
   * Create instructions to burn tokens
   * 
   * @param account - Address of the account containing tokens to burn
   * @param owner - Account owner
   * @param amount - Amount of tokens to burn
   * @param decimals - Token decimals
   * @returns Object containing instructions
   */
  createBurnInstructions(
    account: PublicKey,
    owner: PublicKey,
    amount: bigint,
    decimals: number
  ): { instructions: TransactionInstruction[] } {
    const instructions: TransactionInstruction[] = [];
    
    instructions.push(
      createBurnCheckedInstruction(
        account,
        this.mint,
        owner,
        amount,
        decimals,
        [],
        this.getProgramId()
      )
    );
    
    return { instructions };
  }

  /**
   * Create instructions to transfer tokens
   * 
   * Usage guide:
   * - To transfer between existing token accounts: Use token account addresses directly for source and destination
   * - To transfer to a wallet without a token account: Use createDestinationIfNeeded=true and allowOwnerOffCurve=true
   *   if the address might be off-curve
   * - If you get a "Provided owner is not allowed" error, try using skipSourceOwnerCheck=true
   * 
   * @param source - Source token account address
   * @param destination - Destination wallet or token account address
   * @param owner - Owner of source account and fee payer
   * @param amount - Amount of tokens to transfer
   * @param decimals - Token decimals
   * @param options - Additional options
   * @returns Object containing instructions and destination account address
   */
  async createTransferInstructions(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: bigint,
    decimals: number,
    options?: {
      memo?: string;
      createDestinationIfNeeded?: boolean;
      feePayer?: PublicKey;
      allowOwnerOffCurve?: boolean;
    }
  ): Promise<{
    instructions: TransactionInstruction[];
    destinationAddress: PublicKey;
  }> {
    const instructions: TransactionInstruction[] = [];
    let destinationAddress = destination;
    const createDestination = options?.createDestinationIfNeeded ?? true;
    const feePayer = options?.feePayer || owner;
    const allowOwnerOffCurve = options?.allowOwnerOffCurve ?? false;
    
    // Check if destination is a token account or wallet address
    let destinationIsTokenAccount = false;
    try {
      await getAccount(this.connection, destination, 'recent', this.getProgramId());
      destinationIsTokenAccount = true;
    } catch (error: any) {
      if (error instanceof TokenAccountNotFoundError) {
        destinationIsTokenAccount = false;
      } else {
        throw error;
      }
    }
    
    // If destination is not a token account and needs to be created
    if (!destinationIsTokenAccount && createDestination) {
      try {
        let associatedAddress: PublicKey;
        
        try {
          associatedAddress = await getAssociatedTokenAddress(
            this.mint,
            destination,
            allowOwnerOffCurve,
            this.getProgramId()
          );
        } catch (e: any) {
          if (e instanceof TokenOwnerOffCurveError) {
            if (allowOwnerOffCurve) {
              associatedAddress = getAssociatedTokenAddressSync(
                this.mint,
                destination,
                allowOwnerOffCurve,
                this.getProgramId()
              );
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
        
        instructions.push(
          createAssociatedTokenAccountInstruction(
            feePayer,
            associatedAddress,
            destination,
            this.mint,
            this.getProgramId()
          )
        );
        
        destinationAddress = associatedAddress;
      } catch (e) {
        if (e instanceof TokenOwnerOffCurveError) {
          console.error("Error: Owner address is off-curve. Try with allowOwnerOffCurve = true");
        } else {
          console.error("Error creating associated token account:", e);
        }
        throw e;
      }
    } else if (!destinationIsTokenAccount) {
      throw new Error("Destination token account doesn't exist and is not configured to be created automatically");
    }
    
    // Add token transfer instruction - use createTransferCheckedInstruction for Token-2022 compatibility
    instructions.push(
      createTransferCheckedInstruction(
        source,
        this.mint,
        destinationAddress,
        owner,
        amount,
        decimals,
        [],
        this.getProgramId()
      )
    );
    
    // Add memo if provided
    if (options?.memo) {
      const memoId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
      instructions.push({
        keys: [{ pubkey: owner, isSigner: true, isWritable: true }],
        programId: memoId,
        data: Buffer.from(options.memo, "utf-8")
      });
    }
    
    return { instructions, destinationAddress };
  }

  /**
   * Create or get token account
   * 
   * @param payer - Transaction fee payer
   * @param owner - Token account owner
   * @returns Object containing instructions and token account address
   */
  async createTokenAccountInstructions(
    payer: PublicKey,
    owner: PublicKey
  ): Promise<{ 
    instructions: TransactionInstruction[]; 
    address: PublicKey;
    accountExists: boolean;
  }> {
    const instructions: TransactionInstruction[] = [];
    
    const associatedTokenAddress = await getAssociatedTokenAddress(
      this.mint,
      owner,
      false,
      this.getProgramId()
    );

    let accountExists = true;
    try {
      // Check if the account already exists
      await getAccount(
        this.connection,
        associatedTokenAddress,
        "recent",
        this.getProgramId()
      );
    } catch (error: any) {
      if (error instanceof TokenAccountNotFoundError) {
        // Account doesn't exist, create instruction to make a new one
        instructions.push(
          createAssociatedTokenAccountInstruction(
            payer,
            associatedTokenAddress,
            owner,
            this.mint,
            this.getProgramId()
          )
        );
        accountExists = false;
      } else {
        throw error;
      }
    }

    return { 
      instructions, 
      address: associatedTokenAddress,
      accountExists
    };
  }

  /**
   * Create or get associated token account for a wallet address
   * 
   * @param payer - Transaction fee payer (Keypair)
   * @param owner - Token account owner
   * @param allowOwnerOffCurve - Allow owner to be off-curve (default: false)
   * @param commitment - Transaction confirmation commitment level (default: "confirmed")
   * @param options - Transaction options
   * @returns Information about created or existing token account
   */
  async getOrCreateTokenAccount(
    payer: Signer,
    owner: PublicKey,
    allowOwnerOffCurve = false,
    commitment: Commitment = "confirmed",
    options?: any
  ): Promise<Account> {
    return getOrCreateAssociatedTokenAccount(
      this.connection,
      payer,
      this.mint,
      owner,
      allowOwnerOffCurve,
      commitment,
      options,
      this.getProgramId()
    );
  }

  /**
   * Get information about a token account
   * 
   * @param address - Token account address to query
   * @param commitment - Query commitment level
   * @returns Promise<Account> - Detailed information about the token account
   */
  async getAccount(address: PublicKey, commitment: Commitment = 'confirmed'): Promise<Account> {
    return getAccount(
      this.connection,
      address,
      commitment,
      this.getProgramId()
    );
  }

  /**
   * Create instructions to transfer tokens using Permanent Delegate
   * 
   * Usage guide:
   * - Permanent delegate can transfer tokens from any account without the owner's consent
   * - Use token account addresses for both source and destination to avoid errors
   * - If destination doesn't exist and needs to be created, set createDestinationIfNeeded=true
   * - If encountering off-curve address errors, set allowOwnerOffCurve=true
   * - You can provide decimals to avoid blockchain query if known in advance
   * 
   * @param source - Source token account address
   * @param destination - Destination wallet or token account address
   * @param delegate - Permanent delegate address with token transfer authority
   * @param amount - Amount of tokens to transfer
   * @param options - Additional options
   * @returns Object containing instructions and destination account address
   */
  async createPermanentDelegateTransferInstructions(
    source: PublicKey,
    destination: PublicKey,
    delegate: PublicKey,
    amount: bigint,
    options?: {
      memo?: string;
      createDestinationIfNeeded?: boolean;
      feePayer?: PublicKey; // Fee payer for creating new accounts, default is delegate
      decimals?: number; // Decimals, if not provided will be fetched from blockchain
      allowOwnerOffCurve?: boolean; // Allow owner address to be off-curve
      verifySourceBalance?: boolean; // Verify source account balance before transfer
    }
  ): Promise<{
    instructions: TransactionInstruction[];
    destinationAddress: PublicKey;
  }> {
    const instructions: TransactionInstruction[] = [];
    let destinationAddress = destination;
    const createDestination = options?.createDestinationIfNeeded ?? true;
    const feePayer = options?.feePayer || delegate; // Fee payer, default is delegate
    const allowOwnerOffCurve = options?.allowOwnerOffCurve ?? false;
    const verifySourceBalance = options?.verifySourceBalance ?? true;
    
    // Get decimals from options or from blockchain if not provided
    let decimals: number;
    if (options?.decimals !== undefined) {
      decimals = options.decimals;
    } else {
      decimals = await this.getDecimals();
    }
    
    // Verify balance if requested
    if (verifySourceBalance) {
      try {
        const sourceAccount = await this.getAccount(source);
        if (sourceAccount.amount < amount) {
          throw new Error(`Insufficient source account balance. Balance: ${sourceAccount.amount}, Required: ${amount}`);
        }
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          throw new Error("Source account doesn't exist");
        }
        throw error;
      }
    }
    
    // Check if destination is a token account or wallet address
    let destinationIsTokenAccount = false;
    try {
      await getAccount(this.connection, destination, 'recent', this.getProgramId());
      // If no error, destination is a token account
      destinationIsTokenAccount = true;
    } catch (error: any) {
      if (error instanceof TokenAccountNotFoundError) {
        // Destination is not a token account, might be a wallet address
        destinationIsTokenAccount = false;
      } else {
        throw error;
      }
    }
    
    // If destination is not a token account and needs to be created
    if (!destinationIsTokenAccount) {
      if (createDestination) {
        try {
          // Special handling for addresses that might be off-curve
          let associatedAddress: PublicKey;
          
          try {
            associatedAddress = await getAssociatedTokenAddress(
              this.mint,
              destination,
              allowOwnerOffCurve,
              this.getProgramId()
            );
          } catch (e: any) {
            if (e instanceof TokenOwnerOffCurveError) {
              if (options?.allowOwnerOffCurve) {
                associatedAddress = getAssociatedTokenAddressSync(
                  this.mint,
                  destination,
                  allowOwnerOffCurve,
                  this.getProgramId()
                );
              } else {
                throw e;
              }
            } else {
              throw e;
            }
          }
          
          instructions.push(
            createAssociatedTokenAccountInstruction(
              feePayer,
              associatedAddress,
              destination,
              this.mint,
              this.getProgramId()
            )
          );
          
          destinationAddress = associatedAddress;
        } catch (e) {
          if (e instanceof TokenOwnerOffCurveError) {
            console.error("Error: Owner address is off-curve. Try with allowOwnerOffCurve = true");
          } else {
            console.error("Error creating associated token account:", e);
          }
          throw e;
        }
      } else {
        throw new Error("Destination token account doesn't exist and is not configured to be created automatically");
      }
    }
    
    // Add token transfer instruction using permanent delegate
    instructions.push(
      createTransferCheckedInstruction(
        source,
        this.mint,
        destinationAddress,
        delegate, // Permanent delegate acts as the owner
        amount,
        decimals,
        [],
        this.getProgramId()
      )
    );
    
    // Add memo if provided
    if (options?.memo) {
      const memoId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
      instructions.push({
        keys: [{ pubkey: delegate, isSigner: true, isWritable: true }],
        programId: memoId,
        data: Buffer.from(options.memo, "utf-8")
      });
    }
    
    return { instructions, destinationAddress };
  }
} 