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
  Zap,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  Lightbulb,
  FileCheck,
  Send,
  CornerDownRight,
  BookOpen,
  Copy
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

  // Active flag navigation & AI auto-fix state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [activeFix, setActiveFix] = useState<any>(null);
  const [loadingFix, setLoadingFix] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixSuccessMsg, setFixSuccessMsg] = useState('');

  // AI Assistant advanced state
  const [explanation, setExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sync facts state
  const [syncingFacts, setSyncingFacts] = useState(false);

  // Custom AI prompt state
  const [customInstruction, setCustomInstruction] = useState('');
  const [runningCustomEdit, setRunningCustomEdit] = useState(false);
  const [customEditResult, setCustomEditResult] = useState<any>(null);

  // Standard clauses library
  const [standardClauses, setStandardClauses] = useState<any[]>([]);
  const [selectedStandardClause, setSelectedStandardClause] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadDocument(id);
    }
  }, [id]);

  const loadDocument = async (docId: string) => {
    try {
      const doc = await documentService.getById(docId);
      setDocument(doc);
      setContent(doc.content);

      // Load standard clauses for this document type
      try {
        const clauses = await aiService.getStandardClauses(doc.documentType);
        setStandardClauses(clauses || []);
        if (clauses && clauses.length > 0) {
          setSelectedStandardClause(clauses[0]);
        }
      } catch (err) {
        console.warn('Could not load standard clauses:', err);
      }
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
      setActiveIssueIndex(null);
      setActiveFix(null);
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  /**
   * Jump & highlight exact section/text in the editor textarea
   */
  const locateAndHighlight = (targetStringOrPattern: string, fallbackSection?: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const text = el.value;

    let start = -1;
    let end = -1;

    // 1. Try exact target string if specific and meaningful
    if (targetStringOrPattern && targetStringOrPattern.trim().length > 1) {
      const cleanTarget = targetStringOrPattern.trim().toLowerCase();
      const idx = text.toLowerCase().indexOf(cleanTarget);
      if (idx !== -1) {
        start = idx;
        end = idx + cleanTarget.length;
      }
    }

    // 2. Fallback to matching section headers or keyword in text
    if (start === -1 && fallbackSection) {
      const secClean = fallbackSection.trim().toLowerCase();
      const lines = text.split('\n');
      let charOffset = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(secClean)) {
          start = charOffset;
          end = charOffset + line.length;
          break;
        }
        charOffset += line.length + 1; // +1 for \n
      }
    }

    // 3. Fallback to start of document if still not found
    if (start === -1) {
      start = 0;
      end = Math.min(text.length, 100);
    }

    // Apply focus, selection range, and smooth scroll
    el.focus();
    el.setSelectionRange(start, end);

    const linesBefore = text.substring(0, start).split('\n').length;
    const lineHeight = 24;
    el.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  };

  /**
   * Click on a validation issue/flag:
   * 1. Scrolls and highlights in the center editor
   * 2. Synchronizes the left outline panel
   * 3. Fetches an intelligent AI fix suggestion
   */
  const handleSelectIssue = async (issue: ValidationIssue, idx: number) => {
    setActiveIssueIndex(idx);

    // Extract potential quoted text or numerical token from description
    const quotedMatch = issue.description.match(/'([^']+)'/);
    const targetToken = quotedMatch ? quotedMatch[1] : '';

    locateAndHighlight(targetToken, issue.section);

    // Synchronize section selection in outline
    const matchedSection = sections.find(s => 
      s.title.toLowerCase().includes(issue.section.toLowerCase()) || 
      issue.section.toLowerCase().includes(s.title.toLowerCase())
    );
    if (matchedSection) {
      setSelectedSection(matchedSection.title);
    }

    // Fetch AI fix suggestion
    if (document) {
      setLoadingFix(true);
      try {
        const suggestion = await aiService.suggestFix({
          documentType: document.documentType,
          content,
          issue,
          structuredFacts: document.structuredFacts
        });
        setActiveFix(suggestion);
      } catch (err) {
        console.warn('Could not fetch AI fix suggestion:', err);
      } finally {
        setLoadingFix(false);
      }
    }
  };

  /**
   * Apply an AI suggestion to document content and auto-revalidate
   */
  const handleApplyFix = async (fixObj: any) => {
    if (!fixObj || !fixObj.fixedContent || !id || !document) return;
    setApplyingFix(true);
    try {
      const updatedContent = fixObj.fixedContent;
      setContent(updatedContent);
      setFixSuccessMsg('✓ AI Fix applied to document!');
      setTimeout(() => setFixSuccessMsg(''), 4000);

      // Save draft and revalidate immediately
      await documentService.update(id, { content: updatedContent, saveAsVersion: false });
      const valRes = await documentService.validate(id, {
        content: updatedContent,
        structuredFacts: document.structuredFacts
      });
      setDocument(valRes.document);

      setActiveFix(null);
      setActiveIssueIndex(null);
    } catch (err: any) {
      alert(`Failed to apply fix: ${err.message}`);
    } finally {
      setApplyingFix(false);
    }
  };

  /**
   * One-click direct fix for any flag
   */
  const handleDirectFix = async (issue: ValidationIssue, idx: number) => {
    if (!id || !document) return;
    setActiveIssueIndex(idx);
    setApplyingFix(true);
    try {
      // 1. Locate and highlight in editor
      const quotedMatch = issue.description.match(/'([^']+)'/);
      const targetToken = quotedMatch ? quotedMatch[1] : '';
      locateAndHighlight(targetToken, issue.section);

      // 2. Fetch AI fix suggestion
      const suggestion = await aiService.suggestFix({
        documentType: document.documentType,
        content,
        issue,
        structuredFacts: document.structuredFacts
      });

      if (suggestion && suggestion.fixedContent) {
        // 3. Apply fix to content
        const updatedContent = suggestion.fixedContent;
        setContent(updatedContent);
        setFixSuccessMsg('✓ AI Fix applied & validated!');
        setTimeout(() => setFixSuccessMsg(''), 4000);

        // 4. Save and auto-revalidate
        await documentService.update(id, { content: updatedContent, saveAsVersion: false });
        const valRes = await documentService.validate(id, {
          content: updatedContent,
          structuredFacts: document.structuredFacts
        });
        setDocument(valRes.document);
        setActiveFix(null);
        setActiveIssueIndex(null);
      }
    } catch (err: any) {
      alert(`Auto-fix failed: ${err.message}`);
    } finally {
      setApplyingFix(false);
    }
  };

  /**
   * Synchronize all structured facts in one pass
   */
  const handleSyncAllFacts = async () => {
    if (!id || !document) return;
    setSyncingFacts(true);
    try {
      const res = await aiService.syncFacts({
        documentType: document.documentType,
        content,
        structuredFacts: document.structuredFacts
      });
      setContent(res.fixedContent);
      setFixSuccessMsg(`✓ Synced facts: ${res.changes.join(', ')}`);
      setTimeout(() => setFixSuccessMsg(''), 5000);

      // Save & revalidate
      await documentService.update(id, { content: res.fixedContent, saveAsVersion: false });
      const valRes = await documentService.validate(id, {
        content: res.fixedContent,
        structuredFacts: document.structuredFacts
      });
      setDocument(valRes.document);
    } catch (err: any) {
      alert(`Fact sync failed: ${err.message}`);
    } finally {
      setSyncingFacts(false);
    }
  };

  /**
   * Run custom AI legal prompt / edit
   */
  const handleRunCustomEdit = async () => {
    if (!customInstruction.trim() || !document) return;
    setRunningCustomEdit(true);
    try {
      const res = await aiService.customEdit({
        documentType: document.documentType,
        content,
        selectedText: selectedText || undefined,
        instruction: customInstruction,
        structuredFacts: document.structuredFacts
      });
      setCustomEditResult(res);
    } catch (err: any) {
      alert(`AI edit failed: ${err.message}`);
    } finally {
      setRunningCustomEdit(false);
    }
  };

  const handleApplyCustomEdit = async () => {
    if (!customEditResult || !id || !document) return;
    setApplyingFix(true);
    try {
      const updated = customEditResult.appliedContent;
      setContent(updated);
      setFixSuccessMsg('✓ AI Revision applied!');
      setTimeout(() => setFixSuccessMsg(''), 4000);
      setCustomEditResult(null);
      setCustomInstruction('');

      await documentService.update(id, { content: updated, saveAsVersion: false });
      const valRes = await documentService.validate(id, {
        content: updated,
        structuredFacts: document.structuredFacts
      });
      setDocument(valRes.document);
    } catch (err: any) {
      alert(`Failed to apply revision: ${err.message}`);
    } finally {
      setApplyingFix(false);
    }
  };

  /**
   * Insert standard approved clause at cursor or end of document
   */
  const handleInsertStandardClause = (clauseText: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const cursorPos = el.selectionStart || content.length;

    const before = content.substring(0, cursorPos);
    const after = content.substring(cursorPos);
    const formattedInsertion = `\n\n---\n\n${clauseText.trim()}\n\n`;
    const updated = `${before}${formattedInsertion}${after}`;

    setContent(updated);
    setFixSuccessMsg('✓ Standard clause inserted into document!');
    setTimeout(() => setFixSuccessMsg(''), 4000);
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

  const handleRewrite = async (style: 'formal' | 'simple') => {
    if (!selectedText.trim()) {
      alert('Please highlight or select text in the document editor to rewrite.');
      return;
    }
    setRewriting(true);
    try {
      const res = await aiService.rewriteClause(selectedText, style);
      setContent((prev) => prev.replace(selectedText, res.rewritten));
      setSelectedText(res.rewritten);
      setFixSuccessMsg('✓ Clause rewritten!');
      setTimeout(() => setFixSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Rewrite error: ${err.message}`);
    } finally {
      setRewriting(false);
    }
  };

  if (!document) {
    return (
      <div className="p-12 text-center text-xs text-mira-muted flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-mira-primary" />
        <span>Loading Atharv Legal AI Studio...</span>
      </div>
    );
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
            title="Back to Document Library"
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
              {issuesList.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {issuesList.length} Flag{issuesList.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-mira-muted">
              Type: {document.documentType} • Version v{document.versions?.length || 1} • Last updated {new Date(document.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccessMsg && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> {saveSuccessMsg}
            </span>
          )}
          {fixSuccessMsg && (
            <span className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 font-medium flex items-center gap-1 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-mira-primary" /> {fixSuccessMsg}
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
            {validating ? 'Validating...' : 'Re-Validate'}
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

          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setSelectedSection(sec.title);
                  locateAndHighlight(sec.title, sec.title);
                }}
                className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
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
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                    Flagged
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Fact Sync in Outline */}
          <div className="pt-3 border-t border-mira-border space-y-2">
            <button
              onClick={handleSyncAllFacts}
              disabled={syncingFacts}
              className="w-full py-2 px-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-mira-primary text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFacts ? 'animate-spin' : ''}`} />
              {syncingFacts ? 'Synchronizing Facts...' : '1-Click Sync Structured Facts'}
            </button>

            <div className="text-[11px] text-mira-muted">
              <Link to={`/documents/${document.id}/versions`} className="text-mira-primary font-semibold hover:underline flex items-center gap-1">
                <History className="w-3 h-3" /> View Version History (v{document.versions?.length || 1})
              </Link>
            </div>
          </div>
        </div>

        {/* PANEL 2: Editable Document (Center, 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-mira-border shadow-xs flex flex-col min-h-[78vh]">
          <div className="px-5 py-3 border-b border-mira-border bg-gray-50/60 flex items-center justify-between text-xs text-mira-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-mira-dark">Legal Document Workspace</span>
              {activeIssueIndex !== null && (
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-mira-primary" />
                  Jumped to: {issuesList[activeIssueIndex]?.section}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-purple-700">Full markdown support</span>
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
              className="w-full flex-1 min-h-[70vh] p-4 font-serif text-sm leading-relaxed text-mira-dark bg-transparent border-0 focus:outline-hidden resize-none selection:bg-purple-200"
              placeholder="Legal document text..."
            />
          </div>

          {/* Explanation Banner if requested */}
          {explanation && (
            <div className="mx-5 mb-3 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5 animate-in fade-in relative">
              <button
                onClick={() => setExplanation(null)}
                className="absolute top-2 right-2 text-purple-700 hover:text-purple-900 font-bold text-xs"
                title="Dismiss"
              >
                ✕
              </button>
              <div className="font-bold text-purple-950 text-xs flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-mira-primary" />
                Plain English Explanation
              </div>
              <p className="text-xs text-purple-900 leading-relaxed">{explanation.plainLanguage}</p>
              {explanation.legalImplication && (
                <p className="text-[11px] text-purple-800">
                  <span className="font-semibold">Legal Implication:</span> {explanation.legalImplication}
                </p>
              )}
            </div>
          )}

          {/* Quick Status / Selection Assistant Footer */}
          <div className="px-5 py-2.5 border-t border-mira-border bg-gray-50/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-mira-muted">
            {selectedText.trim().length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
                <span className="font-semibold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md truncate max-w-xs">
                  Selected: "{selectedText.trim().slice(0, 35)}..."
                </span>
                <button
                  onClick={() => handleRewrite('simple')}
                  disabled={rewriting}
                  className="px-2 py-0.5 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-md font-semibold text-[10px] flex items-center gap-1 shadow-2xs"
                >
                  <Wand2 className="w-3 h-3" />
                  {rewriting ? 'Rewriting...' : 'Rewrite in Plain English'}
                </button>
                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="px-2 py-0.5 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-md font-semibold text-[10px] flex items-center gap-1 shadow-2xs"
                >
                  <HelpCircle className="w-3 h-3" />
                  {explaining ? 'Analyzing...' : 'Explain'}
                </button>
                <button
                  onClick={() => setSelectedText('')}
                  className="text-gray-400 hover:text-gray-600 text-[10px] px-1"
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span>{content.split(/\s+/).filter(Boolean).length} Words • {content.length} Characters</span>
            )}
            <span className="text-purple-700 font-medium">Click any flag to navigate & 1-click auto-fix</span>
          </div>
        </div>

        {/* PANEL 3: Streamlined Validation & AI Copilot Panel (Right, 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-mira-border shadow-xs p-4 space-y-4 sticky top-20">
          {/* Top Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('VALIDATION')}
              className={`py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'VALIDATION' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted hover:text-mira-dark'
              }`}
            >
              <span>Flags</span>
              {issuesList.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {issuesList.length}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  100%
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ASSISTANT')}
              className={`py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'ASSISTANT' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted hover:text-mira-dark'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-mira-primary" />
              <span>AI Copilot</span>
            </button>
          </div>

          {/* TAB 1: STREAMLINED VALIDATION FLAGS */}
          {activeTab === 'VALIDATION' && (
            <div className="space-y-3.5">
              {/* Sleek Compact Status Bar */}
              {issuesList.length === 0 ? (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-emerald-100 rounded-lg text-emerald-700">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">100% Verified Compliant</div>
                      <div className="text-[11px] text-emerald-700">All terms, parties & clauses match</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRevalidate}
                    disabled={validating}
                    className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700"
                    title="Re-run verification"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-mira-dark flex items-center gap-1.5">
                      <span className="text-sm font-black text-mira-primary">{validationScore}%</span>
                      <span>Compliance</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {issuesList.length} Flag{issuesList.length > 1 ? 's' : ''} to Resolve
                    </span>
                  </div>
                  <div className="w-full bg-purple-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        validationScore >= 90 ? 'bg-emerald-500' :
                        validationScore >= 70 ? 'bg-blue-500' :
                        validationScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${validationScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Flag Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-mira-muted font-medium">
                  <span>Detected Flags ({issuesList.length})</span>
                  <span className="text-[10px] text-purple-700">Click card to jump • 1-Click Fix</span>
                </div>

                {issuesList.length === 0 ? (
                  <div className="py-6 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-mira-dark">No Issues Found</p>
                    <p className="text-[11px] text-mira-muted">Your draft is free of factual discrepancies or missing sections.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                    {issuesList.map((issue: ValidationIssue, idx: number) => {
                      const isActive = activeIssueIndex === idx;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs transition-all ${
                            isActive
                              ? 'border-purple-500 bg-purple-50/70 shadow-xs ring-1 ring-purple-400'
                              : issue.severity === 'HIGH'
                              ? 'border-red-200 bg-red-50/30 hover:border-red-300 hover:bg-red-50/60'
                              : 'border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/60'
                          }`}
                        >
                          {/* Card Header & Description */}
                          <div 
                            onClick={() => handleSelectIssue(issue, idx)}
                            className="cursor-pointer space-y-1"
                            title="Click to jump to this section in text"
                          >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                              <span className="flex items-center gap-1.5 truncate">
                                <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${
                                  issue.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                                }`} />
                                <span className="truncate text-mira-dark">{issue.section}</span>
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                issue.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>
                            <p className="text-[11px] text-mira-dark/85 leading-snug">
                              {issue.description}
                            </p>
                          </div>

                          {/* Direct 1-Click Fix Action */}
                          <div className="mt-2.5 pt-2 border-t border-gray-200/80 flex items-center gap-1.5">
                            <button
                              onClick={() => handleDirectFix(issue, idx)}
                              disabled={applyingFix}
                              className="flex-1 py-1.5 px-2.5 bg-mira-primary hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            >
                              {applyingFix && activeIssueIndex === idx ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Applying Fix...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3 text-yellow-300" />
                                  <span>1-Click AI Fix</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                const q = issue.description.match(/'([^']+)'/)?.[1] || '';
                                locateAndHighlight(q, issue.section);
                              }}
                              className="py-1.5 px-2 bg-white hover:bg-gray-100 border border-mira-border text-mira-dark rounded-lg text-[10px] font-semibold flex items-center gap-1"
                              title="Locate & highlight in editor"
                            >
                              <span>Locate</span>
                              <CornerDownRight className="w-3 h-3 opacity-60" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collapsible Layer Breakdown */}
              <details className="group pt-2 border-t border-mira-border text-xs">
                <summary className="cursor-pointer text-[11px] font-semibold text-mira-muted hover:text-mira-dark flex items-center justify-between py-1">
                  <span>Verification Layer Scores</span>
                  <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform text-mira-muted" />
                </summary>
                <div className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1.5 border border-gray-100 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-mira-muted">Factual Accuracy</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.factualAccuracy ?? 95}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-mira-muted">Section Completeness</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.sectionCompleteness ?? 100}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-mira-muted">Clause Coverage</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.clauseCoverage ?? 92}%</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-mira-muted">InLegalBERT Consistency</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.semanticConsistency ?? 90}%</span>
                  </div>
                </div>
              </details>

              <p className="text-[10px] text-mira-muted italic">
                Informational score. Subject to qualified legal review.
              </p>
            </div>
          )}

          {/* TAB 2: STREAMLINED AI COPILOT */}
          {activeTab === 'ASSISTANT' && (
            <div className="space-y-3.5 text-xs">
              {/* 1. FACT SYNC CARD */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-mira-border space-y-2">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-mira-primary" />
                  <span className="font-bold text-mira-dark text-xs">Sync Intake Facts</span>
                </div>
                <p className="text-[11px] text-mira-muted leading-relaxed">
                  Update all party names, dates, amounts, and governing law to match project intake data.
                </p>
                <button
                  onClick={handleSyncAllFacts}
                  disabled={syncingFacts}
                  className="w-full py-2 px-3 bg-white hover:bg-purple-50 border border-mira-border hover:border-purple-300 text-mira-dark rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-mira-primary ${syncingFacts ? 'animate-spin' : ''}`} />
                  {syncingFacts ? 'Synchronizing...' : '1-Click Sync Facts into Draft'}
                </button>
              </div>

              {/* 2. AI REVISION & PROMPT */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-mira-border space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-mira-primary" />
                  <span className="font-bold text-mira-dark text-xs">AI Smart Revisions</span>
                </div>
                <p className="text-[11px] text-mira-muted leading-relaxed">
                  Instruct AI to modify or append specific contractual terms:
                </p>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunCustomEdit()}
                    placeholder="e.g. Change duration to 5 years, add fee recovery"
                    className="flex-1 p-2 text-xs bg-white border border-mira-border rounded-lg focus:outline-hidden focus:border-mira-primary text-mira-dark placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleRunCustomEdit}
                    disabled={runningCustomEdit || !customInstruction.trim()}
                    className="px-3 bg-mira-primary hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg flex items-center justify-center shadow-2xs transition-colors"
                    title="Send instruction to AI"
                  >
                    {runningCustomEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setCustomInstruction('Change duration to 5 years')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full hover:border-purple-300 text-mira-muted hover:text-mira-primary transition-colors"
                  >
                    + 5-Year Term
                  </button>
                  <button
                    onClick={() => setCustomInstruction('Add permitted disclosures for legal and accounting advisors')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full hover:border-purple-300 text-mira-muted hover:text-mira-primary transition-colors"
                  >
                    + Advisor Exception
                  </button>
                  <button
                    onClick={() => setCustomInstruction('Add emergency injunctive relief and attorney fees recovery')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full hover:border-purple-300 text-mira-muted hover:text-mira-primary transition-colors"
                  >
                    + Injunction & Fees
                  </button>
                  <button
                    onClick={() => setCustomInstruction('Add mutual non-solicitation covenant for 12 months')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-full hover:border-purple-300 text-mira-muted hover:text-mira-primary transition-colors"
                  >
                    + Non-Solicitation
                  </button>
                </div>

                {customEditResult && (
                  <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 space-y-2 animate-in fade-in">
                    <span className="text-[10px] font-bold text-purple-950 block">AI Proposal:</span>
                    <p className="text-[11px] text-purple-900 leading-snug">{customEditResult.explanation}</p>
                    <button
                      onClick={handleApplyCustomEdit}
                      disabled={applyingFix}
                      className="w-full py-1.5 px-3 bg-mira-primary hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      {applyingFix ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Apply Revision to Document
                    </button>
                  </div>
                )}
              </div>

              {/* 3. STANDARD CLAUSES LIBRARY */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-mira-border space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-mira-secondary" />
                  <span className="font-bold text-mira-dark text-xs">Standard Clause Library</span>
                </div>
                <p className="text-[11px] text-mira-muted leading-relaxed">
                  Inject vetted institutional clauses into your document:
                </p>

                {standardClauses.length > 0 && (
                  <select
                    className="w-full p-2 bg-white border border-mira-border rounded-lg text-xs text-mira-dark focus:outline-hidden focus:border-mira-primary"
                    onChange={(e) => {
                      const cl = standardClauses.find(c => c.id === e.target.value);
                      if (cl) setSelectedStandardClause(cl);
                    }}
                    value={selectedStandardClause?.id || ''}
                  >
                    {standardClauses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.category}] {c.title}
                      </option>
                    ))}
                  </select>
                )}

                {selectedStandardClause && (
                  <button
                    onClick={() => handleInsertStandardClause(selectedStandardClause.content)}
                    className="w-full py-1.5 px-3 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Insert Clause at Cursor
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
