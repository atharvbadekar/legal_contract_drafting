import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentService } from '../services/api';
import { DocumentRecord } from '../types';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  ArrowRight, 
  Download, 
  ExternalLink, 
  Trash2,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  BarChart2
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.list();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      await documentService.delete(id);
      loadDocuments();
    }
  };

  const handleDownloadDocx = async (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await documentService.downloadDocx(doc.id, doc.title);
  };

  const handleDownloadPdf = async (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    await documentService.downloadPdf(doc.id, doc.title);
  };

  const totalCount = documents.length;
  const draftsCount = documents.filter(d => d.status === 'DRAFT').length;
  const completedCount = documents.filter(d => d.status === 'COMPLETED').length;
  const needsReviewCount = documents.filter(d => d.status === 'NEEDS_REVIEW').length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-mira-dark tracking-tight">Atharv Legal AI Workspace</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-mira-light text-mira-primary border border-purple-200">
              Enterprise v1.0
            </span>
          </div>
          <p className="text-sm text-mira-muted mt-1">
            AI-Powered Legal Document Generation & Multi-Tier Validation System
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/research"
            className="px-4 py-2 bg-white border border-mira-border hover:border-mira-primary text-mira-dark hover:text-mira-primary text-sm font-medium rounded-lg shadow-2xs transition-all flex items-center gap-2"
          >
            <BarChart2 className="w-4 h-4 text-purple-600" />
            Empirical Benchmarks
          </Link>
          <Link
            to="/create"
            className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Document
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-mira-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mira-muted uppercase tracking-wider">Total Documents</span>
            <div className="p-2 rounded-lg bg-gray-50 text-mira-dark">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-mira-dark">{totalCount}</span>
            <span className="text-xs text-mira-muted">authored records</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-mira-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mira-muted uppercase tracking-wider">Drafts In Progress</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{draftsCount}</span>
            <span className="text-xs text-mira-muted">awaiting generation</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-mira-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mira-muted uppercase tracking-wider">Validated & Verified</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{completedCount}</span>
            <span className="text-xs text-emerald-700 font-medium">passed multi-tier check</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-mira-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-mira-muted uppercase tracking-wider">Needs Human Review</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{needsReviewCount}</span>
            <span className="text-xs text-amber-700 font-medium">fact mismatch flagged</span>
          </div>
        </div>
      </div>

      {/* Document Creation CTA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-purple-500/20 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-medium backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              Bilateral Commercial Protection
            </div>
            <h3 className="text-xl font-bold">Non-Disclosure Agreement (NDA)</h3>
            <p className="text-sm text-purple-200/90 leading-relaxed">
              Synthesize a controlled 14-section Non-Disclosure Agreement anchored in structured facts, approved legal clause retrieval, and Indian Contract Act statutory references.
            </p>
            <button
              onClick={() => navigate('/create?type=NDA')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-mira-primary hover:bg-purple-50 text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              Draft NDA via Atharv Legal AI Pipeline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-gray-300 text-xs font-medium backdrop-blur-xs">
              <Cpu className="w-3.5 h-3.5 text-blue-300" />
              Statutory Demand & Default
            </div>
            <h3 className="text-xl font-bold">Formal Legal Notice</h3>
            <p className="text-sm text-gray-300/90 leading-relaxed">
              Generate an advocate-calibrated 12-section demand notice with strict fact verification (amounts, breach narrative, response periods) and zero fabricated citations.
            </p>
            <button
              onClick={() => navigate('/create?type=LEGAL_NOTICE')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              Draft Legal Notice
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-mira-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-mira-dark">Recent Legal Documents</h2>
            <p className="text-xs text-mira-muted mt-0.5">Documents authored under controlled research pipeline and baseline</p>
          </div>
          <Link to="/documents" className="text-xs font-semibold text-mira-primary hover:underline flex items-center gap-1">
            View All Documents <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-mira-muted">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-mira-muted mx-auto" />
            <p className="text-sm font-medium text-mira-dark">No documents created yet</p>
            <p className="text-xs text-mira-muted">Begin by selecting a document type above to test the MIRA pipeline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-mira-border bg-gray-50/50 text-[11px] font-semibold text-mira-muted uppercase tracking-wider">
                  <th className="py-3 px-6">Document Title</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Mode</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Validation Score</th>
                  <th className="py-3 px-6">Last Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mira-border text-sm">
                {documents.slice(0, 8).map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}/edit`)}
                    className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-6 font-medium text-mira-dark">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-mira-primary flex-shrink-0" />
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-gray-100 text-gray-700">
                        {doc.documentType === 'NDA' ? 'NDA' : 'Legal Notice'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        doc.generationMode === 'MIRA' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {doc.generationMode}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      {doc.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : doc.status === 'NEEDS_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <AlertCircle className="w-3.5 h-3.5" /> Needs Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              doc.validationScore >= 90 ? 'bg-emerald-500' :
                              doc.validationScore >= 70 ? 'bg-blue-500' :
                              doc.validationScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${doc.validationScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-mira-dark">{doc.validationScore}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-mira-muted">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-1">
                      <button
                        onClick={(e) => handleDownloadDocx(doc, e)}
                        title="Download DOCX"
                        className="p-1.5 text-mira-muted hover:text-mira-primary rounded-md hover:bg-gray-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDownloadPdf(doc, e)}
                        title="Download PDF"
                        className="p-1.5 text-mira-muted hover:text-mira-primary rounded-md hover:bg-gray-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        title="Delete"
                        className="p-1.5 text-mira-muted hover:text-red-600 rounded-md hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
