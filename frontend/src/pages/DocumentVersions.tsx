import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { DocumentRecord, DocumentVersionRecord } from '../types';
import { History, ArrowLeft, RotateCcw, FileText, CheckCircle2, Clock, Eye } from 'lucide-react';

export const DocumentVersions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (docId: string) => {
    try {
      setLoading(true);
      const doc = await documentService.getById(docId);
      setDocument(doc);
      const vList = await documentService.getVersions(docId);
      setVersions(vList);
      if (vList.length > 0) setSelectedVersion(vList[0]);
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!id || !confirm('Are you sure you want to restore this version as the active document content?')) return;
    try {
      await documentService.restoreVersion(id, versionId);
      alert('Version restored successfully!');
      navigate(`/documents/${id}/edit`);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-mira-muted">Loading version history...</div>;
  if (!document) return <div className="p-8 text-center text-xs text-mira-muted">Document not found.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-mira-border shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to={`/documents/${document.id}/edit`}
            className="p-1.5 rounded-lg border border-mira-border text-mira-muted hover:text-mira-dark"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-mira-dark">Version History & Audit Compare</h1>
            <p className="text-xs text-mira-muted">Document: {document.title}</p>
          </div>
        </div>

        <Link
          to={`/documents/${document.id}/edit`}
          className="px-3.5 py-1.5 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent"
        >
          Return to Editor
        </Link>
      </div>

      {/* Grid: Version List (Left) & Preview (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Version History List */}
        <div className="md:col-span-4 bg-white p-4 rounded-xl border border-mira-border shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-mira-dark uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-mira-primary" />
            Revision Timeline ({versions.length})
          </h2>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {versions.map((ver) => (
              <div
                key={ver.id}
                onClick={() => setSelectedVersion(ver)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedVersion?.id === ver.id
                    ? 'border-mira-primary bg-mira-light/50'
                    : 'border-mira-border hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mira-dark">Version v{ver.versionNumber}</span>
                  <span className="text-[10px] text-mira-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(ver.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] text-mira-muted mt-1">
                  Authored by: {ver.createdBy?.name || 'Atharv Legal AI System'}
                </p>
                {ver.validationResult?.score && (
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    Validation Score: {ver.validationResult.score}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Version Content Preview & Restore Action */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-mira-border shadow-xs space-y-4">
          {selectedVersion ? (
            <>
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-mira-dark">
                    Version v{selectedVersion.versionNumber} Snapshot Preview
                  </h3>
                  <span className="text-xs text-mira-muted">
                    Saved on {new Date(selectedVersion.createdAt).toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => handleRestore(selectedVersion.id)}
                  className="px-4 py-2 bg-purple-50 text-mira-primary border border-purple-200 hover:bg-mira-primary hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore This Version
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl max-h-[60vh] overflow-y-auto border border-gray-100 font-serif text-xs text-mira-dark leading-relaxed whitespace-pre-wrap">
                {selectedVersion.content}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-mira-muted">Select a version snapshot to preview.</div>
          )}
        </div>
      </div>
    </div>
  );
};
