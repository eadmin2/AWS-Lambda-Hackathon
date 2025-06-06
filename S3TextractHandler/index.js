import { createClient } from "@supabase/supabase-js";
import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
} from "@aws-sdk/client-textract";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = "us-east-2";
const textractClient = new TextractClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// AWS S3 bucket for processing
const AWS_S3_BUCKET = "my-receipts-app-bucket";

// Medical document queries for Textract
const MEDICAL_QUERIES = [
  { Text: "Patient Name" },
  { Text: "Date of Service" },
  { Text: "Provider Name" },
  { Text: "Facility Name" },
  { Text: "Diagnosis" },
  { Text: "Medications" },
  { Text: "Vital Signs" },
  { Text: "Lab Results" },
  { Text: "Procedures" },
  { Text: "Chief Complaint" },
  { Text: "Treatment Plan" },
  { Text: "Follow-up Instructions" },
];

// Chunking strategy for RAG
const CHUNK_CONFIG = {
  maxChunkSize: 1000, // characters
  overlapSize: 200, // overlap between chunks
  minChunkSize: 100, // minimum viable chunk size
};

// Helper function to create text chunks optimized for RAG
const createTextChunks = (text, pageNumber = 1) => {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // Check if adding this sentence would exceed chunk size
    const potentialChunk =
      currentChunk + (currentChunk ? ". " : "") + trimmedSentence;

    if (
      potentialChunk.length > CHUNK_CONFIG.maxChunkSize &&
      currentChunk.length > CHUNK_CONFIG.minChunkSize
    ) {
      // Save current chunk
      chunks.push({
        index: chunkIndex++,
        content: currentChunk + ".",
        pageNumber,
        wordCount: currentChunk.split(/\s+/).length,
        charCount: currentChunk.length,
      });

      // Start new chunk with overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(
        -Math.floor(CHUNK_CONFIG.overlapSize / 6),
      ); // rough estimate
      currentChunk = overlapWords.join(" ") + ". " + trimmedSentence;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk if it exists
  if (currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
    chunks.push({
      index: chunkIndex,
      content: currentChunk + ".",
      pageNumber,
      wordCount: currentChunk.split(/\s+/).length,
      charCount: currentChunk.length,
    });
  }

  return chunks;
};

// Extract form fields from Textract blocks
const extractFormFields = (blocks) => {
  const formFields = {};
  const keyBlocks = blocks.filter(
    (block) =>
      block.BlockType === "KEY_VALUE_SET" && block.EntityTypes?.includes("KEY"),
  );

  keyBlocks.forEach((keyBlock) => {
    const valueRelationship = keyBlock.Relationships?.find(
      (rel) => rel.Type === "VALUE",
    );
    if (valueRelationship) {
      const valueBlockId = valueRelationship.Ids[0];
      const valueBlock = blocks.find((block) => block.Id === valueBlockId);

      const keyText = getTextFromBlock(keyBlock, blocks);
      const valueText = getTextFromBlock(valueBlock, blocks);

      if (keyText && valueText) {
        formFields[keyText.trim()] = valueText.trim();
      }
    }
  });

  return formFields;
};

// Extract signatures from Textract blocks
const extractSignatures = (blocks) => {
  return blocks
    .filter((block) => block.BlockType === "SIGNATURE")
    .map((block) => ({
      confidence: block.Confidence,
      page: block.Page,
      boundingBox: block.Geometry?.BoundingBox,
    }));
};

// Calculate average confidence
const calculateAverageConfidence = (blocks) => {
  const confidenceScores = blocks
    .filter((block) => block.Confidence)
    .map((block) => block.Confidence);

  return confidenceScores.length > 0
    ? confidenceScores.reduce((sum, conf) => sum + conf, 0) /
        confidenceScores.length
    : 0;
};

