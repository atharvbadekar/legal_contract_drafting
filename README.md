# Atharv Legal AI: Controlled Legal Document Generation, Contract Analyzer & Multi-Tier Validation System

> **A Production-Grade Research & Enterprise Legal Tech Platform**  
> An advanced legal intelligence web application combining structured fact extraction, domain-specific legal NLP embeddings (`sentence-transformers/all-MiniLM-L6-v2`), template-governed drafting, approved clause retrieval, PostgreSQL pgvector RAG, multi-format contract analysis, visual revision diffing, human counsel review triage, and multi-tier automated validation.

---

## Complete Documentation

For the comprehensive technical specification, architecture diagrams, step-by-step pipeline breakdown, and faculty defense Q&A, please refer to:
👉 **[`DOCUMENTATION.md`](./DOCUMENTATION.md)**

---

## 1. System Architecture & Modern Tech Stack

### 1.1 Decoupled Microservices
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons (`http://localhost:5173`, deployed on **Vercel**)
- **Backend API**: Node.js v22 Express, Prisma ORM, TypeScript, Multer, Mammoth, pdf-parse, PDFKit (`http://localhost:5000`, deployed on **Render Free Web Service**)
- **Legal NLP Microservice**: Python 3.13, FastAPI, PyTorch CPU (`sentence-transformers/all-MiniLM-L6-v2`, 384-dim, 1 CPU thread, <250MB RAM footprint, deployed on **Render Free Web Service**)
- **Database & Vector Store**: PostgreSQL 16 + `pgvector` (Neon Serverless PostgreSQL or local container on Port `5433`, DB: `mira_db`)

### 1.2 Default Login Credentials
- **Researcher / Associate**: `user@atharv.legal` / `user123`
- **Administrator / Legal Lead**: `admin@atharv.legal` / `admin123`

---

## 2. Core Capabilities & Latest Features

### 2.1 Multi-Format Contract Analyzer
- **Ingestion**: Ingests legal documents via drag-and-drop file upload (`.pdf`, `.docx`, `.txt`) or raw text paste.
- **Fail-Safe Extraction**: Zero-dependency PDF extraction and native Node `zlib` XML stream fallback for damaged or unusual DOCX files.
- **Contract Overview**: Automatically extracts document type, contracting parties, roles, effective dates, duration, monetary consideration, and governing law.
- **Clause Completeness Map**: Audits canonical contract clauses (`Verified`, `Review`, `Missing`) against institutional standards.
- **Risk & Anomaly Detection**: Uncovers uncapped liabilities, missing IP assignments, unilateral termination rights, and unresolved placeholders (`[Party Name]`, `TBD`, `________`) with quoted evidence and legal rationale.
- **Explainable Contract Health Score**: Computes a transparent 0–100% score backed by hard caps ($\le 50\%$ for critical defects).

### 2.2 Interactive Document Editor & Revision Diff Engine
- **Visual Version Diffing**: Accessible via the **"Version Diff"** button. Generates line-by-line diffs (`+ Added`, `- Removed`, `Unchanged`) comparing original contracts against AI-modified revisions.
- **Contextual AI Assistant**: Surgically rewrite clauses (Make Bilateral, Simplify in Plain English, Formalize) or explain legal implications.
- **Human Counsel Review Layer**: Triage detected flags directly with `Accept`, `Dismiss`, or `Needs Review`. Every decision is immutably logged to `AuditLog`.

### 2.3 Controlled Document Generation Pipeline
- **Exhaustive 5-Step Questionnaire**: Zero missing facts for Bilateral NDAs and Statutory Legal Notices.
- **10-Step State Machine**: Atomic state transitions from fact normalization to clause assembly with RAG retrieval from `pgvector`.
- **Court-Ready Export**: One-click download of professionally styled Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) documents with dual signature blocks.

---

## 3. Running the Stack Locally

### 3.1 Start Legal NLP Microservice
```bash
cd services/legal-nlp
source venv/bin/activate
uvicorn app.main:app --port 8001 --reload
```

### 3.2 Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3.3 Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 4. Automated Test Verification

Execute the complete automated test suites:

```bash
# Backend test suite (32/32 tests pass)
cd backend
npm test

# Legal NLP microservice tests (4/4 tests pass)
cd ../services/legal-nlp
./venv/bin/python -m unittest discover tests

# Frontend production build
cd ../frontend
npm run build
```
