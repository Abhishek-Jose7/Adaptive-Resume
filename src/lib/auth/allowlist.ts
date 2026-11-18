/**
 * Signup Allowlist Enforcement (PRD Section 6.1 A4 / R-12)
 * Personal phase protection to prevent unauthorized user registrations from exhausting free-tier quotas.
 */

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowlist = process.env.SIGNUP_ALLOWLIST;

  // If no allowlist is configured, permit registration (or default to owner email)
  if (!allowlist || allowlist.trim() === "" || allowlist.trim() === "*") {
    return true;
  }

  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const allowedEntries = allowlist
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);

  for (const entry of allowedEntries) {
    if (entry.startsWith("@")) {
      // Domain wildcard check, e.g. "@mycompany.com"
      if (normalizedEmail.endsWith(entry)) {
        return true;
      }
    } else if (entry === normalizedEmail) {
      return true;
    }
  }

  return false;
}
