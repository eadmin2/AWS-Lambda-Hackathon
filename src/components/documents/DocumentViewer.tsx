import React, { useEffect, useState } from "react";
import { DocumentRow } from "./DocumentsTable";
import { supabase } from "../../lib/supabase";
import { Download, FileText, AlertCircle } from "lucide-react";
import Button from "../ui/Button";

interface DocumentViewerProps {
  document: DocumentRow;
}

const getFileType = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return "other";
  if (["jpg", "jpeg", "png", "gif", "tiff", "tif", "bmp", "webp"].includes(ext))
    return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "text";
  return "other";
};

function extractFilePath(fileUrl: string): string {
  // Extract the path after /object/public/documents/ or /object/sign/documents/
  const match = fileUrl.match(/\/object\/(?:public|sign)\/documents\/(.*)$/);
  return match ? `documents/${match[1]}` : fileUrl;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileType = getFileType(document.file_name);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const filePath = extractFilePath(document.file_url);
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(filePath.replace(/^documents\//, ""), 60 * 5); // 5 minutes
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          setError("Failed to load document");
        }
      } catch (err) {
        setError("Failed to load document");
        console.error("Error getting signed URL:", err);
      } finally {
        setIsLoading(false);
      }
    };
    getSignedUrl();
  }, [document.file_url]);

  useEffect(() => {
    if (fileType === "text" && signedUrl) {
      fetch(signedUrl)
        .then((res) => res.text())
        .then(setTextContent)
        .catch(() => {
          setTextContent("Failed to load text file.");
          setError("Failed to load text content");
        });
    }
  }, [signedUrl, fileType]);

  const handleDownload = () => {
    if (signedUrl) {
      const link = window.document.createElement('a');
      link.href = signedUrl;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <div className="text-sm text-gray-600">Loading document...</div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <div className="text-sm text-gray-600 mb-4 text-center">
          {error || "Failed to load document"}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleDownload}
          disabled={!signedUrl}
        >
          <Download className="h-4 w-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  }

  // Header with file info and download button
  const DocumentHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">
          {document.file_name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {new Date(document.uploaded_at).toLocaleDateString()}
        </p>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={handleDownload}
        className="flex-shrink-0"
      >
        <Download className="h-4 w-4 mr-2" />
        Download
      </Button>
    </div>
  );

  if (fileType === "image") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <DocumentHeader />
        <div className="flex justify-center">
          <img
            src={signedUrl}
            alt={document.file_name}
            className="max-w-full h-auto max-h-[60vh] sm:max-h-[70vh] rounded shadow object-contain"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>
    );
  }

  if (fileType === "pdf") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <DocumentHeader />
        <div className="relative">
          <iframe
            src={signedUrl}
            title={document.file_name}
            className="w-full h-[60vh] sm:h-[70vh] rounded shadow border"
            style={{ minHeight: '400px' }}
          />
          {/* Mobile fallback for PDF viewing issues */}
          <div className="block sm:hidden mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Having trouble viewing?</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              If the PDF doesn't display properly on mobile, try downloading it instead.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fileType === "text") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <DocumentHeader />
        <div className="bg-gray-50 rounded-lg border overflow-hidden">
          <div className="max-h-[60vh] sm:max-h-[70vh] overflow-auto p-4">
            <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-800 font-mono">
              {textContent ?? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-3"></div>
                  <span className="text-gray-500">Loading content...</span>
                </div>
              )}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other file types
  return (
    <div className="w-full max-w-md mx-auto">
      <DocumentHeader />
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Preview not available
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            This file type cannot be previewed in the browser.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download to view
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;