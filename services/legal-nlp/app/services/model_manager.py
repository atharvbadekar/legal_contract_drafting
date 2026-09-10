import os
import logging
import torch
from typing import Optional

logger = logging.getLogger("mira.legal_nlp.model_manager")
logging.basicConfig(level=logging.INFO)

class ModelManager:
    _instance: Optional['ModelManager'] = None

    def __init__(self):
        self.model_name = os.getenv("LEGAL_MODEL_NAME", "law-ai/InLegalBERT")
        requested_device = os.getenv("LEGAL_MODEL_DEVICE", "auto")
        if requested_device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = requested_device

        self.max_length = int(os.getenv("LEGAL_MAX_LENGTH", "512"))
        self.tokenizer = None
        self.model = None
        self.is_loaded = False
        self.embedding_dim = 768

    @classmethod
    def get_instance(cls) -> 'ModelManager':
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def load_model(self):
        if self.is_loaded:
            return

        logger.info(f"Loading Legal-BERT model: {self.model_name} on device: {self.device}...")
        try:
            from transformers import AutoTokenizer, AutoModel
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            self.embedding_dim = self.model.config.hidden_size
            self.is_loaded = True
            logger.info(f"Successfully loaded {self.model_name} (dim: {self.embedding_dim})")
        except Exception as e:
            logger.warning(f"Could not load remote model {self.model_name} directly ({e}). Attempting secondary model 'nlpaueb/legal-bert-base-uncased' or local fallback...")
            try:
                from transformers import AutoTokenizer, AutoModel
                fallback_name = "nlpaueb/legal-bert-base-uncased"
                self.tokenizer = AutoTokenizer.from_pretrained(fallback_name)
                self.model = AutoModel.from_pretrained(fallback_name)
                self.model.to(self.device)
                self.model.eval()
                self.embedding_dim = self.model.config.hidden_size
                self.model_name = fallback_name
                self.is_loaded = True
                logger.info(f"Loaded fallback model {fallback_name}")
            except Exception as e2:
                logger.error(f"Failed loading transformers model from HF Hub: {e2}. Initializing deterministic legal representation encoder.")
                self.is_loaded = False
                self.embedding_dim = 768

    def get_status(self) -> dict:
        return {
            "status": "ready" if (self.is_loaded or self.model is not None) else "initialized",
            "model_name": self.model_name,
            "device": self.device,
            "embedding_dim": self.embedding_dim,
            "max_length": self.max_length,
            "loaded": self.is_loaded
        }
