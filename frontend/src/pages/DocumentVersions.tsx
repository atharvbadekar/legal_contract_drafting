import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { DocumentRecord, DocumentVersionRecord, VersionDiffResult, AuditLogRecord } from '../types';
import {
  History,
  ArrowLeft,
  RotateCcw,
  Clock,
  Download,
  ShieldCheck,
  Cpu,
  GitCompare,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText
} from 'lucide-react';

export const DocumentVersions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'versions' | 'audit'>('versions');

  // Version Comparison State
  const [selectedV1, setSelectedV1] = useState<number>(1);
  const [selectedV2, setSelectedV2] = useState<number>(1);
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null);
  const [diffMode, setDiffMode] = useState<'unified' | 'sideBySide'>('unified');
  const [diffLoading, setDiffLoading] = useState(false);

  // Single Version Snapshot (Fallback / Quick inspection)
  const [previewVersion, setPreviewVersion] = useState<DocumentVersionRecord | null>(null);

  // Audit Logs State
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [exportingAudit, setExportingAudit] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (docId: string) => {
    try {
      setLoading(true);
      const [doc, vList, aLogs] = await Promise.all([
        documentService.getById(docId),
        documentService.getVersions(docId),
        documentService.getAuditTrail(docId).catch(() => [])
      ]);

      setDocument(doc);
      setVersions(vList);
      setAuditLogs(aLogs);

      if (vList.length > 0) {
        setPreviewVersion(vList[0]);
        const highestVer = vList[0].versionNumber;
        const prevVer = vList.length > 1 ? vList[1].versionNumber : highestVer;

        setSelectedV1(prevVer);
        setSelectedV2(highestVer);

        // Load initial diff
        loadDiff(docId, prevVer, highestVer);
      }
    } catch (err) {
      console.error('Failed to load version history and audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiff = async (docId: string, v1Num: number, v2Num: number) => {
    try {
      setDiffLoading(true);
      const diff = await documentService.compareVersions(docId, v1Num, v2Num);
      setDiffResult(diff);
    } catch (err) {
      console.error('Failed to fetch diff:', err);
      setDiffResult(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleVersionChange = (v1: number, v2: number) => {
    setSelectedV1(v1);
    setSelectedV2(v2);
    if (id) {
      loadDiff(id, v1, v2);
    }
  };

  const handleRestore = async (versionId: string, verNum: number) => {
    if (!id || !confirm(`Are you sure you want to restore Version v${verNum} as the active document content? This will create a new RESTORE version snapshot.`)) {
      return;
    }
    try {
      await documentService.restoreVersion(id, versionId);
      alert(`Version v${verNum} restored successfully!`);
      navigate(`/documents/${id}/edit`);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleExportAuditReport = async () => {
    if (!id || !document) return;
    try {
      setExportingAudit(true);
      const filename = `audit_report_${(document.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      await documentService.exportAuditReport(id, filename);
    } catch (err: any) {
      alert(`Failed to export audit report: ${err.message}`);
    } finally {
      setExportingAudit(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-mira-muted flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border-2 border-mira-primary border-t-transparent rounded-full animate-spin"></div>
        <span>Loading version history, diffs, and audit trail...</span>
      </div>
    );
  }

  if (!document) {
    return <div className="p-8 text-center text-xs text-mira-muted">Document not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-xl border border-mira-border shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/documents/${document.id}/edit`}
            className="p-1.5 rounded-lg border border-mira-border text-mira-muted hover:text-mira-dark transition-colors"
            title="Return to Editor"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-mira-dark">Document History & Audit Governance</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {document.documentType}
              </span>
            </div>
            <p className="text-xs text-mira-muted">Document: {document.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'versions'
                  ? 'bg-white text-mira-primary shadow-xs'
                  : 'text-gray-600 hover:text-mira-dark'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Version Diff & History ({versions.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-mira-primary shadow-xs'
                  : 'text-gray-600 hover:text-mira-dark'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Audit Trail ({auditLogs.length})
            </button>
          </div>

          <Link
            to={`/documents/${document.id}/edit`}
            className="px-3.5 py-1.5 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent transition-colors"
          >
            Open in Editor
          </Link>
        </div>
      </div>

      {/* TAB 1: VERSION DIFF & REVISION TIMELINE */}
      {activeTab === 'versions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Revision Timeline */}
          <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-mira-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-mira-dark uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-mira-primary" />
                Revision Timeline ({versions.length})
              </h2>
            </div>

            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <div className="p-6 text-center text-xs text-mira-muted">No versions recorded yet.</div>
              ) : (
                versions.map((ver) => {
                  const isV1 = selectedV1 === ver.versionNumber;
                  const isV2 = selectedV2 === ver.versionNumber;
                  const isPreview = previewVersion?.id === ver.id;

                  const opType = (ver.validationResult?.operationType || ver.operationType || 'SAVE').toUpperCase();
                  const badgeColor =
                    opType === 'GENERATION'
                      ? 'bg-blue-100 text-blue-700'
                      : opType === 'AI_FIX'
                      ? 'bg-emerald-100 text-emerald-700'
                      : opType === 'NL_EDIT'
                      ? 'bg-purple-100 text-purple-700'
                      : opType === 'RESTORE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700';

                  const score = ver.validationResult?.score || ver.score;

                  return (
                    <div
                      key={ver.id}
                      onClick={() => setPreviewVersion(ver)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isPreview
                          ? 'border-mira-primary bg-mira-light/40 shadow-xs'
                          : 'border-mira-border hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-mira-dark">v{ver.versionNumber}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                            {opType}
                          </span>
                        </div>
                        <span className="text-[10px] text-mira-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ver.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 line-clamp-1">
                        {ver.validationResult?.changeSummary || ver.changeSummary || 'Document update'}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px]">
                        <span className="text-mira-muted">
                          {ver.createdBy?.name || ver.authorName || 'Author'}
                        </span>
                        {score !== undefined && (
                          <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {score}% Score
                          </span>
                        )}
                      </div>

                      {/* Quick compare selection badges */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVersionChange(ver.versionNumber, selectedV2);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-semibold transition-colors ${
                            isV1
                              ? 'bg-rose-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isV1 ? 'Base (vA) ✓' : 'Set as vA'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVersionChange(selectedV1, ver.versionNumber);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-semibold transition-colors ${
                            isV2
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isV2 ? 'Target (vB) ✓' : 'Set as vB'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(ver.id, ver.versionNumber);
                          }}
                          className="ml-auto text-[9px] px-2 py-0.5 text-mira-primary hover:bg-mira-light rounded font-semibold transition-colors flex items-center gap-0.5"
                          title="Restore this version"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Restore
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Diff Comparison View */}
          <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-mira-border shadow-xs space-y-4">
            {/* Diff Controls Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-mira-border gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600">Base (vA):</span>
                  <select
                    value={selectedV1}
                    onChange={(e) => handleVersionChange(Number(e.target.value), selectedV2)}
                    className="text-xs border border-mira-border rounded-lg px-2 py-1 font-semibold bg-gray-50 text-rose-700 focus:outline-none"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.versionNumber}>
                        v{v.versionNumber} ({new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-gray-400 font-bold">→</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600">Target (vB):</span>
                  <select
                    value={selectedV2}
                    onChange={(e) => handleVersionChange(selectedV1, Number(e.target.value))}
                    className="text-xs border border-mira-border rounded-lg px-2 py-1 font-semibold bg-gray-50 text-emerald-700 focus:outline-none"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.versionNumber}>
                        v{v.versionNumber} ({new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Diff Mode Switcher */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                  <button
                    onClick={() => setDiffMode('unified')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      diffMode === 'unified' ? 'bg-white text-mira-dark shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Unified Diff
                  </button>
                  <button
                    onClick={() => setDiffMode('sideBySide')}
                    className={`px-2.5 py-1 rounded font-semibold ${
                      diffMode === 'sideBySide' ? 'bg-white text-mira-dark shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>

                {/* Restore target version */}
                {selectedV2 && (
                  <button
                    onClick={() => {
                      const targetVer = versions.find((v) => v.versionNumber === selectedV2);
                      if (targetVer) handleRestore(targetVer.id, targetVer.versionNumber);
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-mira-primary border border-purple-200 hover:bg-mira-primary hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore v{selectedV2}
                  </button>
                )}
              </div>
            </div>

            {/* Diff Summary Metric Cards */}
            {diffResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Score Delta</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-mira-dark">{diffResult.v1Score}% → {diffResult.v2Score}%</span>
                    <span
                      className={`text-xs font-bold ${
                        diffResult.scoreDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      ({diffResult.scoreDelta >= 0 ? `+${diffResult.scoreDelta}` : diffResult.scoreDelta}%)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Additions</span>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">
                    +{diffResult.additions} lines
                  </div>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                  <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">Deletions</span>
                  <div className="text-sm font-bold text-rose-800 mt-0.5">
                    -{diffResult.deletions} lines
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Facts Modified</span>
                  <div className="text-sm font-bold text-blue-800 mt-0.5">
                    {diffResult.factsDiff?.length || 0} fields
                  </div>
                </div>
              </div>
            )}

            {/* Facts Changes Delta Card (if any facts changed) */}
            {diffResult && diffResult.factsDiff && diffResult.factsDiff.length > 0 && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                  Structured Facts Changed between v{diffResult.v1Number} and v{diffResult.v2Number}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {diffResult.factsDiff.map((fd, i) => (
                    <div key={i} className="p-2 bg-white rounded border border-amber-100 text-[11px]">
                      <span className="font-bold text-mira-dark">{fd.field}:</span>{' '}
                      <span className="line-through text-rose-600 font-mono">
                        {typeof fd.oldValue === 'object' ? JSON.stringify(fd.oldValue) : String(fd.oldValue ?? 'none')}
                      </span>{' '}
                      <span className="text-gray-400">→</span>{' '}
                      <span className="text-emerald-700 font-bold font-mono">
                        {typeof fd.newValue === 'object' ? JSON.stringify(fd.newValue) : String(fd.newValue ?? 'none')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diff View Box */}
            {diffLoading ? (
              <div className="p-12 text-center text-xs text-mira-muted flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-mira-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Computing line-by-line diff...</span>
              </div>
            ) : diffResult ? (
              <div className="border border-mira-border rounded-xl overflow-hidden bg-gray-900 text-gray-100 font-mono text-xs">
                {/* Diff Header */}
                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between text-[11px] text-gray-300">
                  <span>
                    Comparing <span className="text-rose-400 font-bold">v{diffResult.v1Number}</span> with{' '}
                    <span className="text-emerald-400 font-bold">v{diffResult.v2Number}</span>
                  </span>
                  <span className="text-gray-400">{diffResult.summary}</span>
                </div>

                {/* Diff Lines Body */}
                <div className="max-h-[55vh] overflow-y-auto divide-y divide-gray-800/40">
                  {diffMode === 'unified' ? (
                    // UNIFIED VIEW
                    diffResult.diffLines.map((line, idx) => {
                      const isAdd = line.type === 'ADD';
                      const isRemove = line.type === 'REMOVE';

                      const bgClass = isAdd
                        ? 'bg-emerald-950/40 text-emerald-300'
                        : isRemove
                        ? 'bg-rose-950/40 text-rose-300'
                        : 'text-gray-300 hover:bg-gray-800/30';

                      const prefix = isAdd ? '+' : isRemove ? '-' : ' ';

                      return (
                        <div key={idx} className={`flex items-start px-3 py-0.5 text-xs font-mono leading-relaxed ${bgClass}`}>
                          <span className="w-9 text-right pr-2 text-gray-500 select-none text-[10px]">
                            {line.v1LineNum || ''}
                          </span>
                          <span className="w-9 text-right pr-3 text-gray-500 select-none text-[10px]">
                            {line.v2LineNum || ''}
                          </span>
                          <span className="w-4 select-none font-bold font-mono">
                            {prefix}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap break-words">
                            {line.line || ' '}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    // SIDE-BY-SIDE VIEW
                    <div className="grid grid-cols-2 divide-x divide-gray-800">
                      <div className="space-y-0.5 p-2 bg-gray-900/60">
                        <div className="text-[10px] uppercase font-bold text-rose-400 pb-1 border-b border-gray-800 mb-1">
                          Base Version v{diffResult.v1Number}
                        </div>
                        {diffResult.diffLines
                          .filter((l) => l.type !== 'ADD')
                          .map((line, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 text-xs whitespace-pre-wrap break-words rounded ${
                                line.type === 'REMOVE' ? 'bg-rose-950/40 text-rose-300 font-bold' : 'text-gray-400'
                              }`}
                            >
                              <span className="text-gray-600 mr-2 select-none text-[10px]">{line.v1LineNum}</span>
                              {line.line || ' '}
                            </div>
                          ))}
                      </div>

                      <div className="space-y-0.5 p-2 bg-gray-900/60">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 pb-1 border-b border-gray-800 mb-1">
                          Target Version v{diffResult.v2Number}
                        </div>
                        {diffResult.diffLines
                          .filter((l) => l.type !== 'REMOVE')
                          .map((line, idx) => (
                            <div
                              key={idx}
                              className={`px-2 py-0.5 text-xs whitespace-pre-wrap break-words rounded ${
                                line.type === 'ADD' ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-gray-300'
                              }`}
                            >
                              <span className="text-gray-600 mr-2 select-none text-[10px]">{line.v2LineNum}</span>
                              {line.line || ' '}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-mira-muted bg-gray-50 rounded-xl">
                Select two versions above to calculate the diff.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL & GOVERNANCE */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-xl border border-mira-border shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-mira-border gap-3">
            <div>
              <h2 className="text-sm font-bold text-mira-dark flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-mira-primary" />
                Immutable Audit Trail & Regulatory Event Log
              </h2>
              <p className="text-xs text-mira-muted">
                Every generation, natural-language edit, AI fix, version restore, and export is recorded with model, latency, tokens, and before/after validation score.
              </p>
            </div>

            <button
              onClick={handleExportAuditReport}
              disabled={exportingAudit}
              className="px-4 py-2 bg-mira-primary text-white text-xs font-semibold rounded-lg hover:bg-mira-accent flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingAudit ? 'Exporting...' : 'Export Audit Report (JSON)'}
            </button>
          </div>

          {/* Audit Logs Table / Timeline */}
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-mira-muted">
              No audit log entries recorded yet. Operations will appear here automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const isExpanded = expandedAuditId === log.id;
                const d = log.details || {};
                const opType = (d.operationType || log.action || '').toUpperCase();

                const badgeColor =
                  opType.includes('GENERATION')
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : opType.includes('AI_FIX')
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : opType.includes('NL_EDIT')
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : opType.includes('RESTORE')
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : opType.includes('EXPORT')
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

                return (
                  <div
                    key={log.id}
                    className="border border-mira-border rounded-xl bg-white hover:border-gray-300 transition-all shadow-xs overflow-hidden"
                  >
                    <div
                      onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-3 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${badgeColor}`}>
                          {opType}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-mira-dark">
                              {d.changeSummary || log.action}
                            </h4>
                            {d.versionNumber && (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                v{d.versionNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-mira-muted mt-1">
                            <span>Author: {d.authorName || 'Atharv Legal AI'}</span>
                            <span>•</span>
                            <span>{new Date(log.createdAt || d.timestamp).toLocaleString()}</span>
                            {d.engine && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-gray-600">
                                  <Cpu className="w-3 h-3 text-mira-primary" /> {d.engine}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        {d.scoreBefore !== undefined && d.scoreAfter !== undefined && (
                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">Score Impact</span>
                            <span className="font-bold text-mira-dark">
                              {d.scoreBefore}% → {d.scoreAfter}%
                            </span>
                          </div>
                        )}

                        {d.latencyMs !== undefined && d.latencyMs > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">Latency</span>
                            <span className="font-mono text-[11px] text-gray-600">{d.latencyMs}ms</span>
                          </div>
                        )}

                        <div className="p-1 rounded text-gray-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-mira-border bg-white space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Execution Engine</span>
                            <span className="font-bold text-mira-dark">{d.engine || 'Deterministic Rules Engine'}</span>
                            {d.modelUsed && <span className="block text-[11px] text-gray-600 font-mono mt-0.5">{d.modelUsed}</span>}
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Token Usage</span>
                            <span className="font-mono text-gray-700">
                              Prompt: {d.tokens?.prompt || 0} | Comp: {d.tokens?.completion || 0} | Total: {d.tokens?.total || 0}
                            </span>
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Author Identity</span>
                            <span className="text-mira-dark font-medium">{d.authorName}</span>
                            {d.authorEmail && <span className="block text-gray-500 text-[11px]">{d.authorEmail}</span>}
                          </div>
                        </div>

                        {d.diffSummary && (
                          <div className="text-[11px] text-gray-600">
                            <span className="font-bold text-mira-dark">Diff summary:</span> {d.diffSummary}
                          </div>
                        )}

                        {d.diff && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                              Recorded Diff Sample:
                            </span>
                            <pre className="p-3 bg-gray-900 text-gray-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48">
                              {d.diff}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mandatory Legal Notice & Governance Disclaimer */}
          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-mira-primary shrink-0 mt-0.5" />
            <div className="text-xs text-purple-950 leading-relaxed">
              <span className="font-bold">Legal Governance & Audit Disclaimer:</span> All Atharv Legal AI document modifications, AI fixes, and generation iterations are logged with cryptographic timestamps and author provenance to ensure regulatory transparency. Review every drafted contract with a qualified lawyer in your jurisdiction prior to execution.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
