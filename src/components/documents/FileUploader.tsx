import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, FileImage, File } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { isValidFileType, isValidFileSize } from '../../lib/utils';
import { uploadDocument } from '../../lib/supabase';

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
  canUpload
}) => {
  const [files, setFiles] = useState<{ file: File; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles
      .filter(selectedFile => {
        if (!isValidFileType(selectedFile)) {
          setError('Invalid file type. Please upload a PDF, JPEG, PNG, or TIFF file.');
          return false;
        }
        if (!isValidFileSize(selectedFile)) {
          setError('File is too large. Maximum size is 10MB.');
          return false;
        }
        return true;
      })
      .map(selectedFile => ({
        file: selectedFile,
        name: selectedFile.name.replace(/\.[^.]+$/, ''), // filename without extension
      }));
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 20,
    disabled: uploading || !canUpload,
  });

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleFileNameChange = (index: number, newName: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, name: newName } : f));
  };

  const handleUpload = async () => {
    if (!files.length || !userId || !canUpload) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const { file, name } = files[i];
        const ext = file.name.split('.').pop();
        const finalName = `${name}.${ext}`;
        // Upload directly to Supabase Storage
        const uploadResult = await uploadDocument(new window.File([file], finalName, { type: file.type }), userId);
        const { url: fileUrl } = uploadResult;
        // Insert document record in database
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .insert([
            {
              user_id: userId,
              file_name: finalName,
              file_url: fileUrl,
            },
          ])
          .select()
          .single();
        if (documentError) throw documentError;
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        onUploadComplete(documentData.id);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
      onUploadError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };

  // Add getFileIcon helper for file icons
  function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "tiff", "tif"].includes(ext || "")) return <FileImage className="h-5 w-5 text-primary-500" />;
    if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (["doc", "docx"].includes(ext || "")) return <FileText className="h-5 w-5 text-blue-500" />;
    if (ext === "txt") return <FileText className="h-5 w-5 text-gray-500" />;
    return <File className="h-5 w-5 text-gray-400" />;
  }

  return (
    <div className="w-full">
      {files.length === 0 ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          } ${!canUpload ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          
          <Upload
            className={`h-12 w-12 mb-4 ${
              isDragActive ? 'text-primary-500' : 'text-gray-400'
            }`}
          />
          
          <p className="text-sm font-medium text-gray-700 mb-1">
            {isDragActive
              ? 'Drop your file here...'
              : 'Drag & drop your medical document here'}
          </p>
          
          <p className="text-xs text-gray-500 mb-4">
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
            >
              Browse Files
            </Button>
          ) : (
            <div className="bg-error-100 p-3 rounded-md mt-2 flex items-start max-w-md">
              <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-error-700 text-sm">
                You need to purchase access before uploading documents.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-white">
          <div className="space-y-4">
            {files.map((f, idx) => {
              const ext = f.file.name.split('.').pop();
              return (
                <div key={idx} className="flex items-center gap-3 border-b pb-2 last:border-b-0">
                  {getFileIcon(f.file.name)}
                  <input
                    className="input w-40"
                    value={f.name}
                    onChange={e => handleFileNameChange(idx, e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ''))}
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
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFiles([])}
              disabled={uploading}
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
            >
              Upload {files.length > 1 ? `${files.length} Files` : 'File'}
            </Button>
          </div>
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
            </div>
          )}
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