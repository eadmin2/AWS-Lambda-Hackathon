import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getUserPermissions,
  getUserStatus,
  UserPermissions,
  UserStatus,
} from "../../lib/supabase";
import { Lock, CreditCard, Crown } from "lucide-react";
import Button from "./Button";
import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { LazyMotion, domAnimation, m } from 'framer-motion';

interface AccessControlProps {
  children: React.ReactNode;
  requiresPayment?: boolean;
  requiresAdmin?: boolean;
  requiresUpload?: boolean;
  fallbackMessage?: string;
  showUpgradePrompt?: boolean;
}

const AccessControl: React.FC<AccessControlProps> = ({
  children,
  requiresPayment = false,
  requiresAdmin = false,
  requiresUpload = false,
  fallbackMessage,
  showUpgradePrompt = true,
}) => {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      const perms = await getUserPermissions(profile);
      const status = getUserStatus(profile);
      setPermissions(perms);
      setUserStatus(status);
      setLoading(false);
    };

    fetchPermissions();
  }, [profile]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="animate-pulse bg-gray-200 rounded-lg h-32 w-full" />
      </div>
    );
  }

  if (!permissions || !userStatus) {
    // This case should ideally not be hit if loading handles correctly
    return null;
  }

  // Check permissions
  const hasRequiredPermissions = (() => {
    if (requiresAdmin) return permissions.canAccessAdminFeatures;
    if (requiresUpload) return permissions.canUpload;
    if (requiresPayment) return permissions.canAccessPaidFeatures;
    return true;
  })();

  if (hasRequiredPermissions) {
    return <>{children}</>;
  }

  // Determine appropriate restriction message
  const getRestrictionContent = () => {
    if (requiresAdmin) {
      return {
        icon: <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4" />,
        title: "Admin Access Required",
        message: "This feature is only available to administrators.",
        showUpgradeButton: false,
      };
    }

    if (requiresUpload || requiresPayment) {
      const hasSubscription = permissions.hasActiveSubscription;
      const hasCredits = permissions.hasUploadCredits;

      if (userStatus === "registered" && !hasSubscription && !hasCredits) {
        return {
          icon: <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-4" />,
          title: "Payment Required",
          message: fallbackMessage || "You need to purchase a subscription or upload credits to access this feature.",
          showUpgradeButton: showUpgradePrompt,
        };
      }

      if (requiresUpload && !permissions.canUpload) {
        return {
          icon: <Lock className="h-12 w-12 text-gray-500 mx-auto mb-4" />,
          title: "Upload Credits Required",
          message: "You've used all your upload credits. Purchase more to continue uploading documents.",
          showUpgradeButton: showUpgradePrompt,
        };
      }
    }

    return {
      icon: <Lock className="h-12 w-12 text-gray-500 mx-auto mb-4" />,
      title: "Access Restricted",
      message: fallbackMessage || "You don't have permission to access this feature.",
      showUpgradeButton: showUpgradePrompt && userStatus === "registered",
    };
  };

  const restrictionContent = getRestrictionContent();

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className="max-w-md mx-auto"
        initial={{ x: 0 }}
        animate={{ x: [0, -8, 8, -8, 8, 0] }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {restrictionContent.icon}
              {restrictionContent.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{restrictionContent.message}</p>
            {restrictionContent.showUpgradeButton && (
              <div className="space-y-3">
                <Button
                  onClick={() => window.location.href = "/pricing"}
                  className="w-full"
                >
                  View Pricing Plans
                </Button>
                <p className="text-xs text-gray-500">
                  Choose from single uploads or unlimited monthly subscriptions
                </p>
              </div>
            )}
            {userStatus === "paid" && !permissions.canUpload && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-yellow-800 text-sm">
                  Upload credits remaining: {permissions.uploadCreditsRemaining}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </m.div>
    </LazyMotion>
  );
};

// Convenience components for common access patterns
export const PaymentRequired: React.FC<{ children: React.ReactNode; message?: string }> = ({ 
  children, 
  message 
}) => (
  <AccessControl requiresPayment fallbackMessage={message}>
    {children}
  </AccessControl>
);

export const UploadRequired: React.FC<{ children: React.ReactNode; message?: string }> = ({ 
  children, 
  message 
}) => (
  <AccessControl requiresUpload fallbackMessage={message}>
    {children}
  </AccessControl>
);

export const AdminRequired: React.FC<{ children: React.ReactNode; message?: string }> = ({ 
  children, 
  message 
}) => (
  <AccessControl requiresAdmin fallbackMessage={message} showUpgradePrompt={false}>
    {children}
  </AccessControl>
);

export default AccessControl;