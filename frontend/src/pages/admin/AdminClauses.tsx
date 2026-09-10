import React, { useEffect, useState } from 'react';
import { clauseService } from '../../services/api';
import { ClauseRecord, ClauseStatus, DocumentType } from '../../types';
import { FolderLock, Plus, Check, Archive, Edit2, ShieldCheck, Search, Filter } from 'lucide-react';

export const AdminClauses: React.FC = () => {
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>('NDA');
  const [clauseType, setClauseType] = useState('confidentiality');
  const [content, setContent] = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await clauseService.create({
        title,
        documentType: docType,
        clauseType,
        content,
        jurisdiction,
        status: 'APPROVED'
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      loadClauses();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
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
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || c.documentType === typeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-mira-dark">Approved Clause Library</h1>
          <p className="text-xs text-mira-muted mt-0.5">
            Admin repository of institutional legal clauses indexed via InLegalBERT embeddings for pgvector retrieval.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Approved Clause
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-xl border border-mira-border shadow-2xs">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark"
        >
          <option value="ALL">All Document Types</option>
          <option value="NDA">NDA</option>
          <option value="LEGAL_NOTICE">Legal Notice</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark"
        >
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">APPROVED (Auto-retrievable)</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED (Excluded)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-mira-muted">Loading clauses...</div>
        ) : filteredClauses.length === 0 ? (
          <div className="p-12 text-center text-xs text-mira-muted">No clauses found matching criteria.</div>
        ) : (
          <div className="divide-y divide-mira-border">
            {filteredClauses.map((clause) => (
              <div key={clause.id} className="p-5 space-y-2.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-mira-dark">{clause.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {clause.documentType} • {clause.clauseType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      clause.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      clause.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {clause.status}
                    </span>
                    {clause.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApprove(clause.id)}
                        className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    )}
                    {clause.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleArchive(clause.id)}
                        className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md font-medium flex items-center gap-1"
                      >
                        <Archive className="w-3 h-3" /> Archive
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs font-serif text-mira-dark leading-relaxed italic bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                  "{clause.content}"
                </p>

                <div className="flex items-center gap-4 text-[11px] text-mira-muted">
                  <span>Jurisdiction: <strong>{clause.jurisdiction}</strong></span>
                  <span>•</span>
                  <span>Version: <strong>v{clause.version}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> InLegalBERT Vector Synchronized
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Clause Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mira-border">
            <h3 className="text-base font-bold text-mira-dark">Add Approved Legal Clause</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-mira-dark">Clause Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strict 3-Year Confidentiality Covenant"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-mira-dark">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="NDA">NDA</option>
                    <option value="LEGAL_NOTICE">Legal Notice</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-mira-dark">Clause Taxonomy Key</label>
                  <input
                    type="text"
                    required
                    placeholder="confidentiality, remedies, etc."
                    value={clauseType}
                    onChange={(e) => setClauseType(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Clause Operative Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter standard contractual wording..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs font-serif"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-mira-border text-xs rounded-lg text-mira-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent"
                >
                  Save & Embed in pgvector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
