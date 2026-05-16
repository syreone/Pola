# Pola

A peer-to-peer mobile payment app built on Solana. Connect your Phantom wallet, send and request USDC, and split bills with friends — each person gets their own Solana Pay QR code.

Built with Expo (React Native) as a fintech demo showcasing how blockchain technology can solve real-world payment settlement problems.

## Features

- Connect Wallet screen with Phantom deep-link integration
- Home screen with MKD + USDC Devnet balance
- Request Money flow with Solana Pay-compatible QR code generation
- Send Money flow with real camera QR scanner via `expo-camera`
- Phantom/Solana Pay transaction hook through `Linking.openURL`
- Success screen and payment confirmations
- Split Bill flow — enter friend names and a total, each person gets their own QR code
- Active split dashboard to track who has paid and who hasn't
- Real transaction history with transaction details
- Dark / light theme
- Clean reusable component library

## Tech Stack

| | |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Blockchain | Solana Devnet (JSON-RPC) |
| Payments | Solana Pay transfer request spec |
| Wallet | Phantom deep-link integration |
| Crypto primitives | `tweetnacl`, `bs58` |
| QR | `react-native-qrcode-svg` + Expo Camera |
| Exchange rates | open.er-api.com (USD → MKD, 5min cache) |

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo Go](https://expo.dev/go) installed on your phone
- [Phantom wallet](https://phantom.app) on the same phone for live transaction flows

## Run

```bash
npm install
npx expo start --tunnel
```

Scan the QR code displayed in your terminal with Expo Go. Phantom wallet is required on the same device for real transaction testing.

