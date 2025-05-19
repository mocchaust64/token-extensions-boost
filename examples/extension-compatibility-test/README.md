# Extension Compatibility Test

This directory contains a test script to check compatibility between different Token 2022 extensions. The test creates tokens with various extension combinations to determine which combinations work together.

## Purpose

Different Token 2022 extensions may or may not be compatible with each other. This test helps developers understand:
- Which extension combinations are compatible
- Which combinations are not compatible and why
- How to properly build tokens with multiple extensions

## How to Run the Test

```bash
# Install dependencies
npm install

# Run the test
npx ts-node test-extension-compatibility.ts
```

## Test Overview

The test script:
1. Checks theoretical compatibility based on known constraints
2. Attempts to create tokens with different extension pairs
3. Reports success or failure for each combination
4. Provides explanation for incompatible pairs

## Extension Pairs Tested

The script tests the following extension combinations:
- NonTransferable + PermanentDelegate
- TransferFee + PermanentDelegate
- TransferFee + TransferHook
- MetadataPointer + PermanentDelegate
- NonTransferable + MetadataPointer

## Known Incompatibilities

Based on the Token 2022 program design:

1. **NonTransferable** is not compatible with:
   - TransferFee
   - TransferHook

2. **ConfidentialTransfer** is not compatible with:
   - TransferFee
   - TransferHook
   - PermanentDelegate

## Using This Test

Developers can:
1. Run this test to understand extension compatibility
2. Use the test results to guide token design decisions
3. Modify the script to test additional extension combinations
4. Reference the compatibility matrix when building multi-extension tokens

## Result Interpretation

- ✅ Compatible: The extension combination works successfully
- ❌ Not compatible: The extension combination fails, with error message provided 