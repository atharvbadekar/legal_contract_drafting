import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas.models import (
    HealthResponse,
    ClassifyRequest, ClassifyResponse,
    ExtractRequest, ExtractResponse,
    EmbedRequest, EmbedResponse,
    SimilarityRequest, SimilarityResponse,
    ClauseClassifyRequest, ClauseClassifyResponse,
    ValidateRequest, ValidateResponse
)
from .services.model_manager import ModelManager
from .services.embedding import LegalEmbeddingService
from .services.classification import LegalClassificationService
from .services.extraction import LegalEntityExtractionService
from .services.validation import LegalValidationSupportService

logger = logging.getLogger("atharv.legal_nlp")
logging.basicConfig(level=logging.INFO)

model_manager = ModelManager.get_instance()
embedding_service = LegalEmbeddingService(model_manager)
classification_service = LegalClassificationService(model_manager, embedding_service)
extraction_service = LegalEntityExtractionService(model_manager)
validation_service = LegalValidationSupportService(model_manager, embedding_service, classification_service)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Atharv Legal AI NLP Service (InLegalBERT)...")
    # Load model once at startup into memory
    model_manager.load_model()
    yield
    logger.info("Shutting down Atharv Legal NLP Service...")

app = FastAPI(
    title="Atharv Legal AI NLP Service",
    description="Domain-specific Legal-BERT / InLegalBERT inference service for legal document classification, entity extraction, embedding, and validation.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health():
    status = model_manager.get_status()
    return HealthResponse(**status)

@app.post("/classify", response_model=ClassifyResponse)
async def classify_document(req: ClassifyRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    doc_type, conf, scores = classification_service.classify_document(req.text)
    return ClassifyResponse(
        documentType=doc_type,
        confidence=conf,
        scores=scores
    )

@app.post("/extract", response_model=ExtractResponse)
async def extract_entities(req: ExtractRequest):
    doc_type = req.documentType
    if not doc_type or doc_type == "UNKNOWN":
        doc_type, _, _ = classification_service.classify_document(req.text)
        if doc_type == "UNKNOWN":
            doc_type = "NDA"

    result = extraction_service.extract_entities(req.text, doc_type)
    return ExtractResponse(
        documentType=result["documentType"],
        facts=result["facts"],
        extractedEntities=result["extractedEntities"]
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(req: EmbedRequest):
    if not req.texts:
        return EmbedResponse(embeddings=[], dimension=model_manager.embedding_dim)
    embeddings = embedding_service.embed_texts(req.texts)
    dim = len(embeddings[0]) if embeddings else model_manager.embedding_dim
    return EmbedResponse(
        embeddings=embeddings,
        dimension=dim
    )

@app.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(req: SimilarityRequest):
    embs = embedding_service.embed_texts([req.textA, req.textB])
    sim = embedding_service.compute_similarity(embs[0], embs[1])
    return SimilarityResponse(similarity=round(sim, 4))

@app.post("/classify-clause", response_model=ClauseClassifyResponse)
async def classify_clause(req: ClauseClassifyRequest):
    clause_type, conf, scores = classification_service.classify_clause(req.text, req.documentType or "NDA")
    return ClauseClassifyResponse(
        clauseType=clause_type,
        confidence=conf,
        scores=scores
    )

@app.post("/validate", response_model=ValidateResponse)
async def validate_sections(req: ValidateRequest):
    sections_dicts = [s.model_dump() for s in req.sections]
    approved_dicts = [a.model_dump() for a in req.approvedClauses] if req.approvedClauses else []
    res = validation_service.validate_sections(req.documentType, sections_dicts, approved_dicts)
    return ValidateResponse(
        valid=res["valid"],
        score=res["score"],
        issues=res["issues"]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
