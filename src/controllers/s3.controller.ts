import { Request, Response } from "express";
import { getUploadUrl, deleteS3File } from "../services/s3.service";

//generate presigned url from s3
export const generateUploadUrl = async (req: Request, res: Response) => {
  const { files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    throw { status: 400, message: "No files provided" };
  }

  const uploadDataArray = await Promise.all(
    files.map(
      ({
        sanitizedFileName,
        fileType,
      }: {
        sanitizedFileName: string;
        fileType: string;
      }) => getUploadUrl(sanitizedFileName, fileType)
    )
  );

  res.json({ signedUrls: uploadDataArray });
};

// delete image from s3
export const deleteImage = async (req: Request, res: Response) => {
  const { key } = req.body;

  if (!key) {
    throw { status: 400, message: "Image key is required" };
  }

  await deleteS3File(key);
  res.json({ success: true , message: "Image deleted" });
};
