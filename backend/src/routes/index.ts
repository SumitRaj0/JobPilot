import { Router } from "express";

import { automationRouter } from "./automation.routes.js";
import { extensionRouter } from "./extension.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/extension", extensionRouter);
apiRouter.use("/automation", automationRouter);
