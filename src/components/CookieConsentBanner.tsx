import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_KEY = "cookie_consent_v1";
const REJECT_REPROMPT_DAYS = 7; // For demo, 7 days. Use 180/365 for 6-12 months in production.

type ConsentType = "accepted" | "rejected";

interface CookieConsentData {
  type: ConsentType;
  timestamp: number;
}

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      const raw = localStorage.getItem(COOKIE_KEY);
      if (!raw) return setVisible(true);
      try {
        const data: CookieConsentData = JSON.parse(raw);
        if (data.type === "rejected") {
          // Re-prompt after X days
          const now = Date.now();
          const days = (now - data.timestamp) / (1000 * 60 * 60 * 24);
          if (days >= REJECT_REPROMPT_DAYS) {
            setVisible(true);
            return;
          }
        }
      } catch {
        setVisible(true);
        return;
      }
      setVisible(false);
    };
    checkConsent();
    // Listen for external open
    const handler = () => setVisible(true);
    window.addEventListener("open-cookie-consent", handler);
    return () => window.removeEventListener("open-cookie-consent", handler);
  }, []);

  const handleConsent = (type: ConsentType) => {
    const data: CookieConsentData = {
      type,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(data));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center items-end pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-2xl mx-auto mb-6 bg-white border border-gray-200 shadow-xl rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Cookie consent banner"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block bg-primary-100 text-primary-700 rounded-full p-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 17v.01" />
                <path d="M12 7v4" />
              </svg>
            </span>
            <span className="font-semibold text-gray-900 text-lg">
              We use cookies
            </span>
          </div>
          <p className="text-gray-700 text-sm md:text-base">
            We only use cookies and local storage that are strictly necessary
            for the website to function (such as authentication and your cookie
            consent choice). We do not use analytics, marketing, or tracking
            cookies. See our{" "}
            <Link
              to="/privacy"
              className="underline text-primary-600 hover:text-primary-700"
            >
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          onClick={() => handleConsent("accepted")}
          autoFocus
        >
          OK
        </button>
        <button
          className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          onClick={() => handleConsent("rejected")}
        >
          Reject
        </button>
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close cookie banner"
          onClick={() => setVisible(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export function openCookieConsentBanner() {
  window.dispatchEvent(new CustomEvent("open-cookie-consent"));
}

export default CookieConsentBanner;
