import React, { useEffect, useState } from 'react';
import { knowledgeService } from '../../services/api';
import { KnowledgeDocumentRecord } from '../../types';
import { BookOpen, Plus, Trash2, Database, ShieldCheck, FileText, ChevronDown } from 'lucide-react';

export const AdminKnowledge: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<KnowledgeDocumentRecord | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [docType, setDocType] = useState('GENERAL');
  const [rawText, setRawText] = useState('');
  const [jurisdiction, setJurisdiction] = useState('India');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      const data = await knowledgeService.list();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load knowledge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await knowledgeService.upload({
        title,
        source,
        documentType: docType,
        rawText,
        jurisdiction
      });
      setShowUploadModal(false);
      setTitle('');
      setSource('');
      setRawText('');
      loadKnowledge();
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this knowledge document and all its pgvector embeddings?')) {
      await knowledgeService.delete(id);
      loadKnowledge();
    }
  };

  const handleInspectChunks = async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setSelectedDocDetails(null);
    } else {
      setExpandedDocId(docId);
      const details = await knowledgeService.getChunks(docId);
      setSelectedDocDetails(details);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-mira-dark">Legal Knowledge Repository & pgvector RAG</h1>
          <p className="text-xs text-mira-muted mt-0.5">
            Admin curated statutes, regulations, and institutional policies indexed for retrieval-augmented generation.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Ingest Legal Source
        </button>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-mira-muted">Loading legal knowledge repository...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-mira-muted bg-white rounded-xl border border-mira-border">
            No knowledge sources ingested yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-mira-primary flex-shrink-0" />
                    <h3 className="font-bold text-sm text-mira-dark">{doc.title}</h3>
                    <span className="text-[10px] bg-purple-50 text-mira-primary font-semibold px-2 py-0.5 rounded border border-purple-200">
                      {doc._count?.chunks || 0} pgvector Chunks
                    </span>
                  </div>
                  <p className="text-xs text-mira-muted">
                    Source: {doc.source} • Jurisdiction: {doc.jurisdiction} • Scope: {doc.documentType}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleInspectChunks(doc.id)}
                    className="px-3 py-1.5 bg-gray-50 border border-mira-border rounded-lg text-xs font-medium text-mira-dark hover:bg-gray-100 flex items-center gap-1"
                  >
                    <Database className="w-3.5 h-3.5 text-mira-primary" />
                    Inspect Chunks
                    <ChevronDown className="w-3 h-3 text-mira-muted" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-mira-muted hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chunks Inspector Panel */}
              {expandedDocId === doc.id && selectedDocDetails && (
                <div className="p-5 bg-gray-50 border-t border-mira-border space-y-3">
                  <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">
                    Indexed Semantic Chunks ({selectedDocDetails.chunks?.length || 0})
                  </span>
                  <div className="space-y-2">
                    {selectedDocDetails.chunks?.map((chunk, idx) => (
                      <div key={chunk.id} className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-mira-primary">
                          <span>Chunk #{idx + 1}</span>
                          <span className="text-emerald-700 font-medium text-[10px] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 384-dim Vector Active (all-MiniLM-L6-v2)
                          </span>
                        </div>
                        <p className="text-mira-dark font-serif leading-relaxed text-[11px] whitespace-pre-wrap">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mira-border">
            <h3 className="text-base font-bold text-mira-dark">Ingest Legal Source Document (RAG)</h3>
            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-mira-dark">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Specific Relief Act, 1963 - Injunctive Relief Principles"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-mira-dark">Source Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="Statute / Official Gazette"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-mira-dark">Applicable Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs"
                  >
                    <option value="GENERAL">General Contract Law</option>
                    <option value="NDA">NDA</option>
                    <option value="LEGAL_NOTICE">Legal Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-mira-dark">Full Legal Text</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste official legal statutory sections, rules, or guidelines..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full mt-1 p-2 border border-mira-border rounded-lg text-xs font-serif"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-mira-border text-xs rounded-lg text-mira-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent disabled:opacity-50"
                >
                  {uploading ? 'Chunking & Embedding...' : 'Chunk & Embed in pgvector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
