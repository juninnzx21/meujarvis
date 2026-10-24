import { describe, expect, it } from "vitest";
import { NVIDIA_ZERO_SPEND_POLICY, NVIDIA_ZERO_SPEND_POLICY_KEY } from "./nvidiaBillingPolicyService.js";

describe("NVIDIA_ZERO_SPEND", () => {
  it("fixes spending at zero and blocks unknown billing evidence", () => {
    expect(NVIDIA_ZERO_SPEND_POLICY_KEY).toBe("nvidia_zero_spend_policy_v1");
    expect(NVIDIA_ZERO_SPEND_POLICY).toMatchObject({
      name: "NVIDIA_ZERO_SPEND",
      budgetMonthlyBrl: 0,
      billingPeriod: "calendar_month",
      timezone: "America/Sao_Paulo",
      paidRequestsAllowed: false,
      unknownQuotaBehavior: "BLOCK",
      unknownPricingBehavior: "BLOCK",
      unknownEntitlementBehavior: "BLOCK",
      autoFallbackToPaidProvider: false,
      automaticPaidTopup: false
    });
  });

  it("has separate disabled controls for chat, transcription, and synthesis", () => {
    expect(Object.keys(NVIDIA_ZERO_SPEND_POLICY.operations).sort()).toEqual(["llm", "stt", "tts"]);
    expect(Object.values(NVIDIA_ZERO_SPEND_POLICY.operations).every((operation) => operation.enabled === false)).toBe(true);
  });
});
