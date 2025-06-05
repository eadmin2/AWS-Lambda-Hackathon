import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import Button from "../ui/Button";
import { Mail, AlertCircle } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
}

interface LoginFormData {
  email: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<LoginFormData>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = async (data: LoginFormData) => {
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
      });
      if (error) {
        setError("root", {
          type: "manual",
          message: error.message || "Login failed. Please try again.",
        });
        return;
      }
      setSuccessMessage(
        "Check your email for a login link or one-time passcode (OTP). Follow the instructions to log in.",
      );
      reset();
      if (onSuccess) onSuccess();
    } catch (_error) {
      setError("root", {
        type: "manual",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="bg-error-100 p-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-error-700 text-sm">{errors.root.message}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-success-100 p-3 rounded-md flex items-start">
          <p className="text-success-700 text-sm">{successMessage}</p>
        </div>
      )}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            className={`input pl-10 ${errors.email ? "border-error-500 focus:border-error-500 focus:ring-error-500" : ""}`}
            placeholder="veteran@example.com"
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
          <p className="text-error-500 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Send Login Link / OTP
      </Button>
    </form>
  );
};

export default LoginForm;
