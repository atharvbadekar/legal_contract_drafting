import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractAnalyzerService } from '../services/api';
import { ContractAnalysisResult, ContractClauseStatus, ContractRiskSeverity } from '../types';
import { 
  FileSearch, 
  UploadCloud, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  XCircle, 
  Sparkles, 
  Scale, 
  ArrowRight, 
  Layers, 
  Building2, 
  Calendar, 
  Clock, 
  DollarSign, 
  Gavel, 
  RefreshCw, 
  Eye, 
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  Lightbulb
} from 'lucide-react';

export const ContractAnalyzer: React.FC = () => {
  const navigate = useNavigate();

  // Input states
  const [inputMode, setInputMode] = useState<'UPLOAD' | 'PASTE'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<ContractAnalysisResult | null>(null);
  const [clauseFilter, setClauseFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [importing, setImporting] = useState(false);

  // Sample contract for quick testing
  const loadSampleContract = () => {
    setPastedText(`# MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is dated May 15, 2026, by and between:
ClientCorp Global Inc., a Delaware corporation ("Client"),
and
DevStudio Technologies LLP, an engineering consultancy ("Consultant").

WHEREAS, Client desires to retain Consultant to develop custom cloud architecture and proprietary software deliverables.

1. Scope of Deliverables
Consultant shall develop and deliver custom microservices and integration code according to agreed project milestones. 

2. Consideration & Fees
Client agrees to pay the fees set forth in the milestone schedule.

3. Term and Termination
This Agreement shall continue for a duration of 2 years from the Effective Date. Either party may terminate immediately without notice in the event of material default.

4. Intellectual Property
[PARTY NAME] agrees that background tools remain proprietary.

5. Limitation of Liability
Consultant shall indemnify Client against all claims, liabilities, and damages arising out of performance under this Agreement without limitation.

6. Governing Law & Jurisdiction
This Agreement shall be governed by the laws of the State of Delaware, subject to the exclusive jurisdiction of the courts of Wilmington, Delaware.

IN WITNESS WHEREOF, the parties execute this Agreement.

ClientCorp Global Inc.
By: ______________________
Title: Authorized Signatory

DevStudio Technologies LLP
By: ______________________
Title: Managing Partner`);
    setInputMode('PASTE');
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    if (inputMode === 'UPLOAD' && !file) {
      setError('Please select a PDF, DOCX, or TXT contract file to upload.');
      return;
    }
    if (inputMode === 'PASTE' && !pastedText.trim()) {
      setError('Please paste contract text into the editor.');
      return;
    }

    setAnalyzing(true);
    setAnalysisStep('Extracting document structure & text...');

    try {
      setTimeout(() => setAnalysisStep('Detecting contract type, parties & terms...'), 400);
      setTimeout(() => setAnalysisStep('Evaluating clause completeness against standards...'), 800);
      setTimeout(() => setAnalysisStep('Auditing liability, IP, and termination risks...'), 1200);
      setTimeout(() => setAnalysisStep('Verifying factual consistency & computing health score...'), 1600);

      let res: ContractAnalysisResult;
      if (inputMode === 'UPLOAD' && file) {
        res = await contractAnalyzerService.analyzeFile(file);
      } else {
        res = await contractAnalyzerService.analyzeText(pastedText, 'Pasted Contract');
      }

      setResult(res);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.response?.data?.error || err.message || 'Contract analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleImportToEditor = async () => {
    if (!result) return;
    setImporting(true);
    try {
      const doc = await contractAnalyzerService.importAnalyzed({
        title: result.overview.title || `${result.overview.contractType.replace(/_/g, ' ')} Document`,
        documentType: result.overview.contractType === 'LEGAL_NOTICE' ? 'LEGAL_NOTICE' : 'NDA',
        content: result.extractedText,
        structuredFacts: {
          parties: result.overview.parties,
          effectiveDate: result.overview.effectiveDate,
          duration: result.overview.duration,
          monetaryTerms: result.overview.monetaryTerms,
          governingLaw: result.overview.governingLaw,
          jurisdiction: result.overview.jurisdiction
        },
        health: result.health
      });

      navigate(`/documents/${doc.id}/edit`);
    } catch (err: any) {
      alert(`Failed to import to editor: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Filter clauses
  const filteredClauses = result?.clauseMap.filter((c) => {
    if (clauseFilter === 'ALL') return true;
    return c.status === clauseFilter;
  }) || [];

  // Filter risks
  const filteredRisks = result?.riskAreas.filter((r) => {
    if (riskFilter === 'ALL') return true;
    return r.severity === riskFilter;
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-mira-dark tracking-tight">Contract Analyzer & Intelligence</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-mira-primary border border-purple-200">
              Multi-Format Parser
            </span>
          </div>
          <p className="text-sm text-mira-muted mt-1">
            Audit existing contracts (PDF, DOCX, TXT): extract overview, map clause completeness, detect risk exposure, and compute explainable Contract Health.
          </p>
        </div>

        {result && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                setPastedText('');
              }}
              className="px-3.5 py-2 bg-white border border-mira-border hover:bg-gray-50 text-xs font-semibold text-mira-dark rounded-lg transition-colors cursor-pointer"
            >
              Analyze Another Document
            </button>
            <button
              onClick={handleImportToEditor}
              disabled={importing}
              className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {importing ? 'Importing...' : 'Open in Document Editor'}
            </button>
          </div>
        )}
      </div>

      {/* INPUT UPLOAD SECTION (When no result yet) */}
      {!result && (
        <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputMode('UPLOAD')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  inputMode === 'UPLOAD'
                    ? 'bg-mira-light text-mira-primary border border-purple-200 shadow-2xs'
                    : 'text-mira-muted hover:text-mira-dark hover:bg-gray-50'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                Upload File (PDF / DOCX / TXT)
              </button>
              <button
                onClick={() => setInputMode('PASTE')}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  inputMode === 'PASTE'
                    ? 'bg-mira-light text-mira-primary border border-purple-200 shadow-2xs'
                    : 'text-mira-muted hover:text-mira-dark hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Paste Contract Text
              </button>
            </div>

            <button
              onClick={loadSampleContract}
              className="text-xs text-purple-700 hover:text-purple-900 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Load Sample Services Agreement
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-900 text-xs rounded-xl border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: File Upload Dropzone */}
          {inputMode === 'UPLOAD' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                file ? 'border-purple-400 bg-purple-50/30' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50/50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer space-y-3 block">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-mira-primary flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-7 h-7" />
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-mira-dark">{file.name}</p>
                    <p className="text-xs text-mira-muted">
                      {(file.size / 1024).toFixed(1)} KB • Click or drop another file to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-mira-dark">
                      Drop contract file here, or <span className="text-mira-primary underline">browse your files</span>
                    </p>
                    <p className="text-xs text-mira-muted">
                      Supports PDF, Microsoft Word (.docx), and plain text (.txt / .md) up to 30MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Tab 2: Paste Contract Text */}
          {inputMode === 'PASTE' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-mira-dark flex items-center justify-between">
                <span>Contract Text</span>
                <span className="text-[11px] font-normal text-mira-muted">
                  {pastedText.split(/\s+/).filter(Boolean).length} words
                </span>
              </label>
              <textarea
                rows={12}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full text of your agreement, NDA, service contract, or notice here..."
                className="w-full p-4 text-xs font-mono border border-gray-200 rounded-xl focus:outline-hidden focus:border-mira-primary focus:ring-1 focus:ring-mira-primary resize-y"
              />
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-6 py-3 bg-mira-primary hover:bg-mira-accent disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{analysisStep || 'Analyzing Contract...'}</span>
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Run Contract Intelligence Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RESULTS DISPLAY SECTION */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* SECTION 1: CONTRACT HEALTH & OVERVIEW CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Score Card (1 col) */}
            <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-mira-muted uppercase tracking-wider">Contract Health Score</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    result.health.status === 'STRONG'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : result.health.status === 'MODERATE'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : result.health.status === 'NEEDS_REVISION'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {result.health.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-mira-dark">{result.health.score}%</span>
                  <span className="text-xs text-mira-muted">/ 100 benchmark</span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.health.score >= 85 ? 'bg-emerald-500' :
                      result.health.score >= 70 ? 'bg-blue-500' :
                      result.health.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.health.score}%` }}
                  />
                </div>

                {/* Sub-Category Indicators */}
                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-[11px] font-medium">Clause Completeness</span>
                    <span className="font-bold text-mira-dark">{result.health.categoryScores.completeness}%</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-[11px] font-medium">Risk & Compliance</span>
                    <span className="font-bold text-mira-dark">{result.health.categoryScores.riskAndCompliance}%</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-[11px] font-medium">Factual Consistency</span>
                    <span className="font-bold text-mira-dark">{result.health.categoryScores.consistency}%</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-[11px] font-medium">Clarity & Format</span>
                    <span className="font-bold text-mira-dark">{result.health.categoryScores.clarity}%</span>
                  </div>
                </div>
              </div>

              {/* Score Deductions List */}
              {result.health.scoreBreakdown.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score Factors:</span>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                    {result.health.scoreBreakdown.map((sb, idx) => (
                      <p key={idx} className="text-[10px] text-gray-600 leading-tight">
                        • {sb}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contract Overview Cards (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-mira-dark">{result.overview.title}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    {result.overview.contractType.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-mira-muted">
                  {result.overview.wordCount} words • {result.overview.paragraphCount} sections
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Parties */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-mira-dark">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Contracting Parties</span>
                  </div>
                  {result.overview.parties.length > 0 ? (
                    <div className="space-y-1">
                      {result.overview.parties.map((p, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-semibold text-gray-800">{p.name}</span>
                          <span className="text-[10px] text-gray-500 block">Role: {p.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 italic">No formal party entities detected</p>
                  )}
                </div>

                {/* Dates & Term */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-mira-dark">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Effective Date & Duration</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Effective Date: </span>
                      <span className="font-semibold text-gray-800">{result.overview.effectiveDate || 'Not explicitly stated'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration: </span>
                      <span className="font-semibold text-gray-800">{result.overview.duration || 'Indefinite / Unspecified'}</span>
                    </div>
                  </div>
                </div>

                {/* Monetary Terms */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-mira-dark">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>Consideration / Financial Terms</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    {result.overview.monetaryTerms}
                  </p>
                </div>

                {/* Governing Law */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-mira-dark">
                    <Gavel className="w-4 h-4 text-purple-600" />
                    <span>Governing Law & Jurisdiction</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-gray-500">Law: </span>
                      <span className="font-semibold text-gray-800">{result.overview.governingLaw || 'Unspecified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Jurisdiction: </span>
                      <span className="font-semibold text-gray-800">{result.overview.jurisdiction || 'Unspecified'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CLAUSE COMPLETENESS MAP */}
          <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-mira-dark flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Clause Completeness Map
                </h2>
                <p className="text-xs text-mira-muted mt-0.5">
                  Audit of standard institutional clauses expected for {result.overview.contractType.replace(/_/g, ' ')}
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                {['ALL', 'PRESENT', 'INCOMPLETE', 'AMBIGUOUS', 'MISSING'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setClauseFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                      clauseFilter === st
                        ? 'bg-white text-mira-primary shadow-2xs font-bold'
                        : 'text-mira-muted hover:text-mira-dark'
                    }`}
                  >
                    {st === 'ALL' ? `All (${result.clauseMap.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClauses.map((clause) => {
                const isPresent = clause.status === 'PRESENT';
                const isIncomplete = clause.status === 'INCOMPLETE';
                const isAmbiguous = clause.status === 'AMBIGUOUS';
                const isMissing = clause.status === 'MISSING';

                return (
                  <div
                    key={clause.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      isPresent
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isIncomplete
                        ? 'bg-amber-50/40 border-amber-200'
                        : isAmbiguous
                        ? 'bg-purple-50/40 border-purple-200'
                        : 'bg-red-50/40 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-mira-dark truncate">{clause.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1 ${
                        isPresent
                          ? 'bg-emerald-100 text-emerald-800'
                          : isIncomplete
                          ? 'bg-amber-100 text-amber-800'
                          : isAmbiguous
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isPresent && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {isIncomplete && <AlertTriangle className="w-2.5 h-2.5" />}
                        {isAmbiguous && <HelpCircle className="w-2.5 h-2.5" />}
                        {isMissing && <XCircle className="w-2.5 h-2.5" />}
                        {clause.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      {clause.explanation}
                    </p>

                    {clause.detectedSnippet && (
                      <div className="p-2 rounded bg-white/80 border border-black/5 font-serif text-[10px] text-gray-700 line-clamp-2">
                        "{clause.detectedSnippet}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: RISK & ATTENTION AREAS */}
          <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-mira-dark flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Risk & Attention Areas ({result.riskAreas.length} Flagged)
                </h2>
                <p className="text-xs text-mira-muted mt-0.5">
                  Factual, structural, and liability vulnerabilities identified in the contract text
                </p>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setRiskFilter(sev)}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                      riskFilter === sev
                        ? 'bg-white text-mira-primary shadow-2xs font-bold'
                        : 'text-mira-muted hover:text-mira-dark'
                    }`}
                  >
                    {sev === 'ALL' ? `All (${result.riskAreas.length})` : sev}
                  </button>
                ))}
              </div>
            </div>

            {filteredRisks.length === 0 ? (
              <div className="p-6 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold">No Risk Flags in this Category</p>
                <p className="text-[11px] text-emerald-700">Contract text satisfies verified institutional standards.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRisks.map((risk) => {
                  const isCrit = risk.severity === 'CRITICAL';
                  const isHigh = risk.severity === 'HIGH';
                  const isMed = risk.severity === 'MEDIUM';

                  return (
                    <div
                      key={risk.id}
                      className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                        isCrit || isHigh
                          ? 'bg-red-50/50 border-red-200'
                          : isMed
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-blue-50/50 border-blue-200'
                      }`}
                    >
                      {/* Flag Header */}
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🚩</span>
                          <span className="text-sm font-bold text-gray-900">{risk.title}</span>
                          <span className="text-[10px] text-gray-500 font-normal">({risk.clause})</span>
                        </div>
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          isCrit || isHigh
                            ? 'bg-red-200 text-red-950 border border-red-300'
                            : isMed
                            ? 'bg-amber-200 text-amber-950 border border-amber-300'
                            : 'bg-blue-200 text-blue-950 border border-blue-300'
                        }`}>
                          {risk.severity} FLAG
                        </span>
                      </div>

                      {/* Flaw Identified */}
                      <div className="p-2.5 bg-white/90 rounded-lg border border-black/5 space-y-1">
                        <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">
                          🔍 Flaw Identified:
                        </span>
                        <p className="text-xs text-gray-800 leading-relaxed font-medium">
                          {risk.description}
                        </p>
                      </div>

                      {/* Quoted Evidence */}
                      {risk.evidence && (
                        <div className="p-2.5 rounded-lg bg-white border border-black/5 font-mono text-[11px] text-gray-700 space-y-1">
                          <span className="font-sans font-bold text-gray-500 text-[10px] uppercase block">
                            📝 Quoted Contract Evidence:
                          </span>
                          <div className="bg-gray-50 p-2 rounded border border-gray-100 italic">
                            "{risk.evidence}"
                          </div>
                        </div>
                      )}

                      {/* Rationale and Fix Suggestion */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-white/80 border border-black/5 space-y-1">
                          <span className="font-bold text-gray-700 uppercase text-[10px] flex items-center gap-1">
                            ⚖️ Legal Risk & Rationale:
                          </span>
                          <p className="text-gray-600 leading-relaxed">{risk.legalRationale}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-900 uppercase text-[10px] flex items-center gap-1">
                            💡 How to Fix (Actionable Suggestion):
                          </span>
                          <p className="text-emerald-950 leading-relaxed font-medium">{risk.suggestedResolution}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: FACTUAL CONSISTENCY */}
          <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-3">
            <h2 className="text-base font-bold text-mira-dark flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              Internal Factual Consistency
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5">
                {result.consistency.partiesMatch ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs text-mira-dark block">Party Name Alignment</span>
                  <span className="text-[11px] text-gray-500">
                    {result.consistency.partiesMatch ? 'Preamble matches signatures' : 'Discrepancy detected'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5">
                {result.consistency.dateChronologyValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs text-mira-dark block">Chronological Sequence</span>
                  <span className="text-[11px] text-gray-500">
                    {result.consistency.dateChronologyValid ? 'Timeline order is valid' : 'Timeline contradiction'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5">
                {result.consistency.definedTermsConsistent ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs text-mira-dark block">Defined Terms Usage</span>
                  <span className="text-[11px] text-gray-500">
                    {result.consistency.definedTermsConsistent ? 'Consistent term invocation' : 'Unused or vague terms'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              {result.consistency.findings.map((f, idx) => (
                <p key={idx} className="text-xs text-gray-700 leading-snug">
                  • {f}
                </p>
              ))}
            </div>

            <p className="text-[10px] text-mira-muted italic pt-2 border-t">
              {result.health.disclaimer}
            </p>
          </div>

          {/* SECTION 5: HOW TO MAKE THIS CONTRACT PERFECT */}
          <div className="bg-white rounded-2xl border border-mira-border shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-mira-dark flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  How to Make This Contract Perfect
                </h2>
                <p className="text-xs text-mira-muted mt-0.5">
                  Institutional legal drafting standards & actionable checklist to elevate this contract to 95%+ Health
                </p>
              </div>

              <button
                onClick={handleImportToEditor}
                disabled={importing}
                className="px-4 py-2 bg-mira-primary hover:bg-mira-accent text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {importing ? 'Importing...' : 'Open in Editor & Apply Fixes'}
              </button>
            </div>

            {/* Contract Health & Perfection Status */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    Current Contract Health: {result.health.score}%
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    result.health.score >= 85 ? 'bg-emerald-100 text-emerald-800' :
                    result.health.score >= 70 ? 'bg-blue-100 text-blue-800' :
                    result.health.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.health.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-purple-800">
                  {result.health.score >= 90
                    ? 'This contract has strong foundational protections. Review the checklist below to achieve institutional perfection.'
                    : result.health.score >= 70
                    ? 'Standard draft with notable risk exposure. Implementing the 6 priority fixes below will elevate this document to 95%+.'
                    : 'Critical vulnerabilities detected. This document requires essential terms, liability caps, and party alignment before signing.'}
                </p>
              </div>

              <div className="flex-shrink-0 text-center sm:text-right">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Flagged Vulnerabilities</span>
                <span className="text-2xl font-black text-gray-900">{result.riskAreas.length} Areas</span>
              </div>
            </div>

            {/* Top Priority Action Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                6 Priority Steps to Make This Contract Perfect:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">1</span>
                    <span className="font-bold text-xs text-gray-900">Cap Total Financial Liability</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Add a mutual aggregate liability cap limiting total damages to the fees paid under the agreement in the prior 12 months. Include an express waiver of consequential, indirect, and punitive damages.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">2</span>
                    <span className="font-bold text-xs text-gray-900">Unambiguous Intellectual Property Assignment</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Ensure present-tense assignment ("hereby assigns all right, title, and interest in deliverables") while expressly reserving pre-existing background IP and developer toolkits.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">3</span>
                    <span className="font-bold text-xs text-gray-900">Establish Notice & Cure Mechanisms</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Replace unilateral or immediate termination traps with a reasonable notice period (30 days for convenience) and a mandatory written notice and 15-day cure period for material default.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">4</span>
                    <span className="font-bold text-xs text-gray-900">Incorporate 4 Statutory Confidentiality Exceptions</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Confidentiality covenants must expressly exclude public domain information, prior knowledge, independent creation, and lawful third-party disclosures, plus prompt notice for legal process.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">5</span>
                    <span className="font-bold text-xs text-gray-900">Define Governing Law & Exclusive Jurisdiction</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Designate an explicit, single governing jurisdiction (e.g., State of Delaware, California, or Karnataka) and nominate exclusive court forum or binding institutional arbitration to prevent multi-venue litigation.
                  </p>
                </div>

                {/* Step 6 */}
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">6</span>
                    <span className="font-bold text-xs text-gray-900">Verify Party Alignment & Authorized Signatures</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed pl-7">
                    Ensure corporate entity names in the preamble match signature lines word-for-word, accompanied by authorized corporate officer titles (e.g., Director, VP, CEO) and execution dates.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Link to Editor */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-950">Ready to Perfect This Contract?</span>
                <p className="text-[11px] text-purple-800">
                  Open this document in our Document Editor to use 1-Click Quick Fix, resolve placeholders, or insert canonical clauses from the Clause Library.
                </p>
              </div>
              <button
                onClick={handleImportToEditor}
                disabled={importing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Open in Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