// Get text from a block and its children
const getTextFromBlock = (block, allBlocks) => {
  if (block?.Text) return block.Text;

  const childRelationship = block?.Relationships?.find(
    (rel) => rel.Type === "CHILD",
  );
  if (childRelationship) {
    return childRelationship.Ids.map((id) => allBlocks.find((b) => b.Id === id))
      .filter((childBlock) => childBlock?.Text)
      .map((childBlock) => childBlock.Text)
      .join(" ");
  }

  return "";
};

// Process Textract results for RAG optimization
const processTextractForRAG = async (blocks, documentId) => {
  const processedData = {
    fullText: "",
    chunks: [],
    entities: [],
    formFields: {},
    signatures: [],
    tables: [],
  };

  // Extract form fields
  processedData.formFields = extractFormFields(blocks);

  // Extract signatures
  processedData.signatures = extractSignatures(blocks);

  // Extract text by page
  const pageTexts = new Map();
  const entities = [];

  // Process different block types
  blocks.forEach((block) => {
    const pageNum = block.Page || 1;

    switch (block.BlockType) {
      case "LINE":
        if (!pageTexts.has(pageNum)) pageTexts.set(pageNum, []);
        pageTexts.get(pageNum).push(block.Text);
        break;

      case "KEY_VALUE_SET":
        if (block.EntityTypes?.includes("KEY")) {
          const valueBlock = blocks.find((b) =>
            block.Relationships?.find(
              (rel) => rel.Type === "VALUE" && rel.Ids?.includes(b.Id),
            ),
          );

          if (valueBlock) {
            entities.push({
              entityType: normalizeEntityType(getTextFromBlock(block, blocks)),
              entityValue: getTextFromBlock(valueBlock, blocks),
              confidence: block.Confidence,
              boundingBox: block.Geometry?.BoundingBox,
              pageNumber: pageNum,
            });
          }
        }
        break;

      case "TABLE":
        // Process tables for structured data
        processedData.tables.push(processTableBlock(block, blocks));
        break;
    }
  });

  // Create full text and chunks
  let fullText = "";
  for (const [pageNum, texts] of pageTexts.entries()) {
    const pageText = texts.join(" ");
    fullText += pageText + "\n\n";

    // Create chunks for this page
    const pageChunks = createTextChunks(pageText, pageNum);
    processedData.chunks.push(...pageChunks);
  }

  processedData.fullText = fullText.trim();
  processedData.entities = entities;

  return processedData;
};

// Normalize entity types for consistent storage
const normalizeEntityType = (text) => {
  if (!text) return "unknown";
  const normalized = text.toLowerCase().trim();
  const mappings = {
    "patient name": "patient_name",
    "date of service": "service_date",
    "provider name": "provider_name",
    "facility name": "facility_name",
    diagnosis: "diagnosis",
    medication: "medication",
    "vital signs": "vital_signs",
    "lab results": "lab_results",
  };

  return mappings[normalized] || normalized.replace(/\s+/g, "_");
};

// Process table blocks
const processTableBlock = (tableBlock, allBlocks) => {
  const cells = allBlocks.filter(
    (block) =>
      block.BlockType === "CELL" &&
      block.Relationships?.some((rel) => rel.Ids?.includes(tableBlock.Id)),
  );

  const table = { rows: [], headers: [], confidence: tableBlock.Confidence };
  const cellMap = new Map();

  cells.forEach((cell) => {
    const key = `${cell.RowIndex}-${cell.ColumnIndex}`;
    cellMap.set(key, getTextFromBlock(cell, allBlocks) || "");
  });

  // Extract headers and data
  const maxRow = Math.max(...cells.map((c) => c.RowIndex));
  const maxCol = Math.max(...cells.map((c) => c.ColumnIndex));

  for (let row = 1; row <= maxRow; row++) {
    const rowData = [];
    for (let col = 1; col <= maxCol; col++) {
      rowData.push(cellMap.get(`${row}-${col}`) || "");
    }

    if (row === 1) {
      table.headers = rowData;
    } else {
      table.rows.push(rowData);
    }
  }

  return table;
};

