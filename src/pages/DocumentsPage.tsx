import React, { useEffect, useState } from "react";
import DocumentsTable, { DocumentRow } from "../components/documents/DocumentsTable";
import PaymentOptions from "../components/payment/PaymentOptions";
import FileUploader from "../components/documents/FileUploader";
import { AlertCircle } from "lucide-react";
import { getUserDocuments } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import DocumentViewer from "../components/documents/DocumentViewer";
import Modal from "../components/ui/Modal";

const DocumentsPage: React.FC = () => {
  const { user, session } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [hasSubscription] = useState<boolean>(true); // Set logic as needed
  const [canUpload] = useState<boolean>(true); // Set logic as needed
  const [selectedDocument, setSelectedDocument] = useState<DocumentRow | null>(null);

  // Fetch documents
  const fetchDocuments = () => {
    if (!user) return;
    getUserDocuments(user.id).then((docs) => setDocuments(docs));
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line
  }, [user]);

  // Handler for viewing a document (opens modal)
  const handleViewDocument = (doc: DocumentRow) => {
    setSelectedDocument(doc);
  };

  // Handler for secure download using proxied endpoint
  const handleDownloadDocument = async (doc: DocumentRow) => {
    // Extract only the S3 object key from file_url
    const url = doc.file_url;
    const match = url.match(/https?:\/\/[^/]+\/(.+)/);
    const objectKey = match ? match[1] : url;

    // Use the proxied endpoint instead of direct API call
    const res = await fetch(`/get-s3-url?key=${encodeURIComponent(objectKey)}`);
    const data = await res.json();
    if (res.ok && data.url) {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setDeleteError("Failed to get signed URL for download.");
    }
  };

  const handleDeleteDocument = async (doc: DocumentRow) => {
    try {
      // TODO: Call delete API
      setDeleteError(null);
      // Remove from UI
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setDeleteError("Failed to delete document.");
    }
  };
  const handleRenameDocument = async (doc: DocumentRow, newName: string) => {
    try {
      // TODO: Call rename API
      setRenameError(null);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, file_name: newName + d.file_name.substring(d.file_name.lastIndexOf(".")) } : d))
      );
    } catch (err) {
      setRenameError("Failed to rename document.");
    }
  };
  const handleUploadError = (err: string) => {
    setDeleteError(err);
  };

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto py-8 px-2 sm:px-4">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Upload Medical Document</CardTitle>
            </CardHeader>
            <CardContent>
              {!canUpload ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-700 text-sm font-medium">
                      Payment Required
                    </p>
                    <p className="text-amber-600 text-xs mt-1">
                      You need to purchase a subscription or single upload
                      credit before you can upload documents.
                    </p>
                  </div>
                </div>
              ) : (
                <FileUploader
                  userId={user?.id || ""}
                  onUploadComplete={fetchDocuments}
                  onUploadError={handleUploadError}
                  canUpload={canUpload}
                />
              )}
            </CardContent>
          </Card>
        </div>
        <h2 className="text-2xl font-bold mb-6">Your Documents</h2>
        <DocumentsTable
          documents={documents as DocumentRow[]}
          onView={handleViewDocument}
          onDownload={handleDownloadDocument}
          onDelete={handleDeleteDocument}
          onRename={handleRenameDocument}
        />
        {selectedDocument && (
          <Modal isOpen={!!selectedDocument} onClose={() => setSelectedDocument(null)}>
            <DocumentViewer 
              documentKey={(() => {
                // Remove the bucket URL prefix if present
                const url = selectedDocument.file_url;
                const match = url.match(/https?:\/\/[^/]+\/(.+)/);
                return match ? match[1] : url;
              })()}
              userToken={session?.access_token || ""} 
            />
          </Modal>
        )}
        {deleteError && (
          <div className="mt-4 bg-error-100 border border-error-200 p-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-error-700 text-sm">{deleteError}</p>
          </div>
        )}
        {renameError && (
          <div className="mt-4 bg-error-100 border border-error-200 p-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-error-700 text-sm">{renameError}</p>
          </div>
        )}
        {!hasSubscription && (
          <div id="payment-options" className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Options</h2>
            <PaymentOptions userId={user?.id || ""} onError={handleUploadError} />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DocumentsPage; 