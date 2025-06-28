import React from "react";
import Modal from "./Modal";
import Button from "./Button";

const ErrorModal: React.FC<{
  isOpen: boolean;
  error: string;
  onRetry: () => void;
  onContact: () => void;
  onClose: () => void;
}> = ({ isOpen, error, onRetry, onContact, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy="error-modal-title">
    <div className="p-6">
      <h2 id="error-modal-title" className="text-xl font-bold text-error-700 mb-4">Account Deletion Failed</h2>
      <p className="mb-4 text-gray-700">{error}</p>
      <div className="flex gap-3">
        <Button variant="primary" onClick={onRetry}>Retry</Button>
        <Button variant="secondary" onClick={onContact}>Contact Support</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  </Modal>
);

export default ErrorModal; 