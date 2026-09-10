from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class HealthResponse(BaseModel):
    status: str
    model_name: str
    device: str
    embedding_dim: int
    max_length: int
    loaded: bool

class ClassifyRequest(BaseModel):
    text: str

class ClassifyResponse(BaseModel):
    documentType: str
    confidence: float
    scores: Dict[str, float]

class ExtractRequest(BaseModel):
    text: str
    documentType: Optional[str] = None

class PartyEntity(BaseModel):
    name: str = ""
    type: str = ""
    address: str = ""

class NDAFacts(BaseModel):
    disclosingParty: PartyEntity = Field(default_factory=PartyEntity)
    receivingParty: PartyEntity = Field(default_factory=PartyEntity)
    purpose: str = ""
    confidentialInformation: List[str] = Field(default_factory=list)
    duration: str = ""
    permittedDisclosures: List[str] = Field(default_factory=list)
    exceptions: List[str] = Field(default_factory=list)
    governingLaw: str = ""
    jurisdiction: str = ""
    effectiveDate: str = ""

class NoticePartyEntity(BaseModel):
    name: str = ""
    address: str = ""

class LegalNoticeFacts(BaseModel):
    sender: NoticePartyEntity = Field(default_factory=NoticePartyEntity)
    recipient: NoticePartyEntity = Field(default_factory=NoticePartyEntity)
    subject: str = ""
    background: str = ""
    facts: List[str] = Field(default_factory=list)
    breach: str = ""
    legalBasis: List[str] = Field(default_factory=list)
    amount: str = ""
    demand: str = ""
    responsePeriod: str = ""
    jurisdiction: str = ""
    date: str = ""

class ExtractResponse(BaseModel):
    documentType: str
    facts: Dict[str, Any]
    extractedEntities: Dict[str, List[str]]

class EmbedRequest(BaseModel):
    texts: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int

class SimilarityRequest(BaseModel):
    textA: str
    textB: str

class SimilarityResponse(BaseModel):
    similarity: float

class ClauseClassifyRequest(BaseModel):
    text: str
    documentType: Optional[str] = "NDA"

class ClauseClassifyResponse(BaseModel):
    clauseType: str
    confidence: float
    scores: Dict[str, float]

class SectionItem(BaseModel):
    sectionType: str
    title: Optional[str] = None
    content: str

class ApprovedClauseItem(BaseModel):
    clauseType: str
    title: Optional[str] = None
    content: str

class ValidateRequest(BaseModel):
    documentType: str
    sections: List[SectionItem]
    approvedClauses: Optional[List[ApprovedClauseItem]] = Field(default_factory=list)

class ValidationIssue(BaseModel):
    type: str
    severity: str # HIGH, MEDIUM, LOW
    section: str
    description: str

class ValidateResponse(BaseModel):
    valid: bool
    score: float
    issues: List[ValidationIssue]
