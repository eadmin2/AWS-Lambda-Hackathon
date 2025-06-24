import React, { ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * The id of the element that labels the modal, for accessibility (aria-labelledby)
   */
  ariaLabelledBy?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabelledBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    lastFocusedElement.current = document.activeElement as HTMLElement;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableEls).filter(el => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    // Focus the first focusable element in the modal
    setTimeout(() => {
      if (modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableEls).filter(el => el.offsetParent !== null);
        if (focusable.length > 0) focusable[0].focus();
      }
    }, 0);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the previously focused element
      if (lastFocusedElement.current) lastFocusedElement.current.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {})}
        >
          <motion.div
            ref={modalRef}
            className="relative bg-white rounded-lg shadow-lg max-w-full max-h-full overflow-auto p-6"
            style={{ minWidth: 320, minHeight: 120 }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
