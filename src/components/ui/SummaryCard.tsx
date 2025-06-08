import React from "react";

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value }) => {
  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow p-4 min-w-[180px]">
      <div className="text-2xl text-primary-600">{icon}</div>
      <div>
        <div className="text-lg font-semibold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
};

export default SummaryCard; 