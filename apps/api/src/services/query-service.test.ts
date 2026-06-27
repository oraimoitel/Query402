import { describe, expect, it } from "vitest";
import { UnsafeScrapeUrlError } from "../lib/scrape-url-safety.js";

describe("executeQuery", () => {
  it("rejects unsafe scrape URLs at the service boundary", async () => {
    process.env.X402_PAY_TO_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const { executeQuery } = await import("./query-service.js");

    await expect(
      executeQuery({
        mode: "scrape",
        provider: "scrape.page",
        url: "http://169.254.169.254/latest/meta-data"
      })
    ).rejects.toBeInstanceOf(UnsafeScrapeUrlError);
  });
});
