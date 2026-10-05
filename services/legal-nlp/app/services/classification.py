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

        # Prototype vectors for 10 document types
        self.doc_prototypes = {
            "NDA": [
                "non-disclosure agreement proprietary information confidentiality disclosing party receiving party mutual nda trade secrets obligations return destruction",
                "confidential disclosure agreement intellectual property sensitive business information non disclosure"
            ],
            "LEGAL_NOTICE": [
                "legal notice formal notice demand for payment breach of contract default section 138 statutory notice outstanding dues dishonour of cheque",
                "notice under section demand notice call upon you to pay amount failed to perform obligation litigation consequences"
            ],
            "EMPLOYMENT": [
                "employment agreement employment contract offer letter designation employee employer salary probation period ctc termination duties",
                "contract of employment appointment letter employee obligations compensation benefits annual leave notice period resignation"
            ],
            "SERVICE": [
                "master services agreement professional services contract scope of work deliverables client service provider service fees milestones invoicing",
                "service agreement statement of work deliverables timeline terms of service acceptance criteria fees payment terms"
            ],
            "SAAS": [
                "software as a service agreement saas subscription agreement platform cloud hosting license service level agreement uptime sla recurring fee customer provider",
                "cloud subscription terms access grant data protection sla uptime maintenance window auto-renewal"
            ],
            "CONSULTING": [
                "consulting agreement consultant independent contractor advisory services retainer fee deliverables scope strategic advisor client",
                "independent consultancy contract advisory duties hourly rate retainer intellectual property rights work product"
            ],
            "MOU": [
                "memorandum of understanding mou collaboration cooperation non-binding understanding mutual objectives statement of intent joint initiative",
                "mou between parties exploratory collaboration non binding declaration of intent institutional cooperation"
            ],
            "VENDOR": [
                "vendor agreement supplier agreement supply of goods purchase order procurement pricing delivery warranty vendor buyer",
                "master vendor contract product supply specification order terms returns inspection"
            ],
            "PARTNERSHIP": [
                "partnership agreement general partnership joint venture capital contribution profit sharing partners dissolution governance",
                "business partnership deed capital investment profit loss allocation partnership management"
            ],
            "INTERNSHIP": [
                "internship agreement trainee contract student intern stipend internship duration educational mentor learning objectives",
                "intern appointment letter training program stipend project mentor completion certificate"
            ],
            "LEASE": [
                "commercial lease agreement residential lease tenancy contract landlord tenant premises rent security deposit maintenance term",
                "rental deed lease premises possession monthly rent security deposit covenants quiet enjoyment"
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
            "signatures": "signature of advocate advocate code bar council enrollment stamp"
        }

        self._doc_proto_cache = None
        self._nda_clause_proto_cache = None
        self._notice_clause_proto_cache = None

    def _get_doc_proto_embeddings(self):
        if self._doc_proto_cache is None:
            self._doc_proto_cache = {
                k: self.embedder.embed_texts(v) for k, v in self.doc_prototypes.items()
            }
        return self._doc_proto_cache

    def _get_clause_proto_embeddings(self, document_type: str = "NDA"):
        if document_type == "NDA":
            if self._nda_clause_proto_cache is None:
                keys = list(self.nda_clause_prototypes.keys())
                texts = [self.nda_clause_prototypes[k] for k in keys]
                embs = self.embedder.embed_texts(texts)
                self._nda_clause_proto_cache = dict(zip(keys, embs))
            return self._nda_clause_proto_cache
        else:
            if self._notice_clause_proto_cache is None:
                keys = list(self.notice_clause_prototypes.keys())
                texts = [self.notice_clause_prototypes[k] for k in keys]
                embs = self.embedder.embed_texts(texts)
                self._notice_clause_proto_cache = dict(zip(keys, embs))
            return self._notice_clause_proto_cache

    def classify_document(self, text: str) -> Tuple[str, float, Dict[str, float]]:
        text_lower = text.lower()

        type_keywords = {
            "NDA": ["nda", "non-disclosure", "confidentiality", "trade secret", "disclosing party", "receiving party", "confidential information"],
            "LEGAL_NOTICE": ["legal notice", "demand notice", "statutory notice", "breach of contract", "outstanding amount", "called upon to pay", "cheque dishonour", "consequences of failure"],
            "EMPLOYMENT": ["employment agreement", "contract of employment", "appointment letter", "employer", "employee", "probation period", "salary", "ctc"],
            "SERVICE": ["master services agreement", "service agreement", "scope of services", "deliverables", "service provider", "client", "milestones"],
            "SAAS": ["software as a service", "saas agreement", "subscription agreement", "cloud service", "uptime sla", "licensed users", "subscription fee"],
            "CONSULTING": ["consulting agreement", "consultancy agreement", "independent contractor", "advisory services", "consultant"],
            "MOU": ["memorandum of understanding", "mou", "non-binding understanding", "statement of intent", "collaboration between"],
            "VENDOR": ["vendor agreement", "supplier agreement", "procurement", "purchase order", "supply of goods"],
            "PARTNERSHIP": ["partnership agreement", "general partnership", "profit sharing", "joint venture"],
            "INTERNSHIP": ["internship agreement", "internship", "trainee", "stipend", "educational mentor"],
            "LEASE": ["lease agreement", "rental agreement", "landlord", "tenant", "premises", "security deposit"]
        }

        # Semantic embedding similarity
        text_emb = self.embedder.embed_texts([text])[0]
        proto_cache = self._get_doc_proto_embeddings()

        raw_scores = {}
        for doc_type, proto_embs in proto_cache.items():
            kw_list = type_keywords.get(doc_type, [])
            kw_score = sum(2.0 for k in kw_list if k in text_lower)
            sim = max(self.embedder.compute_similarity(text_emb, p) for p in proto_embs)
            raw_scores[doc_type] = sim * 3.0 + kw_score

        sum_scores = sum(raw_scores.values()) + 1e-5
        normalized_scores = {k: round(float(v / sum_scores), 4) for k, v in raw_scores.items()}
        normalized_scores["UNKNOWN"] = 0.02

        best_type = max(raw_scores, key=raw_scores.get)
        best_val = raw_scores[best_type]

        if best_val > 1.2:
            conf = min(0.98, max(0.60, round(normalized_scores[best_type] * 0.5 + 0.45, 2)))
            return best_type, conf, normalized_scores
        else:
            return "UNKNOWN", 0.50, normalized_scores

    def classify_clause(self, text: str, document_type: str = "NDA") -> Tuple[str, float, Dict[str, float]]:
        proto_embs_map = self._get_clause_proto_embeddings(document_type)
        text_emb = self.embedder.embed_texts([text])[0]

        scores = {}
        best_type = list(proto_embs_map.keys())[0]
        best_sim = -1.0

        for clause_type, proto_emb in proto_embs_map.items():
            sim = self.embedder.compute_similarity(text_emb, proto_emb)
            scores[clause_type] = round(sim, 3)
            if sim > best_sim:
                best_sim = sim
                best_type = clause_type

        conf = min(0.99, max(0.55, round(best_sim, 2)))
        return best_type, conf, scores
