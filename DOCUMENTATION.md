# Atharv Legal AI — Master System Documentation & Architectural Specification

> **AI-Powered Controlled Legal Document Generation, Contract Analyzer & Multi-Tier Validation System**  
> *Author:* Atharv  
> *Repository:* Atharv Legal AI (`legal_contract_drafting`)  
> *Version:* 2.0.0 (Production-Quality Enterprise & Research Platform)  
> *Target Capabilities:* Bilateral NDAs, Statutory Legal Notices, Multi-Format Contract Ingestion (PDF, DOCX, TXT), Revision Diffing, and Explainable Contract Health Auditing

---

## 1. Executive Summary & Research Motivation

### 1.1 The Research Problem in Legal Artificial Intelligence
Modern legal document drafting and analysis demand **absolute precision, statutory ground truth, contractual enforceability, and explainability**. When general-purpose Large Language Models (LLMs) such as GPT-4, Claude, or LLaMA are prompted directly for legal drafting or contract review, they exhibit catastrophic failure modes:

1. **Factual Hallucination & Discrepancies**: Raw LLMs regularly alter contracting parties, invent non-existent corporate entities, alter monetary consideration, or distort contract durations (e.g., changing a strict 3-year term into 5 years or indefinite covenants).
2. **Statutory Fabrication ("Ghost Citations")**: Unconstrained probabilistic token predictors frequently invent non-existent section numbers, court precedents, or cross-contaminate legal jurisdictions (e.g., citing US Uniform Commercial Code for an Indian contract).
3. **Syntactic & Enforceability Gaps**: Generic LLM prose lacks standardized boilerplate covenants, non-severability protections, statutory definitions of confidential information, and dual-signatory blocks required by commercial courts.
4. **False Health Ratings**: In contract auditing, uncalibrated systems routinely score incomplete or risky contracts at ~100% Health due to a lack of required field enforcement, canonical covenant checklists, and placeholder detection.

### 1.2 The Core Architectural Hypothesis
> *"Combining structured legal information extraction, high-efficiency sentence embedding encoders (`sentence-transformers/all-MiniLM-L6-v2`), template-governed drafting, approved clause retrieval, PostgreSQL pgvector RAG, multi-format contract ingestion, deterministic line diffing, and multi-tier automated validation improves the reliability, consistency, resource efficiency, and factual accuracy of legal intelligence web applications compared to direct unconstrained LLM generation."*

### 1.3 Key Architectural Invariant: Why the NLP Encoder is NOT the Text Generator
A fundamental tenet of Atharv Legal AI is respecting model architecture:
- **`sentence-transformers/all-MiniLM-L6-v2` is a dense representation ENCODER**, **NOT an autoregressive text decoder**.
- It is strictly utilized for **representation, classification, entity extraction, semantic similarity, and vector distance calculation**.
- Text synthesis is performed by a dedicated, controlled **Generation Engine** governed by pre-approved clause templates and deterministic parameters.

---

## 2. System Architecture & Modern Topology

Atharv Legal AI is organized into four decoupled, production-grade microservices designed to run comfortably on modern cloud infrastructure (including free tier services such as Render and Vercel):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATION (Vercel)                       │
│  - React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons               │
│  - Contract Analyzer: Drag-and-drop file upload (PDF/DOCX/TXT) or paste │
│  - Document Studio: 3-panel editor (Outline + Center Editor + Sidebar)  │
│  - Document Revision Diff Modal: Deterministic visual line comparison   │
│  - Human Review Layer: Triage flags (Accept / Dismiss / Needs Review)   │
│  - Research Benchmarking Dashboard (Atharv AI vs Baseline LLM)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API / JWT
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND API GATEWAY (Render)                        │
│  - Node.js v22 Express, Prisma ORM, TypeScript                          │
│  - File Ingestion: Multer, pdf-parse, mammoth + zlib XML fallback       │
│  - Contract Analyzer Engine: Overview, Completeness Map, Risk Extractor │
│  - Line-by-Line Diff Service (LCS algorithm)                            │
│  - Multi-Tier Validation Engine (Authoritative Deterministic + NLP)     │
│  - Export Service (Court-Ready DOCX & PDF with Signature Blocks)        │
│  - Audit Trail Logging (User reviews & generation state machine)        │
└───────────────────┬───────────────────┬───────────────────┬─────────────┘
                    │                   │                   │
                    ▼                   ▼                   ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ PostgreSQL + pgvector │   │ Legal NLP Microservice│   │ Generation Service    │
