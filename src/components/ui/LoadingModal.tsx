import React from "react";
import Modal from "./Modal";
import { Loader2 } from "lucide-react";

const LoadingModal: React.FC<{
  isOpen: boolean;
  steps: string[];
  currentStep: number;
}> = ({ isOpen, steps, currentStep }) => (
  <Modal isOpen={isOpen} onClose={() => {}} ariaLabelledBy="loading-modal-title">
    <div className="p-6 flex flex-col items-center">
      <h2 id="loading-modal-title" className="text-lg font-bold mb-2">Deleting your account...</h2>
      <Loader2 className="animate-spin h-10 w-10 text-primary-600 mb-4" aria-hidden="true" />
      <ul className="mb-4 w-full" aria-live="polite">
        {steps.map((step, idx) => (
          <li
            key={step}
            className={`text-sm mb-1 ${idx === currentStep ? "font-bold text-primary-700" : idx < currentStep ? "text-green-600" : "text-gray-400"}`}
            aria-current={idx === currentStep ? "step" : undefined}
          >
            {step}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">Please do not close this window.</p>
    </div>
  </Modal>
);

export default LoadingModal; 