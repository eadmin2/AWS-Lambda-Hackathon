import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createUploadCheckoutSession,
  createSubscriptionCheckoutSession,
} from "../lib/stripe";
import PageLayout from "../components/layout/PageLayout";

const CheckoutPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const doCheckout = async () => {
      if (!user) return;
      if (type === "single") {
        try {
          await createUploadCheckoutSession(user.id);
        } catch {
          setError("Failed to start single upload checkout.");
        }
      } else if (type === "subscription") {
        try {
          await createSubscriptionCheckoutSession(user.id);
        } catch {
          setError("Failed to start subscription checkout.");
        }
      } else {
        setError("Invalid or missing checkout type.");
      }
    };
    doCheckout();
  }, [user, type]);

  return (
    <PageLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        {error ? (
          <div className="text-red-600 font-semibold text-lg">{error}</div>
        ) : (
          <>
            <div className="loader mb-4" />
            <div className="text-lg font-medium text-gray-700">
              Redirecting to secure checkout...
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default CheckoutPage;

// Add a simple CSS spinner (loader) if not already present in your global styles.
