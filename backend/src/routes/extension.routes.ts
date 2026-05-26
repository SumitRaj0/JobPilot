import { Router } from "express";

import {
  getLatestMetadata,
  postPageMetadata,
} from "../controllers/extension.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authOptional } from "../middleware/auth.js";

export const extensionRouter = Router();

extensionRouter.use(authOptional);

extensionRouter.post("/page-metadata", asyncHandler(postPageMetadata));
extensionRouter.get("/page-metadata", asyncHandler(getLatestMetadata));
