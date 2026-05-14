import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { isForbiddenAction } from "../../middlewares/security.js";
import { validate } from "../../middlewares/validate.js";
import { prisma } from "../../prisma/client.js";
import { homeAssistantService } from "../../services/homeAssistantService.js";
import { n8nService } from "../../services/n8nService.js";
import { writeSystemLog } from "../../services/systemLogService.js";
import { whatsappService } from "../../services/whatsappService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();
router.use(authMiddleware);

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  triggerType: z.enum(["manual", "webhook", "schedule", "ai_command"]).default("manual"),
  actionType: z.enum(["n8n", "whatsapp", "home_assistant", "internal"]),
  config: z.record(z.unknown()).default({}),
  enabled: z.boolean().default(true)
});

router.get("/", asyncHandler(async (req, res) => {
  const automations = await prisma.automation.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json({ automations });
}));

router.post("/", validate(schema), asyncHandler(async (req, res) => {
  if (isForbiddenAction(req.body.config)) return res.status(400).json({ message: "Configuracao contem acao proibida." });
  const automation = await prisma.automation.create({ data: { ...req.body, userId: req.user!.id } });
  await writeSystemLog({ userId: req.user!.id, module: "automations", action: "create", message: "Automacao criada", metadata: { automationId: automation.id } });
  res.status(201).json({ automation });
}));

router.put("/:id", validate(schema.partial()), asyncHandler(async (req, res) => {
  if (isForbiddenAction(req.body.config)) return res.status(400).json({ message: "Configuracao contem acao proibida." });
  const automation = await prisma.automation.update({ where: { id: String(req.params.id), userId: req.user!.id }, data: req.body });
  res.json({ automation });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await prisma.automation.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  await writeSystemLog({ userId: req.user!.id, module: "automations", action: "delete", message: "Automacao removida", metadata: { automationId: String(req.params.id) } });
  res.status(204).send();
}));

router.post("/:id/run", asyncHandler(async (req, res) => {
  const automation = await prisma.automation.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!automation) return res.status(404).json({ message: "Automacao nao encontrada" });
  if (!automation.enabled) return res.status(400).json({ message: "Automacao desativada" });
  if (isForbiddenAction(automation.config)) return res.status(400).json({ message: "Automacao bloqueada por seguranca" });
  const log = await prisma.automationLog.create({ data: { automationId: automation.id, status: "pending", input: req.body ?? {} } });
  try {
    let output: unknown = { status: "success", message: "Acao interna registrada." };
    const config = automation.config as Record<string, unknown>;
    if (automation.actionType === "n8n") output = await n8nService.trigger({ automationId: automation.id, config }, req.user!.id);
    if (automation.actionType === "whatsapp") output = await whatsappService.send(String(config.phone ?? ""), String(config.message ?? "Teste JARVIS"), req.user!.id);
    if (automation.actionType === "home_assistant") output = await homeAssistantService.callService(String(config.domain), String(config.service), config, req.user!.id, Boolean(req.body?.confirmed));
    const updated = await prisma.automationLog.update({ where: { id: log.id }, data: { status: "success", output: output as never } });
    await writeSystemLog({ userId: req.user!.id, module: "automations", action: "run", message: "Automacao executada", metadata: { automationId: automation.id, logId: updated.id } });
    return res.json({ log: updated, output });
  } catch (error) {
    const updated = await prisma.automationLog.update({ where: { id: log.id }, data: { status: "error", error: error instanceof Error ? error.message : "Erro desconhecido" } });
    await writeSystemLog({ userId: req.user!.id, level: "error", module: "automations", action: "run_error", message: "Erro ao executar automacao", metadata: { automationId: automation.id, logId: updated.id } });
    return res.status(500).json({ log: updated, message: "Erro ao executar automacao" });
  }
}));

router.get("/:id/logs", asyncHandler(async (req, res) => {
  const logs = await prisma.automationLog.findMany({ where: { automationId: String(req.params.id), automation: { userId: req.user!.id } }, orderBy: { createdAt: "desc" } });
  res.json({ logs });
}));

export default router;
