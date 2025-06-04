import { Connection, PublicKey, clusterApiUrl, Transaction } from '@solana/web3.js';
import { TokenFreezeExtension } from '../../src';
import { 
  AccountState,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';

/**
 * Example demonstrating how to use TokenFreezeExtension with wallet adapter
 * 
 * Note: This is sample code for reference, intended to be integrated into a real React/Web
 * application with wallet adapter library (@solana/wallet-adapter-*)
 */

/**
 * Function to freeze a token account with wallet adapter
 */
async function freezeAccountWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState from useWallet() of @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Freezing token account...");
    
    // Use the new method to prepare the transaction
    const transaction = TokenFreezeExtension.prepareFreezeAccountTransaction(
      account,         // Token account to freeze
      mint,            // Mint address of the token
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Get blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Sign transaction with wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Send signed transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Token account has been frozen!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Error freezing token account:", error);
    throw error;
  }
}

/**
 * Function to thaw a token account with wallet adapter
 */
async function thawAccountWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState from useWallet() of @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Thawing token account...");
    
    // Use the new method to prepare the transaction
    const transaction = TokenFreezeExtension.prepareThawAccountTransaction(
      account,         // Token account to thaw
      mint,            // Mint address of the token
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Get blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Sign transaction with wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Send signed transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Token account has been thawed!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Error thawing token account:", error);
    throw error;
  }
}

/**
 * Function to update default account state of token with wallet adapter
 */
async function updateDefaultAccountStateWithWalletAdapter(
  connection: Connection, 
  wallet: any, // WalletContextState from useWallet() of @solana/wallet-adapter-react
  mint: PublicKey,
  accountState: AccountState
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log(`Updating default account state to ${accountState === AccountState.Frozen ? 'Frozen' : 'Initialized'}...`);
    
    // Use the new method to prepare the transaction
    const transaction = TokenFreezeExtension.prepareUpdateDefaultAccountStateTransaction(
      mint,            // Mint address of the token
      accountState,    // New default state
      wallet.publicKey, // Freeze authority
      wallet.publicKey  // Fee payer
    );
    
    // Get blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Sign transaction with wallet adapter
    const signedTx = await wallet.signTransaction(transaction);
    
    // Send signed transaction
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Token default state has been updated!`);
    console.log(`Transaction signature: ${signature}`);
    
    return signature;
  } catch (error) {
    console.error("Error updating token default state:", error);
    throw error;
  }
}

/**
 * Create freeze instruction and build custom transaction
 * Example of how to use individual instruction functions
 */
async function buildCustomFreezeTransaction(
  connection: Connection, 
  wallet: any, // WalletContextState from useWallet() of @solana/wallet-adapter-react
  account: PublicKey,
  mint: PublicKey
) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    console.log("Creating custom freeze instruction...");
    
    // Create individual instruction
    const freezeInstruction = TokenFreezeExtension.createFreezeAccountInstruction(
      account,
      mint,
      wallet.publicKey,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    // Use utility function to create transaction
    const transaction = TokenFreezeExtension.buildTransaction(
      [freezeInstruction],
      wallet.publicKey
    );
    
    // Additional customization can be done here...
    
    return transaction;
  } catch (error) {
    console.error("Error creating custom freeze transaction:", error);
    throw error;
  }
}

/**
 * Sample React component usage (for reference)
 * 
 * This demonstrates how these functions might be used in a React component
 * with wallet adapter. Not meant to be executed directly.
 */
/*
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function TokenFreezeComponent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [tokenAccount, setTokenAccount] = useState<string | null>(null);
  const [mint, setMint] = useState<string | null>(null);
  
  const handleFreeze = async () => {
    if (!tokenAccount || !mint) return;
    
    try {
      const signature = await freezeAccountWithWalletAdapter(
        connection,
        wallet,
        new PublicKey(tokenAccount),
        new PublicKey(mint)
      );
      
      console.log(`Account frozen: ${signature}`);
    } catch (error) {
      console.error("Failed to freeze account:", error);
    }
  };
  
  const handleThaw = async () => {
    if (!tokenAccount || !mint) return;
    
    try {
      const signature = await thawAccountWithWalletAdapter(
        connection,
        wallet,
        new PublicKey(tokenAccount),
        new PublicKey(mint)
      );
      
      console.log(`Account thawed: ${signature}`);
    } catch (error) {
      console.error("Failed to thaw account:", error);
    }
  };
  
  return (
    <div>
      <WalletMultiButton />
      
      <div>
        <input 
          placeholder="Token Account" 
          onChange={e => setTokenAccount(e.target.value)} 
        />
        <input 
          placeholder="Mint Address" 
          onChange={e => setMint(e.target.value)} 
        />
        
        <button onClick={handleFreeze}>Freeze Account</button>
        <button onClick={handleThaw}>Thaw Account</button>
      </div>
    </div>
  );
}
*/

export {
  freezeAccountWithWalletAdapter,
  thawAccountWithWalletAdapter,
  updateDefaultAccountStateWithWalletAdapter,
  buildCustomFreezeTransaction
}; 