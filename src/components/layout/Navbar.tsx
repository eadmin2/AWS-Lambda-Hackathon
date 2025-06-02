import React, { useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import { FileText, Menu, Bell } from "lucide-react";

interface NavbarProps {
  notifications?: any[];
  onDismissNotification?: (idx: number) => void;
  bellOpen?: boolean;
  onBellOpenChange?: (open: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  notifications = [],
  onDismissNotification,
  bellOpen,
  onBellOpenChange,
}) => {
  const { user, profile, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Separate state variables for different menus
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuDropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (!bellOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onBellOpenChange && onBellOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellOpen, onBellOpenChange]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target as Node) &&
        userMenuDropdownRef.current &&
        !userMenuDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <FileText className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                VA Rating Assistant
              </span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
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
              Calculator
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
                      <>
                        <Link
                          to="/admin"
                          className="text-purple-700 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Admin
                        </Link>
                        <div className="relative flex items-center">
                          <button
                            ref={bellRef}
                            className="relative p-1 rounded-full hover:bg-gray-100 focus:outline-none"
                            onClick={() =>
                              onBellOpenChange && onBellOpenChange(!bellOpen)
                            }
                            aria-label="Notifications"
                          >
                            <Bell className="h-5 w-5 text-gray-700" />
                            {notifications.length > 0 && (
                              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full transform translate-x-1/2 -translate-y-1/2">
                                {notifications.length}
                              </span>
                            )}
                          </button>
                          {bellOpen && (
                            <div
                              ref={dropdownRef}
                              className="absolute right-0 mt-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                            >
                              <div className="p-4 border-b font-semibold text-gray-800">
                                Notifications
                              </div>
                              <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                                {notifications.length === 0 && (
                                  <li className="p-4 text-gray-500 text-sm">
                                    No notifications
                                  </li>
                                )}
                                {notifications.map((notif, idx) => (
                                  <li
                                    key={idx}
                                    className="p-4 text-sm flex justify-between items-start gap-2"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {notif.type}
                                      </div>
                                      <div className="text-gray-700">
                                        {notif.user}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {notif.date ? notif.date : ""}
                                      </div>
                                    </div>
                                    <button
                                      className="ml-2 text-gray-400 hover:text-red-500 text-xs"
                                      aria-label="Dismiss notification"
                                      onClick={() =>
                                        onDismissNotification &&
                                        onDismissNotification(idx)
                                      }
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <div className="relative ml-3">
                      <div>
                        <button
                          ref={userMenuButtonRef}
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
                        <div
                          ref={userMenuDropdownRef}
                          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10"
                        >
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

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="block h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
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
              Calculator
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
    </nav>
  );
};

export default Navbar;