│  - Neon / PostgreSQL  │   │  - FastAPI / Python   │   │  - Controlled LLM     │
│  - pgvector (384-dim) │   │  - all-MiniLM-L6-v2   │   │  - Template & Clause  │
│  - Prisma ORM         │   │  - CPU Pinned (1 thd) │   │    Binding Logic      │
│  - Document Versions  │   │  - RAM < 250 MB       │   │                       │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

### 2.1 Microservice Port Allocation
| Service | Runtime / Framework | Port | Production Host |
| :--- | :--- | :---: | :--- |
| **Frontend Application** | React 18 / Vite / TypeScript | `5173` | Vercel (`https://your-app.vercel.app`) |
| **Backend API Gateway** | Node.js v22 / Express / Prisma | `5000` | Render (`https://your-backend.onrender.com`) |
| **Legal NLP Service** | Python 3.13 / FastAPI / PyTorch | `8001` | Render (`https://your-nlp.onrender.com`) |
| **Database & Vector Store** | PostgreSQL 16 / pgvector | `5433` | Neon Cloud Serverless PostgreSQL |

---

## 3. Frontend Architecture & User Experience

### 3.1 Multi-Format Contract Analyzer (`frontend/src/pages/ContractAnalyzer.tsx`)
- **Drag-and-Drop File Upload**: Ingests `.pdf`, `.docx`, and `.txt` files up to 30MB or accepts pasted text.
- **Contract Overview Card**: Displays document title, classified contract type, contracting parties with roles, effective date, duration, monetary terms, and governing jurisdiction.
- **Explainable Contract Health**: 0–100% score backed by category scores (`Completeness`, `Risk & Compliance`, `Consistency`, `Clarity`), penalty breakdown, and hard score caps.
- **Clause Completeness Map**: Interactive checklist auditing essential covenants (`Verified`, `Review`, `Missing`).
- **Risk & Anomaly Inspector**: Highlights critical liabilities, uncapped indemnities, one-sided termination rights, and missing IP assignments with quoted textual evidence and statutory rationale.
- **1-Click Import**: Converts any analyzed contract into an active workspace document in the Document Editor.

### 3.2 The 3-Panel Legal Document Studio (`frontend/src/pages/DocumentEditor.tsx`)
- **Left Panel (Outline)**: Lists contractual sections with real-time validation badges (`Verified`, `Review`, `Missing`). Clicking any section smoothly scrolls the editor to that exact covenant.
- **Center Panel (Drafting Workspace)**: Full, unhindered manual editing workspace. AI assists, but lawyers make final decisions. Manual modifications trigger automatic re-validation upon save.
- **Right Panel (Multi-Tab Inspector)**:
  - *Validation Tab*: Displays Composite Health Score, detected issues with character ranges, and **Counsel Review Buttons** (`Accept`, `Dismiss`, `Needs Review`).
  - *Completeness Tab*: Live checklist of canonical legal clauses expected in an institutional document.
  - *AI Assistant Tab*: Plain-language clause explainer, 1-click presets (Bilateralize, Simplify, Formalize), and targeted AI commands on selected text.
- **Version Diff Modal**: Accessible via the **"Version Diff"** button. Displays line-by-line visual differences (`+ Added`, `- Removed`, `Unchanged`) between document versions.

---

## 4. Backend Orchestration & The Contract Intelligence Engine

### 4.1 Multi-Format File Ingestion & Fallback Pipeline
To ensure 100% crash immunity during file uploads, `contract_analyzer.ts` implements multi-layer parsing:
1. **PDF Parsing**: Attempts native stream extraction via `pdf-parse`. If an encrypted or unusual PDF is uploaded, gracefully falls back to regex-based stream decoding.
2. **DOCX Parsing**: Parses Word XML using `mammoth`. If damaged or non-standard formatting is detected, falls back to native Node `zlib` stream inflation of `word/document.xml`, extracting raw textual nodes without external dependencies.
3. **Plain Text**: Ingests UTF-8 text directly.

### 4.2 Document Diffing Service (`backend/src/utils/diff_service.ts`)
- Computes line-by-line differences using an optimized Longest Common Subsequence (LCS) algorithm.
- Produces tagged diff lines (`added`, `removed`, `unchanged`) with original line numbering and summary metrics (`addedCount`, `removedCount`, `unchangedCount`).

