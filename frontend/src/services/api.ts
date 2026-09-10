import axios from 'axios';
import { DocumentRecord, ClauseRecord, KnowledgeDocumentRecord, TemplateRecord, User } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atharv_token') || localStorage.getItem('mira_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 unauthorized
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('atharv_token');
      localStorage.removeItem('atharv_user');
      localStorage.removeItem('mira_token');
      localStorage.removeItem('mira_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth Service
export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string, role?: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password, role });
    return res.data;
  },
  me: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  }
};

// Document Service
export const documentService = {
  list: async () => {
    const res = await api.get<{ documents: DocumentRecord[] }>('/documents');
    return res.data.documents;
  },
  getById: async (id: string) => {
    const res = await api.get<{ document: DocumentRecord }>(`/documents/${id}`);
    return res.data.document;
  },
  create: async (data: { title: string; documentType: string; structuredFacts?: any; content?: string; generationMode?: string }) => {
    const res = await api.post<{ document: DocumentRecord }>('/documents', data);
    return res.data.document;
  },
  update: async (id: string, data: { title?: string; content?: string; structuredFacts?: any; saveAsVersion?: boolean }) => {
    const res = await api.put<{ document: DocumentRecord }>(`/documents/${id}`, data);
    return res.data.document;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },
  generate: async (id: string, payload: { rawInput?: string; documentType?: string; structuredFacts?: any; generationMode?: string }) => {
    const res = await api.post<{ result: any; document: DocumentRecord }>(`/documents/${id}/generate`, payload);
    return res.data;
  },
  validate: async (id: string, payload: { content?: string; structuredFacts?: any }) => {
    const res = await api.post<{ validationResult: any; document: DocumentRecord }>(`/documents/${id}/validate`, payload);
    return res.data;
  },
  getVersions: async (id: string) => {
    const res = await api.get<{ versions: any[] }>(`/documents/${id}/versions`);
    return res.data.versions;
  },
  restoreVersion: async (id: string, versionId: string) => {
    const res = await api.post<{ message: string; document: DocumentRecord }>(`/documents/${id}/restore/${versionId}`);
    return res.data;
  },
  downloadDocx: async (id: string, filename: string) => {
    const res = await api.get(`/documents/${id}/export/docx`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadPdf: async (id: string, filename: string) => {
    const res = await api.get(`/documents/${id}/export/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

// AI NLP Service
export const aiService = {
  extractFacts: async (text: string, documentType?: string) => {
    const res = await api.post<{
      documentType: string;
      facts: any;
      extractedEntities: any;
      missingInfo: any;
    }>('/ai/extract-facts', { text, documentType });
    return res.data;
  },
  classifyDocument: async (text: string) => {
    const res = await api.post<{ documentType: string; confidence: number; scores: any }>('/ai/classify-document', { text });
    return res.data;
  },
  explainClause: async (clauseContent: string) => {
    const res = await api.post<{
      plainLanguage: string;
      purpose: string;
      legalImplication: string;
      sourcesUsed: string[];
      disclaimer: string;
    }>('/ai/explain-clause', { clauseContent });
    return res.data;
  },
  rewriteClause: async (clauseContent: string, style: 'formal' | 'simple' | 'custom', customPrompt?: string) => {
    const res = await api.post<{ rewritten: string }>('/ai/rewrite-clause', { clauseContent, style, customPrompt });
    return res.data;
  },
  checkMissing: async (documentType: string, structuredFacts: any) => {
    const res = await api.post('/ai/check-missing', { documentType, structuredFacts });
    return res.data;
  }
};

// Clauses Service
export const clauseService = {
  list: async (filters?: { documentType?: string; status?: string; clauseType?: string }) => {
    const res = await api.get<{ clauses: ClauseRecord[] }>('/clauses', { params: filters });
    return res.data.clauses;
  },
  create: async (data: any) => {
    const res = await api.post<{ clause: ClauseRecord }>('/clauses', data);
    return res.data.clause;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ clause: ClauseRecord }>(`/clauses/${id}`, data);
    return res.data.clause;
  },
  approve: async (id: string) => {
    const res = await api.post<{ clause: ClauseRecord }>(`/clauses/${id}/approve`);
    return res.data.clause;
  },
  archive: async (id: string) => {
    const res = await api.post<{ clause: ClauseRecord }>(`/clauses/${id}/archive`);
    return res.data.clause;
  }
};

// Knowledge RAG Service
export const knowledgeService = {
  list: async () => {
    const res = await api.get<{ documents: KnowledgeDocumentRecord[] }>('/knowledge');
    return res.data.documents;
  },
  getChunks: async (id: string) => {
    const res = await api.get<{ document: KnowledgeDocumentRecord }>(`/knowledge/${id}/chunks`);
    return res.data.document;
  },
  upload: async (data: { title: string; source?: string; documentType?: string; rawText: string; jurisdiction?: string }) => {
    const res = await api.post<{ document: KnowledgeDocumentRecord }>('/knowledge/upload', data);
    return res.data.document;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/knowledge/${id}`);
    return res.data;
  }
};

// Templates Service
export const templateService = {
  list: async () => {
    const res = await api.get<{ templates: TemplateRecord[] }>('/templates');
    return res.data.templates;
  },
  getById: async (id: string) => {
    const res = await api.get<{ template: TemplateRecord }>(`/templates/${id}`);
    return res.data.template;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<{ template: TemplateRecord }>(`/templates/${id}`, data);
    return res.data.template;
  }
};

// Research Service
export const researchService = {
  getMetrics: async () => {
    const res = await api.get<{ metrics: any }>('/research/metrics');
    return res.data.metrics;
  },
  getAuditLogs: async () => {
    const res = await api.get<{ runs: any[] }>('/research/audit');
    return res.data.runs;
  }
};
