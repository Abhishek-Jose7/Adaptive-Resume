import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

export const FORBIDDEN_DEFAULT_SECRETS = new Set([
  "default_resume_maker_development_secret_key_32_bytes",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
]);

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function getCurrentKeyVersion(): number {
  const v = parseInt(process.env.ENCRYPTION_KEY_VERSION || "1", 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET_KEY || process.env.ENCRYPTION_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_SECRET_KEY is required in production and must not be empty."
      );
    }
    if (process.env.NODE_ENV === "test") {
      // In isolated tests, allow an ephemeral test key if not explicitly set
      return deriveKey("test_environment_ephemeral_key_12345678");
    }
    throw new Error(
      "CRITICAL SECURITY CONFIGURATION ERROR: ENCRYPTION_SECRET_KEY must be set in your environment."
    );
  }

  if (isProduction) {
    if (FORBIDDEN_DEFAULT_SECRETS.has(secret) || secret.length < 32) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: Insecure or default ENCRYPTION_SECRET_KEY detected in production. Must be at least 32 bytes and not a known placeholder."
      );
    }
  }

  return deriveKey(secret);
}

/**
 * Returns a map of version numbers to derived keys for historical key rotation
 */
function getPreviousKeysMap(): Map<number, Buffer> {
  const map = new Map<number, Buffer>();
  const raw = process.env.PREVIOUS_ENCRYPTION_SECRETS;
  if (!raw) return map;

  try {
    if (raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        const ver = parseInt(k, 10);
        if (ver > 0 && typeof v === "string" && v.length > 0) {
          map.set(ver, deriveKey(v));
        }
      }
    } else {
      // Format: "1:secret1,2:secret2"
      const pairs = raw.split(",");
      for (const pair of pairs) {
        const [k, v] = pair.split(":");
        if (k && v) {
          const ver = parseInt(k.trim(), 10);
          if (ver > 0 && v.trim().length > 0) {
            map.set(ver, deriveKey(v.trim()));
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to parse PREVIOUS_ENCRYPTION_SECRETS:", err);
  }

  return map;
}

export interface EncryptedPayload {
  ciphertext: string; // Hex string (includes auth tag appended)
  nonce: string; // Hex string of IV
  keyVersion?: number;
}

export class EncryptionService {
  /**
   * Returns current active key version
   */
  static getCurrentKeyVersion(): number {
    return getCurrentKeyVersion();
  }

  /**
   * Encrypts plaintext using AES-256-GCM with a unique 12-byte nonce
   */
  static encrypt(plaintext: string, targetKeyVersion?: number): EncryptedPayload & { keyVersion: number } {
    const activeVersion = targetKeyVersion ?? getCurrentKeyVersion();
    let key: Buffer;

    if (activeVersion === getCurrentKeyVersion()) {
      key = getMasterKey();
    } else {
      const prevKeys = getPreviousKeysMap();
      const found = prevKeys.get(activeVersion);
      if (!found) {
        throw new Error(`Cannot encrypt: Key version ${activeVersion} not found in configuration.`);
      }
      key = found;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      ciphertext: encrypted + ":" + tag,
      nonce: iv.toString("hex"),
      keyVersion: activeVersion,
    };
  }

  /**
   * Encrypts plaintext with an explicitly supplied secret key string
   */
  static encryptWithSecret(plaintext: string, secret: string, keyVersion: number = 1): EncryptedPayload & { keyVersion: number } {
    if (!secret || secret.length < 32) {
      throw new Error("Secret key must be at least 32 characters long for cryptographic safety.");
    }
    if (FORBIDDEN_DEFAULT_SECRETS.has(secret)) {
      throw new Error("Insecure or forbidden default secret key supplied. Must not be a known placeholder.");
    }
    const key = deriveKey(secret);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return {
      ciphertext: encrypted + ":" + tag,
      nonce: iv.toString("hex"),
      keyVersion,
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM and verifies authenticity tag.
   * Gracefully supports historical key versions during rotation.
   */
  static decrypt(payload: EncryptedPayload): string {
    const iv = Buffer.from(payload.nonce, "hex");
    const parts = payload.ciphertext.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid ciphertext format: missing authentication tag");
    }

    const [encHex, tagHex] = parts;
    const tagBuffer = Buffer.from(tagHex, "hex");

    // Collect candidate keys to try, prioritizing payload.keyVersion
    const candidateKeys: Buffer[] = [];
    const prevKeys = getPreviousKeysMap();
    const currentKey = getMasterKey();

    if (payload.keyVersion) {
      if (payload.keyVersion === getCurrentKeyVersion()) {
        candidateKeys.push(currentKey);
      } else if (prevKeys.has(payload.keyVersion)) {
        candidateKeys.push(prevKeys.get(payload.keyVersion)!);
      }
    }

    // Add current key if not already first candidate
    if (!candidateKeys.includes(currentKey)) {
      candidateKeys.push(currentKey);
    }

    // Add remaining historical keys
    for (const key of prevKeys.values()) {
      if (!candidateKeys.includes(key)) {
        candidateKeys.push(key);
      }
    }

    let lastError: any = null;
    for (const key of candidateKeys) {
      try {
        const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(tagBuffer);

        let decrypted = decipher.update(encHex, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } catch (err) {
        lastError = err;
      }
    }

    throw new Error(
      `Decryption failed across all configured key versions: ${lastError?.message || "Authentication tag mismatch"}`
    );
  }

  /**
   * Decrypts with an explicitly supplied secret key string
   */
  static decryptWithSecret(payload: EncryptedPayload, secret: string): string {
    if (!secret || secret.length < 32) {
      throw new Error("Secret key must be at least 32 characters long for cryptographic safety.");
    }
    const key = deriveKey(secret);
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
