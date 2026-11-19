import https from "node:https";
import net from "node:net";

type DnsAnswer = { type: number; data: string };
type DnsResponse = { Status?: number; Answer?: DnsAnswer[] };

const dnsOverHttpsResolvers = [
  { address: "8.8.8.8", serverName: "dns.google" },
  { address: "1.1.1.1", serverName: "cloudflare-dns.com" },
] as const;

function resolveIpv4(hostname: string, resolver: (typeof dnsOverHttpsResolvers)[number]) {
  return new Promise<string[]>((resolve, reject) => {
    const path = `/resolve?name=${encodeURIComponent(hostname)}&type=A`;
    const request = https.get(
      {
        hostname: resolver.address,
        servername: resolver.serverName,
        path,
        headers: { host: resolver.serverName, accept: "application/dns-json" },
        timeout: 2500,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => { body += chunk; });
        response.on("end", () => {
          try {
            if (response.statusCode !== 200) throw new Error(`DNS resolver returned ${response.statusCode}`);
            const answer = JSON.parse(body) as DnsResponse;
            const addresses = (answer.Answer ?? [])
              .filter((item) => item.type === 1 && net.isIPv4(item.data))
              .map((item) => item.data);
            if (answer.Status !== 0 || addresses.length === 0) throw new Error("No IPv4 address returned");
            resolve(addresses);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("DNS-over-HTTPS request timed out")));
    request.on("error", reject);
  });
}

async function resolveWithFallback(hostname: string) {
  let lastError: unknown;
  for (const resolver of dnsOverHttpsResolvers) {
    try {
      return await resolveIpv4(hostname, resolver);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not resolve Neon database host");
}

function connectTcp(address: string, port: number, tlsServerName: string) {
  return new Promise<net.Socket>((resolve, reject) => {
    const socket = new net.Socket();
    socket.once("connect", () => {
      // postgres.js uses this value for TLS SNI when it upgrades the socket.
      (socket as net.Socket & { host?: string }).host = tlsServerName;
      resolve(socket);
    });
    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
    socket.connect(port, address);
  });
}

/**
 * Optional fallback for local environments whose OS DNS resolver is temporarily
 * unavailable. It is used only after EAI_AGAIN/ENOTFOUND and only with Neon hosts.
 */
export function createNeonDnsFallbackSocket({ host, port }: { host: string[]; port: number[] }) {
  const hostname = host[0];
  const portNumber = port[0];

  return connectTcp(hostname, portNumber, hostname).catch(async (error: NodeJS.ErrnoException) => {
    if (!hostname.endsWith(".neon.tech") || !["EAI_AGAIN", "ENOTFOUND"].includes(error.code ?? "")) {
      throw error;
    }

    const addresses = await resolveWithFallback(hostname);
    let lastError: unknown = error;
    for (const address of addresses) {
      try {
        return await connectTcp(address, portNumber, hostname);
      } catch (fallbackError) {
        lastError = fallbackError;
      }
    }
    throw lastError;
  });
}
