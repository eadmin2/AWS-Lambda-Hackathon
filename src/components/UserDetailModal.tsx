import React, { useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface DocumentInfo {
  id: string;
  file_name: string;
  uploaded_at?: string;
}

interface PaymentInfo {
  subscription_status?: string;
  subscription_end_date?: string;
  upload_credits?: number;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
    documents?: { count: number }[];
    payments?: PaymentInfo[];
    user_documents?: DocumentInfo[]; // for detailed docs if available
  } | null;
  onSave: (updated: {
    id: string;
    full_name?: string;
    role: string;
  }) => Promise<void>;
  loading?: boolean;
  onUpdateCredits?: (
    userId: string,
    paymentId: string,
    newCredits: number,
  ) => Promise<void>;
  canEditCredits?: boolean;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  loading,
  onUpdateCredits,
  canEditCredits,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [role, setRole] = useState(user?.role || "");
  const [saving, setSaving] = useState(false);
  const [creditsEdit, setCreditsEdit] = useState<{
    [paymentId: string]: number;
  }>({});
  const [creditsSaving, setCreditsSaving] = useState<{
    [paymentId: string]: boolean;
  }>({});

  React.useEffect(() => {
    setFullName(user?.full_name || "");
    setRole(user?.role || "");
    setCreditsEdit({});
    setCreditsSaving({});
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave({ id: user.id, full_name: fullName, role });
    setSaving(false);
    onClose();
  };

  const handleCreditsChange = (paymentId: string, value: number) => {
    setCreditsEdit((prev) => ({ ...prev, [paymentId]: value }));
  };

  const handleCreditsSave = async (paymentId: string) => {
    if (!onUpdateCredits || !user) return;
    setCreditsSaving((prev) => ({ ...prev, [paymentId]: true }));
    await onUpdateCredits(user.id, paymentId, creditsEdit[paymentId]);
    setCreditsSaving((prev) => ({ ...prev, [paymentId]: false }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="user-detail-modal-title"
    >
      <h2 id="user-detail-modal-title" className="text-lg font-semibold mb-4">
        User Details
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="mt-1 text-gray-900">{user.email}</div>
        </div>
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700"
          >
            Role
          </label>
          <select
            id="role"
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="veteran">Veteran</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Documents
          </label>
          <ul className="mt-1 text-gray-900 max-h-32 overflow-y-auto text-sm">
            {user.user_documents && user.user_documents.length > 0 ? (
              user.user_documents.map((doc) => (
                <li
                  key={doc.id}
                  className="py-1 border-b last:border-b-0 flex justify-between items-center"
                >
                  <span>{doc.file_name}</span>
                  {doc.uploaded_at && (
                    <span className="text-xs text-gray-500 ml-2">
                      {doc.uploaded_at}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No documents</li>
            )}
          </ul>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payments
          </label>
          <ul className="mt-1 text-gray-900 text-sm">
            {user.payments && user.payments.length > 0 ? (
              user.payments.map((pay: any, idx: number) => (
                <li
                  key={pay.id || idx}
                  className="py-1 border-b last:border-b-0"
                >
                  <div>Status: {pay.subscription_status || "None"}</div>
                  {pay.subscription_end_date && (
                    <div>Ends: {pay.subscription_end_date}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span>Credits:</span>
                    <input
                      id={`credits-${pay.id}`}
                      type="number"
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-xs"
                      autoComplete="off"
                      value={
                        creditsEdit[pay.id] !== undefined
                          ? creditsEdit[pay.id]
                          : pay.upload_credits || 0
                      }
                      onChange={(e) =>
                        handleCreditsChange(pay.id, Number(e.target.value))
                      }
                      disabled={creditsSaving[pay.id] || !canEditCredits}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={creditsSaving[pay.id]}
                      disabled={
                        creditsSaving[pay.id] ||
                        creditsEdit[pay.id] === pay.upload_credits ||
                        !canEditCredits
                      }
                      onClick={() => handleCreditsSave(pay.id)}
                    >
                      Save
                    </Button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No payment info</li>
            )}
          </ul>
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={saving || loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={saving || loading}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserDetailModal;
