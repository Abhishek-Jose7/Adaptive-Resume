import dns from "dns/promises";
import net from "net";

/**
 * SSRF Protection Engine for JD URL fetching
 * PRD Section 6.4 J6, Section 11.4
 */

export class SsrfError extends Error {
  constructor(message: string, public code = "URL_FETCH_BLOCKED") {
    super(message);
    this.name = "SsrfError";
  }
}

export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [b0, b1] = parts;

    // Loopback 127.0.0.0/8
    if (b0 === 127) return true;
    // Current network 0.0.0.0/8
    if (b0 === 0) return true;
    // Private 10.0.0.0/8
    if (b0 === 10) return true;
    // Carrier grade NAT 100.64.0.0/10
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    // Link local 169.254.0.0/16
    if (b0 === 169 && b1 === 254) return true;
    // Private 172.16.0.0/12
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // IETF Protocol 192.0.0.0/24
    if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;
    // Private 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;
    // Documentation 198.51.100.0/24, 203.0.113.0/24
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
    // Multicast 224.0.0.0/4
    if (b0 >= 224 && b0 <= 239) return true;
    // Broadcast 255.255.255.255
    if (b0 === 255 && b1 === 255 && parts[2] === 255 && parts[3] === 255) return true;

    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unspecified
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    // Unique local fc00::/7
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link-local fe80::/10
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // IPv4 mapped ::ffff:0:0/96
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.replace("::ffff:", "");
      if (net.isIPv4(v4Part)) return isPrivateOrReservedIp(v4Part);
    }
  }

  return false;
}

export async function validateJobPostingUrl(inputUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new SsrfError("Invalid URL format");
  }

  // 1. Accept HTTPS only
  if (parsed.protocol !== "https:") {
    throw new SsrfError("Only secure HTTPS URLs are permitted");
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Disallow raw IP literals in hostname
  if (net.isIP(hostname)) {
    throw new SsrfError("Direct IP address connections are forbidden");
  }

  // 3. Disallow local or internal hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".onion") ||
    hostname.endsWith(".corp")
  ) {
    throw new SsrfError("Access to local or internal network targets is prohibited");
  }

  // 4. Resolve DNS and inspect all resolved addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new SsrfError("Could not resolve domain name");
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new SsrfError(
          `Domain resolved to a restricted destination (${record.address})`
        );
      }
    }
  } catch (err: any) {
    if (err instanceof SsrfError) throw err;
    throw new SsrfError(`DNS resolution failed for host ${hostname}: ${err.message}`);
  }

  return parsed;
}

export async function fetchJobPostingHtml(url: string): Promise<string> {
  const validatedUrl = await validateJobPostingUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout (PRD 11.4)

  try {
    const response = await fetch(validatedUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "ResumeMakerJobBot/1.0 (Mozilla/5.0 compatible; Careers Scraper)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new SsrfError(
        `Job posting page returned HTTP ${response.status}. Please paste the JD text manually.`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("application/json") &&
      !contentType.includes("text/plain")
    ) {
      throw new SsrfError("The target URL did not return HTML or text content.");
    }

    // Enforce 1 MB body cap (PRD 11.4)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new SsrfError("Unable to read response body");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const maxBytes = 1024 * 1024; // 1 MB

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          throw new SsrfError("Job posting response exceeded the 1 MB size limit.");
        }
        chunks.push(value);
      }
    }

    const fullBuffer = Buffer.concat(chunks);
    return fullBuffer.toString("utf-8");
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new SsrfError("Request timed out after 8 seconds. Please paste the JD text manually.");
    }
    if (err instanceof SsrfError) throw err;
    throw new SsrfError(`Failed to fetch job posting: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
