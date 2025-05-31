import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Mail, Key, AlertCircle, Save } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import { openStripeCustomerPortal, fetchStripeBillingInfo, StripeBillingInfo } from '../lib/stripe';

interface ProfileFormData {
  fullName: string;
  email: string;
}

const ProfilePage: React.FC = () => {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<StripeBillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      fullName: profile?.full_name || '',
      email: user?.email || '',
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
      console.error('Error updating profile:', error);
      setUpdateError('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    setBillingLoading(true);
    fetchStripeBillingInfo()
      .then(setBillingInfo)
      .catch((err) => setBillingError(err.message))
      .finally(() => setBillingLoading(false));
  }, []);

  // Redirect if not authenticated
  if (!isAuthLoading && !user) {
    return <Navigate to="/auth\" replace />;
  }

  return (
    <PageLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent>
                      {updateSuccess && (
                        <div className="mb-6 bg-green-100 border border-green-200 p-4 rounded-md flex items-start">
                          <Save className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-green-700 text-sm">Profile updated successfully.</p>
                        </div>
                      )}

                      {updateError && (
                        <div className="mb-6 bg-error-100 border border-error-200 p-4 rounded-md flex items-start">
                          <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-error-700 text-sm">{updateError}</p>
                        </div>
                      )}

                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              id="fullName"
                              type="text"
                              className={`input pl-10 ${errors.fullName ? 'border-error-500' : ''}`}
                              placeholder="John Doe"
                              {...register('fullName', {
                                required: 'Full name is required',
                              })}
                            />
                          </div>
                          {errors.fullName && (
                            <p className="text-error-500 text-xs mt-1">{errors.fullName.message}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              id="email"
                              type="email"
                              className="input pl-10 bg-gray-50"
                              value={user?.email || ''}
                              disabled
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Email cannot be changed. Contact support if you need to update your email.
                          </p>
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
                  </form>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      To change your password, click the button below to receive a password reset email.
                    </p>
                    <Button
                      variant="secondary"
                      leftIcon={<Key className="h-4 w-4" />}
                      onClick={async () => {
                        if (!user?.email) return;
                        
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                          if (error) throw error;
                          
                          setUpdateSuccess(true);
                          setUpdateError(null);
                        } catch (error) {
                          console.error('Error sending password reset:', error);
                          setUpdateError('Failed to send password reset email. Please try again.');
                          setUpdateSuccess(false);
                        }
                      }}
                    >
                      Send Password Reset Email
                    </Button>
                  </CardContent>
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
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Account Created</h3>
                        <p className="text-base font-medium">
                          {user?.created_at 
                            ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Last Sign In</h3>
                        <p className="text-base font-medium">
                          {user?.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Account Type</h3>
                        <p className="text-base font-medium">
                          {profile?.role === 'admin' ? 'Admin' : 'Veteran'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Subscription & Billing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      Manage your subscription, view payment history, download invoices, or cancel your plan securely via Stripe.
                    </p>
                    {billingLoading && <div className="text-sm text-gray-500 mb-2">Loading billing info...</div>}
                    {billingError && <div className="text-sm text-error-500 mb-2">{billingError}</div>}
                    {billingInfo && (
                      <div className="mb-4">
                        <div className="mb-2">
                          <span className="font-medium">Status:</span> {typeof billingInfo.subscription?.status === 'string' ? billingInfo.subscription.status : 'No active subscription'}
                        </div>
                        {billingInfo.subscription && typeof billingInfo.subscription.current_period_start === 'number' && typeof billingInfo.subscription.current_period_end === 'number' && (
                          <>
                            <div className="mb-2">
                              <span className="font-medium">Current Period:</span> {new Date(billingInfo.subscription.current_period_start * 1000).toLocaleDateString()} - {new Date(billingInfo.subscription.current_period_end * 1000).toLocaleDateString()}
                            </div>
                            <div className="mb-2">
                              <span className="font-medium">Next Payment:</span> {new Date(billingInfo.subscription.current_period_end * 1000).toLocaleDateString()}
                            </div>
                          </>
                        )}
                        {billingInfo.invoices && billingInfo.invoices.length > 0 && (
                          <div className="mt-4">
                            <div className="font-medium mb-1">Payment History:</div>
                            <table className="w-full text-sm border">
                              <thead>
                                <tr>
                                  <th className="text-left p-1 border">Date</th>
                                  <th className="text-left p-1 border">Amount</th>
                                  <th className="text-left p-1 border">Status</th>
                                  <th className="text-left p-1 border">Invoice</th>
                                </tr>
                              </thead>
                              <tbody>
                                {billingInfo.invoices.map((inv: Record<string, unknown>) => (
                                  <tr key={String(inv.id)}>
                                    <td className="p-1 border">{typeof inv.created === 'number' ? new Date(inv.created * 1000).toLocaleDateString() : ''}</td>
                                    <td className="p-1 border">{typeof inv.amount_paid === 'number' ? `$${(inv.amount_paid / 100).toFixed(2)}` : ''}</td>
                                    <td className="p-1 border">{typeof inv.status === 'string' ? inv.status : ''}</td>
                                    <td className="p-1 border">{typeof inv.invoice_pdf === 'string' ? <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">View</a> : '-'}</td>
                                  </tr>
                                ))}
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
                        } catch {
                          alert('Failed to open Stripe portal. Please try again.');
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

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                      If you have any questions or need assistance with your account, please contact our support team.
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => window.location.href = '/contact'}
                    >
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;