import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  FileImage,
  File,
  Plus,
} from "lucide-react";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabase";
import { DocumentRow } from "./DocumentsTable";
import { getUserTokenBalance, validateTokens } from "../../lib/supabase";

// AWS Constants
const AWS_S3_BUCKET = "my-receipts-app-bucket";
const AWS_REGION = "us-east-2";
const MAX_SIZE_MB = 30;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Token estimation constants
const ESTIMATED_PAGES_PER_MB = 10; // Rough estimate for PDF/image files
const MIN_TOKENS_PER_FILE = 1; // Minimum tokens required per file

interface UploaderState {
  files: { file: File; name: string; estimatedTokens: number }[];
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  tokenBalance: number;
  checkingTokens: boolean;
}

type UploaderAction =
  | { type: 'SET_FILES'; files: { file: File; name: string; estimatedTokens: number }[] }
  | { type: 'ADD_FILES'; files: { file: File; name: string; estimatedTokens: number }[] }
  | { type: 'SET_UPLOADING'; uploading: boolean }
  | { type: 'SET_PROGRESS'; progress: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'SET_TOKEN_BALANCE'; balance: number }
  | { type: 'SET_CHECKING_TOKENS'; checking: boolean };

const uploaderReducer = (state: UploaderState, action: UploaderAction): UploaderState => {
  switch (action.type) {
    case 'SET_FILES':
      return { ...state, files: action.files };
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.files] };
    case 'SET_UPLOADING':
      return { ...state, uploading: action.uploading, error: null };
    case 'SET_PROGRESS':
      return { ...state, uploadProgress: action.progress };
    case 'SET_ERROR':
      return { ...state, error: action.error, uploading: false };
    case 'UPLOAD_SUCCESS':
      return { ...state, files: [], error: null, uploading: false, uploadProgress: 0 };
    case 'SET_TOKEN_BALANCE':
      return { ...state, tokenBalance: action.balance };
    case 'SET_CHECKING_TOKENS':
      return { ...state, checkingTokens: action.checking };
    default:
      throw new Error('Unhandled action type');
  }
};

