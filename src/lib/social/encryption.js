
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const encodedKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is missing"
    );
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 key"
    );
  }

  return key;
}

export function encryptToken(plainText) {
  if (typeof plainText !== "string" || !plainText) {
    throw new Error("Token must be a non-empty string");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptToken(encryptedToken) {
  if (typeof encryptedToken !== "string") {
    throw new Error("Invalid encrypted token");
  }

  const parts = encryptedToken.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unsupported encrypted token format");
  }

  const [, ivEncoded, tagEncoded, dataEncoded] = parts;

  const iv = Buffer.from(ivEncoded, "base64");
  const authTag = Buffer.from(tagEncoded, "base64");
  const encrypted = Buffer.from(dataEncoded, "base64");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error("Invalid encrypted token");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
