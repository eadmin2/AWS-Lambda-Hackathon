import React, { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { User, Mail, AlertCircle, Save } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile, supabase } from "../lib/supabase";
import { useForm } from "react-hook-form";
import {
  openStripeCustomerPortal,
  fetchStripeBillingInfo,
  StripeBillingInfo,
} from "../lib/stripe";
import Modal from "../components/ui/Modal";
import { useTokenBalance } from '../hooks/useTokenBalance';

interface ProfileFormData {
  fullName: string;
  email: string;
  emailNotificationsEnabled: boolean;
}

interface TokenInfo {
  tokens_available: number;
  tokens_used: number;
  recent_purchases: Array<{
    id: string;
    product_type: string;
    tokens_purchased: number;
    amount_paid: number;
    created_at: string;
  }>;
}

// Utility function to call the delete-account Edge Function
async function deleteAccountRequest(): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.functions.invoke("delete-account", {
      method: "DELETE",
    });

    if (error) {
      // Try to parse a more specific error message from the response
      let errorMessage = "Failed to delete account.";
      if (error instanceof Error) {
          try {
              const body = JSON.parse(error.message);
              errorMessage = body.error || errorMessage;
          } catch (e) {
              // Not a JSON error, use the default
          }
      }
      return { error: errorMessage };
    }

    return { success: true };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred.";
    return { error: `Failed to invoke function: ${errorMessage}` };
  }
}

