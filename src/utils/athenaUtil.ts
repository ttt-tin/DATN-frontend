import {
  AthenaClient,
  ListTableMetadataCommand,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { message } from "antd";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

// Initialize Athena client
export const athenaClient = new AthenaClient({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
  },
});

const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY!,
  },
});

// Utility to fetch table metadata
export const fetchTables = async (
  catalogName: string,
  databaseName: string
): Promise<string[]> => {
  try {
    const command = new ListTableMetadataCommand({
      CatalogName: catalogName,
      DatabaseName: databaseName,
    });
    const response = await athenaClient.send(command);
    return response.TableMetadataList?.map((table) => table.Name!) || [];
  } catch (error) {
    console.error("Error fetching tables:", error);
    throw new Error("Failed to fetch tables.");
  }
};

// Utility to execute a query and fetch the results
export const executeAthenaQuery = async (
  catalogName: string,
  databaseName: string,
  query: string
): Promise<any[]> => {
  try {
    const startQueryCommand = new StartQueryExecutionCommand({
      QueryString: query,
      QueryExecutionContext: {
        Catalog: catalogName,
        Database: databaseName,
      },
      ResultConfiguration: {
        OutputLocation: process.env.REACT_APP_S3_OUTPUT_BUCKET,
      },
    });

    const startQueryResponse = await athenaClient.send(startQueryCommand);
    const queryExecutionId = startQueryResponse.QueryExecutionId;

    // Poll for query execution status
    let queryStatus: string | undefined;
    do {
      const statusCommand = new GetQueryExecutionCommand({
        QueryExecutionId: queryExecutionId,
      });
      const statusResponse = await athenaClient.send(statusCommand);
      queryStatus = statusResponse.QueryExecution?.Status?.State;

      if (queryStatus === "FAILED" || queryStatus === "CANCELLED") {
        throw new Error(
          `Query failed or was cancelled: ${statusResponse.QueryExecution?.Status?.StateChangeReason}`
        );
      }

      if (queryStatus !== "SUCCEEDED") {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
      }
    } while (queryStatus !== "SUCCEEDED");

    // Fetch query results
    const resultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: queryExecutionId,
    });
    const resultsResponse = await athenaClient.send(resultsCommand);

    const rows = resultsResponse.ResultSet?.Rows || [];
    if (rows.length > 0) {
      const header = rows[0].Data?.map((col) => col.VarCharValue) || [];
      return rows.slice(1).map((row) => {
        const record: any = {};
        row.Data?.forEach((col, index) => {
          const key = header[index];
          if (key) {
            record[key] = col.VarCharValue || null;
          }
        });

        return record;
      });
    }

    return [];
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Failed to execute query.");
  }
};

export const createVolume = async (bucketName: string, volumeName: string) => {
  if (!volumeName.trim()) {
    throw new Error("Volume name cannot be empty.");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `unstructure/${volumeName}/`, // S3 folders are created by adding a trailing "/"
  });

  try {
    await s3Client.send(command);
    message.success(`Volume "${volumeName}" created successfully.`);
  } catch (err) {
    console.error("Error creating volume:", err);
    throw new Error("Failed to create volume.");
  }
};

/**
 * Uploads a file to a specific folder (volume) in the S3 bucket.
 * @param bucketName The name of the S3 bucket.
 * @param volumeName The name of the folder (volume) to upload the file to.
 * @param file The file to upload.
 */
export const handleFileUpload = async (
  bucketName: string,
  volumeName: string,
  file: File
) => {
  if (!volumeName) {
    throw new Error("Volume name cannot be empty.");
  }

  const objectKey = `unstructure/${volumeName}/${file.name}`;

  try {
    // Convert the file to a Uint8Array
    const fileBuffer = new Uint8Array(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: fileBuffer, // Use Uint8Array for the Body
      ContentType: file.type, // Set Content-Type
    });

    await s3Client.send(command);
    message.success(`File "${file.name}" uploaded successfully.`);
  } catch (err) {
    console.error("Error uploading file:", err);
    message.error("Failed to upload file.");
    throw new Error("Failed to upload file.");
  }
};

interface FileMetadata {
  key: string;
  size: number; // No longer optional
  lastModified: Date; // No longer optional, should always be a Date
}

export const connectToExternalStorage = async ({
  provider,
  bucketName,
  accessKey,
  secretKey,
  region,
  accountName,
  containerName,
  sasToken,
}): Promise<FileMetadata[]> => {
  const metadata: FileMetadata[] = [];

  try {
    if (provider.toLowerCase() === "aws s3") {
      if (!bucketName || !accessKey || !secretKey || !region) {
        throw new Error("Missing required information for AWS S3 connection.");
      }

      const externalS3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
      });

      const response = await externalS3Client.send(command);
      if (response.Contents) {
        metadata.push(
          ...response.Contents.map((file) => ({
            key: file.Key || "",
            size: file.Size || 0,
            lastModified: file.LastModified
              ? new Date(file.LastModified)
              : new Date(),
          }))
        );
      }
    } else if (provider.toLowerCase() === "azure blob") {
      if (!sasToken || !containerName) {
        throw new Error(
          "Missing required information for Azure Blob Storage connection."
        );
      }

      const blobServiceUrl = `https://${accountName}.blob.core.windows.net/${containerName}?${sasToken}`;
      const containerClient = new BlobServiceClient(blobServiceUrl).getContainerClient(
        containerName
      );

      for await (const blob of containerClient.listBlobsFlat()) {
        metadata.push({
          key: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified
            ? new Date(blob.properties.lastModified)
            : new Date(),
        });
      }
    } else {
      throw new Error(`Provider "${provider}" is not supported.`);
    }
  } catch (err) {
    console.error(`Error connecting to ${provider}:`, err);
    throw new Error(`Failed to fetch metadata from ${provider}.`);
  }

  return metadata;
};

export const insertMetadataToInternalS3 = async (
  bucketName: string,
  volumeName: string,
  metadata: Array<{ key: string; size: number; lastModified: Date }>
) => {
  if (!metadata || metadata.length === 0) {
    throw new Error("No metadata to insert.");
  }

  try {
    // Insert metadata into the existing table
    const insertQueries = metadata.map(({ key, size, lastModified }) => {
      const timestamp = lastModified.toISOString(); // Ensure lastModified is always a valid ISO string
      return `INSERT INTO ${volumeName} VALUES ('${key}', ${size}, timestamp '${timestamp}');`;
    });

    // Execute all insert queries
    for (const query of insertQueries) {
      await executeAthenaQuery(
        "AwsDataCatalog",
        "metadata-db",
        query
      );
    }

    console.log("Metadata inserted successfully.");
  } catch (err) {
    console.error("Error inserting metadata to internal S3:", err);
    throw new Error("Failed to insert metadata.");
  }
};
