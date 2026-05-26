import { Router } from "express";

import {
  completeAutomation,
  getAutomationStatus,
  startAutomation,
  stopAutomation,
} from "../controllers/automation.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authOptional } from "../middleware/auth.js";

export const automationRouter = Router();

automationRouter.use(authOptional);

automationRouter.post("/start", asyncHandler(startAutomation));
automationRouter.post("/stop", asyncHandler(stopAutomation));
automationRouter.post("/complete", asyncHandler(completeAutomation));
automationRouter.get("/status", asyncHandler(getAutomationStatus));
