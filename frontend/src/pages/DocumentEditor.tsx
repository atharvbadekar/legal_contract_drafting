import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService, aiService } from '../services/api';
import { DocumentRecord, ValidationIssue, DocumentLocation } from '../types';
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
  AlertCircle,
  Lightbulb,
  FileCheck,
  Send,
  CornerDownRight,
  BookOpen,
  Undo2,
  X,
  Scale
} from 'lucide-react';

export const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'FLAGS' | 'TOOLS'>('FLAGS');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Editor ref & selection
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);

  // Notifications
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [fixSuccessMsg, setFixSuccessMsg] = useState('');
  const [undoing, setUndoing] = useState(false);

  // Per-flag AI fix state
  const [flagSuggestions, setFlagSuggestions] = useState<Record<number, {
    targetSnippet: string;
    replacementSnippet: string;
    explanation: string;
    fixedContent?: string;
  }>>({});
  const [loadingFlagFix, setLoadingFlagFix] = useState<Record<number, boolean>>({});
  const [applyingFlagFix, setApplyingFlagFix] = useState<Record<number, boolean>>({});

  // Selection AI assistant state
  const [selectionInstruction, setSelectionInstruction] = useState('');
  const [selectionSuggestion, setSelectionSuggestion] = useState<{
    originalText: string;
    replacementText: string;
    explanation?: string;
  } | null>(null);
  const [suggestingSelection, setSuggestingSelection] = useState(false);
  const [applyingSelection, setApplyingSelection] = useState(false);

  // Plain English explanation banner
  const [explanation, setExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);

  // Facts & Clauses
  const [syncingFacts, setSyncingFacts] = useState(false);
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

      // Load standard clauses
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
      setFlagSuggestions({});
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  /**
   * Jump & highlight exact section/text in the editor textarea
   */
  const locateAndHighlight = (targetStringOrPattern?: string, fallbackSection?: string, location?: DocumentLocation) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const text = el.value;

    let start = -1;
    let end = -1;

    // 1. Direct offset range if provided
    const rangeStart = location?.startOffset ?? location?.textRange?.start;
    const rangeEnd = location?.endOffset ?? location?.textRange?.end;
    if (typeof rangeStart === 'number' && typeof rangeEnd === 'number' && rangeStart >= 0 && rangeEnd <= text.length && rangeStart < rangeEnd) {
      start = rangeStart;
      end = rangeEnd;
    }

    // 2. Exact target string search
    if (start === -1 && targetStringOrPattern && targetStringOrPattern.trim().length > 1) {
      const cleanTarget = targetStringOrPattern.trim().toLowerCase();
      const idx = text.toLowerCase().indexOf(cleanTarget);
      if (idx !== -1) {
        start = idx;
        end = idx + cleanTarget.length;
      }
    }

    // 3. Fallback to section header match
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
        charOffset += line.length + 1;
      }
    }

    // 4. Default fallback to start
    if (start === -1) {
      start = 0;
      end = Math.min(text.length, 100);
    }

    el.focus();
    el.setSelectionRange(start, end);

    const sel = text.substring(start, end);
    if (sel && sel.trim().length > 0) {
      setSelectedText(sel);
    }

    const linesBefore = text.substring(0, start).split('\n').length;
    const lineHeight = 24;
    el.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  };

  /**
   * User clicks a flag in the right panel:
   * 1. Scrolls and highlights in the center editor
   * 2. Synchronizes section outline on left
   */
  const handleSelectFlag = (issue: ValidationIssue, idx: number) => {
    setActiveIssueIndex(idx);
    const targetToken = issue.evidence || (issue.description.match(/'([^']+)'/)?.[1] || '');
    locateAndHighlight(targetToken, issue.section, issue.location);

    // Sync section outline
    const matchedSection = sections.find(s => 
      s.title.toLowerCase().includes(issue.section.toLowerCase()) || 
      issue.section.toLowerCase().includes(s.title.toLowerCase())
    );
    if (matchedSection) {
      setSelectedSection(matchedSection.title);
    }
  };

  /**
   * AI Suggestion for a specific Flag in the right panel
   */
  const handleSuggestFlagFix = async (issue: ValidationIssue, idx: number) => {
    if (!document) return;
    setActiveIssueIndex(idx);
    setLoadingFlagFix(prev => ({ ...prev, [idx]: true }));
    handleSelectFlag(issue, idx);

    try {
      // 1. If issue already has proposedPatch, use it directly
      if (issue.proposedPatch?.replacementText) {
        setFlagSuggestions(prev => ({
          ...prev,
          [idx]: {
            targetSnippet: issue.proposedPatch?.originalText || issue.evidence || '',
            replacementSnippet: issue.proposedPatch?.replacementText || '',
            explanation: issue.proposedPatch?.reason || issue.suggestion || issue.description
          }
        }));
        return;
      }

      // 2. Query AI suggest-fix endpoint
      const res = await aiService.suggestFix({
        documentType: document.documentType,
        content,
        issue,
        structuredFacts: document.structuredFacts
      });

      setFlagSuggestions(prev => ({
        ...prev,
        [idx]: {
          targetSnippet: res.targetSnippet || issue.evidence || '',
          replacementSnippet: res.replacementSnippet,
          explanation: res.explanation || issue.suggestion || issue.description,
          fixedContent: res.fixedContent
        }
      }));
    } catch (err: any) {
      // Fallback
      setFlagSuggestions(prev => ({
        ...prev,
        [idx]: {
          targetSnippet: issue.evidence || '',
          replacementSnippet: issue.suggestion || `[Updated clause for ${issue.section}]`,
          explanation: issue.message || issue.description
        }
      }));
    } finally {
      setLoadingFlagFix(prev => ({ ...prev, [idx]: false }));
    }
  };

  /**
   * 1-Click Apply AI Fix for a Flag
   */
  const handleApplyFlagFix = async (idx: number, issue: ValidationIssue) => {
    if (!id || !document) return;
    const suggestion = flagSuggestions[idx];
    if (!suggestion) return;

    setApplyingFlagFix(prev => ({ ...prev, [idx]: true }));
    try {
      let updatedContent = content;

      // 1. Direct string replacement
      if (suggestion.targetSnippet && content.includes(suggestion.targetSnippet)) {
        updatedContent = content.replace(suggestion.targetSnippet, suggestion.replacementSnippet);
      } 
      // 2. Evidence replacement
      else if (issue.evidence && content.includes(issue.evidence)) {
        updatedContent = content.replace(issue.evidence, suggestion.replacementSnippet);
      }
      // 3. Whole fixedContent fallback
      else if (suggestion.fixedContent && suggestion.fixedContent !== content) {
        updatedContent = suggestion.fixedContent;
      }
      // 4. Missing section: append before signatures or at end
      else if (issue.type === 'MISSING_SECTION' || issue.category === 'STRUCTURAL') {
        const sigMatch = content.search(/##\s*(?:EXECUTION|SIGNATURES|IN WITNESS WHEREOF)/i);
        if (sigMatch !== -1) {
          updatedContent = `${content.substring(0, sigMatch).trim()}\n\n---\n\n${suggestion.replacementSnippet}\n\n---\n\n${content.substring(sigMatch).trim()}`;
        } else {
          updatedContent = `${content.trim()}\n\n---\n\n${suggestion.replacementSnippet}\n`;
        }
      }

      setContent(updatedContent);
      setFlagSuggestions(prev => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
      setActiveIssueIndex(null);
      setFixSuccessMsg(`✓ Applied AI fix to ${issue.section || issue.title}`);
      setTimeout(() => setFixSuccessMsg(''), 4000);

      // Auto-save & re-validate in background
      const updatedDoc = await documentService.update(id, {
        content: updatedContent,
        saveAsVersion: false
      });
      setDocument(updatedDoc);

      const valRes = await documentService.validate(id, {
        content: updatedContent,
        structuredFacts: document.structuredFacts
      });
      setDocument(valRes.document);
    } catch (err: any) {
      alert(`Could not apply fix: ${err.message}`);
    } finally {
      setApplyingFlagFix(prev => ({ ...prev, [idx]: false }));
    }
  };

  /**
   * AI Selection Assistant: Suggest changes for highlighted text in editor
   */
  const handleSuggestForSelection = async (modeOrInstruction?: string) => {
    if (!selectedText.trim() || !document) {
      alert('Please select or highlight text in the editor first.');
      return;
    }
    setSuggestingSelection(true);
    try {
      if (modeOrInstruction === 'simple' || modeOrInstruction === 'formal') {
        const res = await aiService.rewriteClause(selectedText, modeOrInstruction);
        setSelectionSuggestion({
          originalText: selectedText,
          replacementText: res.rewritten,
          explanation: `Rewritten in ${modeOrInstruction === 'simple' ? 'Plain English' : 'Formal Legal Language'}.`
        });
      } else {
        const inst = modeOrInstruction || selectionInstruction || 'Refine and correct this legal clause';
        const res = await aiService.customEdit({
          documentType: document.documentType,
          content,
          selectedText,
          instruction: inst,
          structuredFacts: document.structuredFacts
        });
        setSelectionSuggestion({
          originalText: selectedText,
          replacementText: res.revisedSnippet,
          explanation: res.explanation
        });
      }
    } catch (err: any) {
      alert(`AI Suggestion failed: ${err.message}`);
    } finally {
      setSuggestingSelection(false);
    }
  };

  /**
   * 1-Click Apply AI Suggestion to Selected Text
   */
  const handleApplySelectionSuggestion = async () => {
    if (!id || !document || !selectionSuggestion) return;
    setApplyingSelection(true);
    try {
      const { originalText, replacementText } = selectionSuggestion;
      if (!content.includes(originalText)) {
        alert('Could not locate original text in document. It may have been edited.');
        return;
      }
      const updatedContent = content.replace(originalText, replacementText);
      setContent(updatedContent);
      setSelectionSuggestion(null);
      setSelectedText('');
      setSelectionInstruction('');
      setFixSuccessMsg('✓ AI change applied to document!');
      setTimeout(() => setFixSuccessMsg(''), 4000);

      // Auto-save & revalidate
      const updatedDoc = await documentService.update(id, { content: updatedContent, saveAsVersion: false });
      setDocument(updatedDoc);
      const valRes = await documentService.validate(id, {
        content: updatedContent,
        structuredFacts: document.structuredFacts
      });
      setDocument(valRes.document);
    } catch (err: any) {
      alert(`Failed to apply change: ${err.message}`);
    } finally {
      setApplyingSelection(false);
    }
  };

  /**
   * 1-Click Undo last AI fix
   */
  const handleUndoLastFix = async () => {
    if (!id || !document) return;
    setUndoing(true);
    try {
      const res = await documentService.undoLastFix(id);
      if (res.success && res.document) {
        setContent(res.document.content);
        setDocument(res.document);
        setFixSuccessMsg('✓ Restored to previous snapshot (Undo successful).');
        setTimeout(() => setFixSuccessMsg(''), 4000);
        setActiveIssueIndex(null);
      }
    } catch (err: any) {
      alert(`Undo error: ${err.response?.data?.error || err.message}`);
    } finally {
      setUndoing(false);
    }
  };

  /**
   * 1-Click Sync Facts
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
   * Plain English Explanation
   */
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

  /**
   * Insert standard clause
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
              {issuesList.length > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {issuesList.length} Flag{issuesList.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  100% Compliant
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
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-mira-muted" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-3 py-1.5 bg-mira-light border border-purple-200 text-mira-primary hover:bg-purple-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            Save as Version
          </button>

          <button
            onClick={handleUndoLastFix}
            disabled={undoing || (document.versions?.length || 0) <= 0}
            className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Undo last AI fix"
          >
            <Undo2 className={`w-3.5 h-3.5 text-amber-600 ${undoing ? 'animate-spin' : ''}`} />
            {undoing ? 'Restoring...' : 'Undo AI Fix'}
          </button>

          <button
            onClick={handleRevalidate}
            disabled={validating}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-mira-primary ${validating ? 'animate-spin' : ''}`} />
            {validating ? 'Validating...' : 'Re-Validate'}
          </button>

          <button
            onClick={() => documentService.downloadDocx(document.id, document.title)}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> DOCX
          </button>

          <button
            onClick={() => documentService.downloadPdf(document.id, document.title)}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
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
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                    Flagged
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Fact Sync */}
          <div className="pt-3 border-t border-mira-border space-y-2">
            <button
              onClick={handleSyncAllFacts}
              disabled={syncingFacts}
              className="w-full py-2 px-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-mira-primary text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingFacts ? 'animate-spin' : ''}`} />
              {syncingFacts ? 'Synchronizing Facts...' : '1-Click Sync Facts'}
            </button>

            <div className="text-[11px] text-mira-muted">
              <Link to={`/documents/${document.id}/versions`} className="text-mira-primary font-semibold hover:underline flex items-center gap-1">
                <History className="w-3 h-3" /> View Version History (v{document.versions?.length || 1})
              </Link>
            </div>
          </div>
        </div>

        {/* PANEL 2: Document Workspace (Center, 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-mira-border shadow-xs flex flex-col min-h-[78vh]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-mira-border bg-gray-50/60 flex items-center justify-between text-xs text-mira-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-mira-dark">Legal Document Workspace</span>
              {activeIssueIndex !== null && (
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-mira-primary" />
                  Focused on: {issuesList[activeIssueIndex]?.section || 'Flagged Section'}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-purple-700">Markdown format supported</span>
          </div>

          {/* Center Textarea */}
          <div className="p-5 flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={(e: any) => {
                const sel = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                if (sel && sel.trim().length > 0) {
                  setSelectedText(sel);
                }
              }}
              className="w-full flex-1 min-h-[65vh] p-4 font-serif text-sm leading-relaxed text-mira-dark bg-transparent border-0 focus:outline-hidden resize-none selection:bg-purple-200"
              placeholder="Legal document text..."
            />
          </div>

          {/* Explanation Banner (if requested) */}
          {explanation && (
            <div className="mx-5 mb-3 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5 animate-in fade-in relative">
              <button
                onClick={() => setExplanation(null)}
                className="absolute top-2 right-2 text-purple-700 hover:text-purple-900 font-bold text-xs cursor-pointer"
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

          {/* AI SELECTION ASSISTANT BAR (Appears when text is selected) */}
          {selectedText.trim().length > 0 && (
            <div className="mx-5 mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50/70 border border-purple-200 rounded-xl space-y-2.5 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Sparkles className="w-4 h-4 text-mira-primary" />
                  <span>AI Selection Assistant</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedText('');
                    setSelectionSuggestion(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xs px-1 cursor-pointer"
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>

              <div className="text-[11px] text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-100 italic truncate max-w-full">
                "{selectedText.trim().slice(0, 80)}{selectedText.trim().length > 80 ? '...' : ''}"
              </div>

              {/* Quick AI Action Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleSuggestForSelection('Improve legal clarity and enforceability')}
                  disabled={suggestingSelection}
                  className="px-2.5 py-1 bg-mira-primary hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3 h-3 ${suggestingSelection ? 'animate-spin' : ''}`} />
                  {suggestingSelection ? 'Generating...' : '✨ Suggest AI Changes'}
                </button>

                <button
                  onClick={() => handleSuggestForSelection('simple')}
                  disabled={suggestingSelection}
                  className="px-2 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  Plain English
                </button>

                <button
                  onClick={() => handleSuggestForSelection('formal')}
                  disabled={suggestingSelection}
                  className="px-2 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  <Scale className="w-3 h-3" />
                  Make Formal
                </button>

                <button
                  onClick={() => handleSuggestForSelection('Make this clause mutual and balanced for both parties')}
                  disabled={suggestingSelection}
                  className="px-2 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  Make Mutual
                </button>

                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="px-2 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-[10px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  {explaining ? 'Analyzing...' : 'Explain'}
                </button>
              </div>

              {/* Custom Prompt Input */}
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={selectionInstruction}
                  onChange={(e) => setSelectionInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSuggestForSelection()}
                  placeholder="Or enter custom instruction: e.g. change to 5 years, add fee recovery..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-hidden focus:border-mira-primary text-mira-dark placeholder:text-gray-400"
                />
                <button
                  onClick={() => handleSuggestForSelection()}
                  disabled={suggestingSelection || !selectionInstruction.trim()}
                  className="px-3 py-1.5 bg-mira-primary hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                >
                  {suggestingSelection ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Ask AI
                </button>
              </div>

              {/* Proposed Replacement Card */}
              {selectionSuggestion && (
                <div className="mt-2 p-3 bg-white rounded-xl border border-purple-300 shadow-sm space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      AI Suggested Replacement:
                    </span>
                    <button
                      onClick={() => setSelectionSuggestion(null)}
                      className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <textarea
                    value={selectionSuggestion.replacementText}
                    onChange={(e) => setSelectionSuggestion({
                      ...selectionSuggestion,
                      replacementText: e.target.value
                    })}
                    className="w-full p-2.5 text-xs font-serif leading-relaxed text-mira-dark bg-purple-50/50 border border-purple-200 rounded-lg focus:outline-hidden focus:border-mira-primary resize-y min-h-[70px]"
                  />

                  {selectionSuggestion.explanation && (
                    <p className="text-[10px] text-purple-800 italic">
                      {selectionSuggestion.explanation}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setSelectionSuggestion(null)}
                      className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplySelectionSuggestion}
                      disabled={applyingSelection}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {applyingSelection ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Apply Change to Document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Status Bar */}
          <div className="px-5 py-2.5 border-t border-mira-border bg-gray-50/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-mira-muted">
            <span>{content.split(/\s+/).filter(Boolean).length} Words • {content.length} Characters</span>
            <span className="text-purple-700 font-medium">Click any flag to jump directly to that section</span>
          </div>
        </div>

        {/* PANEL 3: Clean Document Flags List (Right, 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-mira-border shadow-xs p-4 space-y-4 sticky top-20">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('FLAGS')}
              className={`py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'FLAGS' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted hover:text-mira-dark'
              }`}
            >
              <span>Document Flags</span>
              {issuesList.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {issuesList.length}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  0
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('TOOLS')}
              className={`py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'TOOLS' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted hover:text-mira-dark'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-mira-primary" />
              <span>AI Tools</span>
            </button>
          </div>

          {/* TAB 1: DOCUMENT FLAGS */}
          {activeTab === 'FLAGS' && (
            <div className="space-y-3">
              {/* Compliance Header */}
              {issuesList.length === 0 ? (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-emerald-100 rounded-lg text-emerald-700">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">100% Compliant</div>
                      <div className="text-[11px] text-emerald-700">All terms and clauses verified</div>
                    </div>
                  </div>
                  <button
                    onClick={handleRevalidate}
                    disabled={validating}
                    className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700 cursor-pointer"
                    title="Re-validate"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-mira-dark flex items-center gap-1.5">
                      <span className="text-sm font-black text-mira-primary">{validationScore}%</span>
                      <span>Score</span>
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

              {/* Flags Header Label */}
              <div className="flex items-center justify-between text-xs text-mira-muted font-medium pt-1">
                <span>Detected Flags ({issuesList.length})</span>
                <span className="text-[10px] text-purple-700">Click flag to jump</span>
              </div>

              {/* Flags Cards List */}
              {issuesList.length === 0 ? (
                <div className="py-8 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-mira-dark">No Issues Found</p>
                  <p className="text-[11px] text-mira-muted">Your document draft is free of factual discrepancies or missing clauses.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {issuesList.map((issue: ValidationIssue, idx: number) => {
                    const isActive = activeIssueIndex === idx;
                    const suggestion = flagSuggestions[idx];
                    const isLoading = !!loadingFlagFix[idx];
                    const isApplying = !!applyingFlagFix[idx];

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs transition-all space-y-2.5 ${
                          isActive
                            ? 'border-purple-500 bg-purple-50/60 shadow-xs ring-1 ring-purple-400'
                            : 'border-mira-border bg-white hover:border-purple-300'
                        }`}
                      >
                        {/* Flag Header */}
                        <div
                          onClick={() => handleSelectFlag(issue, idx)}
                          className="cursor-pointer space-y-1.5"
                          title="Click to jump to this section in document"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 font-bold text-xs text-mira-dark truncate">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span className="truncate">{issue.title || issue.section}</span>
                            </span>

                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                              issue.severity === 'HIGH' 
                                ? 'bg-red-100 text-red-800' 
                                : issue.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>

                          {/* 1. What is Wrong */}
                          <div className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 text-[11px] text-rose-950 leading-snug">
                            <span className="font-bold text-rose-800">Problem: </span>
                            {issue.message || issue.description}
                          </div>

                          {/* 2. What Changes Are Needed */}
                          <div className="p-2 bg-purple-50/70 rounded-lg border border-purple-100 text-[11px] text-purple-950 leading-snug">
                            <span className="font-bold text-mira-primary">Needed Change: </span>
                            {issue.suggestion || issue.reason || 'Update clause to align with authoritative terms.'}
                          </div>
                        </div>

                        {/* Evidence quote if available */}
                        {issue.evidence && (
                          <div
                            onClick={() => locateAndHighlight(issue.evidence, issue.section, issue.location)}
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 text-[10px] text-gray-700 flex items-center justify-between gap-1.5 cursor-pointer"
                            title="Click to locate quote in editor"
                          >
                            <span className="italic truncate text-gray-600">"{issue.evidence}"</span>
                            <span className="text-purple-700 font-bold flex items-center gap-0.5 flex-shrink-0 text-[9px]">
                              <CornerDownRight className="w-2.5 h-2.5" /> Jump
                            </span>
                          </div>
                        )}

                        {/* Inline AI Suggestion Preview (if user clicked Suggest AI Fix) */}
                        {suggestion && (
                          <div className="p-2.5 bg-white rounded-lg border border-purple-300 shadow-2xs space-y-2 animate-in fade-in">
                            <span className="text-[10px] font-bold text-purple-950 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-mira-primary" />
                              AI Proposed Replacement:
                            </span>
                            <textarea
                              value={suggestion.replacementSnippet}
                              onChange={(e) => setFlagSuggestions(prev => ({
                                ...prev,
                                [idx]: { ...prev[idx], replacementSnippet: e.target.value }
                              }))}
                              className="w-full p-2 text-[11px] font-serif leading-relaxed text-mira-dark bg-purple-50/40 border border-purple-200 rounded-md focus:outline-hidden focus:border-mira-primary resize-y min-h-[60px]"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setFlagSuggestions(prev => {
                                  const copy = { ...prev };
                                  delete copy[idx];
                                  return copy;
                                })}
                                className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleApplyFlagFix(idx, issue)}
                                disabled={isApplying}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                {isApplying ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Applying...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Apply Change
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        {!suggestion && (
                          <div className="pt-1 flex items-center justify-between gap-2 border-t border-gray-100">
                            <button
                              onClick={() => handleSelectFlag(issue, idx)}
                              className="py-1 px-2.5 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <CornerDownRight className="w-3 h-3" />
                              Jump to Section
                            </button>

                            <button
                              onClick={() => handleSuggestFlagFix(issue, idx)}
                              disabled={isLoading}
                              className="py-1 px-2.5 bg-mira-primary hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isLoading ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Thinking...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3" />
                                  Suggest AI Fix
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI UTILITY TOOLS */}
          {activeTab === 'TOOLS' && (
            <div className="space-y-3.5 text-xs">
              {/* Fact Sync Card */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-mira-border space-y-2">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-mira-primary" />
                  <span className="font-bold text-mira-dark text-xs">Sync Intake Facts</span>
                </div>
                <p className="text-[11px] text-mira-muted leading-relaxed">
                  Update all party names, dates, amounts, and governing law to match project facts in one click.
                </p>
                <button
                  onClick={handleSyncAllFacts}
                  disabled={syncingFacts}
                  className="w-full py-2 px-3 bg-white hover:bg-purple-50 border border-mira-border hover:border-purple-300 text-mira-dark rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-mira-primary ${syncingFacts ? 'animate-spin' : ''}`} />
                  {syncingFacts ? 'Synchronizing...' : '1-Click Sync Facts'}
                </button>
              </div>

              {/* Standard Clause Library */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-mira-border space-y-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-mira-secondary" />
                  <span className="font-bold text-mira-dark text-xs">Standard Clause Library</span>
                </div>
                <p className="text-[11px] text-mira-muted leading-relaxed">
                  Inject vetted institutional clauses directly into your draft:
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
                    className="w-full py-1.5 px-3 bg-white hover:bg-purple-50 border border-purple-200 text-mira-primary rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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
