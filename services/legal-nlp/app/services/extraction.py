import logging
import re
from typing import Dict, Any, List
from .model_manager import ModelManager

logger = logging.getLogger("mira.legal_nlp.extraction")

class LegalEntityExtractionService:
    def __init__(self, model_manager: ModelManager):
        self.mgr = model_manager

    def extract_entities(self, text: str, document_type: str = "NDA") -> Dict[str, Any]:
        """
        Extracts structured legal entities from raw user input using legal patterns,
        regex heuristics, and structured slot extraction.
        """
        raw_entities = {
            "ORGANIZATION": [],
            "PERSON": [],
            "ADDRESS": [],
            "DATE": [],
            "MONEY": [],
            "JURISDICTION": [],
            "DURATION": [],
            "CONFIDENTIAL_INFO": [],
            "OBLIGATION": []
        }

        # 1. Company/Entity Regex (Pvt Ltd, LLC, Inc, Corp, Technologies, Solutions, etc.)
        company_patterns = [
            r'\b([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&]*){0,3}\s+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|LLC|Inc\.?|LLP|Corporation|Solutions|Technologies|Enterprises))\b',
            r'(?:between|disclosing\s+party|from)\s+([A-Z][A-Za-z0-9\s&]{2,30}?)(?=\s+(?:located|having|will|shall|and|,|\.))',
            r'(?:to|receiving\s+party)\s+([A-Z][A-Za-z0-9\s&]{2,30}?)(?=\s+(?:for|under|subject|having|,|\.|$))'
        ]
        parties_found = []
        for pattern in company_patterns:
            matches = re.findall(pattern, text)
            for m in matches:
                cleaned = m.strip(" ,.-")
                # Filter out stopwords and phrases
                if len(cleaned) > 2 and cleaned not in parties_found and not re.search(r'\b(will|shall|disclose|located|having|under)\b', cleaned, re.IGNORECASE):
                    parties_found.append(cleaned)
                    raw_entities["ORGANIZATION"].append(cleaned)

        # Fallback party detection
        if not parties_found:
            and_split = re.search(r'(?:between|from)\s+([^,]+?)\s+(?:and|to)\s+([^,\.]+)', text, re.IGNORECASE)
            if and_split:
                p1 = and_split.group(1).strip()
                p2 = and_split.group(2).strip()
                if len(p1) > 1: parties_found.append(p1)
                if len(p2) > 1: parties_found.append(p2)

        # 2. Location / Address / Jurisdiction
        loc_match = re.search(r'(?:located\s+in|having\s+its\s+office\s+at|at|residing\s+at|in)\s+([A-Z][A-Za-z0-9\s,]{2,40})(?=\s+(?:will|shall|and|for|\.|$))', text, re.IGNORECASE)
        location = ""
        if loc_match:
            location = loc_match.group(1).strip(" ,.-")
            raw_entities["ADDRESS"].append(location)

        jurisdiction_match = re.search(r'(?:governed\s+by\s+(?:the\s+laws\s+of)?|jurisdiction\s+of(?:\s+the\s+courts\s+of)?|laws\s+of)\s+([A-Z][A-Za-z0-9\s]{2,25})', text, re.IGNORECASE)
        jurisdiction = ""
        if jurisdiction_match:
            jurisdiction = jurisdiction_match.group(1).strip(" ,.-")
            raw_entities["JURISDICTION"].append(jurisdiction)
        elif location:
            jurisdiction = location

        # 3. Duration
        duration_match = re.search(r'(?:for\s+a\s+period\s+of|duration\s+of|period\s+of|for)\s+(\d+\s*(?:years?|months?|days?)|(?:one|two|three|four|five|ten)\s+years?)', text, re.IGNORECASE)
        duration = ""
        if duration_match:
            duration = duration_match.group(1).strip()
            raw_entities["DURATION"].append(duration)

        # 4. Confidential Information Scope
        conf_match = re.search(r'(?:disclose|confidential\s+information(?:\s+includes?|\s+such\s+as)?|proprietary\s+data(?:\s+such\s+as)?)\s+([a-zA-Z\s,]+?)(?=\s+(?:for\s+a|for\s+\d+|under|subject|\.|$))', text, re.IGNORECASE)
        conf_items = []
        if conf_match:
            extracted_scope = conf_match.group(1).replace("confidential", "").strip()
            parts = [p.strip() for p in re.split(r',|\band\b', extracted_scope) if len(p.strip()) > 2]
            conf_items = parts
            raw_entities["CONFIDENTIAL_INFO"].extend(parts)

        # 5. Money / Outstanding Amount
        money_match = re.search(r'(?:₹|Rs\.?|INR|USD|\$)\s*([\d,]+(?:\.\d{2})?)|(?:amount\s+of\s+)?([\d,]+)\s*(?:rupees|inr|usd|dollars)', text, re.IGNORECASE)
        amount = ""
        if money_match:
            val = money_match.group(1) or money_match.group(2)
            currency = "₹" if "₹" in text or "rs" in text.lower() or "rupee" in text.lower() else "$"
            amount = f"{currency}{val.strip()}"
            raw_entities["MONEY"].append(amount)

        # 6. Response Period / Deadline
        response_match = re.search(r'(?:within|period\s+of)\s+(\d+\s*days?|(?:seven|fifteen|thirty|15|30|7)\s+days?)', text, re.IGNORECASE)
        response_period = ""
        if response_match:
            response_period = response_match.group(1).strip()
            raw_entities["DURATION"].append(response_period)

        # 7. Dates
        date_match = re.search(r'(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})', text, re.IGNORECASE)
        date_val = ""
        if date_match:
            date_val = date_match.group(1).strip()
            raw_entities["DATE"].append(date_val)

        # 8. Assemble into canonical structured facts
        if document_type == "NDA":
            disclosing = parties_found[0] if len(parties_found) > 0 else ""
            receiving = parties_found[1] if len(parties_found) > 1 else ""

            purpose_match = re.search(r'(?:purpose\s+of|evaluating|evaluation\s+of)\s+([^\.]+)', text, re.IGNORECASE)
            purpose = purpose_match.group(1).strip() if purpose_match else ("Evaluation of potential business collaboration" if disclosing and receiving else "")

            facts = {
                "disclosingParty": {
                    "name": disclosing,
                    "type": "Private Limited Company" if "pvt" in disclosing.lower() else "Entity",
                    "address": location
                },
                "receivingParty": {
                    "name": receiving,
                    "type": "Private Limited Company" if "pvt" in receiving.lower() else "Entity",
                    "address": ""
                },
                "purpose": purpose,
                "confidentialInformation": conf_items if conf_items else ["technical documentation", "proprietary data", "business information"],
                "duration": duration,
                "permittedDisclosures": ["directors", "officers", "employees with a need to know", "legal and financial advisors"],
                "exceptions": ["information in the public domain", "independently developed", "already known without breach"],
                "governingLaw": jurisdiction if jurisdiction else "India",
                "jurisdiction": jurisdiction if jurisdiction else "Jaipur, Rajasthan",
                "effectiveDate": date_val
            }
        else: # LEGAL_NOTICE
            sender = parties_found[0] if len(parties_found) > 0 else ""
            recipient = parties_found[1] if len(parties_found) > 1 else ""

            facts = {
                "sender": {
                    "name": sender,
                    "address": location
                },
                "recipient": {
                    "name": recipient,
                    "address": ""
                },
                "subject": "Legal Notice for Non-Payment and Breach of Contract" if amount else "Formal Legal Notice for Breach of Contract",
                "background": f"Transaction and contractual engagement between {sender or 'Sender'} and {recipient or 'Recipient'}.",
                "facts": [
                    f"Invoices and demands for services/goods were duly communicated to {recipient or 'Recipient'}.",
                    f"The payment obligation has not been satisfied despite multiple reminders."
                ],
                "breach": f"Failure to remit outstanding payment of {amount}" if amount else "Willful default and breach of contractual obligations",
                "legalBasis": ["Section 73 of the Indian Contract Act, 1872", "Commercial Courts Act"],
                "amount": amount,
                "demand": f"Immediate payment of outstanding dues of {amount}" if amount else "Immediate cessation of breach and performance of obligations",
                "responsePeriod": response_period if response_period else "15 days",
                "jurisdiction": jurisdiction if jurisdiction else "Competent jurisdiction",
                "date": date_val
            }

        return {
            "documentType": document_type,
            "facts": facts,
            "extractedEntities": raw_entities
        }
