import multer from "multer";
import { HttpError } from "./error";

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const allowed =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!allowed) {
      callback(new HttpError(400, "Only CSV files are supported"));
      return;
    }
    callback(null, true);
  }
});
