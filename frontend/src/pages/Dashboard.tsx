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
  BarChart2,
  Search,
  Briefcase,
  Wrench,
  Cloud,
  UserCheck,
  Handshake,
  Building2,
  MapPin
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
            to="/analyzer"
            className="px-4 py-2 bg-purple-50 border border-purple-200 hover:border-mira-primary text-mira-primary hover:text-purple-800 text-sm font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-purple-600" />
            Analyze Contract
          </Link>
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

      {/* Document Creation & Analysis CTA Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-mira-dark">Multi-Contract Quick Drafting</h2>
            <p className="text-xs text-mira-muted">Select an institutional legal contract type to generate an authoritative draft</p>
          </div>
          <Link
            to="/create"
            className="text-xs font-semibold text-mira-primary hover:text-purple-800 flex items-center gap-1"
          >
            All 10 Contract Types <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NDA */}
          <div className="bg-gradient-to-br from-purple-900 to-indigo-950 rounded-xl p-5 text-white relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200 text-[11px] font-medium">
                <Sparkles className="w-3 h-3 text-purple-300" />
                Commercial
              </div>
              <h3 className="text-base font-bold">Non-Disclosure Agreement</h3>
              <p className="text-xs text-purple-200/80 leading-relaxed line-clamp-2">
                Mutual or unilateral NDA protecting confidential technical & business disclosures.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <button
                onClick={() => navigate('/create?type=NDA')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-mira-primary hover:bg-purple-50 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Draft NDA <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Employment */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 rounded-xl p-5 text-white relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 text-[11px] font-medium">
                <Briefcase className="w-3 h-3 text-emerald-300" />
                Human Resources
              </div>
              <h3 className="text-base font-bold">Employment Agreement</h3>
              <p className="text-xs text-emerald-200/80 leading-relaxed line-clamp-2">
                Executive employment contract with designation, CTC, probation, and IP assignment.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <button
                onClick={() => navigate('/create?type=EMPLOYMENT')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Draft Employment <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Master Services */}
          <div className="bg-gradient-to-br from-violet-900 to-purple-950 rounded-xl p-5 text-white relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-violet-200 text-[11px] font-medium">
                <Wrench className="w-3 h-3 text-violet-300" />
                Services
              </div>
              <h3 className="text-base font-bold">Master Services Agreement</h3>
              <p className="text-xs text-violet-200/80 leading-relaxed line-clamp-2">
                Commercial contract for engineering, deliverables, milestones, and liability cap.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <button
                onClick={() => navigate('/create?type=SERVICE')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-violet-800 hover:bg-violet-50 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Draft Services <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SaaS Agreement */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-950 rounded-xl p-5 text-white relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-[11px] font-medium">
                <Cloud className="w-3 h-3 text-indigo-300" />
                Technology
              </div>
              <h3 className="text-base font-bold">SaaS Subscription</h3>
              <p className="text-xs text-indigo-200/80 leading-relaxed line-clamp-2">
                Cloud software subscription with SLA uptime, recurring billing, and data protection.
              </p>
            </div>
            <div className="pt-4 relative z-10">
              <button
                onClick={() => navigate('/create?type=SAAS')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-indigo-800 hover:bg-indigo-50 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Draft SaaS <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Consulting, MOU, Legal Notice, Analyzer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Consulting */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium">
                <UserCheck className="w-3 h-3 text-orange-600" />
                Advisory
              </div>
              <h3 className="text-base font-bold text-mira-dark">Consulting Agreement</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Independent advisor contract with retainer, work product IP, and confidentiality.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=CONSULTING')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Consulting <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* MOU */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-medium">
                <Handshake className="w-3 h-3 text-teal-600" />
                Partnership
              </div>
              <h3 className="text-base font-bold text-mira-dark">Memorandum of Understanding</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Statement of mutual intent, joint objectives, and preliminary collaboration terms.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=MOU')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft MOU <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium">
                <Cpu className="w-3 h-3 text-slate-700" />
                Litigation
              </div>
              <h3 className="text-base font-bold text-mira-dark">Formal Legal Notice</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Advocate demand notice for breach, default, and litigation consequences.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=LEGAL_NOTICE')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Legal Notice <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Contract Analyzer */}
          <div className="bg-white rounded-xl p-5 border border-purple-200 bg-purple-50/30 shadow-2xs hover:border-mira-primary transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 text-mira-primary text-[11px] font-medium">
                <Search className="w-3 h-3 text-purple-600" />
                Analysis & Health
              </div>
              <h3 className="text-base font-bold text-mira-dark">Contract Analyzer</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Upload DOCX, PDF, or text. Audits clauses, uncovers risk, and generates health score.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/analyzer')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Launch Analyzer <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Third Row: Vendor Supply, Partnership, Internship, Commercial Lease */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendor Agreement */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium">
                <Building2 className="w-3 h-3 text-blue-600" />
                Procurement
              </div>
              <h3 className="text-base font-bold text-mira-dark">Vendor Supply Agreement</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                B2B procurement contract for goods delivery, PO specs, inspection, and warranties.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=VENDOR')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Vendor <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Partnership Agreement */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                <Layers className="w-3 h-3 text-amber-600" />
                Corporate
              </div>
              <h3 className="text-base font-bold text-mira-dark">Partnership Agreement</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                General partnership deed governing capital accounts, profit ratios, and voting.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=PARTNERSHIP')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Partnership <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Internship Agreement */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-cyan-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[11px] font-medium">
                <FileText className="w-3 h-3 text-cyan-600" />
                Training & HR
              </div>
              <h3 className="text-base font-bold text-mira-dark">Internship Agreement</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Educational engagement terms with curriculum, stipend, IP ownership, and conduct.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=INTERNSHIP')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Internship <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Commercial Lease Agreement */}
          <div className="bg-white rounded-xl p-5 border border-mira-border shadow-2xs hover:border-rose-300 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-medium">
                <MapPin className="w-3 h-3 text-rose-600" />
                Real Estate
              </div>
              <h3 className="text-base font-bold text-mira-dark">Commercial Lease</h3>
              <p className="text-xs text-mira-muted leading-relaxed line-clamp-2">
                Property tenancy contract with demised premises, monthly rent, deposit, and lock-in.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={() => navigate('/create?type=LEASE')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Draft Lease <ArrowRight className="w-3 h-3" />
              </button>
            </div>
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
            <p className="text-xs text-mira-muted">Begin by selecting a document type above to test the Atharv Legal AI pipeline.</p>
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
                        {doc.generationMode === 'MIRA' ? 'Atharv Legal AI' : 'Baseline LLM'}
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
