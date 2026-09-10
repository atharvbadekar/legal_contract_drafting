import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFE]">
      <DisclaimerBanner />
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-mira-border bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-mira-muted gap-2">
          <div>
            © {new Date().getFullYear()} Atharv Legal AI Research Platform. Architectural study on InLegalBERT + pgvector RAG.
          </div>
          <div className="flex items-center gap-4">
            <span>Model: law-ai/InLegalBERT (768-dim)</span>
            <span>•</span>
            <span>pgvector Cosine Retrieval</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Multi-Tier Validation Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
