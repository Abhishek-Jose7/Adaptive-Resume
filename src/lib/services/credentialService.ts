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
    const { ciphertext, nonce } = EncryptionService.encrypt(trimmedKey);

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
      metadataJson: { provider, last4 },
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
}
