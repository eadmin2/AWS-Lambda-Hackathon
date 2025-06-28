import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { Mail, User, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  createSubscriptionCheckoutSession,
  createUploadCheckoutSession,
} from "../../lib/stripe";
import { m } from 'framer-motion';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<RegisterFormData>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Capture redirect parameters
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  const onSubmit = async (data: RegisterFormData) => {
    setSuccessMessage(null);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (user) {
        // Explicitly sign in to establish a session immediately
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });

        if (signInError) {
          throw new Error(signInError.message);
        }

        if (signInData.user) {
          // Successful registration, now handle redirect
          if (next === "checkout" && type) {
            if (type === "starter" || type === "file-review" || type === "full-review" || 
                type === "tokens-100" || type === "tokens-250" || type === "tokens-500") {
              await createUploadCheckoutSession(signInData.user.id, type);
            } else if (type === "subscription") {
              await createSubscriptionCheckoutSession(signInData.user.id);
            }
          } else {
            // Default redirect to dashboard if no specific action
            setSuccessMessage("Registration successful! Redirecting...");
            if (onSuccess) onSuccess();
            // or navigate to dashboard
            window.location.href = "/dashboard";
          }
        }
      } else {
        // Handle cases where user is null but no error (e.g., email confirmation required)
        setSuccessMessage(
          "Registration successful! Please check your email to confirm your account.",
        );
        reset();
      }
    } catch (error: any) {
      setError("root", {
        type: "manual",
        message:
          error.message || "Registration failed. Please try again.",
      });
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      // Build redirect URL with parameters
      let redirectTo = window.location.origin + "/dashboard";
      if (next && type) {
        // Store checkout info in session storage
        sessionStorage.setItem("pendingRedirect", window.location.origin + `/checkout?type=${type}`);
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
          message: error.message || "Google sign up failed.",
        });
      }
    } catch (error: any) {
      setError("root", {
        type: "manual",
        message: error.message || "Google sign up failed.",
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
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-600" />
            </div>
            <input
              id="fullName"
              type="text"
              className={`input pl-10 ${errors.fullName ? "border-error-500 focus:border-error-500 focus:ring-error-500" : ""}`}
              placeholder="John Doe"
              autoComplete="name"
              {...register("fullName", {
                required: "Full name is required",
              })}
            />
          </div>
          {errors.fullName && (
            <p className="text-error-500 text-xs mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-600" />
            </div>
            <input
              id="email"
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
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            className={`input ${errors.password ? "border-error-500 focus:border-error-500 focus:ring-error-500" : ""}`}
            placeholder="Enter a password"
            autoComplete="new-password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            })}
          />
          {errors.password && (
            <p className="text-error-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Register
        </Button>
      </form>

      {/* Show payment redirect message */}
      {next === "checkout" && type && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
          <p className="text-blue-700 text-sm">
            After registration, you'll be redirected to complete your payment.
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
        onClick={handleGoogleSignUp}
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
        Sign up with Google
      </Button>
    </m.div>
  );
};

export default RegisterForm;
