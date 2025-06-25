// Cookie consent event bus
let openCookieConsentCallback: (() => void) | null = null;

export const registerCookieConsentOpener = (callback: () => void) => {
  openCookieConsentCallback = callback;
};

export const openCookieConsentBanner = () => {
  if (openCookieConsentCallback) {
    openCookieConsentCallback();
  }
}; 