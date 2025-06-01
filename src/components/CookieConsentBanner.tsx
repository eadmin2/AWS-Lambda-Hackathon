import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'cookie_consent_v1';
const REJECT_REPROMPT_DAYS = 7; // For demo, 7 days. Use 180/365 for 6-12 months in production.

export function openCookieConsentBanner() {
  window.dispatchEvent(new CustomEvent('open-cookie-consent'));
}

type ConsentType = 'accepted' | 'rejected' | 'customized';

interface CookieConsentData {
  type: ConsentType;
  timestamp: number;
  preferences?: CookiePreferences;
}

interface CookiePreferences {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

const defaultPrefs: CookiePreferences = {
  preferences: false,
  analytics: false,
  marketing: false,
};

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaultPrefs);

  useEffect(() => {
    const checkConsent = () => {
      const raw = localStorage.getItem(COOKIE_KEY);
      if (!raw) return setVisible(true);
      try {
        const data: CookieConsentData = JSON.parse(raw);
        if (data.type === 'customized' && data.preferences) {
          setPrefs(data.preferences);
        }
        if (data.type === 'rejected') {
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
    window.addEventListener('open-cookie-consent', handler);
    return () => window.removeEventListener('open-cookie-consent', handler);
  }, []);

  const handleConsent = (type: ConsentType, customPrefs?: CookiePreferences) => {
    const data: CookieConsentData = {
      type,
      timestamp: Date.now(),
      preferences: type === 'customized' ? customPrefs : undefined,
    };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(data));
    setVisible(false);
    setShowCustomize(false);
    if (type === 'customized' && customPrefs) setPrefs(customPrefs);
    // TODO: Actually enable/disable cookies by category here
  };

  // For toggles in customize modal
  const [customizePrefs, setCustomizePrefs] = useState<CookiePreferences>(defaultPrefs);
  useEffect(() => {
    if (showCustomize) {
      setCustomizePrefs(prefs);
    }
  }, [showCustomize]);

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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 17v.01" /><path d="M12 7v4" /></svg>
            </span>
            <span className="font-semibold text-gray-900 text-lg">We use cookies</span>
          </div>
          <p className="text-gray-700 text-sm md:text-base">
            We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. You can accept all cookies, reject non-essential cookies, or customize your preferences. See our{' '}
            <Link to="/privacy" className="underline text-primary-600 hover:text-primary-700">Privacy Policy</Link> for details.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-2 md:mt-0">
          <button
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            onClick={() => handleConsent('accepted')}
            autoFocus
          >
            Accept All
          </button>
          <button
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            onClick={() => handleConsent('rejected')}
          >
            Reject All
          </button>
          <button
            className="bg-white border border-primary-600 text-primary-700 hover:bg-primary-50 font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            onClick={() => setShowCustomize(true)}
          >
            Customize
          </button>
        </div>
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          aria-label="Close cookie banner"
          onClick={() => setVisible(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 pointer-events-auto">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full relative animate-fade-in pointer-events-auto">
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close customize modal"
              onClick={() => setShowCustomize(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Customize Cookie Preferences</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleConsent('customized', customizePrefs);
              }}
            >
              <div className="space-y-5 mb-6">
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked disabled className="mt-1.5 h-5 w-5 text-primary-600" />
                  <div>
                    <span className="font-semibold text-gray-900">Strictly Necessary Cookies</span>
                    <p className="text-gray-600 text-sm">Required for the website to function and cannot be switched off.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={customizePrefs.preferences}
                    onChange={e => setCustomizePrefs(p => ({ ...p, preferences: e.target.checked }))}
                    className="mt-1.5 h-5 w-5 text-primary-600"
                    id="cookie-pref"
                  />
                  <div>
                    <label htmlFor="cookie-pref" className="font-semibold text-gray-900 cursor-pointer">Preferences/Functional Cookies</label>
                    <p className="text-gray-600 text-sm">Remember your settings and preferences to personalize your experience.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={customizePrefs.analytics}
                    onChange={e => setCustomizePrefs(p => ({ ...p, analytics: e.target.checked }))}
                    className="mt-1.5 h-5 w-5 text-primary-600"
                    id="cookie-analytics"
                  />
                  <div>
                    <label htmlFor="cookie-analytics" className="font-semibold text-gray-900 cursor-pointer">Analytics/Performance Cookies</label>
                    <p className="text-gray-600 text-sm">Help us understand site usage and improve our services.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={customizePrefs.marketing}
                    onChange={e => setCustomizePrefs(p => ({ ...p, marketing: e.target.checked }))}
                    className="mt-1.5 h-5 w-5 text-primary-600"
                    id="cookie-marketing"
                  />
                  <div>
                    <label htmlFor="cookie-marketing" className="font-semibold text-gray-900 cursor-pointer">Marketing/Advertising Cookies</label>
                    <p className="text-gray-600 text-sm">Used to show you relevant ads and measure their effectiveness.</p>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                Save Preferences
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieConsentBanner; 