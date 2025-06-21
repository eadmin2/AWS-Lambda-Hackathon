import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  FileText,
  Shield,
  Zap,
  Star,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import {
  createUploadCheckoutSession,
  createSubscriptionCheckoutSession,
} from "../lib/stripe";
import { getUserPermissions } from "../lib/supabase";

const PricingPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<
    "single" | "subscription" | null
  >(null);

  const checkoutSuccess = searchParams.get("checkout") === "success";
  const checkoutCanceled = searchParams.get("checkout") === "canceled";
  const subscriptionSuccess = searchParams.get("subscription") === "success";
  const subscriptionCanceled = searchParams.get("subscription") === "canceled";

  const permissions = getUserPermissions(profile);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  useEffect(() => {
    if (checkoutSuccess || subscriptionSuccess) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title, location.pathname);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [checkoutSuccess, subscriptionSuccess, location.pathname]);

  const handlePurchase = async (type: "single" | "subscription") => {
    if (!user) {
      // Redirect unregistered users to registration with payment intent
      const redirectUrl = `/auth?next=checkout&type=${type}`;
      window.location.href = redirectUrl;
      return;
    }

    try {
      setIsLoading(type);
      if (type === "single") {
        await createUploadCheckoutSession(user?.id);
      } else {
        await createSubscriptionCheckoutSession(user?.id);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      // Handle error appropriately
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-900 to-primary-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Instant VA Disability Rating Estimate for Veterans
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Upload your medical documents and get an accurate VA disability
            rating estimate in minutes using our advanced AI technology.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                AI-Powered Analysis
              </h3>
              <p className="text-gray-600">
                Our advanced AI analyzes your medical documents to identify
                conditions and estimate ratings accurately.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Secure & HIPAA-Conscious
              </h3>
              <p className="text-gray-600">
                Your medical information is protected with bank-level security
                and encryption.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Estimates</h3>
              <p className="text-gray-600">
                Get your estimated VA disability rating in minutes, not weeks or
                months.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {checkoutSuccess && (
            <div className="mb-8 max-w-md mx-auto bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong className="font-bold">Payment Successful!</strong>
              <span className="block sm:inline">
                {" "}
                Your single upload credit has been added to your account.
              </span>
            </div>
          )}
          {subscriptionSuccess && (
            <div className="mb-8 max-w-md mx-auto bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong className="font-bold">Subscription Active!</strong>
              <span className="block sm:inline">
                {" "}
                Welcome to unlimited uploads. You can start using the service
                immediately.
              </span>
            </div>
          )}
          {checkoutCanceled && (
            <div className="mb-8 max-w-md mx-auto bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <strong className="font-bold">Payment canceled</strong>
              <span className="block sm:inline">
                {" "}
                Your payment was not processed. Please try again or contact
                support if you need assistance.
              </span>
            </div>
          )}
          {subscriptionCanceled && (
            <div className="mb-8 max-w-md mx-auto bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <strong className="font-bold">Subscription canceled</strong>
              <span className="block sm:inline">
                {" "}
                Your subscription was not activated. Please try again or contact
                support if you need assistance.
              </span>
            </div>
          )}

          {user && (
            <div className="mt-8 max-w-md mx-auto">
              {permissions.hasActiveSubscription && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Active Subscription</p>
                  <p className="text-green-600 text-sm">You have unlimited uploads</p>
                </div>
              )}
              {permissions.hasUploadCredits && !permissions.hasActiveSubscription && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-800 font-medium">Upload Credits Available</p>
                  <p className="text-blue-600 text-sm">
                    {permissions.uploadCreditsRemaining} uploads remaining
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that works best for you
            </p>
            <div className="mt-4 bg-info-100 border border-info-200 p-4 rounded-md flex items-start max-w-2xl mx-auto">
              <AlertCircle className="h-5 w-5 text-info-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-info-700 text-sm font-medium">
                  Coming Soon
                </p>
                <p className="text-info-600 text-xs mt-1">
                  These are made up pricing plans. Ordering is not yet available. We'll notify you when the service launches.
                </p>
              </div>
            </div>
          </div>

          <div
            className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
            id="pricing-section"
          >
            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">One-Time Upload</h3>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    $29
                  </div>
                  <p className="text-gray-600">Perfect for a single claim</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>Upload and analyze 1 medical document</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>AI-powered condition identification</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>Detailed rating breakdown</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>30-day access to results</span>
                  </li>
                </ul>

                <Button
                  className="w-full"
                  onClick={() => {
                    if (!user) {
                      window.location.href = "/auth?next=checkout&type=single";
                    } else {
                      handlePurchase("single");
                    }
                  }}
                  isLoading={isLoading === "single"}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">
                    Monthly Subscription
                  </h3>
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    $14.99
                  </div>
                  <p className="text-gray-600">
                    For ongoing claims and updates
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span className="font-semibold">
                      Unlimited document uploads
                    </span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>Priority processing</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>Detailed PDF reports</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-500 mr-2" />
                    <span>Cancel anytime</span>
                  </li>
                </ul>

                <Button
                  className="w-full"
                  onClick={() => {
                    if (!user) {
                      window.location.href =
                        "/auth?next=checkout&type=subscription";
                    } else {
                      handlePurchase("subscription");
                    }
                  }}
                  isLoading={isLoading === "subscription"}
                >
                  Start Subscription
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              What Veterans Are Saying
            </h2>
            <p className="text-xl text-gray-600">
              Trusted by veterans nationwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-accent-600">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "This service saved me countless hours of research. The AI
                  analysis was spot-on with my conditions, and I got my rating
                  estimate instantly."
                </p>
                <div>
                  <p className="font-semibold">Michael R.</p>
                  <p className="text-sm text-gray-500">U.S. Army Veteran</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-accent-600">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "The subscription plan is perfect for my ongoing claims. I can
                  upload new documents whenever I need to and get updated
                  ratings right away."
                </p>
                <div>
                  <p className="font-semibold">Sarah J.</p>
                  <p className="text-sm text-gray-500">
                    U.S. Air Force Veteran
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-accent-600">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "The detailed breakdown of each condition helped me understand
                  my claim better. Highly recommend this to any veteran filing
                  for disability."
                </p>
                <div>
                  <p className="font-semibold">David M.</p>
                  <p className="text-sm text-gray-500">
                    U.S. Marine Corps Veteran
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join thousands of veterans who have simplified their VA disability
            claim process with our AI-powered platform.
          </p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="min-w-[200px]">
              Get Your Rating Now
            </Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  );
};

export default PricingPage;
