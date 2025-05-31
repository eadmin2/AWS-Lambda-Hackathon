import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { uploadDocument, supabase } from '../../lib/supabase';
import { isValidFileType, isValidFileSize } from '../../lib/utils';
import { analyzeMedicalDocument } from '../../lib/picaos';

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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDocument, setProcessingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    if (!selectedFile) return;
    
    if (!isValidFileType(selectedFile)) {
      setError('Invalid file type. Please upload a PDF, JPEG, PNG, or TIFF file.');
      return;
    }
    
    if (!isValidFileSize(selectedFile)) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tiff', '.tif'],
    },
    maxFiles: 1,
    disabled: uploading || !canUpload,
  });

  const handleUpload = async () => {
    if (!file || !userId || !canUpload) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Upload document using helper function
      const { path, url: fileUrl } = await uploadDocument(file, userId);
      
      // Insert document record in database
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: userId,
            file_name: file.name,
            file_path: path,
            file_url: fileUrl,
          },
        ])
        .select()
        .single();
      
      if (documentError) throw documentError;
      
      // Process document with Picaos AI
      setProcessingDocument(true);
      setUploadProgress(100);
      
      const documentId = documentData.id;
      
      // Send to Picaos for analysis
      await analyzeMedicalDocument(fileUrl, userId)
        .then(async (result) => {
          // Store results in disability_estimates table
          const estimatesPromises = result.estimated_ratings.map((rating) =>
            supabase.from('disability_estimates').insert([
              {
                user_id: userId,
                document_id: documentId, // Add document_id to create the relationship
                condition: rating.condition,
                estimated_rating: rating.estimated_rating,
                combined_rating: result.combined_rating,
              },
            ])
          );
          
          await Promise.all(estimatesPromises);
          
          onUploadComplete(documentId);
        })
        .catch((error) => {
          console.error('Error analyzing document:', error);
          onUploadError('Failed to analyze document. Please try again later.');
        });
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
      onUploadError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setProcessingDocument(false);
      setFile(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {!file ? (
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
                document.getElementById('fileInput')?.click();
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
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              <FileText className="h-8 w-8 text-primary-500" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(file.size / 1024)} KB
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                disabled={uploading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {(uploading || processingDocument) && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {processingDocument ? 'Analyzing document...' : `Uploading... ${uploadProgress}%`}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-error-100 p-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-error-700 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              className="mr-2"
              onClick={handleRemoveFile}
              disabled={uploading || processingDocument}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              isLoading={uploading || processingDocument}
              disabled={uploading || processingDocument}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;