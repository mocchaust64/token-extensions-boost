# Solana Token Extension SDK

A simple SDK for interacting with Token Extensions on Solana, making it easier for developers to create and manage tokens with extended features without dealing with the complex details of the Solana Token Extensions Program.

## Introduction

Solana Token Extensions (Token-2022) introduce a variety of new features to tokens on Solana, making them more flexible and customizable. This SDK is designed to simplify the use of these features, helping developers easily integrate them into their applications.

## Current Features

The SDK currently supports the following Token Extensions:

- **Transfer Fee**: Create tokens with automatic transfer fees  
- **Metadata Pointer**: Store and manage metadata for tokens  
- **Immutable Owner**: Create token accounts with immutable ownership  
- **Confidential Transfer**: Execute confidential token transfers that hide amounts  

## Roadmap

Upcoming Token Extensions planned for development and integration into the SDK:

- **Transfer Hooks**: Enable custom logic execution when tokens are transferred  
- **Permanent Delegation**: Permanently delegate token management authority to another address  
- **Non-transferable**: Create non-transferable tokens (soulbound tokens)  
- **Default Account State**: Set default state for newly created token accounts  
- **Interest-Bearing**: Create tokens that accrue interest over time  
- **Mint Close Authority**: Define authority to close a mint account  
- **Token Groups & Group Pointer**: Group multiple tokens under a shared classification or identity  
- **Member Pointer**: Link individual tokens to a token group via on-chain metadata  
- **CPI Guard**: Protect token operations from cross-program invocation (CPI) attacks  
- **Required Memo**: Require a memo to be included with each token transfer  
- **Close Authority**: Define who can close a specific token account  



## Installation

```bash
npm install solana-token-extension-sdk
