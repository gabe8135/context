import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBuffer(keyInput = process.env.CREDENTIALS_ENCRYPTION_KEY) {
  if (!keyInput) throw new Error("CREDENTIALS_ENCRYPTION_KEY não configurada");
  const key = /^[a-f\d]{64}$/i.test(keyInput) ? Buffer.from(keyInput, "hex") : Buffer.from(keyInput, "base64");
  if (key.length !== 32) throw new Error("CREDENTIALS_ENCRYPTION_KEY deve possuir 32 bytes");
  return key;
}

export function isCredentialVaultConfigured() {
  try { keyBuffer(); return true; } catch { return false; }
}

export function encryptCredential(value, keyInput) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuffer(keyInput), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptCredential(payload, keyInput) {
  const [version, iv, tag, encrypted] = String(payload || "").split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Credencial criptografada inválida");
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer(keyInput), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
