import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { n8nService } from "../../services/n8nService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const configSchema = z.object({
  webhookUrl: z.string().url("Informe a URL do webhook n8n.").transform((value) => value.trim()),
  apiKey: z.string().optional().refine((value) => !value || !/^https?:\/\//i.test(value), "API key nao pode ser uma URL. Cole a chave/token do n8n, se houver.")
});

router.get("/status", asyncHandler(async (req, res) => res.json(await n8nService.userStatus(req.user!.id))));
router.get("/config", asyncHandler(async (req, res) => res.json(await n8nService.getConfig(req.user!.id))));
router.put("/config", validate(configSchema), asyncHandler(async (req, res) => res.json(await n8nService.saveConfig(req.user!.id, req.body))));
router.delete("/config", asyncHandler(async (req, res) => res.json(await n8nService.clearConfig(req.user!.id))));
router.post("/trigger", asyncHandler(async (req, res) => res.json(await n8nService.trigger(req.body, req.user!.id))));
router.post("/test", asyncHandler(async (req, res) => res.json(await n8nService.test(req.user!.id))));

export default router;