// Main Lambda handler
export const handler = async (event) => {
  const requestId = uuidv4();
  console.log("Request ID:", requestId);
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Handle S3 trigger from AWS S3 bucket - FIXED EVENT MATCHING
    if (
      event.Records &&
      event.Records[0].eventSource === "aws:s3" &&
      event.Records[0].eventName?.includes("ObjectCreated")
    ) {
      return await handleS3Upload(event, requestId);
    }

    // Handle Textract job completion (SNS notification)
    if (event.Records && event.Records[0].EventSource === "aws:sns") {
      return await handleSNSNotification(event, requestId);
    }

    // Handle API Gateway requests
    if (event.requestContext || event.httpMethod) {
      return await handleApiRequest(event, requestId);
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Unsupported event type", requestId }),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, requestId }),
    };
  }
};

// Handle SNS notifications from Textract
const handleSNSNotification = async (event, requestId) => {
  try {
    console.log("Raw SNS Event:", JSON.stringify(event, null, 2));

    const snsRecord = event.Records[0];
    const message = snsRecord.Sns.Message;

    console.log("Raw SNS Message:", message);

    let snsMessage;
    try {
      snsMessage = JSON.parse(message);
    } catch (parseError) {
      console.error("Failed to parse SNS message as JSON:", parseError);
      console.log("Attempting to extract JobId and Status manually...");

      // Try to extract JobId and Status manually for malformed JSON
      const jobIdMatch = message.match(/JobId[:\s]*([^,}]+)/);
      const statusMatch = message.match(/Status[:\s]*([^,}]+)/);

      if (jobIdMatch && statusMatch) {
        snsMessage = {
          JobId: jobIdMatch[1].trim().replace(/['"]/g, ""),
          Status: statusMatch[1].trim().replace(/['"]/g, ""),
        };
        console.log("Manually extracted:", snsMessage);
      } else {
        throw new Error("Could not extract JobId and Status from message");
      }
    }

    const jobId = snsMessage.JobId;
    const status = snsMessage.Status;

    console.log(`Received Textract notification for job ${jobId}: ${status}`);

    if (status === "SUCCEEDED") {
      await handleTextractCompletion(jobId);
    } else if (status === "FAILED") {
      console.log(`Textract job ${jobId} failed`);
      // Update job status to failed
      await supabase
        .from("textract_jobs")
        .update({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error_message: snsMessage.StatusMessage || "Job failed",
        })
        .eq("aws_job_id", jobId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SNS notification processed",
        requestId,
      }),
    };
  } catch (error) {
    console.error("SNS handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, requestId }),
    };
  }
};

// Handle S3 upload from AWS S3 bucket
const handleS3Upload = async (event, requestId) => {
  try {
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const filePath = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " "),
    );

    console.log(
      `Processing uploaded file: ${filePath} from AWS S3 bucket: ${bucketName}`,
    );

    // Validate bucket
    if (bucketName !== AWS_S3_BUCKET) {
      console.error(
        `Unexpected bucket: ${bucketName}, expected: ${AWS_S3_BUCKET}`,
      );
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid bucket", requestId }),
      };
    }

    // Extract user ID and file name from path
    const pathParts = filePath.split("/");
    console.log("Path parts:", pathParts);

    let userId, fileName;

    if (pathParts.length === 1) {
      // File at root level - use default user ID for testing
      fileName = pathParts[0];
      userId = "a6d6193f-d326-4c14-b7fb-9e9cd3e2cd63"; // Default user ID
      console.log("Root level file detected, using default userId:", userId);
    } else if (pathParts.length >= 2) {
      // File in user folder structure: userId/filename.ext
      userId = pathParts[0];
      fileName = pathParts[pathParts.length - 1];
    } else {
      console.error("Invalid file path format:", filePath);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid file path format", requestId }),
      };
    }

    console.log("Extracted userId:", userId);
    console.log("Extracted fileName:", fileName);

    // Validate that userId is a valid UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error("Invalid user ID format:", userId);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid user ID format", requestId }),
      };
    }

    // Create document record in Supabase
    const documentId = uuidv4();

    const { error } = await supabase.from("documents").insert({
      id: documentId,
      user_id: userId,
      file_name: fileName,
      document_name: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
      file_url: `https://${bucketName}.s3.${REGION}.amazonaws.com/${filePath}`,
      upload_status: "uploaded",
      processing_status: "processing",
      textract_status: "processing",
      document_type: "medical_record",
      uploaded_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to create document record:", error);
      throw new Error("Failed to create document record");
    }

    // Start Textract processing
    return await startTextractProcessing(
      bucketName,
      filePath,
      documentId,
      userId,
      requestId,
    );
  } catch (error) {
    console.error("S3 upload handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, requestId }),
    };
  }
};

