import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import Modal from "../ui/Modal";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface AuthTabsProps {
  defaultTab?: "login" | "register";
  onSuccess?: () => void;
  onlyRegister?: boolean;
}

function ResetPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth/reset-password"
      });
      if (error) throw error;
      setStatus("A password reset email has been sent if the email exists in our system.");
    } catch (err: any) {
      setStatus(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-2 text-center">Reset Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Email"}
        </button>
        {status && <div className="text-sm mt-2 text-center">{status}</div>}
      </form>
    </Modal>
  );
}

const AuthTabs: React.FC<AuthTabsProps> = ({
  defaultTab = "login",
  onSuccess,
  onlyRegister = false,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);
  const [showResetModal, setShowResetModal] = useState(false);

  if (onlyRegister) {
    return (
      <div className="w-full max-w-md">
        <RegisterForm onSuccess={onSuccess} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <LoginForm onSuccess={onSuccess} onForgotPassword={() => setShowResetModal(true)} />
      <ResetPasswordModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
    </div>
  );
};

export default AuthTabs;