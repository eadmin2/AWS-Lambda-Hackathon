import { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Lazy load the App component
const App = lazy(() => import("./App.tsx"));

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Suppress extension-related runtime errors
window.addEventListener('error', function(e) {
  if (e.message && e.message.includes('message channel closed')) {
    e.preventDefault();
    return false;
  }
});
window.addEventListener('unhandledrejection', function(e) {
  if (e.reason && e.reason.message && 
      e.reason.message.includes('message channel closed')) {
    e.preventDefault();
    return false;
  }
});
const win = window as any;
if (typeof win !== 'undefined' && win.chrome && win.chrome.runtime) {
  const originalLastError = win.chrome.runtime.lastError;
  Object.defineProperty(win.chrome.runtime, 'lastError', {
    get: function() {
      const error = originalLastError;
      if (error && error.message && 
          error.message.includes('message channel closed')) {
        return null;
      }
      return error;
    },
    configurable: true
  });
}

// Generate CSP nonce for inline scripts if needed
const generateCSPNonce = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

// Set CSP nonce attribute on script tags if they need to be whitelisted
const cspNonce = generateCSPNonce();
// Make nonce available globally for dynamically created elements
(window as any).__CSP_NONCE__ = cspNonce;

// Set nonce on any inline script elements if needed
document
  .querySelectorAll('script[type="text/javascript"]')
  .forEach((script) => {
    script.setAttribute("nonce", cspNonce);
  });

// Remove loading spinner once app is ready
const removeLoadingSpinner = () => {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.remove();
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-900"></div>
    </div>
  }>
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </Suspense>,
);

// Remove loading spinner after a short delay to ensure smooth transition
setTimeout(removeLoadingSpinner, 100);
