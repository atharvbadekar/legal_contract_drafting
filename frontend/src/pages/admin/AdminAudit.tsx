import React, { useEffect, useState } from 'react';
import { researchService } from '../../services/api';
import { Shield, Clock, CheckCircle2, AlertTriangle, ChevronDown, Cpu, Eye } from 'lucide-react';

export const AdminAudit: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const data = await researchService.getAuditLogs();
      setRuns(data);
      if (data.length > 0) setExpandedRunId(data[0].id);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-mira-border shadow-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-mira-primary" />
          <h1 className="text-xl font-bold text-mira-dark">Agent Orchestration Audit Trail</h1>
        </div>
        <p className="text-xs text-mira-muted mt-1">
          Complete execution trace of all 10-step state machine runs, model inference timestamps, and validation decisions.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-mira-muted">Loading audit traces...</div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center text-xs text-mira-muted bg-white rounded-xl border border-mira-border">
          No agent runs logged yet.
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className="bg-white rounded-xl border border-mira-border shadow-2xs overflow-hidden">
              <div
                onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                className="p-4 cursor-pointer hover:bg-gray-50/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    run.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    run.status === 'NEEDS_REVIEW' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-mira-dark">
                        {run.document?.title || 'Legal Document Pipeline'}
                      </span>
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {run.document?.documentType || 'NDA'}
                      </span>
                    </div>
                    <span className="text-[11px] text-mira-muted">
                      Run ID: {run.id} • Started: {new Date(run.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    run.status === 'NEEDS_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {run.status}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-mira-muted transition-transform ${
                    expandedRunId === run.id ? 'rotate-180' : ''
                  }`} />
                </div>
              </div>

              {/* Step by Step Trace */}
              {expandedRunId === run.id && (
                <div className="p-5 bg-gray-50 border-t border-mira-border space-y-3">
                  <span className="text-xs font-bold text-mira-dark uppercase tracking-wider">
                    Agent State Transitions ({run.steps?.length || 0} Steps)
                  </span>
                  <div className="space-y-2">
                    {run.steps?.map((step: any) => (
                      <div key={step.id} className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-2 text-mira-dark font-bold">
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-mira-primary text-[10px] flex items-center justify-center font-bold">
                              {step.stepNumber}
                            </span>
                            {step.stepName}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-mira-muted">
                            <span className="font-mono">{step.executionTimeMs}ms</span>
                            <span>•</span>
                            <span className="text-purple-700 font-medium">{step.modelUsed}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${
                              step.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {step.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className="bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
                            <span className="text-[9px] font-bold text-mira-muted uppercase">Input State:</span>
                            <pre className="text-[10px] text-mira-dark font-mono mt-0.5">
                              {JSON.stringify(step.inputData, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
                            <span className="text-[9px] font-bold text-mira-muted uppercase">Output State:</span>
                            <pre className="text-[10px] text-mira-dark font-mono mt-0.5">
                              {JSON.stringify(step.outputData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
