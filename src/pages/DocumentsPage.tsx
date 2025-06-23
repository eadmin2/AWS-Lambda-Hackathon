import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import FileUploader from "../components/documents/FileUploader";
import { useAuth } from "../contexts/AuthContext";
import { getUserPermissions, UserPermissions } from "../lib/supabase";
import { UploadRequired } from "../components/ui/AccessControl";

const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      if (profile) {
        const perms = await getUserPermissions(profile);
        setPermissions(perms);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [profile]);

  const handleUploadSuccess = (document: any) => {
    setSuccessMessage(
      `File "${document.file_name}" has been uploaded successfully and is being processed.`,
    );
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <p>Loading page...</p>
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <p>Loading user profile...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Upload Document
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Upload your medical documents to get a VA disability rating
              estimate. Once processed, your results will appear on your
              dashboard.
            </p>
          </div>

          <UploadRequired>
            <FileUploader
              userId={profile.id}
              canUpload={permissions?.canUpload || false}
              onUploadComplete={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </UploadRequired>

          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-sm text-gray-600">
              Use this{" "}
              <a
                href="https://drive.google.com/file/d/1-x4C5yJxaHD1jGSvjtjGp8vP6uBOtXPQ/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Fake medical PDF
              </a>{" "}
              to use as an example.
            </p>
          </div>

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6"
              role="alert"
            >
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-6"
              role="alert"
            >
              <strong className="font-bold">Success!</strong>
              <span className="block sm:inline"> {successMessage}</span>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default DocumentsPage; 