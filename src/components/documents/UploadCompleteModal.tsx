import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface UploadCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadCompleteModal: React.FC<UploadCompleteModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="upload-complete-title"
      aria-describedby="upload-complete-description"
    >
      <div className="flex flex-col items-center p-6">
        <div className="mb-4 text-primary-500">
          <CheckCircle className="h-12 w-12" />
        </div>
        
        <h2 
          id="upload-complete-title"
          className="text-xl font-semibold text-gray-900 mb-2 text-center"
        >
          Upload Complete!
        </h2>
        
        <div 
          id="upload-complete-description"
          className="text-center mb-6"
        >
          <p className="text-gray-600 mb-4">
            Your document is being processed. This typically takes about <span className="font-semibold">5-10 minutes</span> to complete. You will receive an email when processing is finished. You can also check your dashboard for updates.
          </p>
          
          <div className="flex items-center justify-center text-primary-600 mb-4">
            <Clock className="h-5 w-5 mr-2" />
            <span className="font-medium">Processing time: ~5-10 minutes</span>
          </div>
        </div>

        <div className="flex justify-center w-full">
          <Button
            variant="primary"
            onClick={handleGoToDashboard}
            className="w-full sm:w-auto"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UploadCompleteModal; 