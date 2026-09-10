# Atharv Legal AI: Controlled Legal Document Generation & Multi-Tier Validation System

> **A Production-Grade Research Legal Tech Platform**  
> Investigating whether combining structured legal information extraction, legal-domain language model encoders (`InLegalBERT`), template-governed drafting, approved clause retrieval, PostgreSQL pgvector RAG, and multi-tier automated validation improves the reliability, consistency, and factual accuracy of AI-generated legal documents.

---

## Complete Documentation

For the comprehensive technical specification, architecture diagrams, step-by-step pipeline breakdown, and faculty defense Q&A, please refer to:
👉 **[`DOCUMENTATION.md`](./DOCUMENTATION.md)**

---

## 1. Quick Start Guide

### 1.1 Microservice Architecture
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS (`http://localhost:5173`)
- **Backend**: Node.js Express, Prisma ORM, TypeScript (`http://localhost:5000`)
- **Legal NLP**: Python 3.13, FastAPI, `law-ai/InLegalBERT` (`http://localhost:8001`)
- **Database**: PostgreSQL 16 + `pgvector` container (Port `5433`, DB: `mira_db`)

### 1.2 Default Login Credentials
- **Researcher**: `user@atharv.legal` / `user123`
- **Administrator / Legal Lead**: `admin@atharv.legal` / `admin123`

---

## 2. Key Features

1. **Exhaustive 5-Step Questionnaire**: Zero missing legal facts (Parties, Agreement Terms, Confidential Scope, Obligations & Remedies, Instructions).
2. **10-Step Controlled Agent State Machine**: Atomic transitions from entity extraction to final versioning with full audit logging into `agent_steps`.
3. **Multi-Tier Validation Engine**:
   - **Layer 1**: Deterministic fact rules (exact names, durations, dates, monetary amounts).
   - **Layer 2**: InLegalBERT semantic distance and clause-type anomaly detection.
   - **Layer 3**: Composite AI Validation Score (0–100%).
4. **Interactive 3-Panel Legal Editor**: Section outline with status badges, center manual editing workspace, and InLegalBERT validation inspector.
5. **Court-Ready Export**: One-click generation of styled Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) documents with dual signature blocks.
6. **Empirical Research Benchmarking**: Live quantitative comparison matrix of Atharv AI vs Baseline Direct LLM.

---

## 3. Running Automated Tests

Run the full end-to-end integration test suite verifying the 5-step questionnaire, InLegalBERT pipeline, factual tamper detection, and DOCX/PDF export:

```bash
cd backend
npx tsx src/test_atharv.ts
```

All 18 contractual parameters are verified in the draft with zero missing facts.
