import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
import { isValidFileType, isValidFileSize } from "../../lib/utils";

// AWS Constants
const AWS_S3_BUCKET = "my-receipts-app-bucket";
const AWS_REGION = "us-east-2";

interface FileUploaderProps {
  userId: string;
  onUploadComplete: (documentId: string) => void;
  onUploadError: (error: string) => void;
  canUpload: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  userId,
  onUploadComplete,
  onUploadError,
  canUpload,
}) => {
  const [files, setFiles] = useState<{ file: File; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles
      .filter((selectedFile) => {
        if (!isValidFileType(selectedFile)) {
          setError(
            "Invalid file type. Please upload a PDF, JPEG, PNG, or TIFF file.",
          );
          return false;
        }
        if (!isValidFileSize(selectedFile)) {
          setError("File is too large. Maximum size is 10MB.");
          return false;
        }
        return true;
      })
      .map((selectedFile) => ({
        file: selectedFile,
        name: selectedFile.name.replace(/\.[^.]+$/, ""), // filename without extension
      }));
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
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
    maxFiles: 20,
    disabled: uploading || !canUpload,
  });

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleFileNameChange = (index: number, newName: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, name: newName } : f)),
    );
  };

  // Function to upload file to S3 using presigned URL
  const uploadFileToS3 = async (
    file: File,
    presignedUrl: string,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          // This will be per-file progress; you might want to aggregate for multiple files
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed due to network error"));
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const handleUpload = async () => {
    if (!files.length || !userId || !canUpload) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const { file, name } = files[i];
        const ext = file.name.split(".").pop();
        const finalName = `${name}.${ext}`;

        // Step 1: Get presigned URL from API Gateway via /get-s3-url
        const res = await fetch("/get-s3-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: finalName,
            userId: userId,
            fileType: file.type,
          }),
        });
        const urlData = await res.json();
        if (!res.ok || !urlData.url) {
          throw new Error(urlData.error || "Failed to get upload URL");
        }

        const { url: presignedUrl, key } = urlData;
        const fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

        // Step 2: Upload file directly to S3
        await uploadFileToS3(file, presignedUrl);

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
            },
          ])
          .select()
          .single();

        if (documentError) {
          throw documentError;
        }

        // Update overall progress
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        // Notify parent component
        onUploadComplete(documentData.id);
      }

      // Clear files on successful upload
      setFiles([]);
      setError(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload document. Please try again.";
      setError(errorMessage);
      onUploadError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  return (
    <div className="w-full">
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
            Supported formats: PDF, JPEG, PNG, TIFF (max 10MB)
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
                            {formatFileSize(f.file.size)}
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
              onClick={() => setFiles([])}
              disabled={uploading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              isLoading={uploading}
              disabled={uploading}
              leftIcon={<Upload className="h-4 w-4" />}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Upload {files.length > 1 ? `${files.length} Files` : "File"}
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

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-error-100 p-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-error-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
