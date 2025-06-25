import React from "react";
import { LazyMotion, domAnimation, m } from 'framer-motion';

interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value }) => {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className="flex items-center gap-4 bg-white rounded-lg shadow p-4 min-w-[180px]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="text-2xl text-primary-600">{icon}</div>
        <div>
          <div className="text-lg font-semibold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
        </div>
      </m.div>
    </LazyMotion>
  );
};

export default SummaryCard; 