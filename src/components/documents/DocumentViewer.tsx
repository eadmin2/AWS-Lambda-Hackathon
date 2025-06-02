import React, { useEffect, useState } from "react";
import { DocumentRow } from "./DocumentsTable";
import { supabase } from "../../lib/supabase";

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
  const fileType = getFileType(document.file_name);

  useEffect(() => {
    const getSignedUrl = async () => {
      const filePath = extractFilePath(document.file_url);
      const { data } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath.replace(/^documents\//, ""), 60 * 5); // 5 minutes
      if (data?.signedUrl) setSignedUrl(data.signedUrl);
      else setSignedUrl(null);
    };
    getSignedUrl();
  }, [document.file_url]);

  useEffect(() => {
    if (fileType === "text" && signedUrl) {
      fetch(signedUrl)
        .then((res) => res.text())
        .then(setTextContent)
        .catch(() => setTextContent("Failed to load text file."));
    }
  }, [signedUrl, fileType]);

  if (!signedUrl) return <div>Loading...</div>;

  if (fileType === "image") {
    return (
      <div className="flex flex-col items-center">
        <img
          src={signedUrl}
          alt={document.file_name}
          className="max-w-full max-h-[70vh] rounded shadow"
        />
        <div className="mt-2 text-sm text-gray-600">{document.file_name}</div>
      </div>
    );
  }
  if (fileType === "pdf") {
    return (
      <div className="w-[80vw] h-[70vh]">
        <iframe
          src={signedUrl}
          title={document.file_name}
          className="w-full h-full rounded shadow border"
        />
        <div className="mt-2 text-sm text-gray-600">{document.file_name}</div>
      </div>
    );
  }
  if (fileType === "text") {
    return (
      <div className="w-[60vw] max-w-2xl max-h-[60vh] overflow-auto bg-gray-50 p-4 rounded shadow border">
        <pre className="whitespace-pre-wrap text-sm text-gray-800">
          {textContent ?? "Loading..."}
        </pre>
        <div className="mt-2 text-xs text-gray-500">{document.file_name}</div>
      </div>
    );
  }
  // Fallback for other types
  return (
    <div className="flex flex-col items-center">
      <div className="text-gray-700 mb-2">Cannot preview this file type.</div>
      <a
        href={signedUrl}
        download={document.file_name}
        className="text-blue-600 underline"
      >
        Download {document.file_name}
      </a>
    </div>
  );
};

export default DocumentViewer;
