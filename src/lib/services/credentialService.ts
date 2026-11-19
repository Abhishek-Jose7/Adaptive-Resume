import { db } from "../db/client";
import { providerCredentials, auditEvents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { EncryptionService } from "../crypto/encryption";
import { ProviderFactory } from "../ai/providerFactory";

export interface StoredCredentialSummary {
  id: string;
  provider: string;
  last4: string;
  isValid: boolean;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CredentialService {
  /**
   * Lists all provider credentials for user (never returning plain keys)
   */
  static async listCredentials(userId: string): Promise<StoredCredentialSummary[]> {
    const creds = await db
      .select({
        id: providerCredentials.id,
        provider: providerCredentials.provider,
        last4: providerCredentials.last4,
        isValid: providerCredentials.isValid,
        lastTestedAt: providerCredentials.lastTestedAt,
        createdAt: providerCredentials.createdAt,
        updatedAt: providerCredentials.updatedAt,
      })
      .from(providerCredentials)
      .where(eq(providerCredentials.userId, userId));

    return creds;
  }

  /**
   * Stores an encrypted BYOK API key with unique AES-256-GCM nonce
   * PRD Section 7.5 & 11.2
   */
  static async storeCredential(userId: string, provider: string, apiKey: string) {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) throw new Error("API key cannot be empty");

    const last4 = trimmedKey.slice(-4);
    const { ciphertext, nonce, keyVersion } = EncryptionService.encrypt(trimmedKey);

    const id = `cred_${crypto.randomUUID()}`;
    const now = new Date();

    // Upsert on (userId, provider)
    const [stored] = await db
      .insert(providerCredentials)
      .values({
        id,
        userId,
        provider,
        encryptedApiKey: ciphertext,
        keyNonce: nonce,
        keyVersion,
        last4,
        isValid: true,
        lastTestedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [providerCredentials.userId, providerCredentials.provider],
        set: {
          encryptedApiKey: ciphertext,
          keyNonce: nonce,
          keyVersion,
          last4,
          isValid: true,
          lastTestedAt: now,
          updatedAt: now,
        },
      })
      .returning({
        id: providerCredentials.id,
        provider: providerCredentials.provider,
        last4: providerCredentials.last4,
        isValid: providerCredentials.isValid,
        lastTestedAt: providerCredentials.lastTestedAt,
      });

    // Record audit event
    await db.insert(auditEvents).values({
      id: `audit_${crypto.randomUUID()}`,
      userId,
      action: "byok_added",
      resourceType: "provider_credential",
      resourceId: stored.id,
      metadataJson: { provider, last4, keyVersion },
    });

    return stored;
  }

  /**
   * Decrypts and retrieves stored API key for server-side AI execution
   */
  static async getDecryptedKey(userId: string, provider: string): Promise<string | null> {
    const creds = await db
      .select()
      .from(providerCredentials)
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.provider, provider)))
      .limit(1);

    if (creds.length === 0) return null;

    const cred = creds[0];
    return EncryptionService.decrypt({
      ciphertext: cred.encryptedApiKey,
      nonce: cred.keyNonce,
      keyVersion: cred.keyVersion,
    });
  }

  /**
   * Tests credential validity against the respective LLM provider
   */
  static async testCredential(userId: string, id: string): Promise<boolean> {
    const creds = await db
      .select()
      .from(providerCredentials)
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.id, id)))
      .limit(1);

    if (creds.length === 0) throw new Error("Credential not found");
    const cred = creds[0];

    let isValid = false;
    try {
      const apiKey = EncryptionService.decrypt({
        ciphertext: cred.encryptedApiKey,
        nonce: cred.keyNonce,
        keyVersion: cred.keyVersion,
      });

      const provider = ProviderFactory.getProvider(cred.provider, apiKey);
      // Run minimal test prompt
      await provider.generateStructured({
        task: "analyze_jd",
        systemPrompt: "Health check",
        userPayload: { rawText: "Software Engineer with TypeScript skills." },
        schema: {},
        temperature: 0.1,
        maxOutputTokens: 256,
      });
      isValid = true;
    } catch (err) {
      console.warn(`Credential test failed for provider ${cred.provider}:`, err);
      isValid = false;
    }

    const now = new Date();
    await db
      .update(providerCredentials)
      .set({ isValid, lastTestedAt: now, updatedAt: now })
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.id, id)));

    return isValid;
  }

  /**
   * Deletes a credential
   */
  static async deleteCredential(userId: string, id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(providerCredentials)
      .where(and(eq(providerCredentials.userId, userId), eq(providerCredentials.id, id)))
      .returning();

    if (deleted) {
      await db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID()}`,
        userId,
        action: "byok_removed",
        resourceType: "provider_credential",
        resourceId: id,
        metadataJson: { provider: deleted.provider },
      });
    }

    return Boolean(deleted);
  }

  /**
   * Rotates stored BYOK credentials to a new key version with round-trip verification
   * and transactional audit logging.
   */
  static async rotateCredentials(
    targetKeyVersion: number,
    newSecret?: string,
    targetUserId?: string
  ): Promise<{ rotatedCount: number; failureCount: number; errors: string[] }> {
    const query = targetUserId
      ? db.select().from(providerCredentials).where(eq(providerCredentials.userId, targetUserId))
      : db.select().from(providerCredentials);

    const allCreds = await query;
    let rotatedCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const cred of allCreds) {
      if (cred.keyVersion === targetKeyVersion) {
        continue; // Already at target key version
      }

      try {
        // 1. Decrypt existing key using stored keyVersion
        const plaintext = EncryptionService.decrypt({
          ciphertext: cred.encryptedApiKey,
          nonce: cred.keyNonce,
          keyVersion: cred.keyVersion,
        });

        // 2. Re-encrypt with new secret or targetKeyVersion
        const reencrypted = newSecret
          ? EncryptionService.encryptWithSecret(plaintext, newSecret, targetKeyVersion)
          : EncryptionService.encrypt(plaintext, targetKeyVersion);

        // 3. Verify round-trip decryption BEFORE modifying database
        const verifyDecrypted = newSecret
          ? EncryptionService.decryptWithSecret(reencrypted, newSecret)
          : EncryptionService.decrypt(reencrypted);

        if (verifyDecrypted !== plaintext) {
          throw new Error("Integrity check failed: Round-trip decrypted key does not match original plaintext.");
        }

        // 4. Atomically persist update and write audit log
        await db.transaction(async (tx) => {
          await tx
            .update(providerCredentials)
            .set({
              encryptedApiKey: reencrypted.ciphertext,
              keyNonce: reencrypted.nonce,
              keyVersion: targetKeyVersion,
              updatedAt: new Date(),
            })
            .where(eq(providerCredentials.id, cred.id));

          await tx.insert(auditEvents).values({
            id: `audit_${crypto.randomUUID()}`,
            userId: cred.userId,
            action: "byok_key_rotated",
            resourceType: "provider_credential",
            resourceId: cred.id,
            metadataJson: {
              provider: cred.provider,
              oldKeyVersion: cred.keyVersion,
              newKeyVersion: targetKeyVersion,
            },
          });
        });

        rotatedCount++;
      } catch (err: any) {
        failureCount++;
        errors.push(`Failed to rotate credential ${cred.id} (${cred.provider}) for user ${cred.userId}: ${err.message}`);
      }
    }

    return { rotatedCount, failureCount, errors };
  }
}

