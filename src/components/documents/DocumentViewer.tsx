import React, { useEffect, useState } from "react";

interface DocumentViewerProps {
  documentKey: string;
  userToken: string;
}

const API_URL = "https://vp1o1djnbe.execute-api.us-east-2.amazonaws.com/get-s3-url";

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentKey, userToken }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper to get file extension
  const getFileType = (key: string) => {
    const ext = key.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "tiff", "tif", "bmp", "webp"].includes(ext || "")) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  };

  const fetchSignedUrl = async () => {
    setIsLoading(true);
    setError(null);
    setSignedUrl(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`,
        },
        body: JSON.stringify({ key: documentKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to get signed URL");
      }
      setSignedUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Failed to load document");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignedUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey, userToken]);

  const handleRetry = () => {
    fetchSignedUrl();
  };

  const fileType = getFileType(documentKey);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-4">
      {/* Button to open modal */}
      <button
        className="btn btn-primary mb-4"
        onClick={() => setIsModalOpen(true)}
        disabled={isLoading || !!error || !signedUrl}
      >
        View Document
      </button>
      {/* Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            {isLoading ? (
              <div>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                <div className="text-sm text-gray-600">Loading document...</div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center">
                <div className="text-red-500 text-2xl mb-2">!</div>
                <div className="text-sm text-gray-600 mb-4 text-center">{error}</div>
                <button className="btn btn-primary" onClick={handleRetry}>Retry</button>
              </div>
            ) : signedUrl ? (
              fileType === "pdf" ? (
                <iframe
                  src={signedUrl}
                  title="Document PDF"
                  className="w-full min-h-[60vh] rounded shadow"
                />
              ) : fileType === "image" ? (
                <img
                  src={signedUrl}
                  alt="Document Preview"
                  className="max-w-full max-h-[70vh] mx-auto rounded shadow"
                />
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  <p>Preview not available for this file type.</p>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary mt-4"
                  >
                    Download File
                  </a>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
