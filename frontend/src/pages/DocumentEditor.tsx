import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService, aiService } from '../services/api';
import { DocumentRecord, ValidationIssue } from '../types';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Download, 
  ExternalLink, 
  History, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Wand2,
  Layers,
  ArrowLeft,
  Check,
  Send,
  Edit3,
  Scale
} from 'lucide-react';

export const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'VALIDATION' | 'ASSISTANT'>('VALIDATION');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Assistant state
  const [explanation, setExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [applyingCommand, setApplyingCommand] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const scrollToSection = (sectionName?: string, evidence?: string, textRange?: { start: number; end: number }) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const text = el.value;

    let idx = -1;
    let matchLen = 0;

    // 1. Precise character range if provided
    if (textRange && typeof textRange.start === 'number' && typeof textRange.end === 'number' && textRange.end > textRange.start) {
      if (textRange.start >= 0 && textRange.end <= text.length) {
        idx = textRange.start;
        matchLen = textRange.end - textRange.start;
      }
    }

    // 2. Exact evidence quote search
    if (idx === -1 && evidence && evidence.trim().length > 1) {
      const evClean = evidence.trim().toLowerCase();
      idx = text.toLowerCase().indexOf(evClean);
      if (idx !== -1) matchLen = evidence.trim().length;
    }

    // 3. Section header search fallback
    if (idx === -1 && sectionName) {
      const cleanSec = sectionName.toLowerCase().replace(/^(?:section|\d+\.?)\s*/i, '').trim();
      idx = text.toLowerCase().indexOf(cleanSec);
      if (idx !== -1) {
        matchLen = cleanSec.length;
      } else {
        idx = text.toLowerCase().indexOf(sectionName.toLowerCase());
        if (idx !== -1) matchLen = sectionName.length;
      }
    }

    if (idx !== -1) {
      let startSel = idx;
      let endSel = idx + matchLen;

      // If we matched a section header without specific textRange or evidence, select the full section block
      if (!textRange && (!evidence || evidence.trim().length <= 1) && sectionName && text.substring(idx, idx + matchLen).toLowerCase().includes(sectionName.toLowerCase().slice(0, 8))) {
        const nextHeader = text.indexOf('\n## ', idx + matchLen);
        const nextDivider = text.indexOf('---', idx + matchLen);
        let endOfBlock = text.length;
        if (nextHeader !== -1 && nextDivider !== -1) {
          endOfBlock = Math.min(nextHeader, nextDivider);
        } else if (nextHeader !== -1) {
          endOfBlock = nextHeader;
        } else if (nextDivider !== -1) {
          endOfBlock = nextDivider;
        }
        endSel = endOfBlock;
      }

      el.focus();
      el.setSelectionRange(startSel, endSel);
      const linesBefore = text.substring(0, startSel).split('\n').length;
      el.scrollTop = Math.max(0, (linesBefore - 3) * 24);
      setSelectedText(text.substring(startSel, endSel));
    }
  };

  useEffect(() => {
    if (id) loadDocument(id);
  }, [id]);

  const loadDocument = async (docId: string) => {
    try {
      const doc = await documentService.getById(docId);
      setDocument(doc);
      setContent(doc.content);
    } catch (err) {
      console.error('Failed to load document:', err);
    }
  };

  const handleSave = async (saveAsVersion: boolean = false) => {
    if (!id || !document) return;
    setSaving(true);
    try {
      const updated = await documentService.update(id, {
        content,
        saveAsVersion
      });
      setDocument(updated);
      setSaveSuccessMsg(saveAsVersion ? 'Saved as new version!' : 'Changes saved.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRevalidate = async () => {
    if (!id || !document) return;
    setValidating(true);
    try {
      const res = await documentService.validate(id, {
        content,
        structuredFacts: document.structuredFacts
      });
      setDocument(res.document);
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleExplain = async () => {
    const textToExplain = selectedText.trim() || content.slice(0, 300);
    setExplaining(true);
    try {
      const res = await aiService.explainClause(textToExplain);
      setExplanation(res);
    } catch (err: any) {
      alert(`Clause explanation error: ${err.message}`);
    } finally {
      setExplaining(false);
    }
  };

  const handleRewrite = async (style: 'formal' | 'simple' | 'mutual') => {
    if (!selectedText.trim()) {
      alert('Please select or highlight text in the document editor to rewrite.');
      return;
    }
    setRewriting(true);
    try {
      const res = await aiService.rewriteClause(
        selectedText,
        style === 'mutual' ? 'custom' : style,
        style === 'mutual' ? 'make mutual for both parties' : undefined
      );
      setContent((prev) => prev.replace(selectedText, res.rewritten));
      setSelectedText(res.rewritten);
      setSaveSuccessMsg('✓ Clause updated in document!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Rewrite error: ${err.message}`);
    } finally {
      setRewriting(false);
    }
  };

  const handleCustomCommand = async () => {
    if (!customCommand.trim()) {
      alert('Please enter an instruction or command for the AI.');
      return;
    }
    const targetText = selectedText.trim() || content.trim();
    if (!targetText) {
      alert('Please select or highlight text in the document editor to modify.');
      return;
    }

    setApplyingCommand(true);
    try {
      const res = await aiService.rewriteClause(targetText, 'custom', customCommand.trim());
      if (res && res.rewritten) {
        if (selectedText.trim()) {
          setContent((prev) => prev.replace(selectedText, res.rewritten));
        } else {
          setContent(res.rewritten);
        }
        setSelectedText(res.rewritten);
        setSaveSuccessMsg('✓ Section updated with AI command!');
        setTimeout(() => setSaveSuccessMsg(''), 3500);
      }
    } catch (err: any) {
      alert(`AI Command failed: ${err.message}`);
    } finally {
      setApplyingCommand(false);
    }
  };

  if (!document) {
    return <div className="p-12 text-center text-xs text-mira-muted">Loading document editor...</div>;
  }

  // Parse sections for outline
  const sections = content.split('---').map((block, idx) => {
    const lines = block.trim().split('\n');
    const headerLine = lines.find(l => l.startsWith('## ') || l.startsWith('# '));
    const title = headerLine ? headerLine.replace(/#+\s*/, '') : `Section ${idx + 1}`;
    
    // Check if issues exist in this section
    const hasIssues = document.validationSummary?.issues?.some(
      (iss: ValidationIssue) => title.toLowerCase().includes(iss.section.toLowerCase()) ||
        iss.section.toLowerCase().includes(title.toLowerCase())
    );

    return { id: idx, title, content: block.trim(), hasIssues };
  });

  const issuesList = document.validationSummary?.issues || [];
  const validationScore = document.validationScore || 0;

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white px-6 py-3.5 rounded-xl border border-mira-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/documents"
            className="p-1.5 rounded-lg border border-mira-border text-mira-muted hover:text-mira-dark hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-mira-dark truncate max-w-md">{document.title}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                document.generationMode === 'MIRA' 
                  ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {document.generationMode === 'MIRA' ? 'Atharv Legal AI' : 'Baseline LLM'}
              </span>
            </div>
            <p className="text-[11px] text-mira-muted">
              Type: {document.documentType} • Version v{document.versions?.length || 1} • Last updated {new Date(document.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccessMsg && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {saveSuccessMsg}
            </span>
          )}

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs"
          >
            <Save className="w-3.5 h-3.5 text-mira-muted" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-3 py-1.5 bg-mira-light border border-purple-200 text-mira-primary hover:bg-purple-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            Save as Version
          </button>

          <button
            onClick={handleRevalidate}
            disabled={validating}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-mira-primary ${validating ? 'animate-spin' : ''}`} />
            Re-Validate
          </button>

          <button
            onClick={() => documentService.downloadDocx(document.id, document.title)}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" /> DOCX
          </button>

          <button
            onClick={() => documentService.downloadPdf(document.id, document.title)}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* 3-PANEL EDITOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* PANEL 1: Document Outline (Left, 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-mira-border shadow-xs p-4 space-y-3 sticky top-20">
          <div className="flex items-center justify-between border-b border-mira-border pb-2">
            <span className="text-xs font-bold text-mira-dark uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-mira-primary" />
              Document Outline
            </span>
            <span className="text-[10px] text-mira-muted">{sections.length} Sections</span>
          </div>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setSelectedSection(sec.title);
                  scrollToSection(sec.title);
                }}
                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  selectedSection === sec.title
                    ? 'bg-mira-light text-mira-primary font-bold'
                    : 'text-mira-dark hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {sec.hasIssues ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{sec.title}</span>
                </div>
                {sec.hasIssues && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                    Flagged
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-mira-border text-[11px] text-mira-muted">
            <Link to={`/documents/${document.id}/versions`} className="text-mira-primary font-semibold hover:underline flex items-center gap-1">
              <History className="w-3 h-3" /> View Version History (v{document.versions?.length || 1})
            </Link>
          </div>
        </div>

        {/* PANEL 2: Editable Document (Center, 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-mira-border shadow-xs flex flex-col min-h-[75vh]">
          <div className="px-5 py-3 border-b border-mira-border bg-gray-50/50 flex items-center justify-between text-xs text-mira-muted">
            <span>Editable Legal Document (Markdown Formatted)</span>
            <span className="text-[11px] font-medium text-purple-700">AI never prevents manual editing</span>
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={(e: any) => {
                const sel = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                if (sel) setSelectedText(sel);
              }}
              className="w-full flex-1 min-h-[68vh] p-4 font-serif text-sm leading-relaxed text-mira-dark bg-transparent border-0 focus:outline-hidden resize-none selection:bg-purple-100"
              placeholder="Legal document text..."
            />
          </div>
        </div>

        {/* PANEL 3: Validation & AI Assistant Panel (Right, 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-mira-border shadow-xs p-4 space-y-4 sticky top-20">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('VALIDATION')}
              className={`py-1.5 rounded-md transition-colors ${
                activeTab === 'VALIDATION' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted'
              }`}
            >
              Validation ({validationScore}%)
            </button>
            <button
              onClick={() => setActiveTab('ASSISTANT')}
              className={`py-1.5 rounded-md transition-colors ${
                activeTab === 'ASSISTANT' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted'
              }`}
            >
              AI Assistant
            </button>
          </div>

          {/* TAB 1: VALIDATION REPORT */}
          {activeTab === 'VALIDATION' && (
            <div className="space-y-4">
              {/* Validation Score Widget */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-mira-muted uppercase tracking-wider">
                  AI Validation Score
                </span>
                <div className="text-3xl font-black text-mira-primary">
                  {validationScore}%
                </div>
                <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      validationScore >= 90 ? 'bg-emerald-500' :
                      validationScore >= 70 ? 'bg-blue-500' :
                      validationScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${validationScore}%` }}
                  />
                </div>
                <span className="inline-block text-[10px] text-purple-700 font-medium pt-1">
                  {document.status === 'COMPLETED' ? '✓ Passed automated checks' : '⚠ Requires manual review'}
                </span>
              </div>

              {/* Multi-tier Layer Checks */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-mira-dark">Layer Breakdown:</span>
                
                <div className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-100">
                  <div className="flex justify-between font-medium">
                    <span>Factual Accuracy</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.factualAccuracy || 95}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Section Completeness</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.sectionCompleteness || 100}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Clause Coverage</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.clauseCoverage || 92}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>InLegalBERT Consistency</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.semanticConsistency || 90}%</span>
                  </div>
                </div>
              </div>

              {/* Technical Semantic Status (if semantic analysis offline / unavailable) */}
              {document.validationSummary?.semanticStatus && !document.validationSummary.semanticStatus.available && (
                <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="text-[11px] leading-tight">
                    {document.validationSummary.semanticStatus.message || 'Semantic analysis unavailable — deterministic validation completed.'}
                  </span>
                </div>
              )}

              {/* Detected Issues */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mira-dark">
                    Validation Flags ({issuesList.length} items):
                  </span>
                  {issuesList.length > 0 && (
                    <span className="text-[10px] text-mira-muted font-medium">
                      Click to jump & resolve
                    </span>
                  )}
                </div>

                {issuesList.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>No fact mismatches or structural anomalies found.</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {issuesList.map((issue: ValidationIssue, idx: number) => {
                      const isHigh = issue.severity === 'HIGH';
                      const isMed = issue.severity === 'MEDIUM';

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                            isHigh
                              ? 'bg-red-50/70 border-red-200 text-red-950'
                              : isMed
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-blue-50/70 border-blue-200 text-blue-950'
                          }`}
                        >
                          {/* Flag Header: Section + Severity Badge */}
                          <div className="flex items-center justify-between font-bold text-[12px] border-b pb-1.5 border-black/10">
                            <div className="flex items-center gap-1.5 truncate">
                              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                                isHigh ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-blue-600'
                              }`} />
                              <span className="truncate">{issue.title || issue.section}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isHigh
                                ? 'bg-red-200 text-red-900 border border-red-300'
                                : isMed
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-blue-200 text-blue-900 border border-blue-300'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>

                          {/* 1. CLEARLY DEFINED FLAG / PROBLEM */}
                          <div className="space-y-1 bg-white/90 p-2.5 rounded-lg border border-black/5 shadow-2xs">
                            <div className="flex items-center gap-1 font-bold text-[10px] text-red-800 uppercase tracking-wider">
                              <span>🚩 Flag / Problem Detected:</span>
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-gray-800">
                              {issue.description || issue.message || 'Issue detected in section wording or factual alignment.'}
                            </p>

                            {/* Quoted Evidence */}
                            {issue.evidence && issue.evidence.trim().length > 0 && (
                              <div className="mt-1 pt-1 border-t border-gray-100 text-[10px] text-gray-600 font-mono bg-gray-50/80 p-1.5 rounded">
                                <span className="font-semibold text-gray-500">Quoted text: </span>
                                "{issue.evidence}"
                              </div>
                            )}

                            {/* Why ATHARV flags this */}
                            {issue.reason && (
                              <div className="mt-1 text-[10px] text-gray-600 leading-snug">
                                <span className="font-semibold text-gray-700">Legal rationale: </span>
                                {issue.reason}
                              </div>
                            )}
                          </div>

                          {/* 2. CLEARLY DEFINED HOW TO RESOLVE IT */}
                          <div className="space-y-1 bg-emerald-50/90 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                            <div className="flex items-center gap-1 font-bold text-[10px] text-emerald-900 uppercase tracking-wider">
                              <span>💡 How to Resolve:</span>
                            </div>
                            <p className="text-[11px] text-emerald-950 font-medium leading-relaxed">
                              {issue.suggestion || (
                                isHigh
                                  ? 'Correct this section to align with verified project facts and standard legal obligations.'
                                  : 'Review and refine wording to eliminate contractual ambiguity.'
                              )}
                            </p>
                          </div>

                          {/* Action Buttons: Jump & Fix with AI */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => scrollToSection(issue.section, issue.evidence, issue.location?.textRange)}
                              className="flex-1 py-1.5 px-2 bg-white hover:bg-gray-100 text-gray-800 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 border border-gray-300 shadow-2xs transition-colors cursor-pointer"
                              title="Scroll editor to this exact section and highlight text"
                            >
                              <ExternalLink className="w-3 h-3 text-gray-500" />
                              Jump to Section
                            </button>

                            <button
                              onClick={() => {
                                scrollToSection(issue.section, issue.evidence, issue.location?.textRange);
                                setActiveTab('ASSISTANT');
                                if (issue.suggestion) {
                                  setCustomCommand(issue.suggestion);
                                }
                              }}
                              className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Jump to this section and open AI Assistant with resolution instructions"
                            >
                              <Sparkles className="w-3 h-3" />
                              Fix with AI Assistant
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-mira-muted italic border-t pt-2">
                "AI Validation Score — informational only. Subject to qualified legal review."
              </p>
            </div>
          )}

          {/* TAB 2: AI ASSISTANT */}
          {activeTab === 'ASSISTANT' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                <span className="font-bold text-purple-950 flex items-center gap-1.5 text-[12px]">
                  <Sparkles className="w-3.5 h-3.5 text-mira-primary" />
                  Contextual Drafting Assistant
                </span>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Select text in the editor, write your command below, and ATHARV AI will modify that specific section.
                </p>
              </div>

              {/* Selected Text Preview */}
              {selectedText ? (
                <div className="p-2.5 bg-gray-50 rounded-xl border border-mira-border text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-semibold text-mira-muted text-[10px] uppercase">
                    <span>Targeted Selection ({selectedText.length} chars)</span>
                    <button
                      onClick={() => setSelectedText('')}
                      className="text-gray-400 hover:text-gray-600 underline text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="font-serif italic line-clamp-3 text-mira-dark bg-white p-1.5 rounded border border-gray-100">
                    "{selectedText}"
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Select or highlight any clause or paragraph in the center editor (or click <strong>"Fix with AI Assistant"</strong> on any flag) to edit that section.
                  </span>
                </div>
              )}

              {/* WRITE COMMAND & APPLY CHANGES */}
              <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-2">
                <label className="font-bold text-mira-dark text-[11px] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-mira-primary" />
                  Write AI Command for Section:
                </label>
                <textarea
                  rows={2}
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCustomCommand();
                    }
                  }}
                  placeholder='e.g. "Change notice period to 60 days", "Make bilateral for both parties", "Add 12-month non-solicit", "Replace Bangalore with Delaware"...'
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-hidden focus:border-mira-primary resize-none font-sans"
                />

                <button
                  onClick={handleCustomCommand}
                  disabled={applyingCommand || !customCommand.trim()}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${applyingCommand ? 'animate-spin' : ''}`} />
                  {applyingCommand ? 'Applying AI Changes...' : 'Apply AI Command to Document'}
                </button>
                <p className="text-[9px] text-mira-muted text-center italic">
                  Press Enter to apply command directly to the selected text.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-mira-dark text-[10px] uppercase tracking-wider">
                  Quick 1-Click Presets:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => handleRewrite('mutual')}
                    disabled={rewriting || !selectedText.trim()}
                    className="w-full py-1.5 px-2.5 bg-white border border-mira-border hover:border-mira-primary disabled:opacity-50 rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs cursor-pointer text-xs"
                    title="Make unilateral terms bilateral for both parties"
                  >
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-mira-primary" />
                      Make Clause Bilateral / Mutual
                    </span>
                    {rewriting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </button>

                  <button
                    onClick={() => handleRewrite('simple')}
                    disabled={rewriting || !selectedText.trim()}
                    className="w-full py-1.5 px-2.5 bg-white border border-mira-border hover:border-mira-primary disabled:opacity-50 rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-mira-secondary" />
                      Make Clause Simpler / Plain English
                    </span>
                    {rewriting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </button>

                  <button
                    onClick={() => handleRewrite('formal')}
                    disabled={rewriting || !selectedText.trim()}
                    className="w-full py-1.5 px-2.5 bg-white border border-mira-border hover:border-mira-primary disabled:opacity-50 rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-mira-primary" />
                      Make Clause Formal & Binding
                    </span>
                    {rewriting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </button>

                  <button
                    onClick={handleExplain}
                    disabled={explaining}
                    className="w-full py-1.5 px-2.5 bg-white border border-mira-border hover:border-mira-primary rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs cursor-pointer text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-mira-primary" />
                      Explain Selected Clause
                    </span>
                    {explaining && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </button>
                </div>
              </div>

              {/* Explanation Card */}
              {explanation && (
                <div className="p-3 bg-gray-50 rounded-xl border border-mira-border space-y-2 mt-2 animate-in fade-in">
                  <div className="font-bold text-mira-dark text-[11px] border-b pb-1">
                    Plain-Language Explanation
                  </div>
                  <p className="text-[11px] text-mira-dark leading-relaxed">{explanation.plainLanguage}</p>
                  <div>
                    <span className="font-bold text-[10px] text-mira-muted uppercase">Commercial Purpose</span>
                    <p className="text-[11px] text-mira-dark mt-0.5">{explanation.purpose}</p>
                  </div>
                  <div>
                    <span className="font-bold text-[10px] text-mira-muted uppercase">Legal Implication</span>
                    <p className="text-[11px] text-mira-dark mt-0.5">{explanation.legalImplication}</p>
                  </div>
                  <p className="text-[9px] text-mira-muted italic pt-1 border-t">
                    {explanation.disclaimer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
