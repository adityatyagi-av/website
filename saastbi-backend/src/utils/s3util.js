import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
export const generatePostUploadUrl = async ({
  fileName,
  fileType,
  mediaType,
  authorId,
  expiresIn = 300,
}) => {
  if (!authorId) throw new Error("authorId is required");
  if (!fileName) throw new Error("fileName is required");
  if (!fileType) throw new Error("fileType is required");
  if (!mediaType) throw new Error("mediaType is required");
  if (mediaType === "IMAGE" && !fileType.startsWith("image/")) {
    throw new Error("Invalid image content-type");
  }
  if (mediaType === "VIDEO" && !fileType.startsWith("video/")) {
    throw new Error("Invalid video content-type");
  }
  if (mediaType === "DOCUMENT") {
    const validDocs = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validDocs.includes(fileType)) {
      throw new Error("Invalid document content-type");
    }
  }
  const sanitizedName = fileName.replace(/\s+/g, "_").toLowerCase();
  const extFromMime = fileType.split("/")[1];
  const extension = extFromMime || "bin";

  const fileKey = `socialmedia/${authorId}/posts/${uuidv4()}_${sanitizedName}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn });

  return {
    signedUrl,
    fileKey,
    publicUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    meta: {
      fileName: sanitizedName,
      extension,
      mime: fileType,
      mediaType,
    },
  };
};
export const generateUploadURL = async ({
  //tenantKey,
  folder = "common",
  fileType = "image/jpeg",
  expiresIn = 60 * 5,
}) => {
  //if (!tenantKey) throw new Error("tenantKey is required");

  const extension = fileType.split("/")[1] || "bin";
  const fileKey = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn });

  const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return { signedUrl, fileKey, publicUrl };
};

export const extractKeyFromUrl = (url) => {
  if (!url) throw new Error("URL is required");

  const match = url.match(
    new RegExp(
      `https://${process.env.AWS_BUCKET_NAME}\\.s3\\.${process.env.AWS_REGION}\\.amazonaws\\.com/(.*)`
    )
  );
  if (!match || !match[1]) throw new Error("Invalid S3 URL");

  return decodeURIComponent(match[1]);
};

export const deleteFromS3 = async (fileKey) => {
  if (!fileKey) throw new Error("fileKey is required");

  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  });

  await s3.send(command);
  return true;
};

export const deleteFromS3ByUrl = async (fileUrl) => {
  const key = extractKeyFromUrl(fileUrl);
  await deleteFromS3(key);
  return key;
};
