"""
iGOT Karmayogi Recommendation Engine
Matches competency gaps to courses from the iGOT catalog.
"""

import json
from pathlib import Path


class RecommendationEngine:
    """Recommends iGOT courses based on detected competency gaps."""

    def __init__(self):
        self.catalog = self._load_catalog()
        self.gap_analyzer = None

    def _load_catalog(self):
        path = Path(__file__).parent.parent / "data" / "igot_courses.json"
        with open(path) as f:
            return json.load(f)

    def get_all_courses(self):
        """Return all available courses."""
        return self.catalog["courses"]

    def get_courses_by_competency(self, competency_id):
        """Get courses tagged for a specific competency."""
        return [
            c for c in self.catalog["courses"]
            if competency_id in c["competency_tags"]
        ]

    def recommend(self, gaps: list[dict], max_per_gap: int = 3) -> dict:
        """
        Recommend courses based on detected gaps.

        gaps: list of gap entries from GapAnalyzer (each has competency_id, gap, priority)

        Returns: structured recommendation plan
        """
        recommendations = []
        total_hours = 0

        # Sort gaps by priority (high first, then by gap size)
        sorted_gaps = sorted(gaps, key=lambda g: (-g["gap"], g["competency_id"]))

        for gap in sorted_gaps:
            comp_id = gap["competency_id"]
            comp_name = gap["name"]
            gap_size = gap["gap"]
            current_level = gap["current_level"]
            required_level = gap["required_level"]
            priority = gap["priority"]

            # Find matching courses
            courses = self.get_courses_by_competency(comp_id)

            # Filter to courses that are above current level but at/below required level
            relevant = [
                c for c in courses
                if c["difficulty"] > current_level and c["difficulty"] <= required_level + 1
            ]

            # If no exact match, get any course for that competency
            if not relevant:
                relevant = courses

            # Sort by rating and relevance
            relevant.sort(key=lambda c: (-c["rating"], c["difficulty"]))

            selected = relevant[:max_per_gap]

            gap_recs = {
                "competency_id": comp_id,
                "competency_name": comp_name,
                "gap_size": gap_size,
                "current_level": current_level,
                "target_level": required_level,
                "priority": priority,
                "courses": [],
            }

            for course in selected:
                gap_recs["courses"].append({
                    "course_id": course["course_id"],
                    "title": course["title"],
                    "provider": course["provider"],
                    "difficulty": course["difficulty"],
                    "duration_hours": course["duration_hours"],
                    "format": course["format"],
                    "rating": course["rating"],
                    "enrollments": course["enrollments"],
                    "url": course["url"],
                    "description": course["description"],
                })
                total_hours += course["duration_hours"]

            recommendations.append(gap_recs)

        # Calculate summary
        total_courses = sum(len(r["courses"]) for r in recommendations)
        high_priority_count = sum(1 for r in recommendations if r["priority"] == "high")

        return {
            "summary": {
                "total_gaps": len(gaps),
                "total_recommendations": total_courses,
                "estimated_total_hours": total_hours,
                "high_priority_gaps": high_priority_count,
                "platform": self.catalog["platform"],
                "last_synced": self.catalog["last_synced"],
            },
            "recommendations": recommendations,
            "learning_path": self._build_learning_path(recommendations),
        }

    def _build_learning_path(self, recommendations):
        """Build a sequential learning path from recommendations."""
        path = []
        step = 1

        for rec in recommendations:
            if rec["priority"] == "high":
                for course in rec["courses"]:
                    path.append({
                        "step": step,
                        "action": "Complete",
                        "course": course["title"],
                        "course_id": course["course_id"],
                        "competency": rec["competency_name"],
                        "duration_hours": course["duration_hours"],
                        "url": course["url"],
                    })
                    step += 1

        # Add medium priority after high
        for rec in recommendations:
            if rec["priority"] == "medium":
                for course in rec["courses"][:1]:  # Only top course for medium
                    path.append({
                        "step": step,
                        "action": "Recommended",
                        "course": course["title"],
                        "course_id": course["course_id"],
                        "competency": rec["competency_name"],
                        "duration_hours": course["duration_hours"],
                        "url": course["url"],
                    })
                    step += 1

        return path
