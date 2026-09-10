import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.model_manager import ModelManager
from app.services.embedding import LegalEmbeddingService
from app.services.classification import LegalClassificationService
from app.services.extraction import LegalEntityExtractionService

class TestLegalNLP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mgr = ModelManager.get_instance()
        cls.mgr.load_model()
        cls.embedder = LegalEmbeddingService(cls.mgr)
        cls.classifier = LegalClassificationService(cls.mgr, cls.embedder)
        cls.extractor = LegalEntityExtractionService(cls.mgr)

    def test_embedding_dimension_and_normalization(self):
        text = "Confidential information shall be kept strictly secret."
        embs = self.embedder.embed_texts([text])
        self.assertEqual(len(embs), 1)
        self.assertEqual(len(embs[0]), 768)

    def test_similarity_consistency(self):
        text_a = "The receiving party shall preserve confidentiality."
        text_b = "Confidential information shall not be disclosed to any third party."
        text_c = "The tenant shall pay rent on the first day of every month."

        embs = self.embedder.embed_texts([text_a, text_b, text_c])
        sim_ab = self.embedder.compute_similarity(embs[0], embs[1])
        sim_ac = self.embedder.compute_similarity(embs[0], embs[2])

        self.assertGreater(sim_ab, sim_ac, "Related confidentiality clauses should have higher similarity")

    def test_document_classification(self):
        nda_text = "This Non-Disclosure Agreement is entered between disclosing and receiving party regarding trade secrets."
        doc_type, conf, _ = self.classifier.classify_document(nda_text)
        self.assertEqual(doc_type, "NDA")
        self.assertGreater(conf, 0.6)

    def test_legal_entity_extraction(self):
        sample = "ABC Technologies Pvt Ltd located in Jaipur will disclose confidential financial information to XYZ Solutions for a period of 3 years."
        res = self.extractor.extract_entities(sample, "NDA")
        facts = res["facts"]
        self.assertIn("ABC Technologies Pvt Ltd", facts["disclosingParty"]["name"])
        self.assertEqual(facts["duration"], "3 years")

if __name__ == '__main__':
    unittest.main()
