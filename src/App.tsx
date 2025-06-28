import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import PricingPage from "./pages/PricingPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import DisclaimerPage from "./pages/DisclaimerPage";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./contexts/AuthContext";
import CheckoutPage from "./pages/CheckoutPage";
import GoodbyePage from "./pages/GoodbyePage";
import CalculatorPage from "./pages/CalculatorPage";
import DocumentsPage from "./pages/DocumentsPage";
import ConditionDetailsPage from "./pages/ConditionDetailsPage";
import ConditionsOverviewPage from "./pages/ConditionsOverviewPage";
import VAFormsPage from "./pages/VAFormsPage";
import FacilitiesPage from "./pages/FacilitiesPage";
import { Helmet } from "react-helmet-async";
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div role="status" aria-label="Loading authentication status">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const location = useLocation();
  return (
    <>
      <Toaster position="top-right" />
      <Helmet>
        {/* Primary Meta Tags */}
        <title>VA Rating Assistant - AI-Powered VA Rating Estimates</title>
        <meta
          name="description"
          content="Get instant, AI-powered VA disability rating estimates for veterans. Fast, accurate, and secure."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0A2463" />

        {/* Open Graph / Facebook / LinkedIn */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://varatingassistant.com/" />
        <meta
          property="og:title"
          content="VA Rating Assistant - AI-Powered VA Rating Estimates"
        />
        <meta
          property="og:description"
          content="Get instant, AI-powered VA disability rating estimates for veterans. Fast, accurate, and secure."
        />
        <meta property="og:image" content="/Logo.svg" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://varatingassistant.com/" />
        <meta
          name="twitter:title"
          content="VA Rating Assistant - AI-Powered VA Rating Estimates"
        />
        <meta
          name="twitter:description"
          content="Get instant, AI-powered VA disability rating estimates for veterans. Fast, accurate, and secure."
        />
        <meta name="twitter:image" content="/Logo.svg" />
      </Helmet>
      <AuthProvider>
        {/* Skip to content link */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <main id="main-content" role="main">
          <LazyMotion features={domAnimation} strict>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ minHeight: '100vh' }}
              >
                <Routes location={location}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="/forms" element={<VAFormsPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/reset-password" element={<AuthPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/disclaimer" element={<DisclaimerPage />} />
                  <Route path="/goodbye" element={<GoodbyePage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/documents"
                    element={
                      <ProtectedRoute>
                        <DocumentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/documents/:documentId/report"
                    element={<ConditionDetailsPage />}
                  />
                  <Route
                    path="/dashboard/conditions"
                    element={
                      <ProtectedRoute>
                        <ConditionsOverviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/forms"
                    element={
                      <ProtectedRoute>
                        <VAFormsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/facilities" element={<FacilitiesPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </m.div>
            </AnimatePresence>
          </LazyMotion>
        </main>
      </AuthProvider>
    </>
  );
}

export default App;
