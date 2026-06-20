import { Router } from "express";
import { memoryUpload } from "../../../config/multer.config";
import { UploadController } from "./upload.controller";

const router = Router();

router.post("/image", memoryUpload.single("image"), UploadController.uploadImage);

export const UploadRoutes = router;
