import json
from pathlib import Path
from .bkt_engine import BKTEngine


class GapAnalyzer:
    """Finds what skills an officer is missing for their role."""

    def __init__(self):
        self.engine = BKTEngine()
        self.data = self._load_competencies()

    def _load_competencies(self):
        path = Path(__file__).parent.parent / "data" / "competencies.json"
        with open(path) as f:
            return json.load(f)

    def get_role_requirements(self, role):
        """Get the skills required for a job role."""
        return self.data["roles"].get(role, {}).get("required_competencies", {})

    def get_competency_info(self, comp_id):
        """Get details about one skill."""
        for c in self.data["competencies"]:
            if c["id"] == comp_id:
                return c
        return {}

    def prob_to_level(self, prob):
        """Convert a probability (0.0-1.0) to a skill level (0-4)."""
        if prob >= 0.9:
            return 4
        elif prob >= 0.7:
            return 3
        elif prob >= 0.4:
            return 2
        elif prob >= 0.15:
            return 1
        return 0

    def analyze_gaps(self, role, officer_mastery):
        """
        Find gaps between what the officer knows and what they need.
        
        role:            job role key (e.g., "deputy_director")
        officer_mastery: dict of {skill_id: probability} (e.g., {"NAS_001": 0.7})
        
        Returns: a report with gaps, strengths, and recommendations
        """
        requirements = self.get_role_requirements(role)
        gaps = []
        mastered = []
        in_progress = []

        for comp_id, required_level in requirements.items():
            mastery_prob = officer_mastery.get(comp_id, 0.0)
            current_level = self.prob_to_level(mastery_prob)
            gap = max(0, required_level - current_level)

            comp_info = self.get_competency_info(comp_id)

            entry = {
                "competency_id": comp_id,
                "name": comp_info.get("name", comp_id),
                "category": comp_info.get("category", ""),
                "required_level": required_level,
                "current_level": current_level,
                "mastery_probability": mastery_prob,
                "gap": gap,
                "priority": "high" if gap >= 2 else "medium" if gap == 1 else "none",
            }

            if gap >= 1:
                gaps.append(entry)
            elif mastery_prob >= 0.75:
                mastered.append(entry)
            else:
                in_progress.append(entry)

        gaps.sort(key=lambda x: (-x["gap"], -x["mastery_probability"]))

        total_possible = sum(requirements.values())
        total_gap = sum(g["gap"] for g in gaps)
        readiness = round(1.0 - (total_gap / total_possible), 2) if total_possible > 0 else 1.0

        return {
            "role": role,
            "role_title": self.data["roles"].get(role, {}).get("title", role),
            "total_competencies": len(requirements),
            "overall_readiness": readiness,
            "gaps": gaps,
            "in_progress": in_progress,
            "mastered": mastered,
        }