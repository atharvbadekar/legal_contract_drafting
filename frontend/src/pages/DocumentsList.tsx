import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/api';
import { DocumentRecord } from '../types';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Edit3
} from 'lucide-react';

export const DocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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
    if (confirm('Are you sure you want to delete this legal document?')) {
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

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.documentType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-mira-dark tracking-tight">Legal Documents Repository</h1>
          <p className="text-xs text-mira-muted mt-1">
            Browse, inspect validation reports, edit, and export agreements.
          </p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Document
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-mira-border shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-mira-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search documents by title or parties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-mira-border rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-mira-primary/20 focus:border-mira-primary"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-hidden"
          >
            <option value="ALL">All Types</option>
            <option value="NDA">NDA</option>
            <option value="LEGAL_NOTICE">Legal Notice</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-mira-border rounded-lg text-xs font-medium text-mira-dark focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Passed Validation</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-mira-muted">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-mira-muted">No documents found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-mira-border bg-gray-50/50 text-[11px] font-semibold text-mira-muted uppercase tracking-wider">
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Mode</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Validation Score</th>
                  <th className="py-3 px-6">Versions</th>
                  <th className="py-3 px-6">Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mira-border text-sm">
                {filteredDocs.map((doc) => (
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
                        {doc.documentType}
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
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              doc.validationScore >= 90 ? 'bg-emerald-500' :
                              doc.validationScore >= 70 ? 'bg-blue-500' :
                              doc.validationScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${doc.validationScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{doc.validationScore}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-mira-muted font-medium">
                      v{doc._count?.versions || 1}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-mira-muted">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/documents/${doc.id}/edit`);
                        }}
                        title="Edit in 3-Panel Editor"
                        className="p-1.5 text-mira-muted hover:text-mira-primary rounded-md hover:bg-gray-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
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
