import React, { useEffect, useState } from "react";
import { AlertCircle, Download } from "lucide-react";
import Button from "../ui/Button";
import { getFileType } from "../../lib/utils";

interface DocumentViewerProps {
  document: {
    file_name: string;
    file_url: string;
    uploaded_at: string;
  };
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileType = getFileType(document.file_name);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    if (fileType === "text") {
      fetch(document.file_url)
        .then((res) => res.text())
        .then(setTextContent)
        .catch(() => {
          setTextContent("Failed to load text file.");
          setError("Failed to load text content");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [document.file_url, fileType]);

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.file_url;
    link.download = document.file_name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <div className="text-sm text-gray-600">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <div className="text-sm text-gray-600 mb-4 text-center">
          {error || "Failed to load document"}
        </div>
        <Button variant="primary" size="sm" onClick={handleDownload}>
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

  return (
    <div>
      <DocumentHeader />
      {fileType === "text" && textContent ? (
        <pre className="bg-gray-100 rounded p-4 overflow-x-auto text-xs sm:text-sm whitespace-pre-wrap">
          {textContent}
        </pre>
      ) : fileType === "image" ? (
        <img
          src={document.file_url}
          alt={document.file_name}
          className="max-w-full max-h-[70vh] mx-auto rounded shadow"
        />
      ) : fileType === "pdf" ? (
        <iframe
          src={document.file_url}
          title={document.file_name}
          className="w-full min-h-[60vh] rounded shadow"
        />
      ) : (
        <div className="text-center text-gray-500 mt-8">
          <p>Preview not available for this file type.</p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            className="mt-4"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
