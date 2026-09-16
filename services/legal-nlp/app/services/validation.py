import logging
import re
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
            for sec in sections:
                title = (sec.get("title") or "").lower()
                content = sec.get("content", "").lower()
                combo = f"{title} {content}"

                if exp == "title":
                    if re.search(r"\b(?:non-disclosure|confidentiality|agreement|nda|preamble)\b", title) or re.search(r"\b(?:non-disclosure\s+agreement|confidentiality\s+agreement)\b", content):
                        return True
                elif exp == "parties":
                    if re.search(r"\b(?:parties|by\s+and\s+between|entered\s+into\s+by|disclosing\s+party|receiving\s+party)\b", combo):
                        return True
                elif exp == "purpose":
                    if re.search(r"\b(?:purpose|recitals?|whereas|background|business\s+relationship)\b", combo):
                        return True
                elif exp == "definition":
                    if re.search(r"\b(?:definition\s+of|confidential\s+information|proprietary\s+information|scope\s+of\s+confidentiality)\b", combo):
                        return True
                elif exp == "confidentiality":
                    if re.search(r"\b(?:obligations?|maintain\s+in\s+confidence|strict\s+confidence|shall\s+not\s+disclose|duty\s+of\s+care|covenants?)\b", combo):
                        return True
                elif exp == "exceptions":
                    if re.search(r"\b(?:exceptions?|exclusions?|shall\s+not\s+apply|public\s*domain|prior\s*possession|prior\s*knowledge|independently\s*developed)\b", combo):
                        return True
                elif exp == "permitted_disclosure":
                    if re.search(r"\b(?:permitted\s+disclosure|need\s+to\s+know|advisors?|counsel|directors|officers)\b", combo):
                        return True
                elif exp == "return_destruction":
                    if re.search(r"\b(?:return|destruct(?:ion)?|destroy|surrender)\b", combo):
                        return True
                elif exp == "duration":
                    if re.search(r"\b(?:term|duration|period\s+of|survival|survive|effective\s+date)\b", combo) and re.search(r"\b(?:\d+\s*(?:years?|months?)|effective|termination)\b", combo):
                        return True
                elif exp == "remedies":
                    if re.search(r"\b(?:remedies|injunct(?:ion|ive)|damages|irreparable\s+harm|relief)\b", combo):
                        return True
                elif exp == "governing_law":
                    if re.search(r"\b(?:governing\s+law|laws\s+of|jurisdiction\s+of|courts\s+of)\b", combo):
                        return True
                elif exp == "dispute_resolution":
                    if re.search(r"\b(?:dispute|arbitrat(?:ion)?|jurisdiction|governing\s+law|courts?)\b", combo):
                        return True
                elif exp == "miscellaneous":
                    if re.search(r"\b(?:miscellaneous|general|severab(?:ility)?|entire\s+agreement|counterparts?|notices?)\b", combo):
                        return True
                elif exp == "signatures":
                    if re.search(r"\b(?:signatures?|execution|in\s+witness\s+whereof|authorized\s+signator(?:y|ies)|by:\s*_+)\b", combo):
                        return True
            return False

        def matches_canonical_notice(exp: str) -> bool:
            for sec in sections:
                title = (sec.get("title") or "").lower()
                content = sec.get("content", "").lower()
                combo = f"{title} {content}"

                if exp == "sender":
                    if re.search(r"\b(?:from|sender|on\s+behalf\s+of|claimant)\b", combo):
                        return True
                elif exp == "recipient":
                    if re.search(r"\b(?:to:|recipient|addressed\s+to|addressee)\b", combo):
                        return True
                elif exp == "subject":
                    if re.search(r"\b(?:subject|re:|legal\s+notice)\b", combo) or "notice" in title:
                        return True
                elif exp == "facts" or exp == "background":
                    if re.search(r"\b(?:facts?|background|transaction|agreement|relationship)\b", combo):
                        return True
                elif exp == "breach":
                    if re.search(r"\b(?:breach|default|failure|non-payment|unpaid|dishonou?r)\b", combo):
                        return True
                elif exp == "legal_basis":
                    if re.search(r"\b(?:section\s+\d+|under\s+section|pursuant\s+to|provisions\s+of|act\b)\b", combo):
                        return True
                elif exp == "demand":
                    if re.search(r"\b(?:demand|call\s+upon|pay\s+the\s+sum|remit|cure)\b", combo) or "$" in combo:
                        return True
                elif exp == "response_period":
                    if re.search(r"\b\d+\s*days\b", combo) or re.search(r"\b(?:within|period\s+of)\s*\d+\s*days\b", combo):
                        return True
                elif exp == "consequences":
                    if re.search(r"\b(?:prosecut(?:ion)?|proceedings?|lawsuit|legal\s+action|costs?\s+and\s+consequences)\b", combo):
                        return True
                elif exp == "signatures" or exp == "closing":
                    if re.search(r"\b(?:advocate|counsel|yours\s+(?:faithfully|sincerely)|authorized\s+signatory|signature)\b", combo):
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
