import React from "react";
import { Link } from "react-router-dom";
import { Youtube, Linkedin, Facebook } from "lucide-react";
import { openCookieConsentBanner } from "../../utils/cookieConsent";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                VA Rating Assistant
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Helping veterans navigate their disability claims with AI-powered
              document analysis.
            </p>
            <div className="mt-4 flex space-x-6">
              <a
                href="https://www.facebook.com/varatingassistant/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" aria-hidden="true" />
              </a>
              <a
                href="https://www.linkedin.com/company/varatingassistant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" aria-hidden="true" />
              </a>
              <a
                href="https://www.youtube.com/@VARatingAssistant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">YouTube</span>
                <Youtube className="h-6 w-6" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase">
              Resources
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <a
                  href="#how-it-works"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="https://www.va.gov/disability/about-disability-ratings/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  VA Rating Guide
                </a>
              </li>
              <li>
                <a
                  href="https://www.va.gov/find-forms/about-form-21-4138/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  VA Forms
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  to="/faq"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  to="/privacy"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieConsentBanner}
                  className="text-base text-gray-600 hover:text-gray-900 underline focus:outline-none"
                >
                  Cookie Settings
                </button>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/disclaimer"
                  className="text-base text-gray-600 hover:text-gray-900"
                >
                  Medical Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            <Link to="/privacy" className="text-gray-500 hover:text-gray-600">
              <span className="text-sm">Privacy</span>
            </Link>
            <button
              type="button"
              onClick={openCookieConsentBanner}
              className="text-gray-500 hover:text-gray-600 underline focus:outline-none"
            >
              <span className="text-sm">Cookie Settings</span>
            </button>
            <Link to="/terms" className="text-gray-500 hover:text-gray-600">
              <span className="text-sm">Terms</span>
            </Link>
            <Link
              to="/disclaimer"
              className="text-gray-500 hover:text-gray-600"
            >
              <span className="text-sm">Disclaimer</span>
            </Link>
          </div>
          <p className="mt-8 text-sm text-gray-500 md:mt-0 md:order-1">
            &copy; {new Date().getFullYear()} VA Rating Assistant. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
