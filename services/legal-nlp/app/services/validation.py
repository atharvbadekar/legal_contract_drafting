import logging
from typing import List, Dict, Any
from .model_manager import ModelManager
from .embedding import LegalEmbeddingService
from .classification import LegalClassificationService

logger = logging.getLogger("mira.legal_nlp.validation")

class LegalValidationSupportService:
    def __init__(self, model_manager: ModelManager, embedding_service: LegalEmbeddingService, classification_service: LegalClassificationService):
        self.mgr = model_manager
        self.embedder = embedding_service
        self.classifier = classification_service

        self.expected_nda_sections = [
            "title", "parties", "purpose", "definition", "confidentiality",
            "exceptions", "permitted_disclosure", "return_destruction",
            "duration", "remedies", "governing_law", "dispute_resolution",
            "miscellaneous", "signatures"
        ]

        self.expected_notice_sections = [
            "sender", "recipient", "subject", "background", "facts",
            "breach", "legal_basis", "demand", "response_period",
            "consequences", "closing", "signatures"
        ]

    def validate_sections(self, document_type: str, sections: List[Dict[str, Any]], approved_clauses: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Uses Legal-BERT representation to validate generated clauses:
        1. Checks for presence of all canonical legal sections.
        2. Performs clause-type classification on section contents to verify whether the text
           actually matches the declared section header.
        3. Measures semantic similarity against approved clauses (if supplied) to flag suspicious deviations.
        4. Detects duplicate or repetitive clauses.
        """
        issues = []
        expected_sections = self.expected_nda_sections if document_type == "NDA" else self.expected_notice_sections
        provided_section_keys = [s.get("sectionType", "").lower().replace(" ", "_") for s in sections]

        # 1. Missing canonical sections check
        for exp in expected_sections:
            matched = any(exp in k or k in exp for k in provided_section_keys)
            if not matched:
                issues.append({
                    "type": "MISSING_SECTION",
                    "severity": "HIGH",
                    "section": exp.replace("_", " ").title(),
                    "description": f"Standard {document_type} requires a '{exp.replace('_', ' ').title()}' section, but none was detected."
                })

        # 2. Section classification verification & deviation check
        seen_embeddings = []
        approved_map = {}
        if approved_clauses:
            for ac in approved_clauses:
                ctype = ac.get("clauseType", "").lower().replace(" ", "_")
                approved_map[ctype] = ac.get("content", "")

        for sec in sections:
            sec_type = sec.get("sectionType", "").lower().replace(" ", "_")
            content = sec.get("content", "").strip()

            if not content or len(content) < 15:
                issues.append({
                    "type": "EMPTY_OR_TRUNCATED_SECTION",
                    "severity": "HIGH",
                    "section": sec.get("title") or sec_type.title(),
                    "description": f"Section '{sec_type}' appears empty or truncated ({len(content)} characters)."
                })
                continue

            # Classify content with Legal-BERT
            pred_type, conf, scores = self.classifier.classify_clause(content, document_type)

            # If classification strongly contradicts the section title
            # (skip meta sections like title/signatures/parties)
            meta_sections = ["title", "parties", "sender", "recipient", "closing", "signatures"]
            if sec_type not in meta_sections and pred_type not in sec_type and sec_type not in pred_type:
                sec_score = scores.get(sec_type, 0.0)
                if conf > 0.75 and sec_score < 0.45:
                    issues.append({
                        "type": "CLAUSE_TYPE_MISMATCH",
                        "severity": "MEDIUM",
                        "section": sec.get("title") or sec_type.title(),
                        "description": f"Semantic content classified as '{pred_type.replace('_', ' ')}' (conf: {conf:.2f}), but section is labeled '{sec_type.replace('_', ' ')}'."
                    })

            # Check similarity to approved clause
            sec_emb = self.embedder.embed_texts([content])[0]
            if sec_type in approved_map:
                app_content = approved_map[sec_type]
                app_emb = self.embedder.embed_texts([app_content])[0]
                sim = self.embedder.compute_similarity(sec_emb, app_emb)
                if sim < 0.40:
                    issues.append({
                        "type": "APPROVED_CLAUSE_DEVIATION",
                        "severity": "LOW",
                        "section": sec.get("title") or sec_type.title(),
                        "description": f"Clause wording exhibits low semantic alignment (similarity: {sim:.2f}) with the approved library template."
                    })

            # Duplicate clause detection
            for prev_title, prev_emb in seen_embeddings:
                sim_prev = self.embedder.compute_similarity(sec_emb, prev_emb)
                if sim_prev > 0.95:
                    issues.append({
                        "type": "DUPLICATE_CLAUSE",
                        "severity": "MEDIUM",
                        "section": sec.get("title") or sec_type.title(),
                        "description": f"Clause content is highly redundant with previous section '{prev_title}' (similarity: {sim_prev:.2f})."
                    })
            seen_embeddings.append((sec.get("title") or sec_type, sec_emb))

        # Calculate Legal-BERT validation score
        high_count = sum(1 for i in issues if i["severity"] == "HIGH")
        med_count = sum(1 for i in issues if i["severity"] == "MEDIUM")
        low_count = sum(1 for i in issues if i["severity"] == "LOW")

        penalty = (high_count * 20) + (med_count * 10) + (low_count * 4)
        score = max(10, min(100, 100 - penalty))

        return {
            "valid": high_count == 0,
            "score": float(score),
            "issues": issues
        }
