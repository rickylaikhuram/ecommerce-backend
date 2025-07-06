import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3";

export const getUploadUrl = async (fileName: string, fileType: string) => {
  const key = `products/images/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  return {
    uploadUrl,
    publicUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`,
    key,
  };
};

export const deleteS3File = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });

  await s3.send(command);
};
