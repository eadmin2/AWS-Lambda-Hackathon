import React, { useState } from "react";
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import AuthTabs from "../components/auth/AuthTabs";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import { supabase } from "../lib/supabase";

const AuthPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const next = searchParams.get("next");
  const type = searchParams.get("type");

  const handleAuthSuccess = () => {
    if (next === "checkout" && type) {
      navigate(`/checkout?type=${type}`);
    } else {
      navigate("/dashboard");
    }
  };

  // Always show the password reset form if on /auth/reset-password
  if (location.pathname === "/auth/reset-password") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-center">Set New Password</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setResetStatus(null);
              setResetLoading(true);
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                setResetStatus("Password updated! You can now log in with your new password.");
                setTimeout(() => {
                  navigate("/dashboard");
                }, 2000);
              } catch (err: any) {
                setResetStatus(err.message || "Failed to update password.");
              } finally {
                setResetLoading(false);
              }
            }}
            className="space-y-4"
          >
            <label className="block">
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="mt-1 block w-full border rounded px-2 py-1"
              />
            </label>
            <button type="submit" className="btn btn-primary w-full" disabled={resetLoading}>
              {resetLoading ? "Updating..." : "Update Password"}
            </button>
            {resetStatus && <div className="text-sm mt-2 text-center">{resetStatus}</div>}
          </form>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated (but not on reset-password page)
  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-64px-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {next !== "checkout" && (
            <div className="mb-6 max-w-md mx-auto bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded shadow flex items-center justify-between">
              <span>
                <strong>New here?</strong> Please visit our Pricing page to select a plan and create your account.
              </span>
              <Button variant="primary" size="sm" className="ml-4" onClick={() => window.location.href = '/pricing#pricing-section'}>
                View Pricing
              </Button>
            </div>
          )}
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
