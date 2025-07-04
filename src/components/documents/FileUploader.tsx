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
import { validateTokens } from "../../lib/supabase";
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { m } from 'framer-motion';
import UploadCompleteModal from './UploadCompleteModal';

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

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
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
  const { files, uploading, uploadProgress, error, checkingTokens } = state;
  const workerRef = useRef<Worker | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [restoringSession, setRestoringSession] = React.useState<boolean>(true);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const { session: supabaseSession } = useAuth();
  const [showCompleteModal, setShowCompleteModal] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  // Use realtime token balance
  const { tokensAvailable, tokensUsed } = useTokenBalance(userId);

  // Use environment variable or hardcode your Supabase project ref
  const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || 'https://algojcmqstokyghijcyc.supabase.co';
  const apiBase = `${SUPABASE_PROJECT_URL}/functions/v1/upload-sessions`;

  // Calculate estimated tokens for a file
  const estimateTokensForFile = (file: File): number => {
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedPages = Math.max(1, Math.ceil(fileSizeMB * ESTIMATED_PAGES_PER_MB));
    return Math.max(MIN_TOKENS_PER_FILE, estimatedPages);
  };

  // Calculate total tokens required for all files
  const getTotalTokensRequired = (): number => {
    return files.reduce((total, file) => total + file.estimatedTokens, 0);
  };

  // Check if user has enough tokens
  const hasEnoughTokens = (): boolean => {
    return tokensAvailable >= getTotalTokensRequired();
  };

  // --- Session API helpers ---
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${supabaseSession?.access_token}`,
    'Content-Type': 'application/json',
  });

  // Fetch user profile to get active_upload_session_id
  const fetchActiveSessionId = async () => {
    if (!supabaseSession) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('active_upload_session_id')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data.active_upload_session_id;
  };

  // Fetch session state
  const fetchSessionState = async (sid: string) => {
    const res = await fetch(`${apiBase}/${sid}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 410) {
        setSessionError('Your upload session has expired. Please re-select your files.');
      } else if (res.status === 403) {
        setSessionError('Upload in progress in another tab. Continue here?');
      } else {
        setSessionError('Failed to restore upload session.');
      }
      setRestoringSession(false);
      return null;
    }
    const data = await res.json();
    return data;
  };

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setRestoringSession(true);
      setSessionError(null);
      const sid = await fetchActiveSessionId();
      if (sid) {
        setSessionId(sid);
        const session = await fetchSessionState(sid);
        if (session && session.files && mounted) {
          // Restore files (as placeholders, since File objects can't be restored)
          const restoredFiles = session.files.map((f: any) => ({
            file: { name: f.name, size: f.size, type: f.type || '', lastModified: Date.now() } as File,
            name: f.name,
            estimatedTokens: f.estimatedTokens || 1,
          }));
          dispatch({ type: 'SET_FILES', files: restoredFiles });
          dispatch({ type: 'SET_PROGRESS', progress: session.progress?.overall || 0 });
        }
      }
      setRestoringSession(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabaseSession]);

  // Create session
  const createSession = async (filesMeta: any[]) => {
    const res = await fetch(apiBase, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ files: filesMeta }),
    });
    if (!res.ok) throw new Error('Failed to create upload session');
    const data = await res.json();
    setSessionId(data.sessionId);
    return data.sessionId;
  };

  // Update session
  const updateSession = async (filesMeta: any[], progress: any) => {
    if (!sessionId) return;
    await fetch(`${apiBase}/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ files: filesMeta, progress }),
    });
  };

  // Delete session
  const deleteSession = async () => {
    if (!sessionId) return;
    await fetch(`${apiBase}/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    setSessionId(null);
  };

  // --- Integrate session logic ---
  // On file add/remove, update session
  useEffect(() => {
    if (files.length > 0 && supabaseSession && !restoringSession) {
      const filesMeta = files.map(f => ({ name: f.name, size: f.file.size, estimatedTokens: f.estimatedTokens }));
      if (!sessionId) {
        createSession(filesMeta).catch(console.error);
      } else {
        updateSession(filesMeta, { overall: uploadProgress, perFile: filesMeta.map(f => ({ name: f.name, progress: uploadProgress })) }).catch(console.error);
      }
    }
    if (files.length === 0 && sessionId && !restoringSession) {
      deleteSession().catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // On upload progress, update session
  useEffect(() => {
    if (sessionId && files.length > 0 && supabaseSession && !restoringSession) {
      const filesMeta = files.map(f => ({ name: f.name, size: f.file.size, estimatedTokens: f.estimatedTokens }));
      updateSession(filesMeta, { overall: uploadProgress, perFile: filesMeta.map(f => ({ name: f.name, progress: uploadProgress })) }).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadProgress]);

  // On upload complete or cancel, mark session completed and delete
  useEffect(() => {
    if (!uploading && files.length === 0 && sessionId && !restoringSession) {
      // Mark session as completed
      fetch(`${apiBase}/${sessionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'completed', auditEvent: 'completed' }),
      }).catch(console.error);
      deleteSession().catch(console.error);
      // Clear session state and error after successful upload
      setSessionId(null);
      setSessionError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploading, files]);

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

  // Debounced upload handler
  const handleUpload = React.useCallback(
    debounce(async () => {
      if (isUploading) return;
      setIsUploading(true);
      if (!files.length || !userId || !canUpload) {
        setIsUploading(false);
        return;
      }
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
          toast.error('Not enough tokens to upload.');
          setIsUploading(false);
          return;
        }
      } catch {
        dispatch({
          type: 'SET_ERROR',
          error: 'Failed to validate token balance. Please try again.'
        });
        dispatch({ type: 'SET_CHECKING_TOKENS', checking: false });
        toast.error('Failed to validate token balance.');
        setIsUploading(false);
        return;
      }
      dispatch({ type: 'SET_UPLOADING', uploading: true });
      toast('Uploading file(s)...', { id: 'uploading' });
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
          // Step 3: Insert document record in Supabase database (no more upsert)
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
                estimated_tokens: estimatedTokens,
              },
            ])
            .select()
            .single();
          if (documentError) {
            // Handle duplicate error specifically
            if (documentError.code === '23505' || documentError.message?.includes('duplicate')) {
              toast.error(`A document with the name \"${finalName}\" already exists.`);
              onUploadError(`Duplicate document detected: ${finalName}`);
              continue; // Skip to next file
            }
            throw documentError;
          }
          if (!documentData) {
            throw new Error("Failed to create document record in database.");
          }
          dispatch({ type: 'SET_PROGRESS', progress: Math.round(((i + 1) / files.length) * 100) });
          onUploadComplete(documentData);
        }
        dispatch({ type: 'UPLOAD_SUCCESS' });
        toast.success('Upload complete! Processing your document...', { id: 'uploading' });
        setShowCompleteModal(true);
      } catch (error) {
        console.error("Error uploading document:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to upload document. Please try again.";
        dispatch({ type: 'SET_ERROR', error: errorMessage });
        onUploadError(errorMessage);
        toast.error(errorMessage);
      } finally {
        dispatch({ type: 'SET_UPLOADING', uploading: false });
        dispatch({ type: 'SET_PROGRESS', progress: 0 });
        setIsUploading(false);
      }
    }, 300),
    [files, userId, canUpload, isUploading]
  );

  // Add getFileIcon helper for file icons
  function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "tiff", "tif"].includes(ext || ""))
      return <FileImage className="h-5 w-5 text-primary-500" />;
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (["doc", "docx"].includes(ext || ""))
      return <FileText className="h-5 w-5 text-blue-500" />;
    if (ext === "txt") return <FileText className="h-5 w-5 text-gray-500" />;
    return <File className="h-5 w-5 text-gray-600" />;
  }

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const enoughTokens = hasEnoughTokens();

  // UI for restoration/loading/error
  if (restoringSession) {
    return <div className="flex flex-col items-center justify-center py-8"><div className="animate-spin">🔄</div><div>Restoring upload session...</div></div>;
  }
  if (sessionError && files.length > 0) {
    return <div className="flex flex-col items-center justify-center py-8 text-red-600"><AlertCircle className="mb-2" /><div>{sessionError}</div></div>;
  }

  return (
    <div className="w-full">
      {/* Token Balance Display */}
      {canUpload && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Token Balance</h3>
              <p className="text-blue-700">
                {`${tokensAvailable} tokens available`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {`Tokens Used: ${tokensUsed}`}
              </p>
            </div>
          </div>
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
          <input {...getInputProps()} id="file-upload-input" name="file-upload" />

          <Upload
            className={`h-8 w-8 sm:h-12 sm:w-12 mb-3 sm:mb-4 ${
              isDragActive ? "text-primary-500" : "text-gray-600"
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
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-xl mx-auto"
        >
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
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-gray-600 hover:text-gray-700 p-1"
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
                          autoComplete="off"
                          aria-label={`Edit name for file ${f.file.name}`}
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
                          {f.file.name} ({formatFileSize(f.file.size)})
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
                        autoComplete="off"
                        aria-label={`Edit name for file ${f.file.name}`}
                      />
                      <span className="text-xs text-gray-500">.{ext}</span>
                      <button
                        onClick={() => handleRemoveFile(idx)}
                        className="ml-2 text-gray-600 hover:text-gray-700 focus:outline-none"
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
              <m.div
                className="w-full h-2 bg-gray-200 rounded overflow-hidden mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <m.div
                  className="h-2 bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ width: `${uploadProgress}%` }}
                />
              </m.div>
            )}
          </div>

          {/* Error Message - Always render when there's an error */}
          {error && (
            <m.div
              className="bg-error-100 p-3 rounded-md flex items-start mb-2"
              initial={{ x: 0 }}
              animate={{ x: [0, -8, 8, -8, 8, 0] }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-error-700 text-sm">{error}</p>
            </m.div>
          )}
        </m.div>
      )}

      <UploadCompleteModal 
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
      />
    </div>
  );
};

export default FileUploader;
