import { describe, expect, it } from "vitest";
import { intentRouterService } from "./intentRouter.service.js";

describe("IntentRouterService", () => {
  it("classifica perguntas sobre astronomia como conhecimento geral, nao status da VPS", () => {
    expect(intentRouterService.classify("Como funciona o sistema solar?").intent).toBe("general.question");
  });

  it("mantem consultas explicitas de disponibilidade como status do sistema", () => {
    expect(intentRouterService.classify("O sistema está online?").intent).toBe("system.status");
    expect(intentRouterService.classify("Meu servidor ficou fora do ar").intent).toBe("system.status");
  });
});
