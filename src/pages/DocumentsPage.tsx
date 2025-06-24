import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import FileUploader from "../components/documents/FileUploader";
import { useAuth } from "../contexts/AuthContext";
import { getUserPermissions, UserPermissions } from "../lib/supabase";
import { UploadRequired } from "../components/ui/AccessControl";

const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
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

  const handleUploadSuccess = (_document: any) => {};
  const handleUploadError = (_errorMessage: string) => {};

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
        </div>
      </div>
    </PageLayout>
  );
};

export default DocumentsPage; 