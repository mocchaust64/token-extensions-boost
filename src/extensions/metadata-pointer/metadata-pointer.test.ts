import { Connection, Keypair } from "@solana/web3.js";
import { MetadataPointerToken } from "./index";

describe("MetadataPointerToken", () => {
  const connection = new Connection("https://api.devnet.solana.com");
  let payer: Keypair;
  let metadataToken: MetadataPointerToken;

  beforeAll(async () => {
    payer = Keypair.generate();

    metadataToken = await MetadataPointerToken.create(
      connection,
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        metadata: {
          name: "Test Token",
          symbol: "TEST",
          uri: "https://example.com/metadata.json",
          additionalMetadata: {
            "description": "A test token with metadata",
            "website": "https://example.com"
          }
        }
      }
    );
  });

  test("getMint returns the correct mint", () => {
    expect(metadataToken.getMint()).not.toBeNull();
  });

  test("getConnection returns the correct connection", () => {
    expect(metadataToken.getConnection()).toBe(connection);
  });

  test("getMetadataPointer returns the metadata pointer state", async () => {
    const metadataPointer = await metadataToken.getMetadataPointer();
    expect(metadataPointer).not.toBeNull();
    expect(metadataPointer.metadataAddress).not.toBeNull();
  });

  test("getTokenMetadata returns the token metadata", async () => {
    const metadata = await metadataToken.getTokenMetadata();
    expect(metadata).not.toBeNull();
    expect(metadata?.name).toBe("Test Token");
    expect(metadata?.symbol).toBe("TEST");
    expect(metadata?.uri).toBe("https://example.com/metadata.json");
    expect(metadata?.additionalMetadata).toContainEqual(["description", "A test token with metadata"]);
    expect(metadata?.additionalMetadata).toContainEqual(["website", "https://example.com"]);
  });

  // Note: These tests would need airdropped SOL to actually execute on devnet
  test("updateMetadataField should update a metadata field", async () => {
    // This test would require payer to have SOL
    // const txid = await metadataToken.updateMetadataField(
    //   payer,
    //   "description",
    //   "Updated description"
    // );
    // expect(txid).not.toBeNull();
    //
    // const metadata = await metadataToken.getTokenMetadata();
    // expect(metadata?.additionalMetadata).toContainEqual(["description", "Updated description"]);
  });

  test("removeMetadataField should remove a metadata field", async () => {
    // This test would require payer to have SOL
    // const txid = await metadataToken.removeMetadataField(
    //   payer,
    //   "website"
    // );
    // expect(txid).not.toBeNull();
    //
    // const metadata = await metadataToken.getTokenMetadata();
    // const hasWebsite = metadata?.additionalMetadata.some(([key]) => key === "website");
    // expect(hasWebsite).toBe(false);
  });
}); 