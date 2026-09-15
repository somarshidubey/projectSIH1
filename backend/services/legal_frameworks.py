"""
Legal Framework Context Service
Loads designation-specific constitutional and legal references
for contextualizing AI-generated interview questions.
"""

import json
from pathlib import Path


class LegalFrameworkService:
    def __init__(self):
        path = Path(__file__).parent.parent / "data" / "legal_frameworks.json"
        with open(path, encoding="utf-8") as f:
            self._data = json.load(f)
        self._mapping = self._data.get("designation_mapping", {})
        self._fallback = self._data.get("fallback_designation", "statistical_officer")

    def _normalize_role(self, role: str) -> str:
        r = (role or "").strip().lower()
        if r in self._mapping:
            return r
        if any(k in r for k in ["ias", "district magistrate", "dm", "collector", "commissioner"]):
            return "ias"
        if any(k in r for k in ["ips", "police", "sp", "superintendent", "dgp"]):
            return "ips"
        if any(k in r for k in ["revenue", "tax", "gst", "irs"]):
            return "revenue_officer"
        if any(k in r for k in ["section officer", "so"]):
            return "section_officer"
        if any(k in r for k in ["joint secretary", "js"]):
            return "joint_secretary"
        if any(k in r for k in ["deputy director", "dd"]):
            return "deputy_director"
        if any(k in r for k in ["statistical officer", "iss", "statistics"]):
            return "statistical_officer"
        return self._fallback

    def get_context(self, job_role: str, competency_id: str | None = None) -> dict:
        """Return the legal framework context for a given designation."""
        normalized = self._normalize_role(job_role)
        role_data = self._mapping.get(normalized) or self._mapping.get(self._fallback, {})
        
        context = {
            "designation_title": role_data.get("designation_title", job_role),
            "cadre_group": role_data.get("cadre_group", ""),
            "constitutional_articles": role_data.get("constitutional_articles", []),
            "acts_and_rules": role_data.get("acts_and_rules", []),
            "statutory_rules": role_data.get("statutory_rules", []),
            "competency_context": "",
        }
        
        if competency_id:
            contexts = role_data.get("competency_contexts", {})
            context["competency_context"] = contexts.get(competency_id, "")
        
        return context

    def get_articles_summary(self, job_role: str) -> str:
        """Return a compact string summary of relevant Constitutional Articles."""
        ctx = self.get_context(job_role)
        if not ctx["constitutional_articles"]:
            return ""
        lines = []
        for a in ctx["constitutional_articles"][:4]:
            lines.append(f"{a['article']} ({a['title']})")
        return "; ".join(lines)

    def get_acts_summary(self, job_role: str) -> str:
        """Return a compact string summary of relevant Acts."""
        ctx = self.get_context(job_role)
        if not ctx["acts_and_rules"]:
            return ""
        lines = []
        for a in ctx["acts_and_rules"][:3]:
            lines.append(a["act"])
        return "; ".join(lines)

    def get_competency_legal_context(self, job_role: str, competency_id: str) -> str:
        """Return a one-paragraph legal context specific to a competency and role."""
        ctx = self.get_context(job_role, competency_id)
        parts = []
        if ctx["competency_context"]:
            parts.append(ctx["competency_context"])
        if ctx["acts_and_rules"]:
            primary = ctx["acts_and_rules"][0]
            sections = ", ".join(primary.get("sections", [])[:2])
            if sections:
                parts.append(f"Key reference: {primary['act']} ({sections})")
        return " ".join(parts) if parts else ""