const DeleteAccountModalContent: React.FC<{
  deleteError: string | null;
  deleteLoading: boolean;
  onDelete: () => void;
  onCancel: () => void;
}> = ({
  deleteError,
  deleteLoading,
  onDelete,
  onCancel,
}) => {
  const [localDeleteConfirm, setLocalDeleteConfirm] = useState("");

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-error-700 mb-4">
        Confirm Account Deletion
      </h2>
      <p className="mb-4 text-gray-700">
        This will permanently delete your account and all data.
        This action cannot be undone.
        <br />
        To confirm, type{" "}
        <span className="font-mono font-bold">DELETE</span> below.
      </p>
      <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-1">
        Type DELETE to confirm
      </label>
      <input
        type="text"
        id="deleteConfirm"
        name="deleteConfirm"
        className="input w-full mb-4"
        placeholder="Type DELETE to confirm"
        autoComplete="off"
        value={localDeleteConfirm}
        onChange={(e) => setLocalDeleteConfirm(e.target.value)}
        autoFocus
      />
      {deleteError && (
        <div className="mb-4 text-error-600 text-sm">
          {deleteError}
        </div>
      )}
      <div className="flex gap-3">
        <Button
          variant="danger"
          className="flex-1"
          disabled={localDeleteConfirm !== "DELETE" || deleteLoading}
          isLoading={deleteLoading}
          onClick={onDelete}
        >
          Permanently Delete
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
          disabled={deleteLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<StripeBillingInfo | null>(
    null,
  );
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const navigate = useNavigate();
  const { tokensAvailable, tokensUsed } = useTokenBalance(user?.id || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      fullName: profile?.full_name || "",
      email: user?.email || "",
      emailNotificationsEnabled: true,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      setIsUpdating(true);
      setUpdateSuccess(false);
      setUpdateError(null);

      await updateProfile(user.id, {
        full_name: data.fullName,
      });

      setUpdateSuccess(true);
    } catch (error) {
      console.error("Error updating profile:", error);
      setUpdateError("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (user) {
      setBillingLoading(true);
      fetchStripeBillingInfo()
        .then(setBillingInfo)
        .catch((err) => {
          console.error("Error fetching billing info:", err);
          setBillingError(err.message);
        })
        .finally(() => setBillingLoading(false));

      // Fetch token information
      setTokenLoading(true);
      fetchTokenInfo()
        .then(setTokenInfo)
        .catch((err) => {
          console.error("Error fetching token info:", err);
        })
        .finally(() => setTokenLoading(false));
    }
  }, [user]);

  const fetchTokenInfo = async (): Promise<TokenInfo> => {
    const { data: tokenData, error: tokenError } = await supabase
      .from("user_tokens")
      .select("tokens_available, tokens_used")
      .eq("user_id", user?.id)
      .single();

    const { data: purchaseData } = await supabase
      .from("token_purchases")
      .select("id, product_type, tokens_purchased, amount_paid, created_at")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (tokenError && tokenError.code !== "PGRST116") {
      throw new Error("Failed to fetch token information");
    }

    return {
      tokens_available: tokenData?.tokens_available || 0,
      tokens_used: tokenData?.tokens_used || 0,
      recent_purchases: purchaseData || [],
    };
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    const result = await deleteAccountRequest();
    if (result.success) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        // Ignore "user_not_found" error after account deletion
        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          err.message === "User from sub claim in JWT does not exist"
        ) {
          // Optionally log or ignore
        } else {
          // Handle/log other errors if needed
          console.error("Logout error:", err);
        }
      }
      setDeleteLoading(false);
      navigate("/goodbye");
    } else {
      setDeleteLoading(false);
      setDeleteError(
        result.error || "Failed to delete account",
      );
    }
  };

  // Redirect if not authenticated
  if (!isAuthLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <PageLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Your Profile
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col h-full">
                <Card className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent>
                      {updateSuccess && (
                        <div className="mb-6 bg-green-100 border border-green-200 p-4 rounded-md flex items-start">
                          <Save className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-green-700 text-sm">
                            Profile updated successfully.
                          </p>
                        </div>
                      )}

                      {updateError && (
                        <div className="mb-6 bg-error-100 border border-error-200 p-4 rounded-md flex items-start">
                          <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-error-700 text-sm">
                            {updateError}
                          </p>
                        </div>
                      )}

                      <div className="space-y-6">
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
                              className={`input pl-10 ${errors.fullName ? "border-error-500" : ""}`}
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
                              className="input pl-10 bg-gray-50"
                              value={user?.email || ""}
                              disabled
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Email cannot be changed. Contact support if you need
                            to update your email.
                          </p>
                        </div>

                        {/* Change Password Section - moved here */}
                        <div className="mt-6 bg-white p-6 rounded shadow-md">
                          <h3 className="text-lg font-semibold mb-2">Change Password</h3>
                          {!showPasswordForm ? (
                            <button className="btn btn-primary" onClick={() => setShowPasswordForm(true)}>
                              Change Password
                            </button>
                          ) : (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                setPasswordStatus(null);
                                setPasswordLoading(true);
                                if (newPassword !== confirmPassword) {
                                  setPasswordStatus("New passwords do not match.");
                                  setPasswordLoading(false);
                                  return;
                                }
                                try {
                                  // Optionally, you can re-authenticate the user here if needed
                                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                                  if (error) throw error;
                                  setPasswordStatus("Password updated successfully.");
                                  setShowPasswordForm(false);
                                  setCurrentPassword("");
                                  setNewPassword("");
                                  setConfirmPassword("");
                                } catch (err: any) {
                                  setPasswordStatus(err.message || "Failed to update password.");
                                } finally {
                                  setPasswordLoading(false);
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
                                  autoComplete="new-password"
                                  className="mt-1 block w-full border rounded px-2 py-1"
                                />
                              </label>
                              <label className="block">
                                Confirm New Password
                                <input
                                  type="password"
                                  value={confirmPassword}
                                  onChange={e => setConfirmPassword(e.target.value)}
                                  required
                                  autoComplete="new-password"
                                  className="mt-1 block w-full border rounded px-2 py-1"
                                />
                              </label>
                              <button type="submit" className="btn btn-primary w-full" disabled={passwordLoading}>
                                {passwordLoading ? "Updating..." : "Update Password"}
                              </button>
                              {passwordStatus && <div className="text-sm mt-2 text-center">{passwordStatus}</div>}
                            </form>
                          )}
                        </div>

                        {/* Email Notification Settings */}
                        <div className="space-y-1 mt-6 border-t pt-6">
                          <label className="block text-sm font-medium text-gray-700">
                            Email Notifications
                          </label>
                          <div className="mt-2">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-primary-600"
                                {...register("emailNotificationsEnabled")}
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                Receive email notifications when new conditions are detected
                              </span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">
                              We'll send you an email when we detect new conditions in your medical documents.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        isLoading={isUpdating}
                        disabled={isUpdating}
                      >
                        Save Changes
                      </Button>
                    </CardFooter>
                    {/* Need Help section inside the card */}
                    <div className="border-t mt-8 pt-6">
                      <h2 className="text-lg font-semibold mb-2">Need Help?</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        If you have any questions or need assistance with your account, please contact our support team.
                      </p>
                      <Button
                        variant="secondary"
                        className="w-full mb-4"
                        onClick={() => (window.location.href = "/contact")}
                      >
                        Contact Support
                      </Button>
                      {/* Danger Zone section inside the card */}
                      <div className="mt-8 border-t pt-8">
                        <h2 className="text-lg font-bold text-error-600 mb-2">Danger Zone</h2>
                        <p className="text-sm text-error-700 mb-4">
                          Permanently delete your profile and all associated data. This action cannot be undone.
                        </p>
                        <Button
                          variant="danger"
                          className="w-full"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Delete My Profile
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Account Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Account Created
                        </h3>
                        <p className="text-base font-medium">
                          {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Last Sign In
                        </h3>
                        <p className="text-base font-medium">
                          {user?.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Account Type
                        </h3>
                        <p className="text-base font-medium">
                          {profile?.role === "admin" ? "Admin" : "Veteran"}
                        </p>
                      </div>
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">
                          Token Balance
                        </h3>
                        <p className="text-base font-medium text-primary-600">
                          {tokenLoading
                            ? "Loading..."
                            : `${tokensAvailable} tokens`}
                        </p>
                        <h3 className="text-sm font-medium text-gray-500 mb-1 mt-3">
                          Tokens Used
                        </h3>
                        <p className="text-base font-medium text-gray-600">
                          {tokenLoading
                            ? "Loading..."
                            : `${tokensUsed} tokens`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Token Purchase History */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Recent Token Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tokenLoading ? (
                      <div className="text-sm text-gray-500 mb-2">
                        Loading purchase history...
                      </div>
                    ) : tokenInfo?.recent_purchases.length === 0 ? (
                      <div className="text-sm text-gray-500 mb-4">
                        No token purchases yet.
                      </div>
                    ) : (
                      <div className="space-y-3 mb-4">
                        {tokenInfo?.recent_purchases.map((purchase) => (
                          <div
                            key={purchase.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {purchase.product_type.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(purchase.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-primary-600">
                                +{purchase.tokens_purchased} tokens
                              </div>
                              <div className="text-sm text-gray-500">
                                ${(purchase.amount_paid / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => (window.location.href = "/pricing#token-addons")}
                    >
                      Buy More Tokens
                    </Button>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Subscription & Billing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Manage your subscription, view payment history, download
                      invoices, or cancel your plan securely via Stripe.
                    </p>
                    {billingLoading && (
                      <div className="text-sm text-gray-500 mb-2">
                        Loading billing info...
                      </div>
                    )}
                    {billingError && (
                      <div className="text-sm text-error-500 mb-2">
                        {billingError}
                      </div>
                    )}
                    {billingInfo && (
                      <div className="mb-4">
                        <div className="mb-2">
                          <span className="font-medium">Status:</span>{" "}
                          {typeof billingInfo.subscription?.status === "string"
                            ? billingInfo.subscription.status
                            : "No active subscription"}
                        </div>
                        {billingInfo.subscription &&
                          typeof billingInfo.subscription
                            .current_period_start === "number" &&
                          typeof billingInfo.subscription.current_period_end ===
                            "number" && (
                            <>
                              <div className="mb-2">
                                <span className="font-medium">
                                  Current Period:
                                </span>{" "}
                                {new Date(
                                  billingInfo.subscription
                                    .current_period_start * 1000,
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  billingInfo.subscription.current_period_end *
                                    1000,
                                ).toLocaleDateString()}
                              </div>
                              <div className="mb-2">
                                <span className="font-medium">
                                  Next Payment:
                                </span>{" "}
                                {new Date(
                                  billingInfo.subscription.current_period_end *
                                    1000,
                                ).toLocaleDateString()}
                              </div>
                            </>
                          )}
                        {billingInfo.invoices &&
                          billingInfo.invoices.length > 0 && (
                            <div className="mt-4">
                              <div className="font-medium mb-1">
                                Payment History:
                              </div>
                              <table className="w-full text-sm border">
                                <thead>
                                  <tr>
                                    <th className="text-left p-1 border">
                                      Date
                                    </th>
                                    <th className="text-left p-1 border">
                                      Amount
                                    </th>
                                    <th className="text-left p-1 border">
                                      Status
                                    </th>
                                    <th className="text-left p-1 border">
                                      Invoice
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {billingInfo.invoices.map(
                                    (inv: Record<string, unknown>) => (
                                      <tr key={String(inv.id)}>
                                        <td className="p-1 border">
                                          {typeof inv.created === "number"
                                            ? new Date(
                                                inv.created * 1000,
                                              ).toLocaleDateString()
                                            : ""}
                                        </td>
                                        <td className="p-1 border">
                                          {typeof inv.amount_paid === "number"
                                            ? `$${(inv.amount_paid / 100).toFixed(2)}`
                                            : ""}
                                        </td>
                                        <td className="p-1 border">
                                          {typeof inv.status === "string"
                                            ? inv.status
                                            : ""}
                                        </td>
                                        <td className="p-1 border">
                                          {typeof inv.invoice_pdf ===
                                          "string" ? (
                                            <a
                                              href={inv.invoice_pdf}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary-600 underline"
                                            >
                                              View
                                            </a>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={async () => {
                        setIsUpdating(true);
                        try {
                          await openStripeCustomerPortal();
                        } catch (error) {
                          console.error("Failed to open Stripe portal:", error);
                          alert(
                            "Failed to open Stripe portal. Please try again.",
                          );
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      isLoading={isUpdating}
                    >
                      Manage Subscription & Invoices
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      >
        <DeleteAccountModalContent
          deleteError={deleteError}
          deleteLoading={deleteLoading}
          onDelete={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default ProfilePage;