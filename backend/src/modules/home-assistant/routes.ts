import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { homeAssistantService } from "../../services/homeAssistantService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

router.get("/status", asyncHandler(async (req, res) => res.json(await homeAssistantService.status(req.user!.id))));
router.post("/test-connection", asyncHandler(async (req, res) => res.json(await homeAssistantService.testConnection(req.user!.id))));
router.get("/entities", asyncHandler(async (req, res) => res.json(await homeAssistantService.entities(req.user!.id))));
router.post("/call-service", validate(z.object({ domain: z.string(), service: z.string(), data: z.record(z.unknown()).default({}), confirmed: z.boolean().optional() })), asyncHandler(async (req, res) => {
  res.json(await homeAssistantService.callService(req.body.domain, req.body.service, req.body.data, req.user!.id, req.body.confirmed));
}));
router.post("/light", validate(z.object({ entityId: z.string().min(3), action: z.enum(["turn_on", "turn_off"]) })), asyncHandler(async (req, res) => {
  res.json(await homeAssistantService.setLight(req.body.entityId, req.body.action, req.user!.id));
}));
router.post("/conversation", validate(z.object({ text: z.string().min(1) })), asyncHandler(async (req, res) => res.json(await homeAssistantService.conversation(req.body.text, req.user!.id))));

export default router;
