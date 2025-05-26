

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { ExtensionType } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from '../../src';

// Extension pairs to test
const extensionPairsToTest = [
  // Pair 1: NonTransferable + PermanentDelegate
  {
    name: "NonTransferable + PermanentDelegate",
    extensions: [ExtensionType.NonTransferable, ExtensionType.PermanentDelegate]
  },
  
  // Pair 2: TransferFee + PermanentDelegate
  {
    name: "TransferFee + PermanentDelegate",
    extensions: [ExtensionType.TransferFeeConfig, ExtensionType.PermanentDelegate]
  },

  // Pair 3: TransferFee + TransferHook
  {
    name: "TransferFee + TransferHook", 
    extensions: [ExtensionType.TransferFeeConfig, ExtensionType.TransferHook]
  },
  
  // Pair 4: MetadataPointer + PermanentDelegate
  {
    name: "MetadataPointer + PermanentDelegate",
    extensions: [ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate]
  },
  
  // Pair 5: NonTransferable + MetadataPointer
  {
    name: "NonTransferable + MetadataPointer",
    extensions: [ExtensionType.NonTransferable, ExtensionType.MetadataPointer]
  }
];


function checkExtensionCompatibility(extensionTypes: ExtensionType[]): {
  isCompatible: boolean;
  reason?: string;
} {
  const incompatiblePairs: [ExtensionType, ExtensionType][] = [];
  
 
  if (extensionTypes.includes(ExtensionType.NonTransferable)) {
    if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig]);
    }
    
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferHook]);
    }
  }
  
  if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
    if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferFeeConfig]);
    }
    
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferHook]);
    }
    
    if (extensionTypes.includes(ExtensionType.PermanentDelegate)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.PermanentDelegate]);
    }
  }
  
  if (incompatiblePairs.length > 0) {
    const reasons = incompatiblePairs.map(([a, b]) => 
      `${ExtensionType[a]} and ${ExtensionType[b]} are incompatible`
    );
    
    return {
      isCompatible: false,
      reason: reasons.join("; ")
    };
  }
  
  return { isCompatible: true };
}

function checkExtensionCompatibilityTest(connection: Connection) {
  console.log("Checking extension compatibility:");
  
  for (const pair of extensionPairsToTest) {
    const result = checkExtensionCompatibility(pair.extensions);
    
    if (result.isCompatible) {
      console.log(`✅ ${pair.name}: Compatible in theory`);
    } else {
      console.log(`❌ ${pair.name}: Not compatible: ${result.reason}`);
    }
  }
}


async function testExtensionPairs() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, '.config', 'solana', 'id.json');
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    payer = Keypair.generate();
    
    const signature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
  }

  const balance = await connection.getBalance(payer.publicKey);
  
  if (balance < 1 * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance to perform test transactions");
    return;
  }

  checkExtensionCompatibilityTest(connection);

  console.log("\nToken creation test results:");

  for (const pair of extensionPairsToTest) {
    try {
      const tokenBuilder = new TokenBuilder(connection);
      tokenBuilder.setTokenInfo(9, payer.publicKey);

      if (pair.extensions.includes(ExtensionType.NonTransferable)) {
        tokenBuilder.addNonTransferable();
      }
      

      if (pair.extensions.includes(ExtensionType.PermanentDelegate)) {
        tokenBuilder.addPermanentDelegate(payer.publicKey);
      }
      

      if (pair.extensions.includes(ExtensionType.TransferFeeConfig)) {
        tokenBuilder.addTransferFee(
          100, // 1%
          BigInt(5_000_000_000), // 5 tokens
          payer.publicKey,
          payer.publicKey
        );
      }
      
 
      if (pair.extensions.includes(ExtensionType.TransferHook)) {
        const hookProgramId = Keypair.generate().publicKey;
        tokenBuilder.addTransferHook(hookProgramId);
      }
      
  
      if (pair.extensions.includes(ExtensionType.MetadataPointer)) {
        tokenBuilder.addTokenMetadata(
          "Test Token",
          "TEST",
          "https://example.com/token.json",
          {
            "description": "A test token for extension compatibility",
            "creator": payer.publicKey.toString()
          }
        );
      }
      
    
      const { mint, token } = await tokenBuilder.createToken(payer);
      
      console.log(`✅ ${pair.name}: Success! Token: ${mint.toString()}`);
    } catch (error: any) {
      console.log(`❌ ${pair.name}: Failed! Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log("=== TOKEN EXTENSION COMPATIBILITY TEST ===\n");
  await testExtensionPairs();
}

main().catch(error => {
  console.error("Error:", error);
  process.exit(1);
}); 