import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Module-level keypair persists across the Phantom redirect within the same app session
let _dappKeyPair = null;

function getDappKeyPair() {
  if (!_dappKeyPair) _dappKeyPair = nacl.box.keyPair();
  return _dappKeyPair;
}

export function buildPhantomConnectUrl() {
  const kp = getDappKeyPair();
  const dappPublicKey = bs58.encode(kp.publicKey);
  const redirectLink = Linking.createURL('onConnect');
  const params = new URLSearchParams({
    app_url: 'https://splitpay.demo',
    dapp_encryption_public_key: dappPublicKey,
    redirect_link: redirectLink,
    cluster: 'devnet',
  });
  return `https://phantom.app/ul/v1/connect?${params.toString()}`;
}

export function decryptPhantomPayload(phantomPublicKeyB58, nonceB58, dataB58) {
  const kp = getDappKeyPair();
  const phantomPk = bs58.decode(phantomPublicKeyB58);
  const nonce = bs58.decode(nonceB58);
  const data = bs58.decode(dataB58);
  const decrypted = nacl.box.open(data, nonce, phantomPk, kp.secretKey);
  if (!decrypted) throw new Error('Decryption failed — keypair mismatch');
  return JSON.parse(new TextDecoder().decode(decrypted));
}

// Generates a random ed25519 public key suitable as a Solana Pay reference key.
// Phantom includes this key as an account in the transaction, letting us poll
// getSignaturesForAddress(referenceKey) to confirm payment without knowing the tx signature.
export function generateReferenceKey() {
  const kp = nacl.sign.keyPair();
  return bs58.encode(kp.publicKey);
}
