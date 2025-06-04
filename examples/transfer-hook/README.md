# Transfer Hook Example

This directory contains examples of how to use the Transfer Hook Extension with SPL Token-2022.

## Overview

The Transfer Hook extension allows token creators to execute custom code whenever tokens are transferred. This enables advanced functionality like complex fee structures, whitelist verification, compliance checks, and other custom behaviors.

## Examples

### 1. Basic (index.ts)

A basic example of how to create and use a token with the TransferHook extension. This example includes:

- Creating a token with a Transfer Hook program
- Creating token accounts for the owner and recipient
- Attempting to transfer tokens (which will fail since the example uses a dummy hook program)
- Creating a token with both Transfer Hook and Metadata extensions

To run:
```bash
npx ts-node examples/transfer-hook/index.ts
```

## Key Features

TransferHookToken provides the following methods:

- `createTokenInstructions()` - Get instructions to create a token with the TransferHook extension
- `createTransferInstruction()` - Create instruction to transfer tokens with the hook execution
- `createTransferInstructionWithExtraAccounts()` - Create transfer instruction with additional accounts for the hook
- `getTransferHookProgramId()` - Get the program ID of the hook assigned to the token

## Important Note

To fully use the Transfer Hook extension, you need to:

1. **Develop and deploy your own Transfer Hook program** that implements the required interface
2. **Initialize the extra account meta list** if your program needs additional accounts
3. Use the program ID of your deployed program when creating tokens

The example in this directory uses a dummy program ID for demonstration purposes only.

## Documentation

For detailed documentation on the TransferHook extension, see:
- [TransferHook Extension Guide](../../docs/transfer-hook.md)

## Requirements

- Solana CLI Tools
- Node.js and npm/yarn
- Sufficient SOL in your wallet (minimum 1 SOL) to perform transactions 