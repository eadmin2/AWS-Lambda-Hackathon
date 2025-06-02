import React from "react";
import { Link } from "react-router-dom";
import { FileText, Download, Eye, AlertCircle } from "lucide-react";
import { formatDate } from "../../lib/utils";
import { Document, DisabilityEstimate } from "../../lib/supabase";
import Button from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface DocumentsListProps {
  documents: Document[];
  estimates: Record<string, DisabilityEstimate[]>;
  isLoading: boolean;
}

const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  estimates,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-slow flex flex-col items-center">
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
    <div className="space-y-6">
      {documents.map((document) => {
        const documentEstimates = estimates[document.id] || [];
        const combinedRating =
          documentEstimates.length > 0
            ? documentEstimates[0].combined_rating
            : null;

        return (
          <Card key={document.id}>
            <CardHeader>
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
                    onClick={() => window.open(document.file_url, "_blank")}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download className="h-4 w-4" />}
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = document.file_url;
                      link.download = document.file_name;
                      link.click();
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documentEstimates.length > 0 ? (
                <div>
                  <div className="mb-4">
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
                        className="bg-primary-600 h-2.5 rounded-full"
                        style={{ width: `${combinedRating}%` }}
                      ></div>
                    </div>
                  </div>

                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Identified Conditions
                  </h4>
                  <div className="divide-y divide-gray-200">
                    {documentEstimates.map((estimate) => (
                      <div
                        key={estimate.id}
                        className="py-3 flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-800">
                          {estimate.condition}
                        </span>
                        <span className="font-semibold text-sm bg-primary-100 text-primary-800 px-2 py-1 rounded">
                          {estimate.estimated_rating}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/documents/${document.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View detailed report →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start">
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
    </div>
  );
};

export default DocumentsList;