### 4.3 Counsel Human Review Layer
- Counsel can review any detected issue and mark its review state:
  - `ACCEPTED`: Acknowledged as a real issue to be resolved.
  - `DISMISSED`: Verified by legal counsel as intentional or non-blocking.
  - `NEEDS_REVIEW`: Flagged for formal counsel review.
- Persisted to database with user ID, timestamp, and audit trail in `AuditLog`.

---

## 5. Specialized Legal NLP Microservice

Implemented in Python FastAPI (`services/legal-nlp/app/`):

### 5.1 Model Selection: `sentence-transformers/all-MiniLM-L6-v2`
To operate reliably on free cloud hosting (Render Free ~512MB RAM ceiling), the microservice loads `sentence-transformers/all-MiniLM-L6-v2`:
- **Model Dimension**: 384 dimensions.
- **Memory Footprint**: < 250 MB RAM (compared to > 1.2 GB for full InLegalBERT).
- **CPU Pinning**: `torch.set_num_threads(1)` eliminates CPU contention.
- **Gradient Computation**: Disabled globally via `torch.set_grad_enabled(False)`.
- **Inference Speed**: ~150ms – 300ms on free CPU instances.

### 5.2 Canonical Embedding Generation (`embedding.py`)
1. Text is tokenized with truncation up to 512 tokens.
2. The model outputs hidden states $\mathbf{H} \in \mathbb{R}^{B \times L \times 384}$.
3. **Mean Pooling over Attention Mask**:
   $$\mathbf{v}_{\text{raw}} = \frac{\sum_{i=1}^L \mathbf{H}_i \cdot \text{mask}_i}{\sum_{i=1}^L \text{mask}_i}$$
4. **L2 Normalization**:
   $$\mathbf{v}_{\text{norm}} = \frac{\mathbf{v}_{\text{raw}}}{\|\mathbf{v}_{\text{raw}}\|_2}$$
   This guarantees that the Euclidean dot product equals the Cosine Similarity:
   $$\text{CosineSimilarity}(\mathbf{u}, \mathbf{v}) = \mathbf{u} \cdot \mathbf{v}$$

---

## 6. PostgreSQL + pgvector Database Schema

### 6.1 Database Schema (Prisma ORM)
```prisma
model User {
  id           String     @id @default(uuid())
  email        String     @unique
  passwordHash String
  name         String
  role         UserRole   @default(USER)
  documents    Document[]
  createdAt    DateTime   @default(now())
}

model Document {
  id                String            @id @default(uuid())
  title             String
  documentType      String            // NDA, LEGAL_NOTICE, CONTRACT
  generationMode    GenerationMode    @default(MIRA)
  status            DocumentStatus    @default(DRAFT)
  content           String            @db.Text
  structuredFacts   Json?
  validationScore   Float?
  validationSummary Json?
  userId            String
  user              User              @relation(fields: [userId], references: [id])
  versions          DocumentVersion[]
  agentRuns         AgentRun[]
  auditLogs         AuditLog[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model Clause {
  id           String        @id @default(uuid())
  title        String
  documentType String
  clauseType   String
  content      String        @db.Text
  status       ClauseStatus  @default(APPROVED)
  // Stored in PostgreSQL as: embedding vector(384)
}

model KnowledgeChunk {
  id         String            @id @default(uuid())
  documentId String
  document   KnowledgeDocument @relation(fields: [documentId], references: [id])
  chunkIndex Int
  content    String            @db.Text
  // Stored in PostgreSQL as: embedding vector(384)
}
```

---

## 7. Multi-Tier Validation & Explainable Scoring Model

The `ValidationEngine` implements three complementary safety layers:

### 7.1 Layer 1: Deterministic Constraint Layer (Authoritative)
- **Placeholder & Blank Prohibition**: Scans for unresolved tokens (`[Party Name]`, `[Insert Date]`, `TBD`, `N/A`, `YOUR NAME`, extended blank underlines `_____`).
- **Required Fields Verification**: Verifies presence of parties, effective dates, contract duration, and governing law in both structured facts and document text.
- **Substantive Clause Evaluation**: Evaluates presence and completeness (`PRESENT`, `INCOMPLETE`, `MISSING`) of canonical covenants (Definitions, Non-Disclosure, Exceptions, Term/Survival, Governing Law, Remedies).
- **Consistency & Defect Checks**: Detects internal timeframe contradictions, party entity name mismatches, and broken cross-references.

