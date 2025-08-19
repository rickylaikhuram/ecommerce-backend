import { Request, Response } from "express";
import { getUploadUrl, deleteS3File } from "../services/s3.service";

// Generate presigned URLs for multiple images
export const generateUploadUrl = async (req: Request, res: Response) => {
  const { files, folderName } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ message: "No files provided" });
    return;
  }

  if (files.length > 10) {
    res.status(400).json({ message: "Maximum 10 images allowed" });
    return;
  }

  try {
    const uploadDataArray = await Promise.all(
      files.map(async ({ sanitizedFileName, fileType }, index) => {
        const uploadData = await getUploadUrl(
          sanitizedFileName,
          fileType,
          folderName
        );
        return {
          ...uploadData,
          index, // Include index to maintain order
        };
      })
    );


    res.json({ signedUrls: uploadDataArray });
    return;
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    res.status(500).json({ message: "Failed to generate upload URLs" });
  }
};

// delete image from s3
export const deleteImage = async (req: Request, res: Response) => {
  const { key } = req.body;

  if (!key) {
    throw { status: 400, message: "Image key is required" };
  }

  await deleteS3File(key);
  res.json({ success: true, message: "Image deleted" });
};
