import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import Button from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from 'framer-motion';

interface NavbarProps {
  notifications?: any[];
  onDismissNotification?: () => void;
  bellOpen?: boolean;
  onBellOpenChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<NavbarProps> = ({
  notifications = [],
  onDismissNotification,
  bellOpen = false,
  onBellOpenChange
}) => {
  const { user, profile, signOut, isLoading } = useAuth();

  // Separate state variables for different menus
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  
  // Refs for click outside detection
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (bellMenuRef.current && !bellMenuRef.current.contains(event.target as Node)) {
        onBellOpenChange?.(false);
      }
    }

    if (isUserMenuOpen || bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, bellOpen, onBellOpenChange]);

  const handleSignOut = async () => {
    try {
      await signOut();
      
      // Force a complete page reload and clear cache
      // Using replace to prevent back-button issues
      window.location.replace('/');
      
      // Add a small delay before reloading to ensure all cleanup is done
      setTimeout(() => {
        // Force reload from server, not from cache
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still force a reload even if there's an error
      window.location.replace('/');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white shadow-sm border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="ml-2 text-xl font-bold text-gray-900">
                VA Rating Assistant
              </span>
            </Link>
          </div>
          {/* Hamburger for mobile */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="block h-6 w-6" />
            </button>
          </div>
          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-2">
            <Link
              to="/"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/calculator"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Combined Rating Calculator
            </Link>
            <Link
              to="/forms"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              VA Forms
            </Link>
            <Link
              to="/facilities"
              className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              VA Facilities
            </Link>
            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {profile?.role === "admin" && (
                      <Link
                        to="/admin"
                        className="text-purple-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    {/* Notifications Bell */}
                    {profile?.role === "admin" && (
                      <div className="relative" ref={bellMenuRef}>
                        <button
                          onClick={() => onBellOpenChange?.(!bellOpen)}
                          className="relative p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <span className="sr-only">View notifications</span>
                          <Bell className="h-6 w-6" />
                          {notifications.length > 0 && (
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                          )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {bellOpen && notifications.length > 0 && (
                          <div className="origin-top-right absolute right-0 mt-2 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 py-1">
                            <div className="px-4 py-2 border-b border-gray-200">
                              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                              {notifications.map((notification, index) => (
                                <div
                                  key={index}
                                  className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                >
                                  <p className="text-sm text-gray-900">{notification.message}</p>
                                  {notification.description && (
                                    <p className="mt-1 text-sm text-gray-500">{notification.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            {onDismissNotification && (
                              <div className="px-4 py-2 border-t border-gray-200">
                                <button
                                  onClick={onDismissNotification}
                                  className="text-sm text-primary-600 hover:text-primary-900"
                                >
                                  Clear all notifications
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative ml-3" ref={userMenuRef}>
                      <div>
                        <button
                          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                          className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <span className="sr-only">Open user menu</span>
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-medium">
                            {user.email?.charAt(0).toUpperCase() || "U"}
                          </div>
                        </button>
                      </div>
                      {isUserMenuOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            Your Profile
                          </Link>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleSignOut();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/pricing#pricing-section"
                      className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium mr-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link to="/auth">
                      <Button variant="primary">Sign In</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 z-[9998]">
          <div className="pt-2 pb-3 space-y-1 flex flex-col">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/calculator"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Combined Rating Calculator
            </Link>
            <Link
              to="/forms"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              VA Forms
            </Link>
            <Link
              to="/facilities"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              VA Facilities
            </Link>
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 rounded-md text-base font-medium text-purple-700 hover:text-purple-900 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
            {!user && (
              <Link
                to="/pricing#pricing-section"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            )}
          </div>
          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-medium">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {user.user_metadata?.full_name || "User"}
                  </div>
                  <div className="text-sm font-medium text-gray-500">
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Your Profile
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex justify-center">
                <Link
                  to="/auth"
                  className="w-full px-4 py-2 rounded bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;
