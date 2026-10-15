import { describe, expect, it } from "vitest";
import { parseFishAudioQuota } from "./ttsQuota.js";

describe("parseFishAudioQuota", () => {
  it("recognizes free credit even when the API omits a numeric balance", () => {
    expect(parseFishAudioQuota({ has_free_credit: true })).toEqual({
      status: "available",
      remaining: null,
      limit: null,
      used: null,
      message: "Crédito gratuito disponível"
    });
  });

  it("uses the reported balance when free credit is unavailable", () => {
    expect(parseFishAudioQuota({ has_free_credit: false, credit: 12.5 })).toMatchObject({
      status: "available",
      remaining: 12.5,
      message: "Créditos Fish Audio"
    });
    expect(parseFishAudioQuota({ has_free_credit: false, credit: 0 }).status).toBe("exhausted");
  });

  it("keeps malformed or missing quota data unknown", () => {
    expect(parseFishAudioQuota({})).toMatchObject({ status: "unknown", remaining: null });
  });
});
