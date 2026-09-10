import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong>Research Prototype Notice:</strong> Atharv Legal AI is an AI-assisted legal drafting and validation system developed for academic & empirical research. It does not provide legal advice or replace formal counsel. All outputs require qualified legal review.
        </span>
      </div>
      <div className="hidden md:flex items-center gap-1 text-amber-700 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>InLegalBERT + pgvector RAG Active</span>
      </div>
    </div>
  );
};
