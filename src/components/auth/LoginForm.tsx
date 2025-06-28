import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { Mail, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { m } from 'framer-motion';
import Modal from "../ui/Modal";

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onForgotPassword }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Capture redirect parameters
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isRedirecting) {
      timeoutId = setTimeout(() => {
        const pendingRedirect = sessionStorage.getItem("pendingRedirect");
        if (pendingRedirect) {
          sessionStorage.removeItem("pendingRedirect");
          // Assume pendingRedirect is a full, valid URL
          window.location.href = pendingRedirect;
          return;
        }

        if (next === "checkout" && type) {
          window.location.href = `/checkout?type=${type}`;
          return;
        }

        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/dashboard";
        }
      }, 1000);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isRedirecting, next, type, onSuccess]);

  const onSubmit = async (data: LoginFormData) => {
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError("root", {
          type: "manual",
          message: error.message,
        });
        return;
      }

      setSuccessMessage("Login successful! Redirecting...");
      setIsRedirecting(true);
    } catch (error: any) {
      setError("root", {
        type: "manual",
        message: error.message || "Login failed. Please try again.",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Build redirect URL with parameters
      let redirectTo = window.location.origin + "/dashboard";
      if (next && type) {
        // Store checkout info in session storage for the current environment
        sessionStorage.setItem("pendingRedirect", `${window.location.origin}/checkout?type=${type}`);
        redirectTo = window.location.origin + "/dashboard";
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) {
        setError("root", {
          type: "manual",
          message: error.message || "Google sign in failed.",
        });
      }
    } catch (error: any) {
      setError("root", {
        type: "manual",
        message: error.message || "Google sign in failed.",
      });
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <m.div
            className="bg-error-100 p-3 rounded-md flex items-start"
            initial={{ x: 0 }}
            animate={{ x: [0, -8, 8, -8, 8, 0] }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-error-700 text-sm">{errors.root.message}</p>
          </m.div>
        )}
        {successMessage && (
          <m.div
            className="bg-success-100 p-3 rounded-md flex items-start"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <svg className="h-5 w-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-success-700 text-sm">{successMessage}</p>
          </m.div>
        )}
        <div className="space-y-1">
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-600" />
            </div>
            <input
              id="login-email"
              type="email"
              className={`input pl-10 ${errors.email ? "border-error-500 focus:border-error-500 focus:ring-error-500" : ""}`}
              placeholder="veteran@example.com"
              autoComplete="username"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
            />
          </div>
          {errors.email && (
            <p className="text-error-500 text-xs mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className={`input ${errors.password ? "border-error-500 focus:border-error-500 focus:ring-error-500" : ""}`}
            placeholder="Enter your password"
            autoComplete="current-password"
            {...register("password", {
              required: "Password is required",
            })}
          />
          {errors.password && (
            <p className="text-error-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right", marginTop: 8 }}>
          <button type="button" className="text-blue-600 hover:underline text-sm" onClick={onForgotPassword}>
            Forgot Password?
          </button>
        </div>
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign In
        </Button>
      </form>

      {/* Show payment redirect message */}
      {next === "checkout" && type && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
          <p className="text-blue-700 text-sm">
            After login, you'll be redirected to complete your payment.
          </p>
        </div>
      )}

      <div className="flex items-center my-4">
        <div className="flex-grow border-t border-gray-200" />
                        <span className="mx-2 text-gray-600 text-xs">OR</span>
        <div className="flex-grow border-t border-gray-200" />
      </div>
      <Button
        type="button"
        className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
        onClick={handleGoogleSignIn}
        isLoading={false}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#clip0_17_40)">
            <path
              d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.4C36.7 32.2 34.7 34.7 31.8 36.3V42H39.5C44 38.1 47.5 32 47.5 24.5Z"
              fill="#4285F4"
            />
            <path
              d="M24 48C30.6 48 36.2 45.8 39.5 42L31.8 36.3C30.1 37.4 27.9 38.1 24 38.1C18.7 38.1 14.1 34.7 12.5 30.2H4.6V35.1C7.9 41.1 15.3 48 24 48Z"
              fill="#34A853"
            />
            <path
              d="M12.5 30.2C12.1 29.1 11.9 27.9 11.9 26.7C11.9 25.5 12.1 24.3 12.5 23.2V18.3H4.6C3.2 21.1 2.5 24.1 2.5 26.7C2.5 29.3 3.2 32.3 4.6 35.1L12.5 30.2Z"
              fill="#FBBC05"
            />
            <path
              d="M24 9.9C27.2 9.9 29.7 11 31.3 12.5L39.6 5.2C36.2 2.1 30.6 0 24 0C15.3 0 7.9 6.9 4.6 12.9L12.5 17.8C14.1 13.3 18.7 9.9 24 9.9Z"
              fill="#EA4335"
            />
          </g>
          <defs>
            <clipPath id="clip0_17_40">
              <rect width="48" height="48" fill="white" />
            </clipPath>
          </defs>
        </svg>
        Sign in with Google
      </Button>
    </m.div>
  );
};

export default LoginForm;