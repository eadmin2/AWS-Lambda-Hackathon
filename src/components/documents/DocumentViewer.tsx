import React, { useEffect, useState } from "react";
import { AlertCircle, Download } from "lucide-react";
import Button from "../ui/Button";
import { getFileType } from "../../lib/utils";

interface DocumentViewerProps {
  document: {
    file_name: string;
    file_url: string;
    uploaded_at: string;
    user_id?: string;
  };
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileType = getFileType(document.file_name);

  // Assume userId is available from context or props (replace with your actual userId source)
  const userId = document.user_id || (window as any).userId;

  useEffect(() => {
    async function fetchSignedUrl() {
      setIsLoading(true);
      setError(null);
      try {
        // The file key is userId/file_name or extract from file_url
        let fileKey = document.file_url.split(`/${document.user_id}/`).pop();
        if (!fileKey) fileKey = document.file_name;
        const res = await fetch(
          `/get-s3-url?key=${encodeURIComponent(document.user_id + "/" + fileKey)}&userId=${encodeURIComponent(userId)}`,
        );
        const data = await res.json();
        if (!res.ok || !data.url)
          throw new Error(data.error || "Failed to get signed URL");
        setSignedUrl(data.url);
        if (fileType === "text") {
          const textRes = await fetch(data.url);
          setTextContent(await textRes.text());
        }
      } catch (err) {
        setError("Failed to load document");
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSignedUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document.file_url, document.file_name, document.user_id, fileType]);

  const handleDownload = () => {
    if (signedUrl) {
      const link = window.document.createElement("a");
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
        disabled={!signedUrl}
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
          src={signedUrl}
          alt={document.file_name}
          className="max-w-full max-h-[70vh] mx-auto rounded shadow"
        />
      ) : fileType === "pdf" ? (
        <iframe
          src={signedUrl}
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
            disabled={!signedUrl}
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
