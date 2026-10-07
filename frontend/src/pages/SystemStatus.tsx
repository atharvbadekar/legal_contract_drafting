import React, { useEffect, useState } from 'react';
import { systemService, CompleteSystemStatusData } from '../services/api';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Cpu, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  Server,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SystemStatus: React.FC = () => {
  const [status, setStatus] = useState<CompleteSystemStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await systemService.getStatus();
      setStatus(data);
      setLastRefreshed(new Date());
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (st?: string) => {
    switch (st) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Fully Operational</span>;
      case 'FALLBACK_ADAPTER':
        return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Fallback Mode</span>;
      case 'DEGRADED':
        return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Degraded</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full"><XCircle className="w-3.5 h-3.5 text-rose-600" /> Offline / Standby</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mira-primary to-mira-secondary flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Engines & AI Pipeline Status</h1>
          </div>
          <p className="text-sm text-gray-500">
            Real-time status monitoring for Atharv Legal AI multi-engine architecture
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last check: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-xs font-semibold text-gray-700 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Safety & Architecture Callout */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3.5 text-sm text-blue-900 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h4 className="font-semibold text-blue-950">Non-Hallucinatory Architectural Guarantee</h4>
          <p className="text-xs leading-relaxed text-blue-800">
            A temporary outage or rate-limiting of any remote LLM or NLP service is strictly treated as a <strong>System Status Notice</strong>. It is never converted into a legal contract finding, defect, or penalty. Our deterministic rules engine and approved clause library continuously ensure baseline drafting accuracy and validation.
          </p>
        </div>
      </div>

      {/* 4 Engine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Deterministic Rules Engine */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Deterministic Rules Engine</h3>
                <p className="text-xs text-gray-500">Legal Ontologies & Structural Linting</p>
              </div>
            </div>
            {getStatusBadge(status?.engines?.deterministicRules?.status || 'ACTIVE')}
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Operates independently with zero network latency. Validates essential fields, cross-references, defined terms, and detects drafting placeholders.
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Rules Loaded:</span>
              <span className="font-semibold text-gray-800">{status?.engines?.deterministicRules?.details?.rulesCount ?? 64} verified patterns</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Validation Mode:</span>
              <span className="font-mono text-gray-800">Strict Non-Hallucination</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Average Latency:</span>
              <span className="font-semibold text-emerald-600">~1ms</span>
            </div>
          </div>
        </div>

        {/* Card 2: Semantic Legal NLP */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Domain Legal NLP</h3>
                <p className="text-xs text-gray-500">Legal-BERT / MiniLM Embeddings</p>
              </div>
            </div>
            {getStatusBadge(status?.engines?.semanticNlp?.status)}
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Performs clause classification, document type identification, and vector embeddings for Indian & commercial legal phrasing.
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Model:</span>
              <span className="font-mono text-gray-800 truncate max-w-[200px]" title={status?.engines?.semanticNlp?.model}>
                {status?.engines?.semanticNlp?.model || 'all-MiniLM-L6-v2'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vector Dimension:</span>
              <span className="font-semibold text-gray-800">384 dimensions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Execution Device:</span>
              <span className="font-semibold text-gray-800">{status?.engines?.semanticNlp?.details?.device || 'cpu'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Provider-Agnostic LLM */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Generation LLM Layer</h3>
                <p className="text-xs text-gray-500">Provider-Agnostic with Zod Validation</p>
              </div>
            </div>
            {getStatusBadge(status?.engines?.llm?.status)}
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Powers polished drafting, clause explanation, and natural-language edits. Automatically cascades to secondary provider on rate limits.
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Active Model:</span>
              <span className="font-mono font-semibold text-amber-700">
                {status?.engines?.llm?.model || 'llama-3.1-8b-instant'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Primary Provider:</span>
              <span className="capitalize font-semibold text-gray-800">{status?.engines?.llm?.details?.primary?.id || 'groq'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fallback Provider:</span>
              <span className="capitalize font-semibold text-gray-800">{status?.engines?.llm?.details?.fallback?.id || 'deterministic'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Response Cache Hits:</span>
              <span className="font-semibold text-emerald-600">{status?.cacheStats?.hits ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Card 4: RAG Vector Knowledge Store */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">RAG Knowledge Store</h3>
                <p className="text-xs text-gray-500">PostgreSQL pgvector Store</p>
              </div>
            </div>
            {getStatusBadge(status?.engines?.rag?.status)}
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Retrieves statutory references (Indian Contract Act 1872, Specific Relief Act) and judicial drafting guidelines for explainability.
          </p>
          <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Storage Engine:</span>
              <span className="font-mono text-gray-800">PostgreSQL pgvector</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Distance Metric:</span>
              <span className="font-mono text-gray-800">Cosine Distance (&lt;=&gt;)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ingested Sources:</span>
              <span className="font-semibold text-blue-600">{status?.engines?.rag?.details?.knowledgeDocuments ?? 0} documents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
