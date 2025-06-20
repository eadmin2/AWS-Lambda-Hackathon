import { createClient } from "@supabase/supabase-js";
import * as Textract from "@aws-sdk/client-textract";
import { v4 as uuidv4 } from "uuid";
import * as S3 from "@aws-sdk/client-s3";
import * as S3RequestPresigner from "@aws-sdk/s3-request-presigner";
import * as SQS from "@aws-sdk/client-sqs";

const REGION = "us-east-2";
const textractClient = new Textract.TextractClient({ region: REGION });
const s3Client = new S3.S3Client({ region: REGION });
const sqsClient = new SQS.SQSClient({ region: REGION });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Updated environment variables
const AWS_S3_BUCKET = "my-receipts-app-bucket";

// SEPARATE QUEUES
const TEXTRACT_COMPLETION_QUEUE = "https://sqs.us-east-2.amazonaws.com/281439767132/RagAgentQueue"; // Current queue for Textract notifications
const RAG_WORK_QUEUE = "https://sqs.us-east-2.amazonaws.com/281439767132/RagWorkQueue"; // New queue for RAG work

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

// Chunking strategy for RAG - optimized for medical documents
const CHUNK_CONFIG = {
  maxChunkSize: 8000, // characters - increased to capture more medical content
  overlapSize: 800, // overlap between chunks - increased for better context
  minChunkSize: 500, // minimum viable chunk size - increased for medical content
};

// Helper function to create text chunks optimized for medical documents
const createMedicalTextChunks = (text, pageNumber = 1, startingChunkIndex = 0) => {
  const chunks = [];
  let chunkIndex = startingChunkIndex;
  
  // Split by lines first to preserve medical document structure
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  let currentChunk = "";
  let currentLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Check if adding this line would exceed chunk size
    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + trimmedLine;
    
    if (potentialChunk.length > CHUNK_CONFIG.maxChunkSize && 
        currentChunk.length > CHUNK_CONFIG.minChunkSize) {
      
      // Save current chunk
      chunks.push({
        index: chunkIndex++,
        content: currentChunk,
        pageNumber,
        wordCount: currentChunk.split(/\s+/).length,
        charCount: currentChunk.length,
        lineCount: currentLines.length
      });
      
      // Start new chunk with overlap (keep last few lines for context)
      const overlapLines = currentLines.slice(-3); // Keep last 3 lines for context
      currentLines = [...overlapLines, trimmedLine];
      currentChunk = currentLines.join('\n');
    } else {
      currentLines.push(trimmedLine);
      currentChunk = potentialChunk;
    }
  }
  
  // Add final chunk if it exists
  if (currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
    chunks.push({
      index: chunkIndex,
      content: currentChunk,
      pageNumber,
      wordCount: currentChunk.split(/\s+/).length,
      charCount: currentChunk.length,
      lineCount: currentLines.length
    });
  }
  
  return chunks;
};

// Legacy function for backward compatibility
const createTextChunks = createMedicalTextChunks;

// Helper to update document status consistently
const updateDocumentStatus = async (
  documentId,
  { processing_status, textract_status, error_message },
) => {
  const updatePayload = { updated_at: new Date().toISOString() };
  if (processing_status) updatePayload.processing_status = processing_status;
  if (textract_status) updatePayload.textract_status = textract_status;
  if (error_message) updatePayload.error_message = error_message;

  console.log(`Updating document ${documentId} with:`, updatePayload);

  const { error } = await supabase
    .from("documents")
    .update(updatePayload)
    .eq("id", documentId);

  if (error) {
    console.error(`Failed to update status for document ${documentId}:`, error);
  }
};

