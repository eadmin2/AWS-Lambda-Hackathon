import React, { useState } from "react";

interface ConditionItemProps {
  name: string;
  rating: number;
  excerpt: string;
  cfrCriteria: string;
  matchedKeywords: string[];
}

const ConditionItem: React.FC<ConditionItemProps> = ({ name, rating, excerpt, cfrCriteria, matchedKeywords }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900 text-lg">{name}</div>
        <span className="bg-primary-100 text-primary-800 font-bold px-3 py-1 rounded-full text-sm">{rating}%</span>
      </div>
      <div className="text-gray-600 text-sm mt-2 mb-2">{excerpt}</div>
      <button
        className="text-primary-600 hover:underline text-sm font-medium"
        aria-expanded={open}
        aria-controls={`cfr-accordion-${name}`}
        onClick={() => setOpen((v) => !v)}
      >
        View CFR §4.xx Criteria
      </button>
      {open && (
        <div
          id={`cfr-accordion-${name}`}
          className="mt-3 p-3 bg-gray-50 rounded border border-gray-200"
          role="region"
          aria-label={`CFR criteria for ${name}`}
        >
          <div className="font-semibold text-gray-800 mb-2">38 CFR Part 4 Language</div>
          <div className="text-gray-700 text-sm whitespace-pre-line mb-2">{cfrCriteria}</div>
          <div className="text-xs text-gray-500">Matched keywords: {matchedKeywords.join(", ")}</div>
        </div>
      )}
    </div>
  );
};

export default ConditionItem; 