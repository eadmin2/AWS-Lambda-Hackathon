import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { formatDate } from "../../lib/utils";
import { supabase, Document, DisabilityEstimate } from "../../lib/supabase";
import Button from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { useAuth } from "../../contexts/AuthContext";
import Modal from "../ui/Modal";

const DocumentsList: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [estimates, setEstimates] = useState<
    Record<string, DisabilityEstimate[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );

  const fetchDocumentsAndEstimates = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (documentsError) throw documentsError;

      // Fetch estimates for all documents
      const documentIds = documentsData.map((d) => d.id);
      const { data: estimatesData, error: estimatesError } = await supabase
        .from("disability_estimates")
        .select("*")
        .in("document_id", documentIds);

      if (estimatesError) throw estimatesError;

      // Group estimates by document ID
      const estimatesByDocId = estimatesData.reduce((acc, est) => {
        if (!acc[est.document_id]) {
          acc[est.document_id] = [];
        }
        acc[est.document_id].push(est);
        return acc;
      }, {} as Record<string, DisabilityEstimate[]>);

      setDocuments(documentsData);
      setEstimates(estimatesByDocId);
    } catch (err: any) {
      setError(
        "Failed to load documents. Please check your connection and try again.",
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentsAndEstimates();
  }, [user]);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    try {
      const { error } = await supabase.functions.invoke("delete-document", {
        body: { documentId: documentToDelete.id },
      });
      if (error) throw new Error(error.message);
      // Refresh list on success
      fetchDocumentsAndEstimates();
    } catch (err: any) {
      console.error("Deletion error:", err);
      setError("Failed to delete the document.");
    } finally {
      setDocumentToDelete(null); // Close modal
    }
  };

  const handleDownload = async (document: Document) => {
    let fileKey = document.file_url.split(`/${document.user_id}/`).pop();
    if (!fileKey) fileKey = document.file_name;
    const res = await fetch(
      `/get-s3-url?key=${encodeURIComponent(document.user_id + "/" + fileKey)}&userId=${encodeURIComponent(document.user_id)}`
    );
    const data = await res.json();
    if (res.ok && data.url) {
    const link = window.document.createElement("a");
      link.href = data.url;
    link.download = document.file_name;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    } else {
      alert("Failed to get signed URL");
    }
    setActiveDropdown(null);
  };

  const handleView = async (document: Document) => {
    let fileKey = document.file_url.split(`/${document.user_id}/`).pop();
    if (!fileKey) fileKey = document.file_name;
    const res = await fetch(
      `/get-s3-url?key=${encodeURIComponent(document.user_id + "/" + fileKey)}&userId=${encodeURIComponent(document.user_id)}`
    );
    const data = await res.json();
    if (res.ok && data.url) {
      window.open(data.url, "_blank");
    } else {
      alert("Failed to get signed URL");
    }
    setActiveDropdown(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (activeDropdown) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeDropdown]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-gray-200 mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-48 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No documents
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven't uploaded any medical documents yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle
                className="h-5 w-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      {documents.map((document) => {
        const documentEstimates = estimates[document.id] || [];
        const combinedRating =
          documentEstimates.length > 0
            ? documentEstimates[0].combined_rating
            : null;
        const showDropdown = activeDropdown === document.id;

        return (
          <Card key={document.id}>
            <CardHeader className="pb-3 sm:pb-6">
              {/* Mobile Layout */}
              <div className="block sm:hidden">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary-500 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-tight">
                        {document.file_name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(document.uploaded_at)}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Dropdown Menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(showDropdown ? null : document.id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(document);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(document);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <div className="border-t border-gray-100"></div>
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentToDelete(document);
                            setActiveDropdown(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Combined Rating on Mobile */}
                {combinedRating && (
                  <div className="bg-primary-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Combined VA Rating
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        {combinedRating}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${combinedRating}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:block">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-6 w-6 text-primary-500 mt-1" />
                    <div>
                      <CardTitle className="text-lg">
                        {document.file_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded on {formatDate(document.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye className="h-4 w-4" />}
                      onClick={() => handleView(document)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={() => handleDownload(document)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => setDocumentToDelete(document)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {documentEstimates.length > 0 ? (
                <div>
                  {/* Desktop Combined Rating */}
                  <div className="hidden sm:block mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Combined VA Rating
                      </h4>
                      <span className="text-xl font-bold text-primary-600">
                        {combinedRating}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${combinedRating}%` }}
                      ></div>
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Identified Conditions
                  </h4>

                  {/* Mobile: Compact condition cards */}
                  <div className="block sm:hidden space-y-2 mb-4">
                    {documentEstimates.map((estimate) => (
                      <div
                        key={estimate.id}
                        className="bg-gray-50 rounded-lg p-3 flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-800 font-medium">
                          {estimate.condition}
                        </span>
                        <span className="font-semibold text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {estimate.disability_rating}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden sm:block divide-y divide-gray-200 mb-4">
                    {documentEstimates.map((estimate) => (
                      <div
                        key={estimate.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-800">
                          {estimate.condition}
                        </span>
                        <span className="font-semibold text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {estimate.disability_rating}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      to={`/documents/${document.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center"
                    >
                      View detailed report →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 sm:p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-700 text-sm font-medium">
                      Processing Document
                    </p>
                    <p className="text-amber-600 text-xs mt-1">
                      This document is still being analyzed. Results will appear
                      here when ready.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {documentToDelete && (
        <Modal
          isOpen={!!documentToDelete}
          onClose={() => setDocumentToDelete(null)}
        >
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Confirm Deletion
          </h3>
          <p className="text-sm text-gray-500 my-4">
            Are you sure you want to delete the document "
            {documentToDelete.file_name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => setDocumentToDelete(null)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DocumentsList;
