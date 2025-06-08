import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsentBanner from "../CookieConsentBanner";
import Sidebar from "./Sidebar";
import { useLocation } from "react-router-dom";

interface PageLayoutProps {
  children: React.ReactNode;
  notifications?: any[];
  onDismissNotification?: (idx: number) => void;
  bellOpen?: boolean;
  onBellOpenChange?: (open: boolean) => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  notifications,
  onDismissNotification,
  bellOpen,
  onBellOpenChange,
}) => {
  const location = useLocation();
  const showSidebar = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/documents");
  return (
    <div className="flex min-h-screen">
      {showSidebar && <Sidebar />}
      <main className="flex-1 px-2 sm:px-4 md:px-8 py-4 md:py-8 transition-all duration-200">
        <Navbar
          notifications={notifications}
          onDismissNotification={onDismissNotification}
          bellOpen={bellOpen}
          onBellOpenChange={onBellOpenChange}
        />
        <main className="flex-grow mt-4 md:mt-8">{children}</main>
        <Footer />
        <CookieConsentBanner />
      </main>
    </div>
  );
};

export default PageLayout;
