import type { Request, Response } from "express";

import { automationService } from "../services/automation.service.js";
import {
  completeAutomationSchema,
  startAllAutomationSchema,
  startAutomationSchema,
  stopAutomationSchema,
} from "../validators/automation.schema.js";

export async function startAutomation(req: Request, res: Response) {
  const body = startAutomationSchema.parse(req.body);
  const userId = req.user?.id ?? "dev-user";

  const result = await automationService.start({
    userId,
    platform: body.platform,
    filters: body.filters,
    pageMetadata: body.pageMetadata,
  });

  res.status(202).json({ ok: true, ...result });
}

export async function startAllAutomation(req: Request, res: Response) {
  const body = startAllAutomationSchema.parse(req.body);
  const userId = req.user?.id ?? "dev-user";

  const result = await automationService.startAll({
    userId,
    filters: body.filters,
  });

  res.status(202).json({ ok: true, ...result });
}

export async function stopAutomation(req: Request, res: Response) {
  const body = stopAutomationSchema.parse(req.body ?? {});
  const userId = req.user?.id ?? "dev-user";

  const result = await automationService.stop(userId, body.platform);
  res.json({ ok: true, ...result });
}

export async function getAutomationStatus(req: Request, res: Response) {
  const userId = req.user?.id ?? "dev-user";
  const status = automationService.getStatus(userId);
  res.json({ ok: true, ...status });
}

export async function completeAutomation(req: Request, res: Response) {
  const body = completeAutomationSchema.parse(req.body);

  const result = automationService.complete(body.userId, {
    jobId: body.jobId,
    platform: body.platform,
    success: body.success,
    applied: body.applied,
    skipped: body.skipped,
    failed: body.failed,
    alreadyApplied: body.alreadyApplied,
    noApplyButton: body.noApplyButton,
    messages: body.messages,
  });

  res.json({ ok: true, ...result });
}
