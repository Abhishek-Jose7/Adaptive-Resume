import dns from "dns/promises";
import net from "net";
import { Agent } from "undici";

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

export type ValidatedUrlWithPin = URL & { pinnedIp: string };

/**
 * Creates an Undici Agent that enforces connection-time IP pinning
 * Prevents TOCTOU DNS rebinding by tying the socket connection directly to the validated IP.
 */
export function createSsrfSafeAgent(allowedHostname?: string, pinnedIp?: string): Agent {
  return new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        const cb = (typeof options === "function" ? options : callback) as any;
        const opt = typeof options === "object" ? options : {};

        if (allowedHostname && hostname.toLowerCase() !== allowedHostname.toLowerCase()) {
          return cb(
            new SsrfError(
              `SSRF Blocked: Hostname mismatch at socket connection (expected ${allowedHostname}, received ${hostname})`
            )
          );
        }

        if (pinnedIp) {
          if (isPrivateOrReservedIp(pinnedIp)) {
            return cb(
              new SsrfError(
                `SSRF Blocked: Pinned connection IP is in a restricted range (${pinnedIp})`
              )
            );
          }
          const family = net.isIPv6(pinnedIp) ? 6 : 4;
          if (opt && opt.all) {
            return cb(null, [{ address: pinnedIp, family }]);
          }
          return cb(null, pinnedIp, family);
        }

        // Fallback: Connection-time resolution and validation
        dns.lookup(hostname, { all: true }).then(
          (addresses) => {
            if (!addresses || addresses.length === 0) {
              return cb(new SsrfError(`Could not resolve host: ${hostname}`));
            }
            for (const record of addresses) {
              if (isPrivateOrReservedIp(record.address)) {
                return cb(
                  new SsrfError(
                    `SSRF Blocked: Connection-time DNS resolution returned restricted IP (${record.address})`
                  )
                );
              }
            }
            const chosen = addresses[0];
            if (opt && opt.all) {
              return cb(null, addresses);
            }
            return cb(null, chosen.address, chosen.family);
          },
          (err) => cb(err)
        );
      },
    },
  });
}

function parseIPv6ToWords(ip: string): number[] | null {
  let normalized = ip.toLowerCase();
  const lastColon = normalized.lastIndexOf(":");
  if (lastColon !== -1) {
    const afterColon = normalized.slice(lastColon + 1);
    if (net.isIPv4(afterColon)) {
      const parts = afterColon.split(".").map(Number);
      const high = ((parts[0] << 8) | parts[1]).toString(16);
      const low = ((parts[2] << 8) | parts[3]).toString(16);
      normalized = normalized.slice(0, lastColon) + ":" + high + ":" + low;
    }
  }

  const parts = normalized.split("::");
  if (parts.length > 2) return null;

  let words: number[] = [];
  if (parts.length === 1) {
    const split = parts[0].split(":");
    if (split.length !== 8) return null;
    words = split.map((s) => parseInt(s, 16));
  } else {
    const left = parts[0] ? parts[0].split(":").map((s) => parseInt(s, 16)) : [];
    const right = parts[1] ? parts[1].split(":").map((s) => parseInt(s, 16)) : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;
    words = [...left, ...new Array(missing).fill(0), ...right];
  }

  if (words.some((w) => isNaN(w) || w < 0 || w > 0xffff)) return null;
  return words;
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
    const words = parseIPv6ToWords(ip);
    if (!words) return true; // Invalid format treated as unsafe

    // Loopback ::1
    if (words.slice(0, 7).every((w) => w === 0) && words[7] === 1) return true;
    // Unspecified ::
    if (words.every((w) => w === 0)) return true;
    // Unique local fc00::/7
    if ((words[0] & 0xfe00) === 0xfc00) return true;
    // Link-local fe80::/10
    if ((words[0] & 0xffc0) === 0xfe80) return true;
    // Multicast ff00::/8
    if ((words[0] & 0xff00) === 0xff00) return true;
    // Discard prefix 100::/64
    if (words[0] === 0x100 && words[1] === 0 && words[2] === 0 && words[3] === 0) return true;
    // Documentation 2001:db8::/32
    if (words[0] === 0x2001 && words[1] === 0xdb8) return true;
    // ORCHIDv2 2001:20::/28 or 2001:10::/28
    if (words[0] === 0x2001 && (words[1] === 0x10 || words[1] === 0x20)) return true;
    // 6to4 relay 2002::/16
    if (words[0] === 0x2002) return true;
    // NAT64 64:ff9b::/96
    if (words[0] === 0x64 && words[1] === 0xff9b && words[2] === 0 && words[3] === 0 && words[4] === 0 && words[5] === 0) return true;

    // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) including hex notation
    if (words.slice(0, 5).every((w) => w === 0) && (words[5] === 0xffff || words[5] === 0)) {
      const b0 = (words[6] >> 8) & 0xff;
      const b1 = words[6] & 0xff;
      const b2 = (words[7] >> 8) & 0xff;
      const b3 = words[7] & 0xff;
      return isPrivateOrReservedIp(`${b0}.${b1}.${b2}.${b3}`);
    }
  }

  return false;
}

export async function validateJobPostingUrl(inputUrl: string): Promise<URL & { pinnedIp: string }> {
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

  // 4. Restrict strictly to standard HTTPS port 443
  if (parsed.port && parsed.port !== "443") {
    throw new SsrfError(`Port ${parsed.port} is not permitted for job URL fetching. Only port 443 is allowed.`);
  }

  // 4. Resolve DNS and inspect all resolved addresses
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
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

  // Attach pinned IP for connection-level enforcement
  (parsed as any).pinnedIp = addresses[0].address;
  return parsed as URL & { pinnedIp: string };
}

export async function fetchJobPostingHtml(url: string): Promise<string> {
  let currentUrl = url;
  const maxRedirects = 3;
  let redirectCount = 0;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout (PRD 11.4)

  try {
    while (redirectCount <= maxRedirects) {
      const validatedUrl = await validateJobPostingUrl(currentUrl);

      // Create an SSRF-safe connection dispatcher that pins the socket to the validated IP
      const dispatcher = createSsrfSafeAgent(validatedUrl.hostname, validatedUrl.pinnedIp);

      const response = await fetch(validatedUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "ResumeMakerJobBot/1.0 (Mozilla/5.0 compatible; Careers Scraper)",
          Accept: "text/html,application/xhtml+xml,application/json;q=0.9",
          Host: validatedUrl.host,
        },
        signal: controller.signal,
        redirect: "manual",
        // @ts-expect-error Node/undici global fetch dispatcher option
        dispatcher,
      });

      // Secure manual redirect following (mitigates open redirect to SSRF targets)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new SsrfError("Too many redirects: exceeded maximum 3 hops");
        }

        const location = response.headers.get("location");
        if (!location) {
          throw new SsrfError("Redirect response missing Location header");
        }

        let nextUrl: URL;
        try {
          nextUrl = new URL(location, validatedUrl);
        } catch {
          throw new SsrfError("Invalid redirect URL location");
        }

        if (nextUrl.protocol !== "https:") {
          throw new SsrfError("Redirects to non-HTTPS endpoints are prohibited");
        }

        currentUrl = nextUrl.toString();
        continue;
      }

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
    }

    throw new SsrfError("Too many redirects: exceeded maximum 3 hops");
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