### 7.2 Layer 2: NLP Semantic Consistency Layer
- Passes draft sections to the Legal NLP service to compute semantic distance against approved clause clusters.
- Operates in non-blocking mode: if the NLP microservice is cold-starting, the deterministic engine functions authoritatively with zero downtime.

### 7.3 Layer 3: Explainable Scoring Formula & Hard Caps
$$\text{Base Score} = 100$$
$$\text{Penalty} = (18 \times N_{\text{HIGH}}) + (5 \times N_{\text{MEDIUM}}) + (2 \times N_{\text{LOW}})$$
$$\text{Raw Score} = \max(0, 100 - \text{Penalty})$$

#### Hard Caps:
- If missing 2+ core canonical clauses: $\text{Score} \le 50\%$.
- If missing essential required fields or unresolved placeholders: $\text{Score} \le 65\%$.
- If $\ge 2$ high-severity legal risks: $\text{Score} \le 70\%$.
- If $\ge 1$ high-severity issue: $\text{Score} < 75\%$.

---

## 8. Export & Delivery Engine

The `ExportService` compiles validated legal markdown into court-ready documents:
- **Microsoft Word (`.docx`)**: Styled using `docx` with 1-inch margins, Heading 1 (centered titles), Heading 2 (numbered covenants), justified body text, horizontal divider rules, and side-by-side signature blocks.
- **Adobe PDF (`.pdf`)**: Generated using `pdfkit` on A4 paper with professional legal typography, header rules, page numbers, and confidentiality footers.

---

## 9. Faculty Defense & Technical Viva Q&A

### Q1: "Why did you build this instead of prompting ChatGPT or Claude directly?"
> **Answer**: Direct LLM prompting is inherently non-deterministic and ungrounded. In commercial and statutory law, a single hallucinated date, missing indemnity cap, or fabricated court citation can nullify an agreement or expose a company to catastrophic liability. Atharv Legal AI enforces a multi-tier safety architecture combining an authoritative questionnaire, approved clause retrieval via pgvector, deterministic contract analysis, and hard scoring caps to guarantee contractual integrity and enforceability.

### Q2: "What NLP model does the system use and why all-MiniLM-L6-v2 instead of heavy legal models?"
> **Answer**: The system uses `sentence-transformers/all-MiniLM-L6-v2`. During architectural auditing, we discovered that 768-dim models like `law-ai/InLegalBERT` consumed over 1.2 GB of RAM, causing Out-of-Memory crashes on free cloud infrastructure (e.g. Render's 512 MB ceiling) and introducing 5-second inference latencies. `all-MiniLM-L6-v2` provides dense 384-dimensional sentence embeddings in under 250 MB RAM, runs on a single CPU thread, and produces sub-second semantic similarities (150–300ms) with zero crash risk.

### Q3: "Can the NLP embedding model generate contract text by itself?"
> **Answer**: No, sir. Embedding models are bidirectional encoders, not autoregressive text generators. Prompting an encoder to write text token-by-token is architecturally impossible. In Atharv Legal AI, the NLP model is properly utilized for representation, semantic distance calculation, and taxonomy classification, while text assembly is handled by our template-governed Generation Service.

### Q4: "How does the Multi-Format Contract Analyzer handle corrupted or non-standard documents?"
> **Answer**: The Contract Analyzer implements multi-layer fallback extractors. For PDF documents, it uses `pdf-parse` with a zero-dependency fallback for unparsed streams. For DOCX files, it uses `mammoth` with a native Node `zlib` XML stream fallback that directly decompresses `word/document.xml`. This guarantees the system never crashes on unusual or partially damaged client uploads.

### Q5: "What is the Human Review Layer and how does it maintain accountability?"
> **Answer**: Automated AI validation is informational and cannot replace legal counsel. The Human Review Layer allows lawyers to triage every detected issue directly in the editor as `Accepted`, `Dismissed`, or `Needs Review`. Each review action is recorded with the counsel's user ID, timestamp, and review notes in the PostgreSQL `AuditLog` table, maintaining a complete, auditable legal paper trail.
