import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import { cn } from "../../lib/utils";

interface AuthTabsProps {
  defaultTab?: "login" | "register";
  onSuccess?: () => void;
  onlyRegister?: boolean;
}

const AuthTabs: React.FC<AuthTabsProps> = ({
  defaultTab = "login",
  onSuccess,
  onlyRegister = false,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);

  if (onlyRegister) {
    return (
      <div className="w-full max-w-md">
        <RegisterForm onSuccess={onSuccess} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <LoginForm onSuccess={onSuccess} />
    </div>
  );
};

export default AuthTabs;
