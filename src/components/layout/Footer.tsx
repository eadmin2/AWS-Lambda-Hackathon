import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Youtube, Linkedin, Facebook } from "lucide-react";
import { openCookieConsentBanner } from "../../utils/cookieConsent";

const Footer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
                className="text-gray-600 hover:text-gray-700"
              >
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" aria-hidden="true" />
              </a>
              <a
                href="https://www.linkedin.com/company/varatingassistant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-700"
              >
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-6 w-6" aria-hidden="true" />
              </a>
              <a
                href="https://www.youtube.com/@VARatingAssistant"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-700"
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
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/") {
                      // Update hash to force browser anchor, then smooth scroll
                      window.location.hash = "#how-it-works";
                      setTimeout(() => {
                        const el = document.getElementById("how-it-works");
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                          el.focus && el.focus();
                        }
                      }, 10);
                    } else {
                      navigate("/#how-it-works");
                    }
                  }}
                >
                  How It Works
                </button>
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
                <Link
                  to="/forms"
                  className="text-base text-gray-600 hover:text-gray-900"
                  onClick={() => { setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 300); }}
                >
                  VA Forms
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/faq") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/faq");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/contact") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/contact");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/help") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/help");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  Help Center
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 tracking-wider uppercase">
              Legal
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <button
                  className="text-base text-primary-600 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  onClick={() => {
                    if (location.pathname === "/privacy") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/privacy");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieConsentBanner}
                  className="text-base text-primary-600 hover:text-primary-800 focus:outline-none"
                >
                  Cookie Settings
                </button>
              </li>
              <li>
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/terms") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/terms");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  className="text-base text-gray-600 hover:text-gray-900 focus:outline-none"
                  onClick={() => {
                    if (location.pathname === "/disclaimer") {
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      navigate("/disclaimer");
                      setTimeout(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, 300);
                    }
                  }}
                >
                  Medical Disclaimer
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
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
