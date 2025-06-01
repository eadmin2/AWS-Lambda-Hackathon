import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieConsentBanner from '../CookieConsentBanner';

interface PageLayoutProps {
  children: React.ReactNode;
  notifications?: any[];
  onDismissNotification?: (idx: number) => void;
  bellOpen?: boolean;
  onBellOpenChange?: (open: boolean) => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, notifications, onDismissNotification, bellOpen, onBellOpenChange }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        notifications={notifications}
        onDismissNotification={onDismissNotification}
        bellOpen={bellOpen}
        onBellOpenChange={onBellOpenChange}
      />
      <main className="flex-grow">{children}</main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
};

export default PageLayout;