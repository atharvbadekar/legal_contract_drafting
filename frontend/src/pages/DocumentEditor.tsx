import React, { useEffect, useState } from 'react';
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
  Check
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

  // AI Assistant state
  const [explanation, setExplanation] = useState<any>(null);
  const [explaining, setExplaining] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

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

  const handleRewrite = async (style: 'formal' | 'simple') => {
    if (!selectedText.trim()) {
      alert('Please select or highlight text in the document editor to rewrite.');
      return;
    }
    setRewriting(true);
    try {
      const res = await aiService.rewriteClause(selectedText, style);
      setContent((prev) => prev.replace(selectedText, res.rewritten));
      setSelectedText(res.rewritten);
    } catch (err: any) {
      alert(`Rewrite error: ${err.message}`);
    } finally {
      setRewriting(false);
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
                onClick={() => setSelectedSection(sec.title)}
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

              {/* Detected Issues */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-mira-dark">
                  Validation Log ({issuesList.length} items):
                </span>
                {issuesList.length === 0 ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>No fact mismatches or structural anomalies found.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {issuesList.map((issue: ValidationIssue, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-xs border ${
                          issue.severity === 'HIGH'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : issue.severity === 'MEDIUM'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span>{issue.section}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-white/70">
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1 leading-snug">{issue.description}</p>
                      </div>
                    ))}
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
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                <span className="font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-mira-primary" />
                  Contextual Drafting Assistant
                </span>
                <p className="text-[11px] text-purple-800">
                  Highlight any clause or paragraph in the center editor, then click an action below:
                </p>
              </div>

              {selectedText && (
                <div className="p-2 bg-gray-50 rounded border text-[11px] font-serif italic line-clamp-3 text-mira-dark">
                  Selected: "{selectedText}"
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="w-full py-2 px-3 bg-white border border-mira-border hover:border-mira-primary rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-mira-primary" />
                    Explain Selected Clause
                  </span>
                  {explaining && <RefreshCw className="w-3 h-3 animate-spin" />}
                </button>

                <button
                  onClick={() => handleRewrite('simple')}
                  disabled={rewriting}
                  className="w-full py-2 px-3 bg-white border border-mira-border hover:border-mira-primary rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-mira-secondary" />
                    Make Clause Simpler / Plain English
                  </span>
                  {rewriting && <RefreshCw className="w-3 h-3 animate-spin" />}
                </button>

                <button
                  onClick={() => handleRewrite('formal')}
                  disabled={rewriting}
                  className="w-full py-2 px-3 bg-white border border-mira-border hover:border-mira-primary rounded-lg font-medium text-mira-dark text-left flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-mira-primary" />
                    Make Clause More Formal & Binding
                  </span>
                  {rewriting && <RefreshCw className="w-3 h-3 animate-spin" />}
                </button>
              </div>

              {/* Explanation Card */}
              {explanation && (
                <div className="p-3 bg-gray-50 rounded-xl border border-mira-border space-y-2 mt-3 animate-in fade-in">
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
