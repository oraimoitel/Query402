import { describe, expect, it } from "vitest";
import { safeScrapeFetch, UnsafeScrapeUrlError, validateScrapeUrl } from "./scrape-url-safety.js";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 as const }];

describe("scrape URL safety", () => {
  it("allows http and https URLs that resolve to public addresses", async () => {
    await expect(
      validateScrapeUrl("https://example.com/page?q=1", { resolveHostname: publicResolver })
    ).resolves.toBe("https://example.com/page?q=1");
    await expect(
      validateScrapeUrl("http://example.com", { resolveHostname: publicResolver })
    ).resolves.toBe("http://example.com/");
  });

  it("rejects unsupported protocols, credentials, and local hostnames", async () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://localhost",
      "https://service.internal"
    ]) {
      await expect(
        validateScrapeUrl(url, { resolveHostname: publicResolver })
      ).rejects.toBeInstanceOf(UnsafeScrapeUrlError);
    }
  });

  it("rejects private and metadata IPv4 ranges", async () => {
    for (const url of [
      "http://127.0.0.1",
      "http://169.254.169.254",
      "http://10.0.0.5",
      "http://192.168.1.1"
    ]) {
      await expect(validateScrapeUrl(url)).rejects.toBeInstanceOf(UnsafeScrapeUrlError);
    }
  });

  it("safeScrapeFetch revalidates redirect targets and enforces redirect limit", async () => {
    await expect(
      safeScrapeFetch("https://example.com", {
        fetchImpl: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data" }
          }),
        resolveHostname: publicResolver
      })
    ).rejects.toBeInstanceOf(UnsafeScrapeUrlError);
  });

  it("safeScrapeFetch returns text content from a safe response", async () => {
    const result = await safeScrapeFetch("https://example.com", {
      fetchImpl: async () =>
        new Response("<html>ok</html>", {
          headers: { "content-type": "text/html; charset=utf-8" }
        }),
      resolveHostname: publicResolver
    });

    expect(result.url).toBe("https://example.com/");
    expect(result.body).toBe("<html>ok</html>");
  });
});
