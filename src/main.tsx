import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Generate CSP nonce for inline scripts if needed
const generateCSPNonce = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Set CSP nonce attribute on script tags if they need to be whitelisted
const cspNonce = generateCSPNonce();
// Make nonce available globally for dynamically created elements
(window as any).__CSP_NONCE__ = cspNonce;

// Set nonce on any inline script elements if needed
document.querySelectorAll('script[type="text/javascript"]').forEach(script => {
  script.setAttribute('nonce', cspNonce);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
