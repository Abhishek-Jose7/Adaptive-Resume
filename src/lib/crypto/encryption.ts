import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "default_resume_maker_development_secret_key_32_bytes";
  return createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  ciphertext: string; // Hex string (includes auth tag appended)
  nonce: string; // Hex string of IV
}

export class EncryptionService {
  /**
   * Encrypts plaintext using AES-256-GCM with a unique 12-byte nonce
   */
  static encrypt(plaintext: string): EncryptedPayload {
    const key = getMasterKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      ciphertext: encrypted + ":" + tag,
      nonce: iv.toString("hex"),
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM and verifies authenticity tag
   */
  static decrypt(payload: EncryptedPayload): string {
    const key = getMasterKey();
    const iv = Buffer.from(payload.nonce, "hex");
    const parts = payload.ciphertext.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid ciphertext format: missing authentication tag");
    }

    const [encHex, tagHex] = parts;
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Masks sensitive API key (e.g. sk-ant-1234...5678 -> sk-...5678)
   */
  static maskKey(rawKey: string): string {
    if (rawKey.length <= 8) return "••••••••";
    const prefix = rawKey.slice(0, 3);
    const suffix = rawKey.slice(-4);
    return `${prefix}••••${suffix}`;
  }
}
