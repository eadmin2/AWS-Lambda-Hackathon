import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsentBanner from "../CookieConsentBanner";
import Sidebar from "./Sidebar";
import Chatbot from "../chat/Chatbot";
import { useLocation } from "react-router-dom";
import { motion } from 'framer-motion';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const location = useLocation();
  const showSidebar = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/documents");
  return (
    <div className="flex min-h-screen">
      {showSidebar && <Sidebar />}
      <main className="flex-1 px-2 sm:px-4 md:px-8 py-4 md:py-8 transition-all duration-200">
        <Navbar />
        <motion.main
          className="flex-grow mt-4 md:mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
        <Footer />
        <CookieConsentBanner />
        <Chatbot />
      </main>
    </div>
  );
};

export default PageLayout;
