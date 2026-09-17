import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { documentService } from '../services/api';
import { DocumentRecord, ValidationIssue, DocumentDiffResult } from '../types';
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
  Layers,
  ArrowLeft,
  Check,
  Send,
  Edit3,
  Scale,
  Eye,
  X,
  XCircle,
  CheckSquare,
  Search,
  RotateCcw,
  Zap,
  PlusCircle,
  Bold,
  Italic,
  List,
  Minus,
  ChevronDown,
  Tag,
  Award,
  BookOpen,
  Lightbulb
} from 'lucide-react';

const CLAUSE_LIBRARY: { title: string; category: string; text: string }[] = [
  {
    title: 'Confidentiality Obligations',
    category: 'Core Covenants',
    text: `## CONFIDENTIALITY OBLIGATIONS\n\nThe Receiving Party agrees to maintain all Confidential Information in strict confidence and shall exercise at least the same degree of care to protect the secrecy of the Confidential Information as it uses to protect its own confidential information of like nature, but in no event less than a reasonable degree of care. The Receiving Party shall not, without the prior express written consent of the Disclosing Party, disclose, publish, or disseminate any Confidential Information to any third party, nor use the Confidential Information for any purpose other than the authorized Purpose.`
  },
  {
    title: 'Exclusions from Confidentiality (4 Standard Exceptions)',
    category: 'Core Covenants',
    text: `## EXCLUSIONS FROM CONFIDENTIALITY\n\nThe obligations of confidentiality and non-use set forth herein shall not apply to any information that the Receiving Party can establish by documentary evidence: (a) is or becomes publicly available through no breach or fault of the Receiving Party; (b) was already in the rightful possession of the Receiving Party prior to disclosure; (c) is independently developed by the Receiving Party without reference to or reliance upon any Confidential Information; or (d) is rightfully received from an independent third party having no confidentiality duty to the Disclosing Party.`
  },
  {
    title: 'Permitted Disclosures & Compelled Process',
    category: 'Core Covenants',
    text: `## PERMITTED DISCLOSURES AND COMPELLED PROCESS\n\nThe Receiving Party may disclose Confidential Information solely to its directors, officers, employees, and professional advisors who have a need to know for the authorized Purpose and who are bound by written non-disclosure obligations no less restrictive than those contained herein. If legally compelled by a court or governmental body to disclose Confidential Information, the Receiving Party shall provide prompt written notice to allow the Disclosing Party a reasonable opportunity to seek a protective order.`
  },
  {
    title: 'Limitation of Liability & Consequential Damages Waiver',
    category: 'Risk Allocation',
    text: `## LIMITATION OF LIABILITY\n\nTo the maximum extent permitted by applicable law: (a) neither party's total aggregate liability arising out of or related to this Agreement, whether in contract, tort (including negligence), statutory breach, or otherwise, shall exceed the total amounts paid or payable by either party under this Agreement during the twelve (12) months preceding the event giving rise to liability; and (b) in no event shall either party be liable to the other for any indirect, incidental, consequential, special, reliance, or punitive damages, including loss of profits, data, or business opportunities.`
  },
  {
    title: 'Intellectual Property Rights & Work Product Assignment',
    category: 'IP & Ownership',
    text: `## INTELLECTUAL PROPERTY RIGHTS & WORK PRODUCT\n\n(a) Work Product Ownership: All deliverables, software, documentation, reports, inventions, and work product developed or produced under this Agreement shall belong solely and exclusively to the Client/Company from the moment of creation.\n(b) Assignment: To the extent any rights in such work product do not vest automatically, the Service Provider hereby irrevocably transfers and assigns all worldwide right, title, and interest (including copyrights, patent rights, and trade secrets) to the Client/Company.\n(c) Pre-Existing IP: Each party retains sole ownership of its respective background intellectual property developed prior to or independently of this Agreement.`
  },
  {
    title: 'Term, Mutual Termination & Survival',
    category: 'Term & Termination',
    text: `## TERM AND TERMINATION\n\n(a) Term: This Agreement shall remain in full force and effect for a period of three (3) years from the Effective Date.\n(b) Termination for Convenience: Either party may terminate this Agreement without cause upon providing at least thirty (30) days prior written notice to the other party.\n(c) Termination for Material Breach: Either party may terminate immediately upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within fifteen (15) days of receiving written notice thereof.\n(d) Survival: Obligations of confidentiality shall survive termination for three (3) years; trade secret obligations shall survive indefinitely.`
  },
  {
    title: 'Return or Destruction of Materials',
    category: 'Covenants',
    text: `## RETURN OR DESTRUCTION OF MATERIALS\n\nUpon written request by the Disclosing Party, or upon expiration or termination of this Agreement, the Receiving Party shall promptly, and in any event within seven (7) business days, return or securely destroy all tangible and electronic materials containing Confidential Information, and provide written certification of compliance signed by an authorized corporate officer.`
  },
  {
    title: 'Non-Solicitation of Personnel (12 Months)',
    category: 'Restrictive Covenants',
    text: `## NON-SOLICITATION OF PERSONNEL\n\nDuring the term of this Agreement and for a period of twelve (12) months following any expiration or termination, neither party shall directly or indirectly solicit, recruit, or attempt to hire any employee, officer, or contractor of the other party who was introduced or with whom the party interacted pursuant to this Agreement, without prior written consent.`
  },
  {
    title: 'Governing Law & Dispute Resolution',
    category: 'Boilerplate',
    text: `## GOVERNING LAW AND DISPUTE RESOLUTION\n\nThis Agreement shall be governed by, construed, and enforced in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. The competent state and federal courts located in Delaware shall have sole and exclusive jurisdiction over any disputes arising out of or relating to this Agreement.`
  },
  {
    title: 'Severability, Counterparts & Entire Agreement',
    category: 'Boilerplate',
    text: `## MISCELLANEOUS PROVISIONS\n\n(a) Entire Agreement: This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements.\n(b) Amendments: No amendment shall be effective unless executed in writing by both Parties.\n(c) Severability: If any provision is held invalid or unenforceable, the remainder of the Agreement shall remain in full force and effect.\n(d) Counterparts: This Agreement may be executed in counterparts, each of which shall be deemed an original.`
  },
  {
    title: 'Formal Execution & Signature Block',
    category: 'Execution',
    text: `## EXECUTION & SIGNATURES\n\nIN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be executed by their respective duly authorized officers as of the Effective Date.\n\n| Disclosing Party | Receiving Party |\n| :--- | :--- |\n| By: ___________________________ | By: ___________________________ |\n| Name: Authorized Representative | Name: Authorized Representative |\n| Title: Executive Officer | Title: Executive Officer |\n| Date: _________________________ | Date: _________________________ |`
  }
];

