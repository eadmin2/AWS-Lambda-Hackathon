import React from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import AuthTabs from "../components/auth/AuthTabs";
import { useAuth } from "../contexts/AuthContext";

const AuthPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const next = searchParams.get("next");
  const type = searchParams.get("type");

  const handleAuthSuccess = () => {
    if (next === "checkout" && type) {
      navigate(`/checkout?type=${type}`);
    } else {
      navigate("/dashboard");
    }
  };

  // Redirect if already authenticated
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-64px-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-primary-600 mx-auto" />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Welcome to VA Rating Assistant
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your account or create a new one to access your
              dashboard.
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow-md rounded-lg">
            <AuthTabs 
              onSuccess={handleAuthSuccess} 
              defaultTab={next === "checkout" ? "register" : "login"}
              onlyRegister={next === "checkout"}
            />
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              By signing up, you agree to our{" "}
              <a
                href="/terms"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AuthPage;
