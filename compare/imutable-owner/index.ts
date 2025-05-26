import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js';
import{TokenAccount, TokenBuilder} from 'solana-token-extension-boost';

import * as fs from 'fs';
import * as path  from 'path';

async function main() {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPath = path.join(process.env.HOME! , '.config','solana','id.json' );
    const secretKeyString = fs.readFileSync(walletPath, {encoding: 'utf8'});
    const secretkey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretkey);


const metadata = {
    name: 'OPOS',
    symbol: 'OPOS',
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: {
        "trait_type": "Item",
        "value": "Developer Portal"
}
};

const tokenBuilder = new TokenBuilder(connection);


}
main()