export const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'VALIDATION' | 'COMPLETENESS' | 'PERFECTION_GUIDE'>('VALIDATION');
  const [issueFilter, setIssueFilter] = useState<'ACTIVE' | 'RESOLVED' | 'ALL'>('ACTIVE');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  // Fix Action States
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [batchFixing, setBatchFixing] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Search & Replace state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Clause Library menu
  const [showClauseMenu, setShowClauseMenu] = useState(false);

  // Placeholder Resolver Modal state
  const [placeholderModal, setPlaceholderModal] = useState<{
    isOpen: boolean;
    placeholder: string;
    issueId?: string;
    targetSection?: string;
    replacementValue: string;
  }>({
    isOpen: false,
    placeholder: '',
    replacementValue: ''
  });

  // Diff Modal state
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffResult, setDiffResult] = useState<DocumentDiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffLabels, setDiffLabels] = useState({ original: '', modified: '' });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Editor feedback & selection state
  const [selectedText, setSelectedText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Keyboard shortcut Ctrl+F / Cmd+F to open Search & Replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleOpenDiff = async () => {
    if (!id) return;
    setDiffLoading(true);
    setShowDiffModal(true);
    try {
      const res = await documentService.getDiff(id);
      setDiffResult(res.diff);
      setDiffLabels(res.comparedVersions || { original: 'Initial Draft (v1)', modified: 'Current Draft' });
    } catch (err: any) {
      alert(`Failed to load version diff: ${err.message}`);
      setShowDiffModal(false);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleReviewIssue = async (issueId: string, status: 'ACCEPTED' | 'DISMISSED' | 'NEEDS_REVIEW') => {
    if (!id || !document) return;
    try {
      const res = await documentService.reviewIssue(id, issueId, status);
      setDocument(res.document);
      setSaveSuccessMsg(`✓ Flag marked as ${status.replace(/_/g, ' ')}`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
    }
  };

  // 1-Click Quick Fix for any issue
  const handleApplyQuickFix = async (issue: ValidationIssue) => {
    if (!id || !document) return;
    const issueId = issue.id || issue.issueId;
    if (!issueId) return;

    setFixingIssueId(issueId);
    try {
      // Pass current editor content so patch applies to live draft
      const res = await documentService.applyIssuePatch(id, issueId, { content });
      if (res && res.document) {
        setDocument(res.document);
        setContent(res.document.content);

        // Mark as ACCEPTED so it clears from active view
        try {
          await documentService.reviewIssue(id, issueId, 'ACCEPTED');
        } catch (revErr) {
          console.warn('Auto-review issue after patch failed:', revErr);
        }

        // Re-validate to refresh validation score and active issues
        try {
          const valRes = await documentService.validate(id);
          if (valRes && valRes.document) {
            setDocument(valRes.document);
          }
        } catch (vErr) {
          console.warn('Revalidation after patch failed:', vErr);
        }

        setSaveSuccessMsg(`⚡ Successfully resolved: ${issue.title || issue.section}`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else if (res && !res.success) {
        alert(res.message || 'This issue requires manual drafting directly in the editor.');
      }
    } catch (err: any) {
      alert(`Quick Fix failed: ${err.message}`);
    } finally {
      setFixingIssueId(null);
    }
  };

  // Batch Auto-Fix all safe issues
  const handleBatchFixSafe = async () => {
    if (!id || !document) return;
    setBatchFixing(true);
    try {
      const res = await documentService.fixAllSafe(id, { content });
      if (res && res.document) {
        setDocument(res.document);
        setContent(res.document.content);

        // Re-validate to refresh validation score
        try {
          const valRes = await documentService.validate(id);
          if (valRes && valRes.document) {
            setDocument(valRes.document);
          }
        } catch (vErr) {
          console.warn('Revalidation after batch fix failed:', vErr);
        }

        setSaveSuccessMsg(`⚡ Auto-fixed ${res.appliedCount} safe issue${res.appliedCount === 1 ? '' : 's'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(`Batch Auto-Fix failed: ${err.message}`);
    } finally {
      setBatchFixing(false);
    }
  };

  // Interactive Placeholder Resolver: replaces tokens, persists changes, and refreshes validation
  const handleResolvePlaceholder = async () => {
    if (!id || !document || !placeholderModal.replacementValue) return;
    const targetToken = placeholderModal.placeholder;
    const val = placeholderModal.replacementValue;
    const updatedContent = content.split(targetToken).join(val);
    setContent(updatedContent);
    setPlaceholderModal(prev => ({ ...prev, isOpen: false }));

    try {
      // 1. Persist updated content
      const updatedDoc = await documentService.update(id, { content: updatedContent });
      if (updatedDoc) {
        setDocument(updatedDoc);
      }

      // 2. Mark the placeholder issue as ACCEPTED
      if (placeholderModal.issueId) {
        await documentService.reviewIssue(id, placeholderModal.issueId, 'ACCEPTED');
      }

      // 3. Re-run validation so the placeholder issue is completely cleared
      const valRes = await documentService.validate(id);
      if (valRes && valRes.document) {
        setDocument(valRes.document);
      }

      setSaveSuccessMsg(`✓ Replaced all "${targetToken}" with "${val}" and cleared flag`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error resolving placeholder:', err);
      setSaveSuccessMsg(`✓ Replaced in editor ("${targetToken}" → "${val}")`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    }
  };

  // 1-Click Undo last fix
  const handleUndoLastFix = async () => {
    if (!id || !document) return;
    setUndoing(true);
    try {
      const res = await documentService.undoLastFix(id);
      if (res && res.document) {
        setDocument(res.document);
        setContent(res.document.content);
        setSaveSuccessMsg(`⤾ ${res.message || 'Reverted to previous version'}`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(`Undo failed: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  };

  // Insert standard canonical clause at cursor
  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;

    const before = current.substring(0, start);
    const after = current.substring(end);
    
    const needsPrefixNewline = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const needsSuffixNewline = after.length > 0 && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
    
    const newContent = `${before}${needsPrefixNewline}${textToInsert}${needsSuffixNewline}${after}`;
    setContent(newContent);

    setTimeout(() => {
      el.focus();
      const newCursorPos = start + needsPrefixNewline.length + textToInsert.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
      const linesBefore = newContent.substring(0, newCursorPos).split('\n').length;
      el.scrollTop = Math.max(0, (linesBefore - 3) * 24);
    }, 50);

    setSaveSuccessMsg('✓ Clause inserted into document');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Formatting helpers (bold, italic, list, divider)
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = el.value;

    const selected = current.substring(start, end);
    let newContent = '';
    let newStart = start;
    let newEnd = end;

    if (selected) {
      newContent = current.substring(0, start) + prefix + selected + suffix + current.substring(end);
      newStart = start;
      newEnd = end + prefix.length + suffix.length;
    } else {
      const placeholder = prefix === '## ' ? 'Section Title\n' : (prefix === '- ' ? 'List item\n' : 'text');
      newContent = current.substring(0, start) + prefix + placeholder + suffix + current.substring(end);
      newStart = start + prefix.length;
      newEnd = newStart + placeholder.length;
    }

    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    }, 50);
  };

  // Search & Replace logic
  const handleFind = (direction: 'next' | 'prev' = 'next') => {
    if (!searchQuery || !textareaRef.current) return;
    const el = textareaRef.current;
    const text = el.value;
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    const sourceText = matchCase ? text : text.toLowerCase();

    const indices: number[] = [];
    let pos = 0;
    while ((pos = sourceText.indexOf(query, pos)) !== -1) {
      indices.push(pos);
      pos += query.length;
    }

    if (indices.length === 0) {
      setTotalMatches(0);
      setCurrentMatchIdx(0);
      return;
    }

    setTotalMatches(indices.length);

    let targetIdx = 0;
    const currentCursor = el.selectionStart;

    if (direction === 'next') {
      const found = indices.findIndex(idx => idx > currentCursor);
      targetIdx = found !== -1 ? found : 0;
    } else {
      const found = [...indices].reverse().findIndex(idx => idx < currentCursor);
      targetIdx = found !== -1 ? indices.length - 1 - found : indices.length - 1;
    }

    setCurrentMatchIdx(targetIdx + 1);
    const startPos = indices[targetIdx];
    const endPos = startPos + query.length;

    el.focus();
    el.setSelectionRange(startPos, endPos);
    const linesBefore = text.substring(0, startPos).split('\n').length;
    el.scrollTop = Math.max(0, (linesBefore - 4) * 24);
  };

  const handleReplaceCurrent = () => {
    if (!searchQuery || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end);

    const matches = matchCase 
      ? selected === searchQuery 
      : selected.toLowerCase() === searchQuery.toLowerCase();

    if (matches) {
      const updated = content.substring(0, start) + replaceQuery + content.substring(end);
      setContent(updated);
      setTimeout(() => {
        handleFind('next');
      }, 50);
    } else {
      handleFind('next');
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const count = (content.match(regex) || []).length;
    if (count === 0) return;

    const updated = content.replace(regex, replaceQuery);
    setContent(updated);
    setTotalMatches(0);
    setCurrentMatchIdx(0);
    setSaveSuccessMsg(`✓ Replaced ${count} occurrences of "${searchQuery}"`);
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  if (!document) {
    return <div className="p-12 text-center text-xs text-mira-muted">Loading document editor...</div>;
  }

  // Parse sections for outline
  const sections = content.split('---').map((block, idx) => {
    const lines = block.trim().split('\n');
    const headerLine = lines.find(l => l.startsWith('## ') || l.startsWith('# '));
    const title = headerLine ? headerLine.replace(/#+\s*/, '') : `Section ${idx + 1}`;
    
    // Check if active issues exist in this section
    const hasIssues = (document.validationSummary?.issues || []).some(
      (iss: ValidationIssue) => (!iss.reviewStatus || iss.reviewStatus === 'NEEDS_REVIEW') &&
        (title.toLowerCase().includes(iss.section.toLowerCase()) || iss.section.toLowerCase().includes(title.toLowerCase()))
    );

    return { id: idx, title, content: block.trim(), hasIssues };
  });

  const allIssues: ValidationIssue[] = document.validationSummary?.issues || [];
  const activeIssues = allIssues.filter(
    (i: ValidationIssue) => !i.reviewStatus || i.reviewStatus === 'NEEDS_REVIEW'
  );
  const resolvedIssues = allIssues.filter(
    (i: ValidationIssue) => i.reviewStatus === 'ACCEPTED' || i.reviewStatus === 'DISMISSED'
  );

  const displayedIssues = issueFilter === 'ACTIVE' 
    ? activeIssues 
    : issueFilter === 'RESOLVED' 
    ? resolvedIssues 
    : allIssues;

  const validationScore = document.validationScore || 0;

  const safeFixableCount = activeIssues.filter((i: ValidationIssue) => 
    (i.canAutoFix || 
     i.mode === 'SAFE_AUTO' || 
     i.type === 'UNRESOLVED_PLACEHOLDER' ||
     i.type === 'MISSING_NOTICE_PERIOD' ||
     i.type === 'MISSING_SIGNATURE_BLOCK' ||
     i.type === 'UNCAPPED_LIABILITY' ||
     i.type === 'ONE_SIDED_TERMINATION' ||
     i.type === 'MISSING_IP_ASSIGNMENT') &&
    i.type !== 'MISSING_PAYMENT_AMOUNT' &&
    i.type !== 'CONFLICTING_TERMS'
  ).length;

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
            disabled={undoing}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-amber-400 hover:bg-amber-50/40 text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Undo last applied legal patch and revert to previous revision"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-600 ${undoing ? 'animate-spin' : ''}`} />
            {undoing ? 'Reverting...' : 'Undo Fix'}
          </button>

          <button
            onClick={handleOpenDiff}
            className="px-3 py-1.5 bg-white border border-mira-border hover:border-mira-primary text-xs font-semibold rounded-lg text-mira-dark flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Compare current draft against initial version or previous revisions"
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            Version Diff
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

        {/* PANEL 2: Editable Document & Professional Drafting Toolbar (Center, 6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-mira-border shadow-xs flex flex-col min-h-[75vh]">
          {/* Top Bar */}
          <div className="px-5 py-2.5 border-b border-mira-border bg-gray-50/50 flex items-center justify-between text-xs text-mira-muted">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-700">Legal Document Editor</span>
            </div>
            <span className="text-[11px] font-medium text-purple-700">AI never prevents manual editing</span>
          </div>

          {/* Professional Drafting Toolbar */}
          <div className="px-4 py-2 border-b border-mira-border bg-gray-50/80 flex items-center justify-between gap-2 flex-wrap">
            {/* Formatting Tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => insertFormatting('## ', '\n')}
                className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded text-xs font-bold shadow-2xs cursor-pointer"
                title="Heading 2 (## Section Title)"
              >
                H2
              </button>
              <button
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs cursor-pointer"
                title="Bold (**text**)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs cursor-pointer"
                title="Italic (*text*)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('- ', '\n')}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs cursor-pointer"
                title="Bullet List (- item)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('\n\n---\n\n')}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded shadow-2xs cursor-pointer"
                title="Section Divider (---)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              {/* Search & Replace Toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors border cursor-pointer ${
                  showSearch 
                    ? 'bg-purple-100 border-purple-300 text-purple-800' 
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title="Toggle Search & Replace (Ctrl+F)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Find & Replace</span>
              </button>
            </div>

            {/* Insert Approved Standard Clause Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowClauseMenu(!showClauseMenu)}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-mira-primary" />
                <span>+ Insert Standard Clause</span>
                <ChevronDown className="w-3 h-3 text-purple-600" />
              </button>

              {showClauseMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setShowClauseMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-84 bg-white rounded-xl shadow-xl border border-gray-200 z-30 py-1 text-xs max-h-80 overflow-y-auto animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 flex items-center justify-between">
                      <span>Approved Standard Legal Clauses</span>
                      <button onClick={() => setShowClauseMenu(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {CLAUSE_LIBRARY.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          insertTextAtCursor(c.text);
                          setShowClauseMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-50 flex items-start justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-gray-900 text-xs">{c.title}</div>
                          <div className="text-[10px] text-gray-500 line-clamp-1">{c.text.replace(/#+\s*/g, '').slice(0, 65)}...</div>
                        </div>
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                          {c.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search & Replace Active Bar */}
          {showSearch && (
            <div className="px-4 py-2.5 bg-purple-50/60 border-b border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFind(e.shiftKey ? 'prev' : 'next');
                    }}
                    placeholder="Find text in document..."
                    className="w-full pl-7 pr-3 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-hidden focus:border-purple-500"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
                </div>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Replace with..."
                    className="w-full px-3 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-0"
                  />
                  <span>Aa</span>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                {totalMatches > 0 && (
                  <span className="text-[11px] text-purple-700 font-mono font-medium px-2 py-0.5 bg-purple-100 rounded">
                    {currentMatchIdx}/{totalMatches}
                  </span>
                )}
                <button
                  onClick={() => handleFind('prev')}
                  className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-semibold cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => handleFind('next')}
                  className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-xs font-semibold cursor-pointer"
                >
                  Next
                </button>
                <button
                  onClick={handleReplaceCurrent}
                  disabled={!searchQuery}
                  className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Replace
                </button>
                <button
                  onClick={handleReplaceAll}
                  disabled={!searchQuery}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Replace All
                </button>
                <button
                  onClick={() => setShowSearch(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Textarea Editor */}
          <div className="p-5 flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={(e: any) => {
                const sel = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                if (sel) setSelectedText(sel);
              }}
              className="w-full flex-1 min-h-[64vh] p-4 font-serif text-sm leading-relaxed text-mira-dark bg-transparent border-0 focus:outline-hidden resize-none selection:bg-purple-100"
              placeholder="Legal document text..."
            />
          </div>

          {/* Live Document Metrics Bar */}
          <div className="px-5 py-2.5 border-t border-mira-border bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Words: <strong className="text-gray-700 font-mono">{content.trim().split(/\s+/).filter(Boolean).length}</strong></span>
              <span>Characters: <strong className="text-gray-700 font-mono">{content.length}</strong></span>
              <span>Sections: <strong className="text-gray-700 font-mono">{sections.length}</strong></span>
              <span>Reading Time: <strong className="text-gray-700 font-mono">~{Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200))} min</strong></span>
              {selectedText && (
                <span className="text-purple-700 font-medium">Selected: <strong className="font-mono">{selectedText.length}</strong> chars</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${validationScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-medium text-gray-700">Health: {validationScore}%</span>
            </div>
          </div>
        </div>

        {/* PANEL 3: Validation & Perfection Guide Panel (Right, 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-mira-border shadow-xs p-4 space-y-4 sticky top-20">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('VALIDATION')}
              className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'VALIDATION' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted'
              }`}
            >
              Flags ({validationScore}%)
            </button>
            <button
              onClick={() => setActiveTab('COMPLETENESS')}
              className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'COMPLETENESS' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted'
              }`}
            >
              Checklist
            </button>
            <button
              onClick={() => setActiveTab('PERFECTION_GUIDE')}
              className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'PERFECTION_GUIDE' ? 'bg-white text-mira-primary shadow-2xs font-bold' : 'text-mira-muted'
              }`}
            >
              Perfection Guide
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

              {/* Auto-Fix All Safe Issues Banner */}
              {safeFixableCount > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Zap className="w-4 h-4 text-emerald-700 fill-emerald-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        {safeFixableCount} Safe Fix{safeFixableCount === 1 ? '' : 'es'} Ready
                      </div>
                      <div className="text-[10px] text-emerald-800">
                        Deterministic legal patches with safety guarantees
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleBatchFixSafe}
                    disabled={batchFixing}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    {batchFixing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    )}
                    {batchFixing ? 'Fixing...' : `Fix All (${safeFixableCount})`}
                  </button>
                </div>
              )}

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
                    <span>NLP Semantic Consistency</span>
                    <span className="font-bold text-mira-dark">{document.validationSummary?.layerScores?.semanticConsistency || 90}%</span>
                  </div>
                </div>
              </div>

              {/* Technical Semantic Status */}
              {document.validationSummary?.semanticStatus && (
                <div className={`p-2.5 rounded-lg text-xs border flex items-center justify-between ${
                  document.validationSummary.semanticStatus.available
                    ? 'bg-emerald-50/50 text-emerald-900 border-emerald-200'
                    : 'bg-purple-50/50 text-purple-900 border-purple-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      document.validationSummary.semanticStatus.available ? 'bg-emerald-500' : 'bg-purple-600'
                    }`} />
                    <span className="text-[11px] leading-tight font-medium">
                      {document.validationSummary.semanticStatus.available
                        ? (document.validationSummary.semanticStatus.message || 'Semantic analysis verified via Legal NLP service.')
                        : (document.validationSummary.semanticStatus.message?.includes('unavailable') 
                            ? 'Autonomous Legal Engine: Deterministic validation active.' 
                            : (document.validationSummary.semanticStatus.message || 'Autonomous Legal Engine active.'))}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                    {document.validationSummary.semanticStatus.available ? 'NLP Active' : 'Autonomous'}
                  </span>
                </div>
              )}

              {/* Detected Issues Header & Filter Tabs */}
              <div className="space-y-2.5">
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-mira-dark">
                      Document Compliance Flags:
                    </span>
                    <span className="text-[10px] text-mira-muted font-medium">
                      {activeIssues.length} active • {resolvedIssues.length} resolved
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setIssueFilter('ACTIVE')}
                      className={`flex-1 py-1 rounded-md transition-all text-center text-[11px] cursor-pointer ${
                        issueFilter === 'ACTIVE'
                          ? 'bg-white text-purple-700 shadow-2xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Active Flags ({activeIssues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueFilter('RESOLVED')}
                      className={`flex-1 py-1 rounded-md transition-all text-center text-[11px] cursor-pointer ${
                        issueFilter === 'RESOLVED'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Resolved ({resolvedIssues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueFilter('ALL')}
                      className={`flex-1 py-1 rounded-md transition-all text-center text-[11px] cursor-pointer ${
                        issueFilter === 'ALL'
                          ? 'bg-white text-gray-900 shadow-2xs font-bold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      All ({allIssues.length})
                    </button>
                  </div>
                </div>

                {displayedIssues.length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200 text-center space-y-1">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="font-bold">
                      {issueFilter === 'ACTIVE'
                        ? '🎉 All Compliance Flags Resolved!'
                        : issueFilter === 'RESOLVED'
                        ? 'No Resolved Flags Yet'
                        : 'No Flags Found in Document'}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      {issueFilter === 'ACTIVE'
                        ? resolvedIssues.length > 0 
                          ? `All ${resolvedIssues.length} flags have been resolved or dismissed. Click "Resolved" tab above to review.`
                          : 'No fact mismatches, structural anomalies, or missing clauses found.'
                        : issueFilter === 'RESOLVED'
                        ? 'Review active flags and accept, quick-fix, or dismiss them to see them here.'
                        : 'Contract satisfies verified institutional drafting standards.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {displayedIssues.map((issue: ValidationIssue, idx: number) => {
                      const isHigh = issue.severity === 'HIGH';
                      const isMed = issue.severity === 'MEDIUM';
                      const issueKey = issue.id || issue.issueId || `iss_${idx}`;
                      const isResolved = issue.reviewStatus === 'ACCEPTED' || issue.reviewStatus === 'DISMISSED';

                      const isAutoFixable = Boolean(
                        issue.canAutoFix || 
                        issue.mode === 'SAFE_AUTO' || 
                        issue.type === 'UNRESOLVED_PLACEHOLDER' || 
                        issue.type === 'MISSING_NOTICE_PERIOD' || 
                        issue.type === 'MISSING_SIGNATURE_BLOCK' || 
                        issue.type === 'UNCAPPED_LIABILITY' || 
                        issue.type === 'UNLIMITED_LIABILITY' ||
                        issue.type === 'ONE_SIDED_TERMINATION' || 
                        issue.type === 'MISSING_IP_ASSIGNMENT'
                      ) && issue.type !== 'MISSING_PAYMENT_AMOUNT' && issue.type !== 'CONFLICTING_TERMS';

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                            isResolved
                              ? 'bg-gray-50/80 border-gray-200 text-gray-800 opacity-90'
                              : isHigh
                              ? 'bg-red-50/70 border-red-200 text-red-950'
                              : isMed
                              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                              : 'bg-blue-50/70 border-blue-200 text-blue-950'
                          }`}
                        >
                          {/* If Resolved, show green badge banner */}
                          {isResolved && (
                            <div className="flex items-center justify-between bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300 text-[11px] text-emerald-950 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                Resolved ({issue.reviewStatus})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleReviewIssue(issueKey, 'NEEDS_REVIEW')}
                                className="text-[10px] text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
                                title="Re-open this flag as active"
                              >
                                ↺ Re-open
                              </button>
                            </div>
                          )}

                          {/* Flag Header: Section + Severity Badge */}
                          <div className="flex items-center justify-between font-bold text-[12px] border-b pb-1.5 border-black/10">
                            <div className="flex items-center gap-1.5 truncate">
                              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                                isResolved ? 'text-gray-400' : isHigh ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-blue-600'
                              }`} />
                              <span className="truncate">{issue.title || issue.section}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isResolved
                                ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                : isHigh
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

                          {/* 1-CLICK QUICK FIX BUTTON (Only for active auto-fixable issues) */}
                          {isAutoFixable && !isResolved && (
                            <div className="pt-0.5">
                              <button
                                onClick={() => {
                                  if (issue.type === 'UNRESOLVED_PLACEHOLDER') {
                                    setPlaceholderModal({
                                      isOpen: true,
                                      placeholder: issue.evidence || '[Party Name]',
                                      issueId: issueKey,
                                      targetSection: issue.section,
                                      replacementValue: document.structuredFacts?.disclosingParty?.name || ''
                                    });
                                  } else {
                                    handleApplyQuickFix(issue);
                                  }
                                }}
                                disabled={fixingIssueId === issueKey}
                                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                title={issue.type === 'UNRESOLVED_PLACEHOLDER' ? 'Open interactive placeholder resolver' : 'Apply verified legal patch immediately to document'}
                              >
                                {fixingIssueId === issueKey ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Applying Legal Patch...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                    <span>
                                      {issue.type === 'UNRESOLVED_PLACEHOLDER'
                                        ? '⚡ Resolve Placeholder Token'
                                        : issue.type?.includes('MISSING')
                                        ? '⚡ Insert Canonical Clause'
                                        : '⚡ 1-Click Quick Fix'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Manual Drafting Guidance for non-auto-fixable items */}
                          {!isAutoFixable && !isResolved && (
                            <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-200 text-[10px] text-blue-900 space-y-1">
                              <div className="flex items-center gap-1 font-bold text-[10px] text-blue-800 uppercase tracking-wider">
                                <HelpCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span>Manual Drafting Required:</span>
                              </div>
                              <p className="leading-relaxed">
                                {issue.type === 'MISSING_PAYMENT_AMOUNT'
                                  ? 'Commercial consideration (fees, payment schedule, or currency) cannot be invented by AI. Click "Jump to Section in Editor" below to define the agreed commercial terms.'
                                  : issue.type === 'CONFLICTING_TERMS'
                                  ? 'Contradictory contractual terms detected. Click "Jump to Section in Editor" below to align the terms.'
                                  : 'Click "Jump to Section in Editor" below to edit this text directly, or check the Perfection Guide tab for standard clauses.'}
                              </p>
                            </div>
                          )}

                          {/* Human Counsel Review Layer */}
                          <div className="p-2 bg-white/80 rounded-lg border border-black/5 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-gray-600 uppercase tracking-wider">
                              Counsel Review {issue.reviewStatus ? `[${issue.reviewStatus}]` : ''}:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReviewIssue(issueKey, 'ACCEPTED')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  issue.reviewStatus === 'ACCEPTED'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                                title="Accept this finding and mark resolved"
                              >
                                ✓ Accept
                              </button>
                              <button
                                onClick={() => handleReviewIssue(issueKey, 'DISMISSED')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  issue.reviewStatus === 'DISMISSED'
                                    ? 'bg-gray-600 text-white shadow-2xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                }`}
                                title="Dismiss as non-blocking / intentional"
                              >
                                Dismiss
                              </button>
                              {isResolved && (
                                <button
                                  onClick={() => handleReviewIssue(issueKey, 'NEEDS_REVIEW')}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
                                  title="Re-open flag as active"
                                >
                                  ↺ Re-open
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Action Button: Jump & Highlight Section in Editor */}
                          <div className="pt-1">
                            <button
                              onClick={() => scrollToSection(issue.section, issue.evidence, issue.location?.textRange)}
                              className="w-full py-1.5 px-2 bg-white hover:bg-gray-100 text-gray-800 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-gray-300 shadow-2xs transition-colors cursor-pointer"
                              title="Scroll editor to this exact section and highlight text for editing"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                              Jump to Section in Editor
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

          {/* TAB 2: CONTRACT COMPLETENESS MAP */}
          {activeTab === 'COMPLETENESS' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                <span className="font-bold text-purple-950 flex items-center gap-1.5 text-[12px]">
                  <CheckSquare className="w-3.5 h-3.5 text-mira-primary" />
                  Clause Completeness Checklist
                </span>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Audit of canonical clauses expected in an institutional {document.documentType === 'NDA' ? 'NDA' : 'Legal Notice'}.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Preamble & Parties', key: 'parties' },
                  { name: 'Definition of Scope', key: 'definition' },
                  { name: document.documentType === 'NDA' ? 'Non-Disclosure Obligations' : 'Breach & Demands', key: 'obligations' },
                  { name: 'Exceptions & Carve-Outs', key: 'exceptions' },
                  { name: 'Term & Survival Duration', key: 'duration' },
                  { name: 'Remedies & Relief', key: 'remedies' },
                  { name: 'Governing Law & Jurisdiction', key: 'governing_law' },
                  { name: 'Execution & Signatures', key: 'signatures' }
                ].map((item, idx) => {
                  const matchingSection = sections.find(s => 
                    s.title.toLowerCase().includes(item.name.toLowerCase().slice(0, 7)) ||
                    s.content.toLowerCase().includes(item.name.toLowerCase().slice(0, 7))
                  );
                  const isPresent = !!matchingSection;
                  const hasIssues = matchingSection?.hasIssues;

                  return (
                    <div
                      key={idx}
                      onClick={() => matchingSection && scrollToSection(matchingSection.title)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                        isPresent && !hasIssues
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : isPresent && hasIssues
                          ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                          : 'bg-red-50/50 border-red-200 text-red-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isPresent && !hasIssues ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : isPresent && hasIssues ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-[11px]">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {isPresent && !hasIssues ? 'Verified' : isPresent && hasIssues ? 'Review' : 'Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-mira-muted italic pt-1 border-t">
                Click any present clause to scroll directly to that section in the editor.
              </p>
            </div>
          )}

          {/* TAB 3: DOCUMENT PERFECTION & BEST PRACTICES GUIDE */}
          {activeTab === 'PERFECTION_GUIDE' && (
            <div className="space-y-4 text-xs">
              {/* Header Banner */}
              <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-purple-950 text-xs">
                  <Award className="w-4 h-4 text-purple-700" />
                  <span>How to Make Your Contract Legally Perfect</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Institutional legal standards used by premier corporate legal teams. Follow these 7 pillars and insert canonical clauses to make your contract bulletproof and enforceable.
                </p>
              </div>

              {/* Document Health & Perfection Status */}
              <div className="p-3 bg-white rounded-xl border border-mira-border shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">
                    Current Document Score
                  </span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    validationScore >= 90 ? 'bg-emerald-100 text-emerald-800' :
                    validationScore >= 70 ? 'bg-blue-100 text-blue-800' :
                    validationScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {validationScore}% — {validationScore >= 90 ? 'Institutional Grade' : validationScore >= 70 ? 'Solid Draft' : 'Needs Review'}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 space-y-1">
                  <p className="font-medium text-gray-800">
                    {validationScore >= 90 
                      ? '✓ Excellent contract quality! Verify parties and signatures to finalize.'
                      : activeIssues.length > 0
                      ? `⚠ You have ${activeIssues.length} active flag${activeIssues.length === 1 ? '' : 's'} to address in the Flags tab. Review the 7 pillars below to elevate to 100%.`
                      : 'Follow the 7 legal pillars below to add complete protective covenants.'
                    }
                  </p>
                </div>
              </div>

              {/* 7 INSTITUTIONAL PERFECTION PILLARS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    7 Pillars of Contract Perfection:
                  </span>
                  <span className="text-[10px] text-mira-muted">Click to insert</span>
                </div>

                {/* Pillar 1: Liability Cap */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">1</span>
                      <span>Liability & Financial Exposure</span>
                    </div>
                    <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">Critical</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Never execute without a mutual liability cap. Limit total aggregate liability to fees paid in the prior 12 months, and include an express waiver of consequential, indirect, and punitive damages.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Limitation of Liability'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert 12-Month Liability Cap Clause
                  </button>
                </div>

                {/* Pillar 2: IP Assignment */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">2</span>
                      <span>IP Rights & Work Product</span>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">Essential</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Use explicit present-tense assignment ("hereby assigns all right, title, and interest in deliverables") while expressly reserving pre-existing background IP, third-party libraries, and developer tools.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Intellectual Property'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert IP & Work Product Assignment
                  </button>
                </div>

                {/* Pillar 3: Notice & Cure Periods */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">3</span>
                      <span>Notice & Termination Cure</span>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Standard</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Avoid abrupt unilateral termination. Provide at least 30 days prior written notice for convenience, and a mandatory 15-day notice-and-cure period before terminating for material breach.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Term, Mutual Termination'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert Notice & Cure Termination Clause
                  </button>
                </div>

                {/* Pillar 4: Confidentiality & 4 Exceptions */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">4</span>
                      <span>Confidentiality & Statutory Carve-Outs</span>
                    </div>
                    <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">Protective</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Ensure the 4 canonical exclusions are stated: public domain, prior knowledge, independent creation, and lawful third-party receipt. Include prompt written notice for court subpoenas.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Exclusions from Confidentiality'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert 4 Confidentiality Exceptions
                  </button>
                </div>

                {/* Pillar 5: Governing Law & Jurisdiction */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">5</span>
                      <span>Governing Law & Forum Selection</span>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">Enforceability</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Nominate one single, unambiguous governing jurisdiction (e.g., State of Delaware, California, or Karnataka) and designate exclusive court venue or binding institutional arbitration.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Governing Law'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert Governing Law Clause
                  </button>
                </div>

                {/* Pillar 6: Integration & Boilerplate */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">6</span>
                      <span>Integration & Severability (Boilerplate)</span>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold">Ironclad</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Protect your contract against parol evidence with an Entire Agreement clause, keep the remainder valid if one term is struck via Severability, and authorize digital Counterparts.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Severability, Counterparts'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert Entire Agreement & Boilerplate
                  </button>
                </div>

                {/* Pillar 7: Execution & Signatures */}
                <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                      <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">7</span>
                      <span>Execution & Signature Blocks</span>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Execution</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    <strong>Rule:</strong> Ensure corporate entity names match the preamble exactly. Include authorized officer names, executive titles (e.g., Director, CEO, VP), and execution dates for each party.
                  </p>
                  <button
                    onClick={() => {
                      const clause = CLAUSE_LIBRARY.find(c => c.title.includes('Formal Execution'));
                      if (clause) insertTextAtCursor(clause.text);
                    }}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3 h-3 text-purple-600" />
                    Insert Signature Block
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-mira-muted italic pt-2 border-t">
                "Insert button places canonical institutional clause at your cursor in the editor."
              </p>
            </div>
          )}
        </div>
      </div>

      {/* INTERACTIVE PLACEHOLDER RESOLVER MODAL */}
      {placeholderModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Resolve Document Placeholder</h3>
                  <p className="text-xs text-gray-500">Replace bracketed tokens with authoritative parties or terms</p>
                </div>
              </div>
              <button
                onClick={() => setPlaceholderModal({ ...placeholderModal, isOpen: false })}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Placeholder to Replace:</label>
              <div className="p-2 bg-purple-50 border border-purple-100 rounded-lg font-mono text-xs text-purple-900 font-bold">
                {placeholderModal.placeholder}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Select Canonical Suggestion:</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                {[
                  { label: 'Disclosing Party', val: document.structuredFacts?.disclosingParty?.name || document.structuredFacts?.disclosingParty || 'Apex Innovations Inc.' },
                  { label: 'Receiving Party', val: document.structuredFacts?.receivingParty?.name || document.structuredFacts?.receivingParty || 'Nexus Global Partners LLC' },
                  { label: 'Effective Date', val: document.structuredFacts?.effectiveDate || new Date().toISOString().split('T')[0] },
                  { label: 'Governing Law', val: document.structuredFacts?.jurisdiction || document.structuredFacts?.governingLaw || 'the State of Delaware' },
                  { label: 'Duration / Term', val: document.structuredFacts?.duration || 'three (3) years' }
                ].filter(item => Boolean(item.val)).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPlaceholderModal(prev => ({ ...prev, replacementValue: item.val }))}
                    className={`p-2 rounded-lg text-xs text-left border flex items-center justify-between transition-colors cursor-pointer ${
                      placeholderModal.replacementValue === item.val
                        ? 'bg-purple-100 border-purple-400 font-bold text-purple-950'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.val}</span>
                    <span className="text-[10px] text-gray-400">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Or Type Custom Value:</label>
              <input
                type="text"
                value={placeholderModal.replacementValue}
                onChange={(e) => setPlaceholderModal(prev => ({ ...prev, replacementValue: e.target.value }))}
                placeholder="Type replacement text..."
                className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setPlaceholderModal({ ...placeholderModal, isOpen: false })}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolvePlaceholder}
                disabled={!placeholderModal.replacementValue}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                Replace All in Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION DIFF MODAL */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Document Revision Diff</h3>
                  <p className="text-xs text-gray-500">
                    Comparing <span className="font-semibold text-gray-700">{diffLabels.original || 'Initial Draft'}</span> vs <span className="font-semibold text-purple-700">{diffLabels.modified || 'Current Draft'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiffModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diff Stats Banner */}
            {diffResult && (
              <div className="px-5 py-2.5 bg-gray-100/70 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="font-mono">+{diffResult.summary.addedCount}</span> Added
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                    <span className="font-mono">-{diffResult.summary.removedCount}</span> Removed
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="font-mono font-semibold text-gray-800">{diffResult.summary.unchangedCount}</span> Unchanged lines
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 italic">
                  Deterministic line-by-line legal comparison
                </span>
              </div>
            )}

            {/* Modal Body: Diff Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-slate-950 text-slate-100">
              {diffLoading ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                  <p className="text-sm text-slate-400 font-sans">Computing exact version differences...</p>
                </div>
              ) : diffResult && diffResult.lines.length > 0 ? (
                <div className="space-y-0.5">
                  {diffResult.lines.map((dl, i) => (
                    <div
                      key={i}
                      className={`flex items-start px-2 py-0.5 rounded-xs transition-colors ${
                        dl.type === 'added'
                          ? 'bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500'
                          : dl.type === 'removed'
                          ? 'bg-red-950/60 text-red-300 border-l-2 border-red-500 line-through opacity-80'
                          : 'text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <span className="w-10 select-none text-right pr-3 text-[10px] text-slate-600 font-mono">
                        {dl.lineA || dl.lineB || ''}
                      </span>
                      <span className="w-4 select-none text-center font-bold font-mono">
                        {dl.type === 'added' ? '+' : dl.type === 'removed' ? '-' : ' '}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words font-mono">
                        {dl.text || ' '}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 font-sans">
                  No differences found between the compared versions.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
              <button
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
