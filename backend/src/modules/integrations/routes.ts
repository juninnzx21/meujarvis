import express, { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { integrationConfigService, integrationProviders } from "../../services/integrationConfigService.js";
import { integrationSetupService, setupProviders } from "../../services/integrationSetupService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ttsService } from "../../services/ttsService.js";

const router = Router();
router.use(authMiddleware);

function assertAdmin(role?: string) {
  if (role !== "admin") {
    const error = new Error("Apenas admin pode alterar configuracoes globais.");
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

const providerSchema = z.object({
  provider: z.enum(integrationProviders)
});
const setupProviderSchema = z.object({
  provider: z.enum(setupProviders)
});
const aiModelProviderSchema = z.object({
  provider: z.enum(["openai", "gemini", "nvidia", "ollama"])
});

router.get("/", asyncHandler(async (req, res) => res.json(await integrationConfigService.status(req.user!.id, req.user!.role === "admin"))));
router.get("/status", asyncHandler(async (req, res) => res.json(await integrationConfigService.status(req.user!.id, req.user!.role === "admin"))));
router.get("/config", asyncHandler(async (req, res) => res.json(await integrationConfigService.config(req.user!.id, req.user!.role === "admin"))));
router.get("/logs", asyncHandler(async (req, res) => res.json(await integrationConfigService.logs(req.user!.id, req.user!.role === "admin"))));
router.get("/setup-wizard", asyncHandler(async (req, res) => res.json(await integrationSetupService.wizard(req.user!.id))));
router.get("/events", asyncHandler(async (req, res) => res.json(await integrationConfigService.events(req.user!.id, req.user!.role === "admin"))));
router.get("/tts/voices/:provider", asyncHandler(async (req, res) => {
  if (req.params.provider !== "elevenlabs" && req.params.provider !== "nvidia") return res.status(400).json({ message: "Provedor de voz inválido." });
  res.json(await ttsService.voices(req.user!.id, req.params.provider));
}));
router.get("/tts/quotas", asyncHandler(async (req, res) => res.json(await ttsService.quotas(req.user!.id))));
router.post("/tts/fish-audio/clone", express.raw({ type: "audio/mpeg", limit: "8mb" }), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  if (!Buffer.isBuffer(req.body) || req.body.length < 4) return res.status(400).json({ message: "Envie um arquivo MP3 para criar a voz personalizada." });
  const hasMp3Header = req.body.subarray(0, 3).toString("ascii") === "ID3" || (req.body[0] === 0xff && (req.body[1] & 0xe0) === 0xe0);
  if (!hasMp3Header) return res.status(415).json({ message: "O arquivo enviado não parece ser um MP3 válido." });
  const title = typeof req.query.title === "string" ? req.query.title : "JARVIS - Voz personalizada";
  res.json(await ttsService.cloneFishAudioVoice(req.user!.id, req.body, "audio/mpeg", title));
}));
router.get("/models/:provider", validate(aiModelProviderSchema, "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationConfigService.listAiModels(req.user!.id, req.params.provider as "openai" | "gemini" | "nvidia" | "ollama"));
}));
router.get("/setup/summary", asyncHandler(async (req, res) => res.json(await integrationSetupService.summary(req.user!.id))));
router.get("/setup", asyncHandler(async (req, res) => res.json(await integrationSetupService.list(req.user!.id))));
router.get("/setup/:provider", validate(setupProviderSchema, "params"), asyncHandler(async (req, res) => {
  res.json(await integrationSetupService.get(req.user!.id, req.params.provider as never));
}));
router.put("/setup/:provider", validate(setupProviderSchema, "params"), validate(z.record(z.unknown())), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationSetupService.save(req.user!.id, req.params.provider as never, req.body));
}));
router.post("/setup/:provider/test", validate(setupProviderSchema, "params"), asyncHandler(async (req, res) => {
  res.json(await integrationSetupService.test(req.user!.id, req.params.provider as never));
}));
router.post("/setup/:provider/bootstrap", validate(setupProviderSchema, "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationSetupService.bootstrap(req.user!.id, req.params.provider as never));
}));
router.post("/setup/:provider/configure-webhook", validate(setupProviderSchema, "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationSetupService.configureWebhook(req.user!.id, req.params.provider as never));
}));
router.post("/setup/:provider/reset-safe", validate(setupProviderSchema, "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationSetupService.resetSafe(req.user!.id, req.params.provider as never, String(req.body?.confirm || "")));
}));

router.put("/config/:provider", validate(providerSchema, "params"), validate(z.record(z.unknown())), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationConfigService.saveProvider(req.user!.id, req.params.provider as never, req.body));
}));

router.post("/test/:provider", validate(providerSchema, "params"), asyncHandler(async (req, res) => {
  res.json(await integrationConfigService.testProvider(req.user!.id, req.params.provider as never));
}));

router.post("/bootstrap/:provider", validate(providerSchema, "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationConfigService.bootstrapProvider(req.user!.id, req.params.provider as never));
}));

router.post("/events/:id/retry", validate(z.object({ id: z.string().min(1) }), "params"), asyncHandler(async (req, res) => {
  assertAdmin(req.user!.role);
  res.json(await integrationConfigService.retryEvent(req.user!.id, String(req.params.id)));
}));

export default router;
