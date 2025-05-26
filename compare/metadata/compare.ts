import * as fs from 'fs';
import * as path from 'path';
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js';
import { TokenBuilder } from '../../src/utils/token-builder';

async function main() {
    const connection = new Connection( clusterApiUrl('devnet'), 'confirmed');
    const walletPath = path.join(process.env.HOME!, '.config','solana','id.json');
    const secretKeyString= fs.readFileSync(walletPath, {encoding: 'utf8'});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    const mintAuthority = payer.publicKey;

 const tokenBuilder = new TokenBuilder(connection);
 tokenBuilder
    .setTokenInfo(6, mintAuthority)

    .addTokenMetadata(
        'OOPS',
        'OOPS',
        'https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json',
        {
            'trait_type': 'Item',
            'value': 'Developer Portal',
        }
    )
    .addNonTransferable();
    
    
    const {mint} = await tokenBuilder.createToken(payer);
    console.log(`Mint address: ${mint.toString()}`);
}
main()