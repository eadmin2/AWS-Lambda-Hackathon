import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import FileUploader from "../components/documents/FileUploader";
import { useAuth } from "../contexts/AuthContext";
import { getUserPermissions, UserPermissions } from "../lib/supabase";
import { UploadRequired } from "../components/ui/AccessControl";
import { useSearchParams } from "react-router-dom";
import Modal from "../components/ui/Modal";

const DocumentsPage: React.FC = () => {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

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

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setShowPaymentNotification(true);
      setShowOnboardingModal(true);
      const timer = setTimeout(() => setShowPaymentNotification(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
      <Modal isOpen={showOnboardingModal} onClose={() => setShowOnboardingModal(false)}>
        <h2 className="text-xl font-bold mb-2 text-center">Welcome to VA Rating Assistant!</h2>
        <p className="mb-4 text-gray-700 text-center">
          Thank you for your payment. Here's how to get started:
        </p>
        <ul className="list-disc pl-6 mb-4 text-gray-700 text-left">
          <li>Click <b>Upload Document</b> to upload your medical or VA-related PDFs, images, or scanned documents.</li>
          <li>After uploading, your documents will be processed automatically. You'll see a progress indicator.</li>
          <li>Once processing is complete, you'll be able to view your estimated VA disability rating and detected conditions on your dashboard.</li>
          <li>You can upload additional documents at any time for a more accurate estimate.</li>
          <li>Need help? Visit the <b>Help</b> page or contact support for assistance.</li>
        </ul>
        <button className="btn btn-primary w-full" onClick={() => setShowOnboardingModal(false)}>
          Got it!
        </button>
      </Modal>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {showPaymentNotification && (
            <div className="mb-6 max-w-md mx-auto bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow relative">
              <strong className="font-bold">Payment Received!</strong>
              <span className="block sm:inline"> Your payment was successful. You can now upload documents.</span>
            </div>
          )}
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