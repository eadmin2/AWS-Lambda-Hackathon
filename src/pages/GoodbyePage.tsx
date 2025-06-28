import React, { useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";

const GoodbyePage: React.FC = () => {
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded shadow-md max-w-md w-full text-center">
          <h1 className="sr-only">Account Deletion Confirmation</h1>
          <h2 className="text-2xl font-bold text-primary-700 mb-4">Your account has been deleted</h2>
          <p className="mb-4 text-gray-700">
            We're sorry to see you go. Your account and all associated data have been permanently deleted.
          </p>
          <p className="mb-4 text-gray-500 text-sm">
            <strong>Data Retention:</strong> We do not retain your personal data after deletion, except as required by law or for fraud prevention.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={() => window.location.href = "/auth"}>
              Sign Up Again
            </Button>
            <Button variant="secondary" onClick={() => window.location.href = "/contact"}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default GoodbyePage;
