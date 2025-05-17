import { Connection, Keypair } from '@solana/web3.js';
import{TransferFeeToken,getOrCreateTokenAccount } from 'solana-token-extension-boost';
import * as fs from 'fs';

async function main() {

    const connecttion  =  new Connection("https://api.devnet.solana.com", "confirmed");

    const walletPath = "/Users/tai/.config/solana/id.json";
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);

    const token = await TransferFeeToken.create(
        connecttion,
        payer,
        {

            decimals: 9,
            mintAuthority: payer.publicKey,
            transferFeeConfig: { feeBasisPoints: 100,
                maxFee: BigInt(10_000_000),
                transferFeeConfigAuthority: payer,
                withdrawWithheldAuthority: payer,
            },
        }
    );

    const mintAmout = BigInt(1000_000_000_000);
    const ownerTokenAccount = await token.createAccountAndMintTo(
        payer.publicKey,
        payer,
        mintAmout,
        payer
    )

    const recipient = Keypair.generate();

    const recipientTokenAccount = await getOrCreateTokenAccount(
        connecttion,
        payer,
        token.getMint(),
        recipient.publicKey,
        false,
        undefined,
        undefined,
        token.getProgramId()
    );

    const tranferAmount = BigInt(100_000_000_000);
    
    const transferSignature = await token.transfer(
        ownerTokenAccount,
        recipientTokenAccount.address,
        payer,
        tranferAmount,
        9,


    );

    console.log("Transfer signature:", transferSignature);

    const accountsWithFee = await token.findAccountsWithWithheldFees();
    console.log("Accounts with withheld fees:", accountsWithFee);


    if(accountsWithFee.length >0) {

        const harvestSignature = await token.harvestWithheldTokensToMint(
        accountsWithFee
        );
        console.log("Harvest signature:", harvestSignature);

        const feeRecipientAccount = await getOrCreateTokenAccount(
            connecttion,
            payer,
            token.getMint(),
            recipient.publicKey,
            false,
            undefined,
            undefined,
            token.getProgramId()
            
        );

        console.log("Fee recipient account:", feeRecipientAccount.address.toString());

        try{
            const withdrawSignature = await token.withdrawFeesFromMint(
                feeRecipientAccount.address
            );

            console.log("Withdraw signature:", withdrawSignature);

        } catch (error) {

        }
            
    }

}
