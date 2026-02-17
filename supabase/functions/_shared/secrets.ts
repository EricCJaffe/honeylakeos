const LEGACY_PREFIX = "legacy:v0:";
const AES_PREFIX = "enc:v1:";

function assertSecretKey(): string {
  const secretKey = Deno.env.get("INTEGRATION_SECRET_KEY");
  if (!secretKey || secretKey.length < 16) {
    throw new Error("INTEGRATION_SECRET_KEY is missing or too short; set a strong value before using integrations");
  }
  return secretKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(secretKey: string): Promise<CryptoKey> {
  const material = new TextEncoder().encode(secretKey);
  const hash = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function legacyObfuscate(text: string, secretKey: string): string {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secretKey);
  const textBytes = encoder.encode(text);
  const result = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return bytesToBase64(result);
}

function legacyDeobfuscate(encoded: string, secretKey: string): string {
  const keyBytes = new TextEncoder().encode(secretKey);
  const textBytes = base64ToBytes(encoded);
  const result = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(result);
}

async function encryptAesGcm(plaintext: string, secretKey: string): Promise<string> {
  const key = await deriveAesKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plainBytes = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainBytes);
  const payload = {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
  };

  return `${AES_PREFIX}${btoa(JSON.stringify(payload))}`;
}

async function decryptAesGcm(stored: string, secretKey: string): Promise<string> {
  const encodedPayload = stored.slice(AES_PREFIX.length);
  const payloadJson = atob(encodedPayload);
  const payload = JSON.parse(payloadJson) as { iv: string; ciphertext: string };
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const key = await deriveAesKey(secretKey);

  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}

export async function encryptSecretValue(plainText: string): Promise<string> {
  const secretKey = assertSecretKey();
  return encryptAesGcm(plainText, secretKey);
}

export async function decryptSecretValue(stored: string): Promise<string> {
  const secretKey = assertSecretKey();

  if (stored.startsWith(AES_PREFIX)) {
    return decryptAesGcm(stored, secretKey);
  }

  if (stored.startsWith(LEGACY_PREFIX)) {
    return legacyDeobfuscate(stored.slice(LEGACY_PREFIX.length), secretKey);
  }

  // Backward compatibility for rows that only stored raw legacy base64.
  return legacyDeobfuscate(stored, secretKey);
}

export function markLegacySecret(plainText: string): string {
  const secretKey = assertSecretKey();
  return `${LEGACY_PREFIX}${legacyObfuscate(plainText, secretKey)}`;
}
