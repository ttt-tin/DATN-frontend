import React, { useState } from "react";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DownloadFile = ({ objectKey }) => {
  const [loading, setLoading] = useState(false);

  const s3Client = new S3Client({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
    },
  });

  const generateSignedUrl = async (bucketName, key) => {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
      console.log("Signed URL: ", url);
      return url;
    } catch (err) {
      console.error("Error generating signed URL:", err);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    const bucketName = "bk-health-bucket-landing";
    const fileKey = objectKey;
    console.log(fileKey);

    try {
      const presignedUrl = await generateSignedUrl(bucketName, fileKey);
      const link = document.createElement("a");
      link.href = presignedUrl || "";
      link.download = fileKey; // Optional: Set a custom file name
      link.target = "_blank";
      link.click();
    } catch (error) {
      console.error("Error downloading the file:", error);
      alert("Failed to download the file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDownload} disabled={loading}>
      {loading ? "Downloading..." : "Download File"}
    </button>
  );
};

export default DownloadFile;