interface FileUploaderProps {
  userId: string;
  onUploadComplete: (document: DocumentRow) => void;
  onUploadError: (error: string) => void;
  canUpload: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  userId,
  onUploadComplete,
  onUploadError,
  canUpload,
}) => {
  const initialState: UploaderState = {
    files: [],
    uploading: false,
    uploadProgress: 0,
    error: null,
    tokenBalance: 0,
    checkingTokens: false,
  };

  const [state, dispatch] = useReducer(uploaderReducer, initialState);
  const { files, uploading, uploadProgress, error, tokenBalance, checkingTokens } = state;
  const workerRef = useRef<Worker | null>(null);

  // Calculate estimated tokens for a file
  const estimateTokensForFile = (file: File): number => {
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedPages = Math.max(1, Math.ceil(fileSizeMB * ESTIMATED_PAGES_PER_MB));
    return Math.max(MIN_TOKENS_PER_FILE, estimatedPages);
  };

  // Load user's token balance
  const loadTokenBalance = async () => {
    if (!userId) return;
    
    dispatch({ type: 'SET_CHECKING_TOKENS', checking: true });
    try {
      const balance = await getUserTokenBalance(userId);
      dispatch({ type: 'SET_TOKEN_BALANCE', balance });
    } catch (error) {
      console.error("Error loading token balance:", error);
    } finally {
      dispatch({ type: 'SET_CHECKING_TOKENS', checking: false });
    }
  };

  // Calculate total tokens required for all files
  const getTotalTokensRequired = (): number => {
    return files.reduce((total, file) => total + file.estimatedTokens, 0);
  };

  // Check if user has enough tokens
  const hasEnoughTokens = (): boolean => {
    return tokenBalance >= getTotalTokensRequired();
  };

  useEffect(() => {
    loadTokenBalance();
  }, [userId]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/upload.worker.ts', import.meta.url));

    workerRef.current.onmessage = (event) => {
      const { type, percentComplete, error: workerError } = event.data;
      if (type === 'progress') {
        dispatch({ type: 'SET_PROGRESS', progress: Math.round(percentComplete) });
      } else if (type === 'error') {
        const errorMessage = workerError || "An unknown error occurred during upload.";
        dispatch({ type: 'SET_ERROR', error: errorMessage });
        onUploadError(errorMessage);
      }
    };

    // Cleanup worker on component unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [onUploadError]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    // Clear any previous errors first
    dispatch({ type: 'SET_ERROR', error: null });

    // Handle rejected files first
    if (fileRejections.length > 0) {
      const firstRejection = fileRejections[0];
      const firstError = firstRejection.errors[0];

      if (firstError.code === 'file-too-large') {
        const fileName = firstRejection.file.name;
        const fileSize = formatFileSize(firstRejection.file.size);
        dispatch({
          type: 'SET_ERROR',
          error: `"${fileName}" is too large (${fileSize}). Maximum size is ${MAX_SIZE_MB}MB.`
        });
      } else if (firstError.code === 'file-invalid-type') {
        dispatch({
          type: 'SET_ERROR',
          error: 'Invalid file type. Please upload a PDF, JPEG, PNG, or TIFF file.'
        });
      } else {
        dispatch({
          type: 'SET_ERROR',
          error: firstError.message || 'File is invalid.'
        });
      }
      return; // Important: return early to prevent processing accepted files
    }

    // Only process accepted files if there are no rejections
    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map((file) => ({
        file,
        name: file.name.replace(/\.[^.]+$/, ""),
        estimatedTokens: estimateTokensForFile(file),
      }));
      dispatch({ type: 'ADD_FILES', files: newFiles });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/tiff": [".tiff", ".tif"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: MAX_SIZE_BYTES,
    maxFiles: 20,
    disabled: uploading || !canUpload,
  });

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    dispatch({ type: 'SET_FILES', files: newFiles });
    if (newFiles.length === 0) {
      dispatch({ type: 'SET_ERROR', error: null });
    }
  };

  const handleFileNameChange = (index: number, newName: string) => {
    const newFiles = files.map((f, i) => (i === index ? { ...f, name: newName } : f));
    dispatch({ type: 'SET_FILES', files: newFiles });
  };

  const uploadFileWithWorker = (file: File, presignedUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        return reject(new Error("Upload worker is not available."));
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'success') {
          workerRef.current?.removeEventListener('message', messageHandler);
          resolve();
        } else if (event.data.type === 'error') {
          workerRef.current?.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        }
      };

      workerRef.current.addEventListener('message', messageHandler);
      workerRef.current.postMessage({ file, presignedUrl });
    });
  };

  const handleUpload = async () => {
    if (!files.length || !userId || !canUpload) return;

    // Check token balance before upload
    const totalTokensRequired = getTotalTokensRequired();
    
    dispatch({ type: 'SET_CHECKING_TOKENS', checking: true });
    try {
      const validation = await validateTokens(userId, totalTokensRequired);
      
      if (!validation.valid) {
        dispatch({ 
          type: 'SET_ERROR', 
          error: `${validation.message} You need ${totalTokensRequired} tokens but only have ${validation.currentBalance}. Please purchase more tokens to continue.`
        });
        dispatch({ type: 'SET_CHECKING_TOKENS', checking: false });
        return;
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        error: 'Failed to validate token balance. Please try again.'
      });
      dispatch({ type: 'SET_CHECKING_TOKENS', checking: false });
      return;
    }

    dispatch({ type: 'SET_UPLOADING', uploading: true });
    dispatch({ type: 'SET_PROGRESS', progress: 0 });
    dispatch({ type: 'SET_CHECKING_TOKENS', checking: false });

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, name, estimatedTokens } = files[i];
        const ext = file.name.split(".").pop();
        const finalName = `${name}.${ext}`;

        // Step 1: Get presigned URL from Supabase Edge Function (includes token validation)
        const { data: urlData, error: urlError } =
          await supabase.functions.invoke("generate-presigned-url", {
            body: {
              fileName: finalName,
              userId: userId,
              fileType: file.type,
              estimatedTokens: estimatedTokens, // Pass estimated tokens for validation
            },
          });

        if (urlError || !urlData) {
          throw new Error(
            `Failed to get upload URL: ${urlError?.message || "Unknown error"}`,
          );
        }

        const { url: presignedUrl, key } = urlData;
        const fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

        // Step 2: Upload file directly to S3 via Web Worker
        await uploadFileWithWorker(file, presignedUrl);

        // Step 3: Create document record in Supabase database
        const { data: documentData, error: documentError } = await supabase
          .from("documents")
          .insert([
            {
              user_id: userId,
              file_name: finalName,
              document_name: name,
              file_url: fileUrl,
              upload_status: "uploaded",
              processing_status: "processing",
              document_type: "medical_record",
              mime_type: file.type,
              file_size: file.size,
              estimated_tokens: estimatedTokens, // Store estimated tokens
            },
          ])
          .select()
          .single();

        if (documentError) {
          throw documentError;
        }
        if (!documentData) {
          throw new Error("Failed to create document record in database.");
        }

        // Update overall progress
        dispatch({ type: 'SET_PROGRESS', progress: Math.round(((i + 1) / files.length) * 100) });

        // Notify parent component
        onUploadComplete(documentData);
      }

      // Refresh token balance after successful upload
      await loadTokenBalance();

      // Clear files on successful upload
      dispatch({ type: 'UPLOAD_SUCCESS' });
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload document. Please try again.";
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      onUploadError(errorMessage);
    } finally {
      dispatch({ type: 'SET_UPLOADING', uploading: false });
      dispatch({ type: 'SET_PROGRESS', progress: 0 });
    }
  };

  // Add getFileIcon helper for file icons
  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "tiff", "tif"].includes(ext || ""))
      return <FileImage className="h-5 w-5 text-primary-500" />;
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (["doc", "docx"].includes(ext || ""))
      return <FileText className="h-5 w-5 text-blue-500" />;
    if (ext === "txt") return <FileText className="h-5 w-5 text-gray-500" />;
    return <File className="h-5 w-5 text-gray-400" />;
  }

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalTokensRequired = getTotalTokensRequired();
  const enoughTokens = hasEnoughTokens();

  return (
    <div className="w-full">
      {/* Token Balance Display */}
      {canUpload && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Token Balance</h3>
              <p className="text-blue-700">
                {checkingTokens ? "Loading..." : `${tokenBalance} tokens available`}
              </p>
            </div>
            {files.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-blue-600">
                  Required: {totalTokensRequired} tokens
                </p>
                <p className={`text-sm font-medium ${enoughTokens ? 'text-green-600' : 'text-red-600'}`}>
                  {enoughTokens ? '✓ Sufficient tokens' : '⚠ Insufficient tokens'}
                </p>
              </div>
            )}
          </div>
          {!enoughTokens && files.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-yellow-800 text-sm">
                You need {totalTokensRequired - tokenBalance} more tokens. 
                <a href="/pricing" className="underline ml-1">Purchase tokens</a>
              </p>
            </div>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center transition-colors min-h-[200px] ${
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-primary-400"
          } ${!canUpload ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <input {...getInputProps()} />

          <Upload
            className={`h-8 w-8 sm:h-12 sm:w-12 mb-3 sm:mb-4 ${
              isDragActive ? "text-primary-500" : "text-gray-400"
            }`}
          />

          <p className="text-sm font-medium text-gray-700 mb-1 text-center">
            {isDragActive
              ? "Drop your file here..."
              : "Drag & drop your medical document here"}
          </p>

          <p className="text-xs text-gray-500 mb-4 text-center px-2">
            Supported formats: PDF, JPEG, PNG, TIFF (max 30MB)<br/>
            Each file requires tokens based on estimated page count
          </p>

          {canUpload ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          ) : (
            <div className="bg-error-100 p-3 rounded-md mt-2 flex items-start w-full max-w-sm">
              <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-error-700 text-sm">
                You need to purchase access before uploading documents.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-3 sm:p-4 bg-white">
          {/* Mobile: Cards layout, Desktop: List layout */}
          <div className="space-y-3 sm:space-y-4">
            {files.map((f, idx) => {
              const ext = f.file.name.split(".").pop();
              return (
                <div key={idx}>
                  {/* Mobile Card Layout */}
                  <div className="block sm:hidden bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(f.file.name)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {f.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(f.file.size)} • ~{f.estimatedTokens} tokens
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        disabled={uploading}
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 text-sm"
                        id={`file-name-${idx}`}
                        name={`file-name-${idx}`}
                        value={f.name}
                        onChange={(e) =>
                          handleFileNameChange(
                            idx,
                            e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ""),
                          )
                        }
                        disabled={uploading}
                        placeholder="File name"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        .{ext}
                      </span>
                    </div>
                  </div>

                  {/* Desktop List Layout */}
                  <div className="hidden sm:flex items-center gap-3 border-b pb-2 last:border-b-0">
                    {getFileIcon(f.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-500 truncate">
                        {f.file.name} ({formatFileSize(f.file.size)}) • ~{f.estimatedTokens} tokens
                      </p>
                    </div>
                    <input
                      className="input w-40"
                      id={`file-name-desktop-${idx}`}
                      name={`file-name-desktop-${idx}`}
                      value={f.name}
                      onChange={(e) =>
                        handleFileNameChange(
                          idx,
                          e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ""),
                        )
                      }
                      disabled={uploading}
                    />
                    <span className="text-xs text-gray-500">.{ext}</span>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="ml-2 text-gray-400 hover:text-gray-500 focus:outline-none"
                      disabled={uploading}
                      title="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add More Files Button */}
          {!uploading && canUpload && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={open}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Files
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                dispatch({ type: 'SET_FILES', files: [] });
                dispatch({ type: 'SET_ERROR', error: null });
              }}
              disabled={uploading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              isLoading={uploading || checkingTokens}
              disabled={uploading || checkingTokens || !enoughTokens}
              leftIcon={<Upload className="h-4 w-4" />}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {checkingTokens ? "Checking Tokens..." : 
               !enoughTokens ? "Insufficient Tokens" :
               `Upload ${files.length > 1 ? `${files.length} Files` : "File"}`}
            </Button>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center sm:text-left">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Message - Always render when there's an error */}
      {error && (
        <div className="mt-4 bg-error-100 p-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-error-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
