
import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from 'solana-token-extension-boost';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';

async function main() {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPath = path.join(process.env.HOME!,'.config','solana','id.json');
    const secretKeyString = fs.readFileSync(walletPath, {encoding: 'utf8'});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);

    const transferFeeParams = {
        feeBasisPoints: 100, 
        maxFee: BigInt(1000000000000000), 
        transferFeeConfigAuthority: payer.publicKey,
        withdrawWithheldAuthority: payer.publicKey
    }

    const interestRate = 400; 
    const rateAuthority = payer.publicKey;
    const delegateKeypair = Keypair.generate();
    const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addTransferFee(
        transferFeeParams.feeBasisPoints,
        transferFeeParams.maxFee,
        transferFeeParams.transferFeeConfigAuthority,
        transferFeeParams.withdrawWithheldAuthority
    )

    .addInterestBearing(
        interestRate,
        rateAuthority
    )
    .addPermanentDelegate(delegateKeypair.publicKey)

    
 
    const mint = await tokenBuilder.createToken(payer);
    console.log(`Mint address: ${mint.toString()}`);

    const mintTo = BigInt(1000000000000);    
      
    
}


main().catch(err => {
    console.error(err);
    process.exit(1);
  }); 