import React, { useState } from 'react';
import { UserCondition } from '../../lib/supabase'; // Import the main type

// Define the new types based on the backend response
interface TooltipDefinition {
  term: string;
  definition: string;
}

interface ConfidenceIndicator {
  score: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface ConditionData {
  rating_explanation: string;
  cfr_link: string;
  tooltip_definitions: TooltipDefinition[];
  confidence_indicator: ConfidenceIndicator;
  disclaimer: string;
}

// A helper to highlight and add simple browser-native tooltips
const HighlightedText = ({ text, tooltips }: { text: string; tooltips: { term: string, definition: string }[] }) => {
  if (!text) return null;
  if (!tooltips || tooltips.length === 0) {
    return <span>{text}</span>;
  }

  const terms = tooltips.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
  
  const parts = text.split(regex);

  return (
      <span>
        {parts.map((part, index) => {
          const lowerCasePart = part.toLowerCase();
          const tooltip = tooltips.find(t => t.term.toLowerCase() === lowerCasePart);
          if (tooltip) {
            return (
              <span key={index} title={tooltip.definition} className="font-bold text-blue-600 underline decoration-dotted cursor-help">{part}</span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
  );
};

interface ConditionItemProps {
  condition: UserCondition;
}

const ConditionItem: React.FC<ConditionItemProps> = ({ condition }) => {
  const [open, setOpen] = useState(false);

  const getConfidenceColor = (score?: 'High' | 'Medium' | 'Low') => {
    switch (score) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // RENDER THE NEW, DETAILED VIEW
  if (condition.recommendation) {
    const details = condition.recommendation;
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-xl text-gray-900">{condition.name}</h3>
          </div>
          <div className="text-right">
             <span className={`font-bold px-3 py-1 rounded-full text-lg ${getConfidenceColor(details.confidence_indicator.score)}`}>
              {condition.rating}%
            </span>
            <div className="text-xs text-gray-500 mt-1">Confidence: {details.confidence_indicator.score}</div>
          </div>
        </div>

        <div className="text-gray-700 text-base mb-4 prose">
           <HighlightedText text={details.rating_explanation} tooltips={details.tooltip_definitions} />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span>{open ? 'Hide' : 'Show'} Details & CFR Information</span>
             <svg className={`w-5 h-5 ml-1 transform transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {open && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-md text-gray-800 mb-2">Confidence Reasoning</h4>
              <p className="text-sm text-gray-600 mb-4">{details.confidence_indicator.reasoning}</p>
              
              <h4 className="font-semibold text-md text-gray-800 mb-2">CFR Information</h4>
              {details.cfr_link && (
                  <a 
                    href={details.cfr_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Official Criteria
                  </a>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded-md">
          <span role="img" aria-label="warning">⚠️</span> {details.disclaimer}
        </div>
      </div>
    );
  }

  // RENDER THE OLD, SIMPLE VIEW as a fallback
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900 text-lg">{condition.name}</div>
        <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">{condition.rating}%</span>
      </div>
      <div className="text-gray-600 text-sm mt-2 mb-2">{condition.summary || 'No summary available.'}</div>
       <button
        className="text-blue-600 hover:underline text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        View CFR Details
      </button>
      {open && (
        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="font-semibold text-gray-800 mb-2">38 CFR Part 4 Language</div>
          <div className="text-gray-700 text-sm whitespace-pre-line mb-2">{condition.cfr_criteria || 'No CFR criteria found.'}</div>
          {condition.keywords && condition.keywords.length > 0 && (
            <div className="text-xs text-gray-500">Matched keywords: {condition.keywords.join(", ")}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConditionItem; 