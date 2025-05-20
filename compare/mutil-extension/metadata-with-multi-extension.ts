import { clusterApiUrl, Connection, Keypair, } from '@solana/web3.js';
import * as fs from "fs";
import * as path from "path";
import {TokenBuilder} from "solana-token-extension-boost";
import {getTokenMetadata} from "@solana/spl-token";

async function main () {

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const walletPath = path.join(process.env.HOME! , ".config","solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    
    
    const metadata = {
        name: "OPOS",
        symbol: "OPOS",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    
        additionalMetadata: {
             "trait_type": "Item",
        "value": "Developer Portal"
        }
};
    const tokenBuilder = new TokenBuilder(connection);
    const delegateKeypair = Keypair.generate();
    tokenBuilder
        .setTokenInfo(9, payer.publicKey)
        .addTokenMetadata(
            metadata.name,
            metadata.symbol,
            metadata.uri,
            metadata.additionalMetadata
        )

        // add transfer fee
        .addTransferFee( 
            50,
            BigInt(500000),
            payer.publicKey,
            payer.publicKey
        )
        // add permenant delegate
        .addPermanentDelegate(delegateKeypair.publicKey)

        const {mint} = await tokenBuilder.createToken(payer);

        console.log('token created successfully! mint:', mint.toString());
        console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}
main().then(() => {
    console.log("done");
}).catch((err) => {
    console.error(err);
});