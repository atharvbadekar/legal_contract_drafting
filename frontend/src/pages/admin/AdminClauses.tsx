import React, { useEffect, useState } from 'react';
import { clauseService } from '../../services/api';
import { ClauseRecord, DocumentType } from '../../types';
import {
  Plus,
  Check,
  Archive,
  Edit2,
  ShieldCheck,
  Search,
  Filter,
  History,
  AlertTriangle,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';

const CONTRACT_TYPES = [
  { value: 'ALL', label: 'All Document Types' },
  { value: 'NDA', label: 'Non-Disclosure Agreement (NDA)' },
  { value: 'SERVICE', label: 'Master Services Agreement (Service)' },
  { value: 'EMPLOYMENT', label: 'Employment Agreement' },
  { value: 'LEASE', label: 'Commercial Lease Agreement' },
  { value: 'CONSULTING', label: 'Consulting / Freelance Agreement' },
  { value: 'PARTNERSHIP', label: 'Partnership Agreement' },
  { value: 'SALE', label: 'Sale of Goods Agreement' },
  { value: 'LEGAL_NOTICE', label: 'Formal Legal Notice' }
];

const VARIANTS = [
  { value: 'ALL', label: 'All Variants' },
  { value: 'standard', label: 'Standard' },
  { value: 'mutual', label: 'Mutual' },
  { value: 'one-way', label: 'One-Way / Unilateral' },
  { value: 'strict', label: 'Strict / Aggressive' },
  { value: 'balanced', label: 'Balanced / Neutral' },
  { value: 'experimental', label: 'Experimental' }
];

const RISK_LEVELS = [
  { value: 'ALL', label: 'All Risk Levels' },
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' }
];

const REQUIRED_STATUSES = ['REQUIRED', 'RECOMMENDED', 'CONDITIONAL', 'OPTIONAL'];

export const AdminClauses: React.FC = () => {
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [variantFilter, setVariantFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClause, setEditingClause] = useState<ClauseRecord | null>(null);
  const [versioningClause, setVersioningClause] = useState<ClauseRecord | null>(null);

  // Form state for Add/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formContractType, setFormContractType] = useState('NDA');
  const [formClauseType, setFormClauseType] = useState('confidentiality');
  const [formContent, setFormContent] = useState('');
  const [formVariant, setFormVariant] = useState('standard');
  const [formRequiredStatus, setFormRequiredStatus] = useState('RECOMMENDED');
  const [formRiskLevel, setFormRiskLevel] = useState('LOW');
  const [formJurisdiction, setFormJurisdiction] = useState('India');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formConditionsJson, setFormConditionsJson] = useState('{}');

  // Form state for New Version
  const [versionContent, setVersionContent] = useState('');
  const [versionRevisionNotes, setVersionRevisionNotes] = useState('');
  const [versionVariant, setVersionVariant] = useState('standard');
  const [versionRiskLevel, setVersionRiskLevel] = useState('LOW');

  useEffect(() => {
    loadClauses();
  }, []);

  const loadClauses = async () => {
    try {
      setLoading(true);
      const data = await clauseService.list();
      setClauses(data);
    } catch (err) {
      console.error('Failed to load clauses:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormContractType('NDA');
    setFormClauseType('confidentiality');
    setFormContent('');
    setFormVariant('standard');
    setFormRequiredStatus('RECOMMENDED');
    setFormRiskLevel('LOW');
    setFormJurisdiction('India');
    setFormSourceUrl('');
    setFormConditionsJson('{}');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (clause: ClauseRecord) => {
    setEditingClause(clause);
    setFormTitle(clause.title);
    setFormContractType(clause.contractType || clause.documentType || 'NDA');
    setFormClauseType(clause.clauseType);
    setFormContent(clause.content || clause.text || '');
    setFormVariant(clause.variant || 'standard');
    setFormRequiredStatus(clause.requiredStatus || 'RECOMMENDED');
    setFormRiskLevel(clause.riskLevel || 'LOW');
    setFormJurisdiction(clause.jurisdiction || 'India');
    setFormSourceUrl(clause.sourceUrl || '');
    setFormConditionsJson(clause.conditions ? JSON.stringify(clause.conditions, null, 2) : '{}');
  };

  const handleOpenVersion = (clause: ClauseRecord) => {
    setVersioningClause(clause);
    setVersionContent(clause.content || clause.text || '');
    setVersionRevisionNotes('');
    setVersionVariant(clause.variant || 'standard');
    setVersionRiskLevel(clause.riskLevel || 'LOW');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedConditions = {};
      try {
        parsedConditions = JSON.parse(formConditionsJson);
      } catch {
        alert('Invalid JSON in conditions field. Please check formatting.');
        return;
      }

      await clauseService.create({
        title: formTitle,
        documentType: formContractType as DocumentType,
        contractType: formContractType,
        clauseType: formClauseType,
        content: formContent,
        text: formContent,
        variant: formVariant,
        requiredStatus: formRequiredStatus,
        riskLevel: formRiskLevel,
        conditions: parsedConditions,
        jurisdiction: formJurisdiction,
        sourceUrl: formSourceUrl || undefined,
        status: 'APPROVED'
      });
      setShowAddModal(false);
      resetForm();
      loadClauses();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClause) return;

    try {
      let parsedConditions = {};
      try {
        parsedConditions = JSON.parse(formConditionsJson);
      } catch {
        alert('Invalid JSON in conditions field. Please check formatting.');
        return;
      }

      await clauseService.update(editingClause.id, {
        title: formTitle,
        documentType: formContractType as DocumentType,
        contractType: formContractType,
        clauseType: formClauseType,
        content: formContent,
        text: formContent,
        variant: formVariant,
        requiredStatus: formRequiredStatus,
        riskLevel: formRiskLevel,
        conditions: parsedConditions,
        jurisdiction: formJurisdiction,
        sourceUrl: formSourceUrl || undefined
      });
      setEditingClause(null);
      resetForm();
      loadClauses();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versioningClause) return;

    try {
      await clauseService.createVersion(versioningClause.id, {
        content: versionContent,
        revisionNotes: versionRevisionNotes || 'Admin revised clause content and variant',
        variant: versionVariant,
        riskLevel: versionRiskLevel
      });
      setVersioningClause(null);
      loadClauses();
    } catch (err: any) {
      alert(`Version creation failed: ${err.message}`);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await clauseService.approve(id);
      loadClauses();
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await clauseService.archive(id);
      loadClauses();
    } catch (err: any) {
      alert(`Archive failed: ${err.message}`);
    }
  };

  const filteredClauses = clauses.filter((c) => {
    const cDocType = c.contractType || c.documentType;
    const matchesType = typeFilter === 'ALL' || cDocType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesVariant = variantFilter === 'ALL' || (c.variant || 'standard') === variantFilter;
    const matchesRisk = riskFilter === 'ALL' || (c.riskLevel || 'LOW') === riskFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clauseType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cDocType || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesStatus && matchesVariant && matchesRisk && matchesSearch;
  });

  const getRiskBadgeColor = (risk?: string) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getVariantBadgeColor = (variant?: string) => {
    switch (variant) {
      case 'mutual':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'one-way':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'strict':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'balanced':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-mira-dark">Approved Clause Library</h1>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              pgvector 384-dim
            </span>
          </div>
          <p className="text-xs text-mira-muted mt-1">
            Institutional legal clause repository for Atharv Legal AI. Features deterministic condition filtering, semantic pgvector cosine variant selection, and immutable version tracking.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Clause
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-mira-border shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-mira-muted" />
          <input
            type="text"
            placeholder="Search clauses by keyword, section title, taxonomy key, or operative text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-mira-border rounded-lg text-xs font-medium text-mira-dark placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-mira-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-mira-muted font-medium">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-none"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">APPROVED (Auto-retrievable)</option>
            <option value="DRAFT">DRAFT (Review pending)</option>
            <option value="ARCHIVED">ARCHIVED (Excluded)</option>
          </select>

          <select
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-none"
          >
            {VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-none"
          >
            {RISK_LEVELS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || variantFilter !== 'ALL' || riskFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setVariantFilter('ALL');
                setRiskFilter('ALL');
              }}
              className="text-xs text-mira-primary hover:underline px-2 py-1 font-medium"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-xs text-mira-muted font-medium">
            Showing {filteredClauses.length} of {clauses.length} clauses
          </div>
        </div>
      </div>

      {/* Clauses List */}
      <div className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-mira-muted">Loading clause repository...</div>
        ) : filteredClauses.length === 0 ? (
          <div className="p-16 text-center text-xs text-mira-muted space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p>No legal clauses found matching your filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-mira-border">
            {filteredClauses.map((clause) => {
              const docType = clause.contractType || clause.documentType;
              return (
                <div key={clause.id} className="p-5 space-y-3 hover:bg-gray-50/50 transition-colors">
                  {/* Top line: Title & Action buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-mira-dark">{clause.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {docType} • {clause.clauseType}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getVariantBadgeColor(clause.variant)}`}>
                          variant: {clause.variant || 'standard'}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getRiskBadgeColor(clause.riskLevel)}`}>
                          {clause.riskLevel || 'LOW'} RISK
                        </span>
                        {clause.requiredStatus && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {clause.requiredStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          clause.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : clause.status === 'DRAFT'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {clause.status}
                      </span>

                      {/* Version Button */}
                      <button
                        onClick={() => handleOpenVersion(clause)}
                        className="px-2 py-1 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md font-medium flex items-center gap-1 transition-colors"
                        title="Create new version"
                      >
                        <History className="w-3 h-3 text-gray-500" /> New Version
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(clause)}
                        className="px-2 py-1 text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md font-medium flex items-center gap-1 transition-colors"
                        title="Edit clause properties"
                      >
                        <Edit2 className="w-3 h-3 text-gray-500" /> Edit
                      </button>

                      {/* Approve Button */}
                      {clause.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleApprove(clause.id)}
                          className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-medium flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                      )}

                      {/* Archive Button */}
                      {clause.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleArchive(clause.id)}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-md font-medium flex items-center gap-1 transition-colors"
                        >
                          <Archive className="w-3 h-3" /> Archive
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Operative Clause Text */}
                  <p className="text-xs font-serif text-mira-dark leading-relaxed italic bg-gray-50/70 p-3.5 rounded-lg border border-gray-100">
                    "{clause.content || clause.text}"
                  </p>

                  {/* Conditions & Metadata footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-mira-muted border-t border-gray-100 pt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Jurisdiction: <strong>{clause.jurisdiction || 'India'}</strong></span>
                      <span>•</span>
                      <span>Version: <strong>v{clause.version}</strong></span>
                      {clause.conditions && Object.keys(clause.conditions).length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                            Cond: {JSON.stringify(clause.conditions)}
                          </span>
                        </>
                      )}
                      {clause.sourceUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={clause.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-mira-primary hover:underline flex items-center gap-1"
                          >
                            Source Ref <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </>
                      )}
                    </div>

                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Legal NLP Vector Synchronized
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Clause Modal */}
      {(showAddModal || editingClause) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-mira-border my-8">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-mira-dark">
                {editingClause ? 'Edit Approved Clause' : 'Add New Approved Legal Clause'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClause(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingClause ? handleUpdate : handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-mira-dark">Clause Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mutual Confidentiality & Non-Disclosure Covenants"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-mira-dark">Contract Type</label>
                  <select
                    value={formContractType}
                    onChange={(e) => setFormContractType(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    {CONTRACT_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-mira-dark">Taxonomy Key</label>
                  <input
                    type="text"
                    required
                    placeholder="confidentiality, liability, etc."
                    value={formClauseType}
                    onChange={(e) => setFormClauseType(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-mira-dark">Variant</label>
                  <select
                    value={formVariant}
                    onChange={(e) => setFormVariant(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="standard">standard</option>
                    <option value="mutual">mutual</option>
                    <option value="one-way">one-way</option>
                    <option value="strict">strict</option>
                    <option value="balanced">balanced</option>
                    <option value="experimental">experimental</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-mira-dark">Required Status</label>
                  <select
                    value={formRequiredStatus}
                    onChange={(e) => setFormRequiredStatus(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    {REQUIRED_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-mira-dark">Risk Level</label>
                  <select
                    value={formRiskLevel}
                    onChange={(e) => setFormRiskLevel(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Operative Legal Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter exact contractual language..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs font-serif leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-mira-dark">Jurisdiction</label>
                  <input
                    type="text"
                    value={formJurisdiction}
                    onChange={(e) => setFormJurisdiction(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-mira-dark">Source Reference URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formSourceUrl}
                    onChange={(e) => setFormSourceUrl(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Conditions JSON (Optional)</label>
                <textarea
                  rows={2}
                  placeholder='e.g. { "isMutual": true, "liabilityCap": true }'
                  value={formConditionsJson}
                  onChange={(e) => setFormConditionsJson(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingClause(null);
                  }}
                  className="px-4 py-2 border border-mira-border text-xs rounded-lg text-mira-dark hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent shadow-xs"
                >
                  {editingClause ? 'Save Changes' : 'Save & Synchronize pgvector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Version Modal */}
      {versioningClause && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mira-border my-8">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-mira-dark">Create New Clause Version</h3>
                <p className="text-xs text-mira-muted mt-0.5">
                  Publishing v{versioningClause.version + 1} for: <strong>{versioningClause.title}</strong>
                </p>
              </div>
              <button onClick={() => setVersioningClause(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVersion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-mira-dark">Variant</label>
                  <select
                    value={versionVariant}
                    onChange={(e) => setVersionVariant(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="standard">standard</option>
                    <option value="mutual">mutual</option>
                    <option value="one-way">one-way</option>
                    <option value="strict">strict</option>
                    <option value="balanced">balanced</option>
                    <option value="experimental">experimental</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-mira-dark">Risk Level</label>
                  <select
                    value={versionRiskLevel}
                    onChange={(e) => setVersionRiskLevel(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Revision Notes / Reason for Update</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Updated indemnification carve-outs per 2026 judicial precedent"
                  value={versionRevisionNotes}
                  onChange={(e) => setVersionRevisionNotes(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Revised Clause Text (v{versioningClause.version + 1})</label>
                <textarea
                  rows={5}
                  required
                  value={versionContent}
                  onChange={(e) => setVersionContent(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs font-serif leading-relaxed"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The previous version (v{versioningClause.version}) will be archived in the clause history table with its original text preserved for audit compliance.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setVersioningClause(null)}
                  className="px-4 py-2 border border-mira-border text-xs rounded-lg text-mira-dark hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent shadow-xs"
                >
                  Publish v{versioningClause.version + 1} & Re-embed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
