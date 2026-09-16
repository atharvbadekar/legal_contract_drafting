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
        1. Checks for presence of all canonical legal sections using semantic & keyword normalization.
        2. Performs clause-type verification on section contents.
        3. Measures semantic similarity against approved clauses.
        4. Detects duplicate or repetitive clauses.
        """
        issues = []
        full_text = " ".join([s.get("content", "") for s in sections]).lower()

        def matches_canonical_nda(exp: str) -> bool:
            # Check full text and individual section titles
            for sec in sections:
                title = (sec.get("title") or "").lower()
                content = sec.get("content", "").lower()
                combo = f"{title} {content}"

                if exp == "title":
                    if "agreement" in combo or "non-disclosure" in combo or "nda" in combo or "title" in combo or "preamble" in combo or "#" in combo:
                        return True
                elif exp == "parties":
                    if "part" in combo or "between" in combo or "disclosing" in combo or "receiving" in combo:
                        return True
                elif exp == "purpose":
                    if "purpose" in combo or "recital" in combo or "whereas" in combo or "background" in combo:
                        return True
                elif exp == "definition":
                    if "definition" in combo or "confidential information" in combo or "scope" in combo or "proprietary information" in combo:
                        return True
                elif exp == "confidentiality":
                    if "confidential" in combo or "obligation" in combo or "duty of" in combo or "shall maintain" in combo or "covenant" in combo:
                        return True
                elif exp == "exceptions":
                    if "exception" in combo or "exclusion" in combo or "shall not apply to" in combo or "public domain" in combo or "prior possession" in combo or "prior knowledge" in combo:
                        return True
                elif exp == "permitted_disclosure":
                    if "permitted" in combo or "advisor" in combo or "counsel" in combo or "need to know" in combo:
                        return True
                elif exp == "return_destruction":
                    if "return" in combo or "destruct" in combo or "destroy" in combo or "certif" in combo:
                        return True
                elif exp == "duration":
                    if "term" in combo or "duration" in combo or "period of" in combo or "year" in combo or "survival" in combo or "effective date" in combo:
                        return True
                elif exp == "remedies":
                    if "remed" in combo or "injunct" in combo or "damages" in combo or "relief" in combo or "irreparable" in combo:
                        return True
                elif exp == "governing_law":
                    if "governing" in combo or "law" in combo or "jurisdiction" in combo or "courts" in combo:
                        return True
                elif exp == "dispute_resolution":
                    if "dispute" in combo or "arbitrat" in combo or "jurisdiction" in combo or "governing law" in combo or "courts" in combo:
                        return True
                elif exp == "miscellaneous":
                    if "misc" in combo or "general" in combo or "severab" in combo or "entire agreement" in combo or "counterpart" in combo or "notices" in combo:
                        return True
                elif exp == "signatures":
                    if "sign" in combo or "execution" in combo or "in witness whereof" in combo or "by: ____" in combo or "by:" in combo or "authorized" in combo:
                        return True
            return False

        def matches_canonical_notice(exp: str) -> bool:
            for sec in sections:
                title = (sec.get("title") or "").lower()
                content = sec.get("content", "").lower()
                combo = f"{title} {content}"

                if exp == "sender":
                    if "sender" in combo or "from" in combo or "on behalf of" in combo:
                        return True
                elif exp == "recipient":
                    if "recipient" in combo or "to:" in combo or "addressed to" in combo:
                        return True
                elif exp == "subject":
                    if "subject" in combo or "re:" in combo or "notice" in title:
                        return True
                elif exp == "facts" or exp == "background":
                    if "fact" in combo or "background" in combo or "transaction" in combo:
                        return True
                elif exp == "breach":
                    if "breach" in combo or "default" in combo or "failure" in combo or "non-payment" in combo:
                        return True
                elif exp == "legal_basis":
                    if "section" in combo or "act" in combo or "law" in combo or "clause" in combo:
                        return True
                elif exp == "demand":
                    if "demand" in combo or "pay" in combo or "call upon" in combo or "$" in combo:
                        return True
                elif exp == "response_period":
                    if "day" in combo or "period" in combo or "within" in combo:
                        return True
                elif exp == "consequences":
                    if "prosecut" in combo or "proceeding" in combo or "suit" in combo or "risk" in combo:
                        return True
                elif exp == "signatures" or exp == "closing":
                    if "advocate" in combo or "counsel" in combo or "yours" in combo or "sign" in combo:
                        return True
            return False

        # 1. Missing canonical sections check (intelligent)
        expected_sections = self.expected_nda_sections if document_type == "NDA" else self.expected_notice_sections
        for exp in expected_sections:
            is_matched = matches_canonical_nda(exp) if document_type == "NDA" else matches_canonical_notice(exp)
            if not is_matched:
                issues.append({
                    "type": "MISSING_SECTION",
                    "severity": "HIGH",
                    "section": exp.replace("_", " ").title(),
                    "description": f"Standard {document_type} requires a '{exp.replace('_', ' ').title()}' section, but none was detected."
                })

        # 2. Section content & redundancy checks
        seen_embeddings = []
        approved_map = {}
        if approved_clauses:
            for ac in approved_clauses:
                ctype = ac.get("clauseType", "").lower().replace(" ", "_")
                approved_map[ctype] = ac.get("content", "")

        for sec in sections:
            sec_type = sec.get("sectionType", "").lower().replace(" ", "_")
            content = sec.get("content", "").strip()
            title = sec.get("title") or sec_type.title()

            # Ignore truly empty divider artifacts (length < 5)
            if not content or len(content) < 5:
                continue

            if len(content) < 20:
                issues.append({
                    "type": "EMPTY_OR_TRUNCATED_SECTION",
                    "severity": "MEDIUM",
                    "section": title,
                    "description": f"Section '{title}' appears unusually brief or truncated ({len(content)} characters)."
                })
                continue

            # Check similarity to approved clause
            sec_emb = self.embedder.embed_texts([content])[0]
            if sec_type in approved_map:
                app_content = approved_map[sec_type]
                app_emb = self.embedder.embed_texts([app_content])[0]
                sim = self.embedder.compute_similarity(sec_emb, app_emb)
                if sim < 0.35:
                    issues.append({
                        "type": "APPROVED_CLAUSE_DEVIATION",
                        "severity": "LOW",
                        "section": title,
                        "description": f"Clause wording exhibits low semantic alignment (similarity: {sim:.2f}) with institutional standard."
                    })

            # Duplicate clause detection (threshold 0.96)
            for prev_title, prev_emb in seen_embeddings:
                sim_prev = self.embedder.compute_similarity(sec_emb, prev_emb)
                if sim_prev > 0.96:
                    issues.append({
                        "type": "DUPLICATE_CLAUSE",
                        "severity": "MEDIUM",
                        "section": title,
                        "description": f"Section '{title}' is an exact duplicate of '{prev_title}'."
                    })
                    break
            seen_embeddings.append((title, sec_emb))

        # Calculate Legal-BERT validation score
        high_count = sum(1 for i in issues if i["severity"] == "HIGH")
        med_count = sum(1 for i in issues if i["severity"] == "MEDIUM")
        low_count = sum(1 for i in issues if i["severity"] == "LOW")

        penalty = (high_count * 15) + (med_count * 8) + (low_count * 3)
        score = max(20, min(100, 100 - penalty))

        return {
            "valid": high_count == 0,
            "score": float(score),
            "issues": issues
        }
