import React, { useState, useEffect } from "react";
import PaymentOptions from "../components/payment/PaymentOptions";
import DocumentsList from "../components/documents/DocumentsList";
import FileUploader from "../components/documents/FileUploader";
import PageLayout from "../components/layout/PageLayout";
import { useAuth } from "../contexts/AuthContext";
import { getUserPermissions } from "../lib/supabase";
import { UploadRequired } from "../components/ui/AccessControl";

const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const permissions = getUserPermissions(profile);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const clearError = () => {
    setError(null);
  };

  if (!profile) {
    return (
      <PageLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div>Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Management
          </h1>
          <p className="text-gray-600">
            Upload and manage your VA-related documents for analysis.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Documents
          </h2>
          <UploadRequired message="You need an active subscription or upload credits to upload documents.">
            <FileUploader 
              onUploadSuccess={handleUploadSuccess}
              onError={handleError}
            />
          </UploadRequired>
        </div>

        {/* Payment Options for Non-Paid Users */}
        {!permissions.canUpload && (
          <div id="payment-options" className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <PaymentOptions 
              userId={profile.id} 
              onError={handleError}
            />
          </div>
        )}

        {/* Document List Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Documents
          </h2>
          <DocumentsList key={refreshKey} />
        </div>

        {/* User Status Information */}
        {permissions.hasUploadCredits && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Upload Credits
            </h3>
            <p className="text-sm text-blue-700">
              You have {permissions.uploadCreditsRemaining} upload credits remaining.
            </p>
          </div>
        )}

        {permissions.hasActiveSubscription && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 mb-1">
              Active Subscription
            </h3>
            <p className="text-sm text-green-700">
              You have unlimited uploads with your active subscription.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default DocumentsPage; 