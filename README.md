# SplitPay

A stage-demo Expo React Native app for Venmo/CashApp-style peer-to-peer payments using Phantom wallet concepts, Solana Devnet, Solana Pay QR codes, and a QR scanner.

## Demo Scope

This project is intentionally barebones and demo-focused. It includes:

- Connect Wallet screen with Phantom-style button and mocked connected address
- Home screen with EUR + SOL Devnet balance placeholder
- Request Money flow with Solana Pay-compatible QR code generation
- Send Money flow with real camera QR scanner via `expo-camera`
- Phantom/Solana Pay transaction attempt hook through `Linking.openURL`
- Mocked success screen so the live demo does not fail because of wallet/network speed
- Split Bill flow with typed friend names and separate QR code per friend
- Mock transaction history
- Clean reusable components

## Install

```bash
npm install
npm start
```

Then press `a` to run on Android, or scan the Expo QR code with Expo Go.

## Important Notes

### Solana Pay

The app builds Solana Pay transfer request URLs in `src/utils/solanaPay.js`:

```txt
solana:<recipient>?amount=<amount>&label=<label>&message=<message>&memo=<memo>
```

The demo recipient wallet is currently the system program placeholder:

```js
11111111111111111111111111111111
```

Replace it with your real Devnet receiving wallet before testing with Phantom.

### Phantom / Devnet

The `openSolanaPayUrl` function attempts to open a Solana Pay URL. For a deeper real integration, replace the mocked wallet connection with Phantom deeplinks or a Solana mobile wallet adapter flow.

### QR Scanner

`SendMoneyScreen.js` uses Expo Camera's `CameraView` and QR barcode scanning. There is also a `Use Demo QR` fallback for stage reliability.

## Suggested 40-hour build/demo plan

1. Run and verify navigation.
2. Replace the demo recipient wallet with your Devnet wallet.
3. Test Request Money QR generation.
4. Scan the QR from another device using Send Money.
5. Try opening the QR with Phantom on Android.
6. Keep mocked success enabled for the stage demo.
7. Polish friend names and transaction examples before presenting.

## Production TODOs

- Real Phantom wallet authorization
- Real wallet public key state
- Devnet network validation
- Transaction signature capture
- Transaction confirmation polling
- Real balance fetching
- Real contact/friend system
- Backend only if needed for users, invoices, or transaction reconciliation
