import { Router } from "express";
import { contactController } from "../controllers/contact.controller";
import { asyncHandler } from "../middlewares/error";
import { requireAuth } from "../middlewares/auth";
import { csvUpload } from "../middlewares/upload";

export const contactRouter = Router();

contactRouter.use(requireAuth);

contactRouter.get("/", asyncHandler(contactController.list));
contactRouter.get("/stats", asyncHandler(contactController.stats));
contactRouter.get("/audience", asyncHandler(contactController.audience));
contactRouter.post("/", asyncHandler(contactController.create));
contactRouter.post(
  "/import",
  csvUpload.single("file"),
  asyncHandler(contactController.importCsv)
);
contactRouter.patch("/:id", asyncHandler(contactController.update));
contactRouter.delete("/:id", asyncHandler(contactController.remove));
