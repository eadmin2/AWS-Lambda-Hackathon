import React from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";

const GoodbyePage: React.FC = () => (
  <PageLayout>
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Your account has been deleted
        </h1>
        <p className="text-gray-700 mb-6">
          Thank you for using VA Rating Assistant. Your account and all
          associated data have been permanently deleted. We're sorry to see you
          go!
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 transition"
        >
          Return to Home
        </Link>
      </div>
    </div>
  </PageLayout>
);

export default GoodbyePage;