// Updated notification function - now sends to dedicated RAG work queue
const notifyRagAgentViaSQS = async (userId, documentId) => {
  console.log(`Sending RAG work message for document ${documentId} to queue ${RAG_WORK_QUEUE}`);
  try {
    // Determine if this is a FIFO queue
    const isFifoQueue = RAG_WORK_QUEUE.endsWith('.fifo');
    
    const messageCommand = {
      QueueUrl: RAG_WORK_QUEUE, // Send to dedicated RAG work queue
      MessageBody: JSON.stringify({
        user_id: userId,
        document_id: documentId,
        timestamp: new Date().toISOString(),
        source: "document_processor"
      }),
    };
    
    // Add FIFO-specific parameters if needed
    if (isFifoQueue) {
      messageCommand.MessageGroupId = documentId;
      messageCommand.MessageDeduplicationId = `${documentId}-${Date.now()}`;
      console.log(`Using FIFO queue parameters for document ${documentId}`);
    }
    
    const command = new SQS.SendMessageCommand(messageCommand);
    await sqsClient.send(command);
    console.log(`✅ Successfully sent RAG work message for document ${documentId}`);
  } catch (error) {
    console.error(`Failed to send RAG work message for document ${documentId}:`, error);
    await updateDocumentStatus(documentId, {
        processing_status: 'failed',
        error_message: 'Failed to queue for RAG processing.'
    });
    throw new Error(`Failed to notify RAG agent via SQS: ${error.message}`);
  }
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

  // Extract text by page - ONLY use LINE blocks to avoid duplication
  const pageTexts = new Map();
  const entities = [];

  // Process different block types
  blocks.forEach((block) => {
    const pageNum = block.Page || 1;

    switch (block.BlockType) {
      case "LINE":
        // Only process LINE blocks for text extraction
        if (!pageTexts.has(pageNum)) pageTexts.set(pageNum, []);
        if (block.Text && block.Text.trim()) {
          pageTexts.get(pageNum).push(block.Text.trim());
        }
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

  // Create full text and chunks with better preservation
  let fullText = "";
  let allChunks = [];
  
  for (const [pageNum, texts] of pageTexts.entries()) {
    const pageText = texts.join("\n"); // Use newlines to preserve structure
    fullText += `\n\n=== PAGE ${pageNum} ===\n` + pageText;

    // Create chunks for this page, passing the current size of allChunks as the starting index
    const pageChunks = createMedicalTextChunks(pageText, pageNum, allChunks.length);
    allChunks.push(...pageChunks);
  }

  processedData.fullText = fullText.trim();
  processedData.chunks = allChunks;
  processedData.entities = entities;

  console.log(`[DEBUG] Text extraction complete:`);
  console.log(`- Full text length: ${processedData.fullText.length} characters`);
  console.log(`- Total chunks: ${processedData.chunks.length}`);
  console.log(`- Chunks details:`, processedData.chunks.map(c => ({ 
    index: c.index, 
    page: c.pageNumber, 
    charCount: c.charCount 
  })));

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

// Main Lambda handler - FIXED with SQS support
export const handler = async (event) => {
  const requestId = uuidv4();
  console.log("Request ID:", requestId);
  
  // DEBUG: Check environment variables
  console.log("=== ENVIRONMENT CHECK ===");
  console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("Supabase client configured:", !!supabase);
  
  // Check if Supabase is working
  try {
    const { data, error } = await supabase.from("documents").select("count").limit(1);
    console.log("Supabase connection test:", error ? "FAILED" : "SUCCESS");
    if (error) console.error("Supabase error:", error);
  } catch (dbError) {
    console.error("Supabase connection failed:", dbError);
  }
  
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Handle S3 trigger from AWS S3 bucket
    if (
      event.Records &&
      event.Records[0].eventSource === "aws:s3" &&
      event.Records[0].eventName?.includes("ObjectCreated")
    ) {
      return await handleS3Upload(event, requestId);
    }

    // Simplified SQS handler - only handles Textract notifications now
    if (
      event.Records &&
      event.Records[0].eventSource === "aws:sqs"
    ) {
      console.log("SQS event detected - processing Textract notification");
      
      try {
        const sqsRecord = event.Records[0];
        const messageBody = JSON.parse(sqsRecord.body);
        
        // This queue now ONLY receives Textract SNS notifications
        if (messageBody.Type === "Notification" && messageBody.TopicArn && messageBody.Message) {
          console.log("📄 Textract SNS notification detected - processing");
          
          const snsEvent = {
            Records: [{
              Sns: {
                Message: messageBody.Message,
                MessageId: messageBody.MessageId,
                TopicArn: messageBody.TopicArn
              }
            }]
          };
          
          return await handleSNSNotification(snsEvent, requestId);
        } else {
          console.error("❓ Unexpected message format in Textract completion queue:", messageBody);
          throw new Error("Unexpected message format");
        }
        
      } catch (error) {
        console.error("❌ Error processing SQS message:", error);
        throw error;
      }
    }

    // Handle direct SNS notifications (if not going through SQS)
    if (event.Records && 
        (event.Records[0].EventSource === "aws:sns" || 
         event.Records[0].eventSource === "aws:sns" ||
         (event.Records[0].Sns && event.Records[0].EventSubscriptionArn))) {
      console.log("Direct SNS notification detected");
      return await handleSNSNotification(event, requestId);
    }

    // Handle direct invocation for get-s3-url (plain event with key/userId)
    if (event.key) {
      const userId = event.userId || event.userid || null;
      return await handleGetS3Url({
        httpMethod: "POST",
        body: JSON.stringify({ key: event.key, userId }),
      }, requestId);
    }

    // Handle API Gateway requests
    if (event.requestContext || event.httpMethod) {
      return await handleApiRequest(event, requestId);
    }

    console.log("Unsupported event type detected");
    console.log("Event structure:", {
      hasRecords: !!event.Records,
      firstRecordEventSource: event.Records?.[0]?.eventSource,
      firstRecordEventName: event.Records?.[0]?.eventName,
      hasRequestContext: !!event.requestContext,
      hasHttpMethod: !!event.httpMethod
    });

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

// Enhanced SNS notification handler with better logging
const handleSNSNotification = async (event, requestId) => {
  try {
    console.log("=== SNS NOTIFICATION RECEIVED ===");
    console.log("Request ID:", requestId);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Raw SNS Event:", JSON.stringify(event, null, 2));

    // Check if we have a valid SNS record structure
    if (!event.Records || !event.Records[0] || !event.Records[0].Sns) {
      console.error("Invalid SNS event structure:", JSON.stringify(event, null, 2));
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Invalid SNS event structure", 
          requestId,
          timestamp: new Date().toISOString()
        }),
      };
    }

    const snsRecord = event.Records[0];
    const message = snsRecord.Sns.Message;
    const messageId = snsRecord.Sns.MessageId;
    const topicArn = snsRecord.Sns.TopicArn;

    console.log("SNS Message ID:", messageId);
    console.log("SNS Topic ARN:", topicArn);
    console.log("Raw SNS Message:", message);

    let snsMessage;
    try {
      snsMessage = JSON.parse(message);
      console.log("Parsed SNS Message:", JSON.stringify(snsMessage, null, 2));
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

    console.log(`=== PROCESSING TEXTRACT JOB ===`);
    console.log(`Job ID: ${jobId}`);
    console.log(`Status: ${status}`);
    console.log(`Processing started at: ${new Date().toISOString()}`);

    if (status === "SUCCEEDED") {
      console.log(`✅ Textract job ${jobId} succeeded - processing results`);
      const result = await handleTextractCompletion(jobId);
      console.log(`✅ Successfully processed Textract job ${jobId}`);

      if (!result || !result.documentId) {
        throw new Error(
          `handleTextractCompletion failed to return a documentId for job ${jobId}`,
        );
      }
      const { documentId } = result;

      const { data: document, error: docError } = await supabase
        .from("documents")
        .select("id, user_id")
        .eq("id", documentId)
        .single();

      if (docError || !document) {
        console.error(
          `Failed to get document details for RAG notification:`,
          docError,
        );
        throw new Error(
          `Could not retrieve document details for RAG notification for document ${documentId}`,
        );
      }

      // Notify the rag-agent to process the document via SQS
      try {
        await notifyRagAgentViaSQS(document.user_id, document.id);
        console.log(`✅ Successfully notified RAG agent for document ${document.id}`);
      } catch (error) {
        console.error("Error notifying RAG agent via SQS:", error);
        // The error is already logged and document status updated in notifyRagAgentViaSQS
        throw error; // Re-throw to fail the overall execution
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Document processed successfully",
          documentId: document.id
        })
      };
    } else if (status === "FAILED") {
      console.log(`❌ Textract job ${jobId} failed`);
      console.log("Status Message:", snsMessage.StatusMessage || "No status message provided");
      
      // Update job status to failed
      await supabase
        .from("textract_jobs")
        .update({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error_message: snsMessage.StatusMessage || "Job failed",
        })
        .eq("aws_job_id", jobId);
        
      console.log(`❌ Updated job ${jobId} status to FAILED in database`);
    } else {
      console.log(`⚠️ Unknown status received: ${status}`);
    }

    console.log("=== SNS NOTIFICATION PROCESSING COMPLETE ===");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SNS notification processed successfully",
        jobId,
        status,
        requestId,
        processedAt: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error("=== SNS NOTIFICATION ERROR ===");
    console.error("Error processing SNS notification:", error);
    console.error("Error stack:", error.stack);
    console.error("Request ID:", requestId);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message, 
        requestId,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

// Handle S3 upload from AWS S3 bucket - IDEMPOTENT VERSION
const handleS3Upload = async (event, requestId) => {
  try {
    const record = event.Records[0];
    const bucketName = record.s3.bucket.name;
    const filePath = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " "),
    );
    const eventName = record.eventName;

    console.log(`=== S3 UPLOAD EVENT RECEIVED ===`);
    console.log(`Event: ${eventName}`);
    console.log(`File: ${filePath}`);
    console.log(`Bucket: ${bucketName}`);
    console.log(`Request ID: ${requestId}`);

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

    // CHECK FOR EXISTING DOCUMENT - PREVENT DUPLICATES
    const fileUrl = `https://${bucketName}.s3.${REGION}.amazonaws.com/${filePath}`;
    
    console.log("=== CHECKING FOR EXISTING DOCUMENT ===");
    console.log("File URL:", fileUrl);
    
    const { data: existingDoc, error: checkError } = await supabase
      .from("documents")
      .select("id, processing_status, textract_status, uploaded_at")
      .eq("user_id", userId)
      .eq("file_url", fileUrl)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing document:", checkError);
      // Continue anyway - don't fail on check error
    }

    if (existingDoc) {
      console.log(`=== EXISTING DOCUMENT FOUND ===`);
      console.log(`Document ID: ${existingDoc.id}`);
      console.log(`Uploaded: ${existingDoc.uploaded_at}`);
      console.log(`Processing Status: ${existingDoc.processing_status}`);
      console.log(`Textract Status: ${existingDoc.textract_status}`);
      
      if (existingDoc.processing_status === "processing" && 
          existingDoc.textract_status === "processing") {
        console.log("✅ Document already being processed - skipping duplicate");
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Document already exists and is being processed",
            documentId: existingDoc.id,
            status: "duplicate_skipped",
            requestId,
          }),
        };
      }
      
      if (existingDoc.processing_status === "completed") {
        console.log("✅ Document already completed - skipping duplicate");
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Document already completed",
            documentId: existingDoc.id,
            status: "already_completed",
            requestId,
          }),
        };
      }
      
      if (existingDoc.processing_status === "failed" || 
          existingDoc.textract_status === "pending" ||
          existingDoc.textract_status === "failed") {
        console.log("🔄 Document exists but failed or pending - retrying processing");
        
        await supabase
          .from("documents")
          .update({
            processing_status: "processing",
            textract_status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDoc.id);

        return await startTextractProcessing(
          bucketName,
          filePath,
          existingDoc.id,
          userId,
          requestId,
        );
      }
    }

    // Create new document record only if it doesn't exist
    const documentId = uuidv4();
    console.log("=== CREATING NEW DOCUMENT ===");
    console.log("Document ID:", documentId);

    const { error } = await supabase.from("documents").insert({
      id: documentId,
      user_id: userId,
      file_name: fileName,
      document_name: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
      file_url: fileUrl,
      upload_status: "uploaded",
      processing_status: "processing",
      textract_status: "processing",
      document_type: "medical_record",
      uploaded_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to create document record:", error);
      
      // Check if this is a unique constraint violation (duplicate)
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        console.log("🔍 Duplicate document detected during insert - checking existing record");
        // Try to get the existing document
        const { data: duplicateDoc } = await supabase
          .from("documents")
          .select("id")
          .eq("user_id", userId)
          .eq("file_url", fileUrl)
          .single();
          
        if (duplicateDoc) {
          console.log("✅ Using existing document ID:", duplicateDoc.id);
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: "Document already exists",
              documentId: duplicateDoc.id,
              status: "duplicate_found",
              requestId,
            }),
          };
        }
      }
      
      throw new Error("Failed to create document record");
    }

    console.log("✅ Successfully created document record");
    console.log("🚀 Starting Textract processing...");

    // Start Textract processing
    return await startTextractProcessing(
      bucketName,
      filePath,
      documentId,
      userId,
      requestId,
    );
  } catch (error) {
    console.error("=== S3 UPLOAD HANDLER ERROR ===");
    console.error("Error:", error);
    console.error("Request ID:", requestId);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, requestId }),
    };
  }
};

