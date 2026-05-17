import type { Request, Response } from "express";
import { brainService } from "./brain.service.js";

export const brainController = {
  async ask(req: Request, res: Response) {
    const result = await brainService.ask({ userId: req.user!.id, ...req.body });
    res.json(result);
  },
  async plan(req: Request, res: Response) {
    const result = await brainService.plan({ userId: req.user!.id, ...req.body });
    res.json(result);
  },
  async executeDraft(req: Request, res: Response) {
    const result = await brainService.executeDraft(req.user!.id, req.body?.draftAction ?? req.body);
    res.json(result);
  },
  async feedback(req: Request, res: Response) {
    const result = await brainService.feedback.create(req.user!.id, req.body);
    res.status(201).json(result);
  },
  async listFeedback(req: Request, res: Response) {
    const result = await brainService.feedback.list(req.user!.id);
    res.json(result);
  },
  async agents(_req: Request, res: Response) {
    res.json(brainService.agents());
  },
  async tools(_req: Request, res: Response) {
    res.json(brainService.tools());
  },
  async status(_req: Request, res: Response) {
    res.json(brainService.status());
  }
};
