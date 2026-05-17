import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { integrationConfigService, integrationProviders } from "../../services/integrationConfigService.js";
import { integrationSetupService, setupProviders } from "../../services/integrationSetupService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

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

router.get("/", asyncHandler(async (req, res) => res.json(await integrationConfigService.status(req.user!.id))));
router.get("/status", asyncHandler(async (req, res) => res.json(await integrationConfigService.status(req.user!.id))));
router.get("/config", asyncHandler(async (req, res) => res.json(await integrationConfigService.config(req.user!.id))));
router.get("/logs", asyncHandler(async (req, res) => res.json(await integrationConfigService.logs(req.user!.id))));
router.get("/setup-wizard", asyncHandler(async (req, res) => res.json(await integrationSetupService.wizard(req.user!.id))));
router.get("/events", asyncHandler(async (req, res) => res.json(await integrationConfigService.events(req.user!.id))));
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
