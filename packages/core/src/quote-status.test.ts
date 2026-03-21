import { describe, expect, it } from "vitest";
import { isLegacyArchiveOrCancelStatus, normalizeQuoteStatus } from "./quote-status";

describe("normalizeQuoteStatus", () => {
  it("maps Prisma lowercase and legacy uppercase", () => {
    expect(normalizeQuoteStatus("draft")).toBe("draft");
    expect(normalizeQuoteStatus("SENT")).toBe("sent");
    expect(normalizeQuoteStatus("ACCEPTED")).toBe("accepted");
  });

  it("maps ARCHIVED and CANCELLED to archived", () => {
    expect(normalizeQuoteStatus("ARCHIVED")).toBe("archived");
    expect(normalizeQuoteStatus("cancelled")).toBe("archived");
  });

  it("returns null for invalid", () => {
    expect(normalizeQuoteStatus("")).toBeNull();
    expect(normalizeQuoteStatus("bogus")).toBeNull();
    expect(normalizeQuoteStatus(null)).toBeNull();
  });
});

describe("isLegacyArchiveOrCancelStatus", () => {
  it("detects legacy labels", () => {
    expect(isLegacyArchiveOrCancelStatus("ARCHIVED")).toBe(true);
    expect(isLegacyArchiveOrCancelStatus("Cancelled")).toBe(true);
    expect(isLegacyArchiveOrCancelStatus("archived")).toBe(false);
  });
});