// Start Textract processing with AWS S3 - FIXED VERSION
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

    // REMOVED: HeadObjectCommand check - S3 event already guarantees object exists
    // This was causing the 404 NotFound error
    console.log(`[DEBUG] Proceeding directly to Textract - S3 event confirms object exists`);

    // Start async Textract processing (works with AWS S3)
    const command = new Textract.StartDocumentAnalysisCommand({
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
      JobTag: documentId, // Add JobTag for better tracking
      NotificationChannel: {
        SNSTopicArn: process.env.TEXTRACT_SNS_TOPIC_ARN || "arn:aws:sns:us-east-2:281439767132:textract-completion",
        RoleArn: process.env.TEXTRACT_SNS_ROLE_ARN || "arn:aws:iam::281439767132:role/TextractServiceRole",
      },
    });

    console.log(`[DEBUG] Sending Textract command...`);
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
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });

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

// Get all Textract results with pagination
const getAllTextractResults = async (awsJobId) => {
  const allBlocks = [];
  let nextToken = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`[DEBUG] Fetching Textract results page ${pageCount}${nextToken ? ` with token: ${nextToken.substring(0, 20)}...` : ' (first page)'}`);
    
    const command = new Textract.GetDocumentAnalysisCommand({ 
      JobId: awsJobId,
      NextToken: nextToken 
    });
    
    const result = await textractClient.send(command);
    
    if (result.JobStatus !== "SUCCEEDED") {
      console.error(`Textract job ${awsJobId} failed with status: ${result.JobStatus}`);
      throw new Error(`Textract job failed: ${result.StatusMessage || result.JobStatus}`);
    }
    
    if (result.Blocks && result.Blocks.length > 0) {
      allBlocks.push(...result.Blocks);
      console.log(`[DEBUG] Page ${pageCount}: Added ${result.Blocks.length} blocks (total: ${allBlocks.length})`);
    }
    
    nextToken = result.NextToken;
    
    // Safety check to prevent infinite loops
    if (pageCount > 200) {
      console.warn(`[WARNING] Reached maximum page limit (200) for job ${awsJobId}`);
      break;
    }
    
  } while (nextToken);
  
  console.log(`[SUCCESS] Retrieved all ${allBlocks.length} blocks across ${pageCount} pages`);
  return allBlocks;
};

