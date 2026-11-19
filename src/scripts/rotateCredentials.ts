#!/usr/bin/env node
/**
 * BYOK Key Rotation CLI Script
 *
 * Usage:
 *   npx tsx src/scripts/rotateCredentials.ts --target-version 2 [--new-secret "new_32_byte_secret"]
 */
import { CredentialService } from "../lib/services/credentialService";
import { getCurrentKeyVersion, EncryptionService, FORBIDDEN_DEFAULT_SECRETS } from "../lib/crypto/encryption";

async function main() {
  const args = process.argv.slice(2);
  let targetVersion: number | null = null;
  let newSecret: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--target-version" && args[i + 1]) {
      targetVersion = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--new-secret" && args[i + 1]) {
      newSecret = args[i + 1];
      i++;
    }
  }

  if (!targetVersion || targetVersion < 1) {
    console.error("Error: --target-version <number> is required and must be >= 1.");
    console.log("Usage: npx tsx src/scripts/rotateCredentials.ts --target-version 2 [--new-secret <secret>]");
    process.exit(1);
  }

  if (newSecret !== undefined) {
    if (newSecret.length < 32) {
      console.error("Error: --new-secret must be at least 32 characters long for cryptographic safety.");
      process.exit(1);
    }
    if (FORBIDDEN_DEFAULT_SECRETS.has(newSecret)) {
      console.error("Error: Insecure or forbidden default secret key specified. Cannot use known placeholders.");
      process.exit(1);
    }
  }

  // Pre-rotation sanity probe: verify that encryption & decryption works with candidate key
  const probePlaintext = "rotation_preflight_probe_canary_value";
  try {
    const probeEncrypted = newSecret
      ? EncryptionService.encryptWithSecret(probePlaintext, newSecret, targetVersion)
      : EncryptionService.encrypt(probePlaintext, targetVersion);

    const probeDecrypted = newSecret
      ? EncryptionService.decryptWithSecret(probeEncrypted, newSecret)
      : EncryptionService.decrypt(probeEncrypted);

    if (probeDecrypted !== probePlaintext) {
      console.error("Error: Preflight cryptographic verification failed. Decrypted canary did not match.");
      process.exit(1);
    }
  } catch (probeErr: any) {
    console.error(`Error: Preflight key verification failed: ${probeErr.message}`);
    process.exit(1);
  }

  console.log(`Starting BYOK credential rotation...`);
  console.log(`Current Active Key Version: ${getCurrentKeyVersion()}`);
  console.log(`Target Key Version: ${targetVersion}`);

  const result = await CredentialService.rotateCredentials(targetVersion, newSecret);

  console.log("\nRotation Summary:");
  console.log(`- Successfully rotated: ${result.rotatedCount}`);
  console.log(`- Failed: ${result.failureCount}`);

  if (result.errors.length > 0) {
    console.error("\nErrors encountered:");
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log("\nBYOK Credential rotation completed successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during credential rotation:", err);
  process.exit(1);
});
