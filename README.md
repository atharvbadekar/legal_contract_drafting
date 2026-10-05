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
# Backend test suite (46/46 tests pass across 5 test suites)
cd backend
npm test

# Legal NLP microservice tests (4/4 tests pass)
cd ../services/legal-nlp
./venv/bin/python -m unittest discover tests

# Frontend production build
cd ../frontend
npm run build
```

---

## 5. Cloud Deployment & Working Links

Atharv Legal AI is architected for seamless cloud deployment on Render (Backend & NLP services) and Vercel (Frontend application).

### 5.1 Repository
- **GitHub Repository**: [https://github.com/atharvbadekar/legal_contract_drafting](https://github.com/atharvbadekar/legal_contract_drafting)
- **Primary Branch**: `main`

### 5.2 Frontend Deployment (Vercel)
- **Deployment Platform**: [Vercel](https://vercel.com)
- **Root Directory**: `frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: Your Render Backend URL (e.g. `https://atharv-legal-ai-backend.onrender.com/api`)

### 5.3 Backend API Deployment (Render)
- **Deployment Platform**: [Render](https://render.com)
- **Service Type**: Web Service (Node)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build && npx prisma generate`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `5000`
  - `NODE_ENV`: `production`
  - `JWT_SECRET`: `<secure-jwt-secret>`
  - `DATABASE_URL`: Your PostgreSQL connection string (e.g., Neon or Render PostgreSQL with `pgvector`)
  - `LEGAL_NLP_URL`: Your Render Legal NLP Service URL (optional, defaults to local fallback)
  - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://atharv-legal-ai.vercel.app`)

### 5.4 10 Supported Contract Generation Types
1. **Non-Disclosure Agreement (NDA)** — Mutual & Unilateral
2. **Employment Agreement** — Full-time, Part-time, & Contract
3. **Master Service Agreement (MSA)** — Deliverables, Milestones & Retainers
4. **SaaS Subscription Agreement** — Tiers, SLA, & Uptime Guarantees
5. **Independent Consulting Agreement** — Retainers, Hourly & IP Assignment
6. **Memorandum of Understanding (MOU)** — Institutional Partnerships
7. **Vendor / Procurement Agreement** — Supply, Warranties & Indemnification
8. **Partnership Agreement** — Profit-sharing & Governance
9. **Internship Agreement** — Stipend, Mentorship & Confidentiality
10. **Statutory Legal Notice** — Recovery & Compliance Notice

