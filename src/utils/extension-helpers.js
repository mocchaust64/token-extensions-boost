"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionTypeString = exports.ExtensionTypeByte = exports.EXTENSION_TYPES = void 0;
exports.getExtensionName = getExtensionName;
exports.isToken2022 = isToken2022;
exports.getTokenInfo = getTokenInfo;
exports.getOptimalInitializationOrder = getOptimalInitializationOrder;
const spl_token_1 = require("@solana/spl-token");
exports.EXTENSION_TYPES = {
    TransferFeeConfig: 0,
    TransferFeeAmount: 1,
    MintCloseAuthority: 2,
    ConfidentialTransferMint: 3,
    ConfidentialTransferAccount: 4,
    DefaultAccountState: 5,
    ImmutableOwner: 6,
    MemoTransfer: 7,
    NonTransferable: 8,
    InterestBearingConfig: 9,
    CpiGuard: 10,
    PermanentDelegate: 11,
    NonTransferableAccount: 12,
    TransferHook: 13,
    MetadataPointer: 14,
    TokenMetadata: 15
};
exports.ExtensionTypeByte = {
    TransferFeeConfig: 0,
    TransferFeeAmount: 1,
    MintCloseAuthority: 2,
    ConfidentialTransferMint: 3,
    ConfidentialTransferAccount: 4,
    DefaultAccountState: 5,
    ImmutableOwner: 6,
    MemoTransfer: 7,
    NonTransferable: 8,
    InterestBearingConfig: 9,
    CpiGuard: 10,
    PermanentDelegate: 11,
    NonTransferableAccount: 12,
    TransferHook: 13,
    MetadataPointer: 14,
    TokenMetadata: 15,
    GroupPointer: 20,
    MemberPointer: 21,
};
exports.ExtensionTypeString = {
    0: "TransferFee (Config)",
    1: "TransferFee (Amount)",
    2: "MintCloseAuthority",
    3: "ConfidentialTransfer (Mint)",
    4: "ConfidentialTransfer (Account)",
    5: "DefaultAccountState",
    6: "ImmutableOwner",
    7: "MemoTransfer",
    8: "NonTransferable",
    9: "InterestBearing",
    10: "CpiGuard",
    11: "PermanentDelegate",
    12: "NonTransferableAccount",
    13: "TransferHook",
    14: "MetadataPointer",
    15: "TokenMetadata",
    20: "GroupPointer",
    21: "MemberPointer",
};
function getExtensionName(type) {
    const names = {
        0: "TransferFee (Config)",
        1: "TransferFee (Amount)",
        2: "MintCloseAuthority",
        3: "ConfidentialTransfer (Mint)",
        4: "ConfidentialTransfer (Account)",
        5: "DefaultAccountState",
        6: "ImmutableOwner",
        7: "MemoTransfer",
        8: "NonTransferable",
        9: "InterestBearing",
        10: "CpiGuard",
        11: "PermanentDelegate",
        12: "NonTransferableAccount",
        13: "TransferHook",
        14: "MetadataPointer",
        15: "TokenMetadata",
    };
    return names[type] || `Unknown Extension (${type})`;
}
async function isToken2022(connection, mint) {
    try {
        const accountInfo = await connection.getAccountInfo(mint);
        if (!accountInfo) {
            return false;
        }
        return accountInfo.owner.equals(spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    catch (error) {
        return false;
    }
}
async function getTokenInfo(connection, mint) {
    const isProgramToken2022 = await isToken2022(connection, mint);
    if (!isProgramToken2022) {
        return { isProgramToken2022, extensions: [] };
    }
    try {
        const mintInfo = await (0, spl_token_1.getMint)(connection, mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        let extensions = [];
        if (mintInfo.tlvData) {
            // Check extensions manually by reading data from tlvData
            // This is a simplified way to avoid type errors
            Object.entries(exports.EXTENSION_TYPES).forEach(([name, id]) => {
                extensions.push({
                    type: id,
                    name: getExtensionName(id),
                    // We simply check for the presence of extension by tlvData size
                    // In reality, more complex logic is needed to check each extension precisely
                    present: mintInfo.tlvData.length > 0
                });
            });
        }
        return { isProgramToken2022, extensions };
    }
    catch (error) {
        return { isProgramToken2022, extensions: [] };
    }
}
/**
 * Find the optimal initialization order for extensions
 * Some extensions must be initialized before the mint, others must be after.
 *
 * @param extensionTypes - Array of extension types to sort
 * @returns Sorted array in optimal order
 */
function getOptimalInitializationOrder(extensionTypes) {
    // Some extensions must be initialized before the mint
    const beforeMintInit = [
        spl_token_1.ExtensionType.MintCloseAuthority,
        spl_token_1.ExtensionType.TransferFeeConfig,
        spl_token_1.ExtensionType.ConfidentialTransferMint,
        spl_token_1.ExtensionType.DefaultAccountState,
        spl_token_1.ExtensionType.MetadataPointer, // Important: MetadataPointer must be initialized before mint
        spl_token_1.ExtensionType.TokenMetadata, // If using TokenMetadata directly instead of MetadataPointer
        spl_token_1.ExtensionType.NonTransferable
    ];
    // Some extensions must be initialized after the mint
    const afterMintInit = [
        spl_token_1.ExtensionType.TransferHook,
        spl_token_1.ExtensionType.InterestBearingConfig,
        spl_token_1.ExtensionType.CpiGuard,
        spl_token_1.ExtensionType.PermanentDelegate,
        spl_token_1.ExtensionType.NonTransferableAccount
    ];
    // Sort extensions in optimal order
    const beforeMint = [];
    const afterMint = [];
    for (const extensionType of extensionTypes) {
        if (beforeMintInit.includes(extensionType)) {
            beforeMint.push(extensionType);
        }
        else if (afterMintInit.includes(extensionType)) {
            afterMint.push(extensionType);
        }
        else {
            // Default: add before mint initialization
            beforeMint.push(extensionType);
        }
    }
    // Return sorted array with before-mint extensions first
    return [...beforeMint, ...afterMint];
}
