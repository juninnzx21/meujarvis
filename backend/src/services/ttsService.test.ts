import { describe, expect, it } from "vitest";
import { canUseTtsProvider, parseFishAudioQuota } from "./ttsQuota.js";

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

describe("canUseTtsProvider", () => {
  it("requires confirmed availability and enough characters in automatic mode", () => {
    expect(canUseTtsProvider({ status: "available", remaining: null, limit: null, used: null, message: "Free" }, 100)).toBe(true);
    expect(canUseTtsProvider({ status: "available", remaining: 99, limit: 100, used: 1, message: "Quota" }, 100)).toBe(false);
    expect(canUseTtsProvider({ status: "exhausted", remaining: 0, limit: 100, used: 100, message: "Quota" }, 1)).toBe(false);
    expect(canUseTtsProvider({ status: "unknown", remaining: null, limit: null, used: null, message: "Unavailable" }, 1)).toBe(false);
  });
});