// Handle Textract job completion (this would be called by SNS notification or polling)
const handleTextractCompletion = async (awsJobId) => {
  let documentId = null;
  try {
    // Get document information first
    const { data: jobData } = await supabase
      .from("textract_jobs")
      .select("document_id")
      .eq("aws_job_id", awsJobId)
      .single();

    if (!jobData || !jobData.document_id) {
      console.error("Job not found in database or document_id is missing:", awsJobId);
      throw new Error(`Job ${awsJobId} not found in DB or has no document_id.`);
    }
    documentId = jobData.document_id;
    
    // Verify document exists before proceeding to prevent race conditions
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
        console.error(`Document ${documentId} not found for job ${awsJobId}. Error: ${docError?.message}`);
        throw new Error(`Document ${documentId} not found, cannot process Textract results.`);
    }

    // Get ALL Textract results with pagination
    console.log(`[DEBUG] Fetching all Textract results for job ${awsJobId}`);
    const allBlocks = await getAllTextractResults(awsJobId);
    
    if (!allBlocks || allBlocks.length === 0) {
      console.error(`No blocks retrieved for job ${awsJobId}`);
      return;
    }

    console.log(`[DEBUG] Retrieved ${allBlocks.length} total blocks from Textract`);

    // Process results for RAG
    const processedData = await processTextractForRAG(
      allBlocks,
      jobData.document_id,
    );

    console.log(`[DEBUG] Textract processing complete:`);
    console.log(`- Blocks processed: ${allBlocks.length}`);
    console.log(`- Full text length: ${processedData.fullText.length}`);
    console.log(`- Chunks created: ${processedData.chunks.length}`);
    console.log(`- Entities found: ${processedData.entities.length}`);
    console.log(`- Form fields: ${Object.keys(processedData.formFields).length}`);
    console.log(`- Tables: ${processedData.tables.length}`);

    // Calculate confidence and prepare updates
    const avgConfidence = calculateAverageConfidence(allBlocks);
    const signatures = processedData.signatures;

    // Store chunks in database
    if (processedData.chunks.length > 0) {
      console.log(`[DEBUG] Storing ${processedData.chunks.length} chunks in database`);
      
      // NEW: Delete existing chunks for this document to prevent duplicates on reprocessing
      console.log(`[CLEANUP] Deleting existing chunks for document ${jobData.document_id}`);
      const { error: deleteError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_id', jobData.document_id);

      if (deleteError) {
        console.error(`[CLEANUP] Failed to delete old chunks:`, deleteError);
        // This is not a fatal error, as the insert would fail anyway.
        // We log it and proceed.
      } else {
        console.log(`[CLEANUP] Successfully deleted old chunks.`);
      }
      
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
      } else {
        console.log(`[SUCCESS] Successfully stored ${processedData.chunks.length} chunks`);
      }
    } else {
      console.warn(`[WARNING] No chunks created for document ${jobData.document_id}`);
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
          total_pages: Math.max(...allBlocks.map((b) => b.Page || 1)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobData.document_id),

      supabase
        .from("textract_jobs")
        .update({
          status: "SUCCEEDED",
          completed_at: new Date().toISOString(),
          raw_output: allBlocks.slice(0, 1000), // Store first 1000 blocks to avoid size limits
        })
        .eq("aws_job_id", awsJobId),
    ]);

    console.log(`Successfully processed document ${jobData.document_id}`);
    return { documentId: jobData.document_id };
  } catch (error) {
    console.error("Error processing Textract completion:", error);

    if (documentId) {
      await updateDocumentStatus(documentId, {
        processing_status: "failed",
        textract_status: "failed",
        error_message: `Textract completion failed: ${error.message}`,
      });
    }

    // Update job status to failed
    await supabase
      .from("textract_jobs")
      .update({
        status: "FAILED",
        completed_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq("aws_job_id", awsJobId);
    
    throw error;
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
    const command = new S3.GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });
    const url = await S3RequestPresigner.getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // 5 min
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
  if (
    (event.path && event.path.endsWith("/get-s3-url")) ||
    (event.rawPath && event.rawPath.endsWith("/get-s3-url"))
  ) {
    return await handleGetS3Url(event, requestId);
  }

  if (
    (event.path && event.path.endsWith("/chat-with-agent")) ||
    (event.rawPath && event.rawPath.endsWith("/chat-with-agent"))
  ) {
    return await handleBedrockAgentChat(event, requestId);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not Found", requestId }),
  };
};

