import type { Request, Response } from "express";

import { extensionService } from "../services/extension.service.js";
import { pageMetadataSchema } from "../validators/extension.schema.js";

export async function postPageMetadata(req: Request, res: Response) {
  const metadata = pageMetadataSchema.parse(req.body);
  const result = await extensionService.recordPageMetadata(metadata);

  res.status(201).json({
    ok: true,
    received: metadata,
    ...result,
  });
}

export async function getLatestMetadata(req: Request, res: Response) {
  const platform = req.query.platform as string | undefined;
  const metadata = extensionService.getLatestMetadata(platform);

  res.json({ metadata });
}
