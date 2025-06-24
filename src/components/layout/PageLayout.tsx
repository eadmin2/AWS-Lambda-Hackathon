import React, { Suspense, lazy } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useLocation } from "react-router-dom";
import { motion } from 'framer-motion';

// Lazy load non-critical components
const CookieConsentBanner = lazy(() => import("../CookieConsentBanner"));
const Sidebar = lazy(() => import("./Sidebar"));
const Chatbot = lazy(() => import("../chat/Chatbot"));

interface PageLayoutProps {
  children: React.ReactNode;
  notifications?: any[];
  onDismissNotification?: () => void;
  bellOpen?: boolean;
  onBellOpenChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children,
  notifications,
  onDismissNotification,
  bellOpen,
  onBellOpenChange
}) => {
  const location = useLocation();
  const showSidebar = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/documents");
  return (
    <div className="flex min-h-screen">
      {showSidebar && (
        <Suspense fallback={<div className="w-64 bg-gray-100" />}>
          <Sidebar />
        </Suspense>
      )}
      <main className="flex-1 px-2 sm:px-4 md:px-8 py-4 md:py-8 transition-all duration-200">
        <Navbar 
          notifications={notifications}
          onDismissNotification={onDismissNotification}
          bellOpen={bellOpen}
          onBellOpenChange={onBellOpenChange}
        />
        <motion.main
          className="flex-grow mt-4 md:mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
        <Footer />
        <Suspense fallback={null}>
          <CookieConsentBanner />
        </Suspense>
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      </main>
    </div>
  );
};

export default PageLayout;
