import logging
import re
from typing import Dict, Tuple
from .model_manager import ModelManager
from .embedding import LegalEmbeddingService

logger = logging.getLogger("mira.legal_nlp.classification")

class LegalClassificationService:
    def __init__(self, model_manager: ModelManager, embedding_service: LegalEmbeddingService):
        self.mgr = model_manager
        self.embedder = embedding_service

        # Prototype vectors for document types
        self.doc_prototypes = {
            "NDA": [
                "non-disclosure agreement proprietary information confidentiality disclosing party receiving party mutual nda trade secrets obligations return destruction",
                "confidential disclosure agreement intellectual property sensitive business information non disclosure"
            ],
            "LEGAL_NOTICE": [
                "legal notice formal notice demand for payment breach of contract default section 138 statutory notice outstanding dues dishonour of cheque",
                "notice under section demand notice call upon you to pay amount failed to perform obligation litigation consequences"
            ]
        }

        # Prototype texts for NDA clauses
        self.nda_clause_prototypes = {
            "definition": "definition of confidential information includes technical data source code financial records business plans",
            "purpose": "purpose of this agreement evaluation of collaboration discussions business partnership project",
            "confidentiality": "confidentiality obligations receiving party shall maintain strictly confidential not disclose to third party",
            "permitted_disclosure": "permitted disclosure to employees officers legal advisors having need to know bound by confidentiality",
            "exceptions": "exceptions to confidential information public domain prior possession rightfully received from third party independently developed",
            "return_destruction": "return or destruction of materials upon termination prompt return of documents certified destruction",
            "duration": "term and duration of agreement obligations shall survive for period of years effective date",
            "remedies": "remedies for breach injunctive relief irreparable harm without necessity of posting bond damages",
            "governing_law": "governing law construed in accordance with laws of jurisdiction courts of competent jurisdiction",
            "dispute_resolution": "dispute resolution arbitration conciliation seat of arbitration tribunal rules",
            "miscellaneous": "miscellaneous provisions entire agreement amendments severability waiver notices counterpart",
            "signatures": "in witness whereof the parties have executed this agreement signatures authorized representatives"
        }

        # Prototype texts for Legal Notice clauses
        self.notice_clause_prototypes = {
            "parties": "to and from sender advocate on behalf of client addressee recipient",
            "subject": "subject legal notice regarding breach default non payment outstanding amount",
            "background": "background narration our client entered into contract dated relationship between parties",
            "facts": "statement of facts invoices raised delivery of goods services rendered timeline of events",
            "breach": "breach of obligations failure to pay neglected to perform repudiation of contract default",
            "legal_basis": "legal basis statutory provisions sections breach of trust dishonour of cheque liability under law",
            "demand": "demand call upon you to pay sum within days along with interest fail not",
            "response_period": "response period within 15 days 30 days from receipt of this legal notice",
            "consequences": "consequences failing which our client will initiate legal proceedings civil criminal at your risk cost",
            "closing": "closing yours sincerely advocate for client copy retained for record",
            "signatures": "signature of advocate advocate code bar council enrollment stamp"
        }

    def classify_document(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        text_lower = text.lower()

        # Deterministic keyword priors
        nda_keywords = ["nda", "non-disclosure", "confidentiality", "trade secret", "disclosing party", "receiving party", "confidential information"]
        notice_keywords = ["legal notice", "demand notice", "statutory notice", "breach of contract", "outstanding amount", "called upon to pay", "cheque dishonour", "consequences of failure"]

        nda_score = sum(2.0 for k in nda_keywords if k in text_lower)
        notice_score = sum(2.0 for k in notice_keywords if k in text_lower)

        # Semantic embedding similarity
        text_emb = self.embedder.embed_texts([text])[0]
        
        nda_proto_embs = self.embedder.embed_texts(self.doc_prototypes["NDA"])
        notice_proto_embs = self.embedder.embed_texts(self.doc_prototypes["LEGAL_NOTICE"])

        sim_nda = max(self.embedder.compute_similarity(text_emb, p) for p in nda_proto_embs)
        sim_notice = max(self.embedder.compute_similarity(text_emb, p) for p in notice_proto_embs)

        total_nda = sim_nda * 3.0 + nda_score
        total_notice = sim_notice * 3.0 + notice_score

        scores = {
            "NDA": round(float(total_nda / (total_nda + total_notice + 1e-5)), 4),
            "LEGAL_NOTICE": round(float(total_notice / (total_nda + total_notice + 1e-5)), 4),
            "UNKNOWN": 0.05
        }

        if total_nda > total_notice and total_nda > 1.2:
            conf = min(0.98, max(0.60, round(sim_nda * 0.5 + 0.45, 2)))
            return "NDA", conf, scores
        elif total_notice > total_nda and total_notice > 1.2:
            conf = min(0.98, max(0.60, round(sim_notice * 0.5 + 0.45, 2)))
            return "LEGAL_NOTICE", conf, scores
        else:
            return "UNKNOWN", 0.50, scores

    def classify_clause(self, text: str, document_type: str = "NDA") -> Tuple[str, float, Dict[str, float]]:
        prototypes = self.nda_clause_prototypes if document_type == "NDA" else self.notice_clause_prototypes
        text_emb = self.embedder.embed_texts([text])[0]

        scores = {}
        best_type = list(prototypes.keys())[0]
        best_sim = -1.0

        for clause_type, proto_text in prototypes.items():
            proto_emb = self.embedder.embed_texts([proto_text])[0]
            sim = self.embedder.compute_similarity(text_emb, proto_emb)
            scores[clause_type] = round(sim, 3)
            if sim > best_sim:
                best_sim = sim
                best_type = clause_type

        conf = min(0.99, max(0.55, round(best_sim, 2)))
        return best_type, conf, scores