// Start Textract processing with AWS S3
const startTextractProcessing = async (
  bucketName,
  filePath,
  documentId,
  userId,
  requestId,
) => {
  try {
    console.log(
      `[DEBUG] Starting Textract for AWS S3: s3://${bucketName}/${filePath}`,
    );

    // Test S3 access first
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });

    const headResult = await s3Client.send(headCommand);
    console.log(
      `[DEBUG] S3 object confirmed: ${headResult.ContentLength} bytes, ${headResult.ContentType}`,
    );

    // Start async Textract processing (works with AWS S3)
    const command = new StartDocumentAnalysisCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: filePath,
        },
      },
      FeatureTypes: ["TABLES", "FORMS", "QUERIES", "SIGNATURES"],
      QueriesConfig: {
        Queries: MEDICAL_QUERIES,
      },
      NotificationChannel: {
        SNSTopicArn: "arn:aws:sns:us-east-2:281439767132:textract-completion",
        RoleArn: "arn:aws:iam::281439767132:role/TextractServiceRole",
      },
    });

    const result = await textractClient.send(command);
    const awsJobId = result.JobId;

    console.log(
      `[SUCCESS] Started Textract job ${awsJobId} for document ${documentId}`,
    );

    // Store job in Supabase
    const { error: jobError } = await supabase.from("textract_jobs").insert({
      id: uuidv4(),
      document_id: documentId,
      aws_job_id: awsJobId,
      status: "PROCESSING",
      started_at: new Date().toISOString(),
    });

    if (jobError) {
      console.error("Failed to store Textract job:", jobError);
      throw new Error("Failed to store job information");
    }

    // Update document with job ID
    const { error: docError } = await supabase
      .from("documents")
      .update({ textract_job_id: awsJobId })
      .eq("id", documentId);

    if (docError) {
      console.error("Failed to update document with job ID:", docError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Textract processing started successfully",
        jobId: awsJobId,
        documentId,
        requestId,
        s3Location: `s3://${bucketName}/${filePath}`,
      }),
    };
  } catch (error) {
    console.error("Textract processing error:", error);

    // Update document status to error
    await supabase
      .from("documents")
      .update({
        processing_status: "failed",
        textract_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    throw error;
  }
};

// Handle Textract job completion (this would be called by SNS notification or polling)
const handleTextractCompletion = async (awsJobId) => {
  try {
    // Get job completion status
    const command = new GetDocumentAnalysisCommand({ JobId: awsJobId });
    const result = await textractClient.send(command);

    if (result.JobStatus !== "SUCCEEDED") {
      console.error(
        `Textract job ${awsJobId} failed with status: ${result.JobStatus}`,
      );

      // Update job status
      await supabase
        .from("textract_jobs")
        .update({
          status: result.JobStatus,
          completed_at: new Date().toISOString(),
          error_message: result.StatusMessage || "Job failed",
        })
        .eq("aws_job_id", awsJobId);

      return;
    }

    // Get document information
    const { data: jobData } = await supabase
      .from("textract_jobs")
      .select("document_id")
      .eq("aws_job_id", awsJobId)
      .single();

    if (!jobData) {
      console.error("Job not found in database:", awsJobId);
      return;
    }

    // Process results for RAG
    const processedData = await processTextractForRAG(
      result.Blocks,
      jobData.document_id,
    );

    // Calculate confidence and prepare updates
    const avgConfidence = calculateAverageConfidence(result.Blocks);
    const signatures = processedData.signatures;

    // Store chunks in database
    if (processedData.chunks.length > 0) {
      const chunkInserts = processedData.chunks.map((chunk, index) => ({
        id: uuidv4(),
        document_id: jobData.document_id,
        chunk_index: index,
        page_number: chunk.pageNumber,
        content: chunk.content,
        content_type: "text",
        word_count: chunk.wordCount,
        char_count: chunk.charCount,
        confidence_score: avgConfidence / 100,
      }));

      const { error: chunksError } = await supabase
        .from("document_chunks")
        .insert(chunkInserts);

      if (chunksError) {
        console.error("Failed to insert chunks:", chunksError);
      }
    }

    // Store entities
    if (processedData.entities.length > 0) {
      const entityInserts = processedData.entities.map((entity) => ({
        id: uuidv4(),
        document_id: jobData.document_id,
        entity_type: entity.entityType,
        entity_value: entity.entityValue,
        confidence_score: entity.confidence / 100,
        bounding_box: entity.boundingBox,
      }));

      const { error: entitiesError } = await supabase
        .from("medical_entities")
        .insert(entityInserts);

      if (entitiesError) {
        console.error("Failed to insert entities:", entitiesError);
      }
    }

    // Update document and job status
    await Promise.all([
      supabase
        .from("documents")
        .update({
          processing_status: "completed",
          textract_status: "completed",
          processed_at: new Date().toISOString(),
          total_chunks: processedData.chunks.length,
          textract_form_fields: processedData.formFields,
          textract_confidence: avgConfidence,
          has_signatures: signatures.length > 0,
          signature_count: signatures.length,
          total_pages: Math.max(...result.Blocks.map((b) => b.Page || 1)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobData.document_id),

      supabase
        .from("textract_jobs")
        .update({
          status: "SUCCEEDED",
          completed_at: new Date().toISOString(),
          raw_output: result.Blocks,
        })
        .eq("aws_job_id", awsJobId),
    ]);

    console.log(`Successfully processed document ${jobData.document_id}`);
  } catch (error) {
    console.error("Error processing Textract completion:", error);

    // Update job status to failed
    await supabase
      .from("textract_jobs")
      .update({
        status: "FAILED",
        completed_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq("aws_job_id", awsJobId);
  }
};

// --- Secure S3 Pre-Signed URL Endpoint ---
// This endpoint generates a pre-signed S3 URL for a given file key if the user is authorized.
// To use: call /get-s3-url?key={fileKey}&userId={userId} (GET or POST)
async function handleGetS3Url(event, requestId) {
  try {
    let key, userId;
    if (event.httpMethod === "POST" && event.body) {
      const body = JSON.parse(event.body);
      key = body.key;
      userId = body.userId;
    } else if (event.queryStringParameters) {
      key = event.queryStringParameters.key;
      userId = event.queryStringParameters.userId;
    }
    if (!key || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing key or userId", requestId }),
      };
    }

    // Check that the user is authorized to access this file
    // (Look up the document in Supabase and verify userId matches)
    const { data: doc, error } = await supabase
      .from("documents")
      .select("user_id, file_name")
      .eq("user_id", userId)
      .like("file_url", `%/${key}`)
      .maybeSingle();
    if (error || !doc) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Unauthorized or file not found",
          requestId,
        }),
      };
    }

    // Generate a pre-signed URL for the file
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // 5 min
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate signed URL",
        requestId,
      }),
    };
  }
}

// Update API Gateway handler to route /get-s3-url requests
const handleApiRequest = async (event, requestId) => {
  // Route for secure S3 pre-signed URL
  if (
    (event.path && event.path.endsWith("/get-s3-url")) ||
    (event.rawPath && event.rawPath.endsWith("/get-s3-url"))
  ) {
    return await handleGetS3Url(event, requestId);
  }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "API endpoint placeholder", requestId }),
  };
};
