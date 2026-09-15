"""
Karmayogi AI Learning Agent
---------------------------
A live AI mentor that interviews an officer about their department and role,
estimates competency mastery from natural-language answers, and surfaces a
live gap analysis with iGOT Karmayogi course recommendations on every turn.

Design
------
* Each officer gets an agent **session** stored in memory.
* The agent builds an assessment plan from the officer's role
  (required competencies in the KCM/FRAC-aligned competency framework).
* It asks ONE question at a time, contextualised to the officer's
  department (pulled from the iGOT officer profile).
* Every answer is scored (strong / partial / weak) either by Groq LLM or a
  deterministic NLP fallback, then merged with the officer's quiz-history
  prior (Bayesian Knowledge Tracing) into a live mastery estimate.
* As mastery crosses the role's required level, the competency is
  finalised as *mastered* or *gap* with human-readable reasoning.
* Gaps are continuously fed into the iGOT RecommendationEngine so the
  right-hand pane updates live with recommended videos/paths.
"""

import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .bkt_engine import BKTEngine
from .igot_client import IGOTClient
from .legal_frameworks import LegalFrameworkService
from .recommendation_engine import RecommendationEngine


# ------------------------------------------------------------------ #
# Constants
# ------------------------------------------------------------------ #

DEFAULT_ROLE = "statistical_officer"
MAX_QUESTIONS_TOTAL = 12
MIN_QUESTIONS_PER_COMP = 2
TARGET_EVIDENCE = 2                # evidence entries needed to finalise a competency
CONFIDENCE_FINALISE = 0.5          # fraction of target evidence below which a comp stays "assessing"
INTERVIEW_WEIGHT = 0.65            # how much interview evidence dominates the prior at full confidence

STRENGTH_SCORE = {"strong": 0.85, "partial": 0.55, "weak": 0.25}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _load_competencies():
    path = Path(__file__).parent.parent / "data" / "competencies.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _prob_to_level(prob):
    if prob >= 0.9:
        return 4
    if prob >= 0.7:
        return 3
    if prob >= 0.4:
        return 2
    if prob >= 0.15:
        return 1
    return 0


# ------------------------------------------------------------------ #
# Optional Groq LLM helper (degrades gracefully to None when absent)
# ------------------------------------------------------------------ #

class _LLM:
    def __init__(self):
        self.model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
        self.enabled = bool(os.environ.get("GROQ_API_KEY"))
        self._client = None

    def _get_client(self):
        if self._client is None:
            from groq import Groq
            self._client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        return self._client

    def complete_json(self, messages, temperature=0.4, max_tokens=800):
        """Call Groq once and parse the JSON object response.

        Returns a dict or None on any failure (so callers fall back to
        deterministic generation).
        """
        if not self.enabled:
            return None
        try:
            client = self._get_client()
            resp = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            text = resp.choices[0].message.content or ""
            parsed = json.loads(text)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None


# ------------------------------------------------------------------ #
# Competency keyword lexicon for deterministic scoring
# ------------------------------------------------------------------ #

# Extracted from the level descriptors in competencies.json + common domain
# vocabulary so the fallback scorer has meaningful terms to look for.
_COMPETENCY_KEYWORDS = {
    "FMT_001": ["mean", "median", "standard deviation", "variance", "distribution",
                "hypothesis", "regression", "time series", "multivariate", "probability",
                "normal distribution", "confidence", "correlation", "variance"],
    "FMT_002": ["gdp", "inflation", "fiscal", "deficit", "balance of payments", "monetary",
                "macro", "policy", "national income", "output", "growth", "exchange rate",
                "government", "fiscal policy", "econometric"],
    "NAS_001": ["gdp", "gva", "production approach", "national accounts", "sector",
                "base year", "nsdp", "state domestic product", "revision", "chain",
                "inter-sectoral", "gross value added", "constant prices"],
    "SRS_001": ["srs", "sample", "sampling", "cbr", "cdr", "imr", "tfr", "fertility",
                "mortality", "demographic", "vital statistics", "dual record", "registration",
                "life table", "population", "base line", "survey"],
    "IOT_001": ["iot", "sensor", "mqtt", "data stream", "real-time", "telemetry",
                "deploy", "integration", "iot platform", "dashboard", "embedded", "protocol"],
    "DDI_001": ["sdmx", "metadata", "dissemination", "publication", "calendar", "sdd",
                "pipeline", "standards", "data release", "catalog", "interoperability",
                "machine-readable", "open data"],
}


# ------------------------------------------------------------------ #
# The learning agent service
# ------------------------------------------------------------------ #

class LearningAgentService:
    def __init__(self):
        self.igot = IGOTClient()
        self.llm = _LLM()
        self.bkt = BKTEngine()
        self.rec_engine = RecommendationEngine()
        self.legal = LegalFrameworkService()
        self.data = _load_competencies()
        self.roles = self.data["roles"]
        self.competencies = {c["id"]: c for c in self.data["competencies"]}
        self._sessions: dict[str, dict] = {}
        self._sessions_by_officer: dict[str, str] = {}  # officer_id -> session_id
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ #
    # Session lifecycle
    # ------------------------------------------------------------------ #

    def create_session(self, officer_id, role=None, department=None, name=None) -> dict:
        """Build a new agent session for an officer (profile pulled from iGOT)."""
        profile = self.igot.get_officer_profile(officer_id)

        role = role or profile.get("job_role") or DEFAULT_ROLE
        if role not in self.roles:
            role = DEFAULT_ROLE

        dept = department or profile.get("department_name") or "MoSPI"
        display_name = name or profile.get("known_as") or profile.get("first_name") or officer_id

        role_meta = self.roles[role]
        required_comps = role_meta.get("required_competencies", {})
        dept_comps = self.igot.get_department_competencies(dept)

        # Seed each required competency with a BKT prior from quiz history
        history = profile.get("competency_history") or {}
        assessments = {}
        pending = []
        for comp_id, required_level in sorted(required_comps.items(), key=lambda kv: (-kv[1], kv[0])):
            prior = self.bkt.compute_mastery_from_history(comp_id, history.get(comp_id, []))
            level = _prob_to_level(prior)
            gap = max(0, required_level - level)
            assessments[comp_id] = {
                "competency_id": comp_id,
                "competency_name": self.competencies.get(comp_id, {}).get("name", comp_id),
                "category": self.competencies.get(comp_id, {}).get("category", ""),
                "required_level": required_level,
                "current_level": level,
                "mastery_probability": prior,
                "gap": gap,
                "priority": "high" if gap >= 2 else "medium" if gap == 1 else "none",
                "status": "pending",             # pending | assessing | gap_confirmed | mastered
                "confidence": 0.0,
                "evidence": [],
                "questions_asked": 0,
                "probe_level": 1,
                "reasoning": "",
            }
            pending.append(comp_id)

        # Interview order: biggest gap first, then department-relevant comps
        pending.sort(key=lambda cid: (-assessments[cid]["gap"], cid not in dept_comps))
        if not pending:
            pending = list(required_comps.keys())

        session = {
            "session_id": f"agn_{uuid.uuid4().hex[:12]}",
            "officer_id": officer_id,
            "officer": {
                "wid": profile.get("wid", ""),
                "name": display_name,
                "avatar": profile.get("avatar", "MO"),
                "email": profile.get("email", ""),
                "role": role,
                "role_title": role_meta.get("title", role),
                "department": dept,
                "sub_department": profile.get("sub_department_name", ""),
                "unit": profile.get("unit_name", ""),
                "location": f"{profile.get('organization_location_city', '')}, {profile.get('organization_location_state', '')}".strip(", "),
                "language": profile.get("language_preference", "English"),
                "cadre": profile.get("cadre") or self.legal.get_context(role).get("cadre_group", "Group A (Gazetted)"),
                "source": "iGOT Karmayogi",
                "department_competencies": dept_comps,
            },
            "created_at": _now(),
            "updated_at": _now(),
            "status": "active",                  # active | completed | error
            "messages": [],
            "interview": {
                "pending": pending,
                "asked": 0,
                "total": min(len(pending) * MIN_QUESTIONS_PER_COMP, MAX_QUESTIONS_TOTAL),
            },
            "assessments": assessments,
            "gaps": {},
            "strengths": {},
            "overall_readiness": 1.0,
            "recommendations": None,
            "next": None,
        }

        self._append_message(
            session, "assistant",
            (
                f"Namaste! I'm your **Karmayogi AI Mentor**. I've pulled your "
                f"profile from the iGOT Karmayogi ecosystem — you serve as "
                f"**{session['officer']['role_title']}** in **{dept}**"
                + (f" ({profile.get('sub_department_name', '')})" if profile.get("sub_department_name") else "")
                + f".\n\nTo recommend the right training, I'll ask a few short "
                f"questions about how you apply statistical competencies in your "
                f"department work. Answer naturally, or pick a suggested reply — "
                f"I'll update your gap analysis live on the right."
            ),
            kind="agent_greet",
        )

        # Start the first question
        self._advance(session)

        with self._lock:
            self._sessions[session["session_id"]] = session
            self._sessions_by_officer[session["officer_id"]] = session["session_id"]
        return self.public_state(session["session_id"])

    def get_session(self, session_id) -> dict:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            return None
        return self._sessions[session_id]

    def get_session_by_officer(self, officer_id) -> dict | None:
        with self._lock:
            sid = self._sessions_by_officer.get(officer_id)
        if not sid:
            return None
        return self._sessions.get(sid)

    def respond(self, session_id, answer, suggestion=None) -> dict:
        """Process one officer answer and advance the interview."""
        session = self.get_session(session_id)
        if session is None:
            raise KeyError("session not found")
        if session["status"] != "active":
            raise ValueError("session is no longer active")

        answer = (answer or "").strip()
        if not answer and suggestion:
            answer = suggestion.strip()

        self._append_message(session, "user", answer[:1200], kind="user_answer")

        comp_id = session["next"]["competency_id"]
        evidence = self._evaluate_answer(session, comp_id, answer)

        self._record_evidence(session, comp_id, evidence)
        self._maybe_finalise(session, comp_id)

        # Re-run gap synthesis + recommendations whenever gaps change
        self._synthesise(session)

        # Give the officer live feedback about their latest answer
        assessment = session["assessments"][comp_id]
        feed = self._feedback_message(assessment, session["gaps"].get(comp_id))
        self._append_message(session, "assistant", feed, kind="agent_feedback")

        # Move the interview forward
        self._advance(session)

        return self.public_state(session_id)

    def restart_session(self, officer_id, role=None, department=None, name=None) -> dict:
        sid = self.get_session_by_officer(officer_id)
        if sid:
            with self._lock:
                self._sessions.pop(sid, None)
                self._sessions_by_officer.pop(officer_id, None)
        return self.create_session(officer_id, role=role, department=department, name=name)

    # ------------------------------------------------------------------ #
    # Public state (serialisable)
    # ------------------------------------------------------------------ #

    def public_state(self, session_id) -> dict:
        session = self.get_session(session_id)
        if session is None:
            return None
        clone = json.loads(json.dumps(session, default=str))
        clone["interview"]["progress"] = session["interview"]["asked"]
        return clone

    def _append_message(self, session, role, content, kind="text"):
        session["messages"].append({
            "role": role,
            "content": content,
            "kind": kind,
            "timestamp": _now(),
        })

    # ------------------------------------------------------------------ #
    # Interview flow
    # ------------------------------------------------------------------ #

    def _advance(self, session):
        """Pick the next competency to probe and generate its question, or
        complete the interview if nothing is left."""
        target = self._next_target(session)
        if target is None:
            self._complete(session)
            return
        question = self._generate_question(session, target)
        session["question_sequence"] = session.get("question_sequence", 0) + 1
        session["interview"]["asked"] += 1
        session["next"] = {
            "type": "question",
            "sequence": session["question_sequence"],
            "question_id": f"q_{session['question_sequence']}",
            "competency_id": target,
            "competency_name": self.competencies[target]["name"],
            "focus_level": session["assessments"][target]["probe_level"],
            "text": question["text"],
            "suggested": question["suggested"],
            "legal_reference": question.get("legal_reference", ""),
            "constitutional_reference": question.get("constitutional_reference", ""),
        }
        session["updated_at"] = _now()

    def _next_target(self, session):
        for comp_id in session["interview"]["pending"]:
            assessment = session["assessments"][comp_id]
            if assessment["status"] not in ("gap_confirmed", "mastered"):
                return comp_id
        return None

    def _complete(self, session):
        session["status"] = "completed"
        gap_count = len(session["gaps"])
        mastered_count = len(session["strengths"])
        rec_count = (session["recommendations"] or {}).get("summary", {}).get("total_recommendations", 0)
        summary = (
            f"Interview complete — thank you! I assessed "
            f"**{len(session['interview']['pending'])}** competencies for your role.\n\n"
            f"- **Gaps identified:** {gap_count}  \n"
            f"- **Mastered:** {mastered_count}  \n"
            f"- **Courses recommended:** {rec_count}\n\n"
            f"Your readiness score is **{int(session['overall_readiness'] * 100)}%**. "
            f"Open the **Gap Analysis** tab for the reasoning behind each finding, "
            f"and the **Recommended Courses** tab for the iGOT Karmayogi videos "
            f"matched to your gaps."
        )
        self._append_message(session, "assistant", summary, kind="agent_complete")
        session["next"] = {
            "type": "complete",
            "gaps": gap_count,
            "mastered": mastered_count,
            "recommendations": rec_count,
            "message": summary,
        }
        session["updated_at"] = _now()

    # ------------------------------------------------------------------ #
    # Question generation
    # ------------------------------------------------------------------ #

    def _generate_question(self, session, comp_id) -> dict:
        comp = self.competencies[comp_id]
        assessment = session["assessments"][comp_id]
        officer = session["officer"]
        level = assessment["probe_level"]

        domain_desc = comp["levels"].get(str(min(level, 4)), comp["levels"].get("1", ""))
        context = (
            f"{officer['role_title']} in {officer['department']}"
            + (f", {officer['sub_department']}" if officer["sub_department"] else "")
        )

        # ---- Legal framework context ----
        legal_ctx = self.legal.get_competency_legal_context(officer["role"], comp_id)
        articles_summary = self.legal.get_articles_summary(officer["role"])
        acts_summary = self.legal.get_acts_summary(officer["role"])

        # ---- LLM path (best effort) ----
        llm = self.llm.complete_json(
            [
                {
                    "role": "system",
                    "content": (
                        "You are Karmayogi, a competency interviewer for India's official "
                        "statistical system. You probe exactly ONE competency at a time and "
                        "may reference relevant Constitutional Articles and Acts of Parliament "
                        "when framing questions, especially for government officers' specific "
                        "designations. Return ONLY a JSON object: "
                        '{"question": string, "suggested": [3 strings], '
                        '"suggested_strengths": ["strong"|"partial"|"weak", ...]}. '
                        "Question 1 asks for a concrete work example; questions 2+ go "
                        "one level deeper and dig into method or trade-off, optionally "
                        "tying to Constitutional/Statutory provisions relevant to the "
                        "officer's role. Suggested answers encode a strong, a partial "
                        "and a weak response."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Competency: {comp['name']} ({comp['category']}).\n"
                        f"Probing at level {level}: {domain_desc}\n"
                        f"Context: {context}\n"
                        f"Legal Framework: {legal_ctx or 'N/A'}\n"
                        f"Constitutional References: {articles_summary or 'N/A'}\n"
                        f"Relevant Legislation: {acts_summary or 'N/A'}\n"
                        f"Question #{assessment['questions_asked'] + 1} for this competency.\n"
                        f"Officer's estimated mastery so far: "
                        f"{int(assessment['mastery_probability'] * 100)}%, current level "
                        f"{assessment['current_level']} (required level {assessment['required_level']})."
                    ),
                },
            ]
        )
        if llm and llm.get("question") and isinstance(llm.get("suggested"), list) and len(llm["suggested"]) >= 3:
            strengths = llm.get("suggested_strengths") or ["strong", "partial", "weak"]
            return {
                "text": llm["question"][:600],
                "suggested": [
                    {"text": s[:240], "strength": strengths[i] if i < len(strengths) else "partial"}
                    for i, s in enumerate(llm["suggested"][:3])
                ],
                "legal_reference": acts_summary,
                "constitutional_reference": articles_summary,
            }

        # ---- Deterministic fallback with legal framework context ----
        text = (
            f"Let's look at **{comp['name']}** in your role as {context}."
        )
        if legal_ctx:
            text += f"\n\n> **Legal & Statutory Framework:** {legal_ctx}"
        if assessment["questions_asked"] == 0:
            text += f"\n\nAt an operational level this involves: _{domain_desc}_.\n"
            text += "Can you give me a concrete example of how you've applied this under statutory procedures in your departmental work?"
            if articles_summary:
                text += f"\n\n_Constitutional Provisions: {articles_summary}_"
        else:
            text += f"\n\nGoing a level deeper (_focus: {domain_desc}_): how do you ensure compliance with statutory rules in practice, and what are the main administrative trade-offs?"
            if acts_summary:
                text += f"\n\n_Governing Legislation & Rules: {acts_summary}_"

        return {
            "text": text,
            "suggested": self._fallback_suggestions(comp["name"], level, comp_id, role=officer.get("role", "statistical_officer")),
            "legal_reference": acts_summary,
            "constitutional_reference": articles_summary,
        }

    def _fallback_suggestions(self, comp_name, level, comp_id, role="statistical_officer"):
        role_lower = (role or "").lower()
        if "ias" in role_lower or "dm" in role_lower or "magistrate" in role_lower:
            return [
                {
                    "text": (
                        f"Under District Planning powers (Art 243ZD) and Disaster Management Act Section 30, "
                        f"I utilize cross-departmental statistical indices to allocate contingency funds and submit audited accounts."
                    ),
                    "strength": "strong",
                },
                {
                    "text": (
                        f"I review monthly district progress indicators and follow standard procedures for Centrally Sponsored Schemes, "
                        f"though complex econometric evaluations are coordinated with the State Planning Department."
                    ),
                    "strength": "partial",
                },
                {
                    "text": (
                        "I possess general administrative awareness of district statistical indices, "
                        "but rely primarily on the District Statistical Officer for technical methodology execution."
                    ),
                    "strength": "weak",
                },
            ]
        elif "ips" in role_lower or "police" in role_lower or "sp" in role_lower:
            return [
                {
                    "text": (
                        f"Pursuant to BNSS Section 173 and digital evidence certification under Section 63 of BSA, "
                        f"I apply multivariate crime hotspot modeling to optimize station deployment and ensure forensic evidentiary chain of custody."
                    ),
                    "strength": "strong",
                },
                {
                    "text": (
                        "I analyze monthly crime records and GIS spatial patterns for law and order patrol scheduling, "
                        "though specialized cyber telemetry analysis is referred to the State Cyber Crime Cell."
                    ),
                    "strength": "partial",
                },
                {
                    "text": (
                        "I understand statutory crime data submission requirements to NCRB, "
                        "but would require specialized training to conduct direct statistical modeling on forensic datasets."
                    ),
                    "strength": "weak",
                },
            ]
        elif "revenue" in role_lower or "irs" in role_lower or "tax" in role_lower:
            return [
                {
                    "text": (
                        f"In accordance with Article 265 and statutory return mandates under the GST/Income Tax Act, "
                        f"I execute automated discrepancy analyses to detect tax base leakage and reconcile monthly collections."
                    ),
                    "strength": "strong",
                },
                {
                    "text": (
                        "I handle return reconciliations and follow standard revenue assessment guidelines, "
                        "though inter-state tax devolution modeling requires Senior Board consultation."
                    ),
                    "strength": "partial",
                },
                {
                    "text": (
                        "I am familiar with basic revenue reporting schedules, "
                        "but day-to-day administrative work rarely involves direct econometric forecasting."
                    ),
                    "strength": "weak",
                },
            ]

        # Standard / Statistics / Default role suggestions
        keywords = _COMPETENCY_KEYWORDS.get(comp_id, [])
        sample = keywords[0].capitalize() if keywords else "Systematic procedures"
        return [
            {
                "text": (
                    f"I apply {sample} methods regularly in division reporting under Collection of Statistics Act mandates — "
                    f"validating data outputs, preparing monthly briefs, and adhering to NSC statistical standards."
                ),
                "strength": "strong",
            },
            {
                "text": (
                    f"I have a working familiarity with {sample} — I interpret standard reports and follow statutory guidelines, "
                    f"though advanced multi-sector models require senior supervisory clearance."
                ),
                "strength": "partial",
            },
            {
                "text": (
                    "I am aware of the conceptual framework, but my immediate duties rarely require "
                    "direct statistical modeling, so structured capacity building would be beneficial."
                ),
                "strength": "weak",
            },
        ]

    # ------------------------------------------------------------------ #
    # Answer evaluation
    # ------------------------------------------------------------------ #

    def _evaluate_answer(self, session, comp_id, answer) -> dict:
        """Score the officer's answer, prefer LLM, fall back to keywords."""
        comp = self.competencies[comp_id]
        assessment = session["assessments"][comp_id]
        officer = session.get("officer", {})
        llm = self.llm.complete_json(
            [
                {
                    "role": "system",
                    "content": (
                        "You evaluate a senior Indian government civil servant's (IAS, IPS, IRS, ISS, Group A/B Gazetted) "
                        "response against an administrative and technical competency. Return ONLY a JSON object: "
                        '{"strength": "strong"|"partial"|"weak", "score": 0.0-1.0, "rationale": string}. '
                        'A "strong" answer demonstrates concrete operational application, specific domain terminology, '
                        "and awareness of constitutional principles (e.g. Articles 311, 312, 112, 265, 21) or statutory procedures "
                        '(BNSS/CrPC, BSA, Disaster Management Act, Collection of Statistics Act, RTI Act); '
                        '"partial" shows procedural familiarity but thin operational depth; "weak" indicates high-level awareness only.'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Officer Role: {officer.get('role_title', 'Officer')} ({officer.get('department', 'Government')}).\n"
                        f"Competency: {comp['name']}, probing at level {assessment['probe_level']}. "
                        f"Level descriptor: {comp['levels'].get(str(min(assessment['probe_level'], 4)), '')}\n"
                        f"Officer answer: {answer}"
                    ),
                },
            ]
        )
        if llm:
            strength = llm.get("strength")
            if strength not in STRENGTH_SCORE:
                strength = "partial"
            score = float(llm.get("score") or STRENGTH_SCORE[strength])
            score = max(0.0, min(1.0, score))
            rationale = str(llm.get("rationale") or "")[:300]
            return {
                "strength": strength,
                "score": score,
                "rationale": rationale,
                "source": "llm",
            }

        return self._fallback_score(comp_id, answer)

    def _fallback_score(self, comp_id, answer) -> dict:
        keywords = _COMPETENCY_KEYWORDS.get(comp_id, [])
        text = answer.lower()
        domain_hits = [k for k in keywords if k.lower() in text]

        statutory_terms = [
            "article", "section", "act", "statutory", "constitution", "rules", "compliance",
            "mandate", "bnss", "bsa", "crpc", "ipc", "rti", "disaster", "gazette", "magistrate",
            "police", "district", "collector", "audit", "revenue", "ncrb", "court", "evidence", "dm"
        ]
        statutory_hits = [s for s in statutory_terms if s in text]

        word_count = len(re.findall(r"\S+", answer))
        total_hits = len(domain_hits) + len(statutory_hits)

        if (word_count >= 12 and (len(domain_hits) >= 2 or total_hits >= 3)) or (len(statutory_hits) >= 2 and word_count >= 10):
            strength, score = "strong", 0.85
        elif word_count >= 5 or total_hits >= 1:
            strength, score = "partial", 0.55
        else:
            strength, score = "weak", 0.25

        rationale = (
            f"Answer evaluated: {len(domain_hits)} domain term(s) and {len(statutory_hits)} statutory reference(s) "
            f"across {word_count} words."
        )
        return {"strength": strength, "score": score, "rationale": rationale, "source": "rule"}

    # ------------------------------------------------------------------ #
    # Evidence updates & mastery
    # ------------------------------------------------------------------ #

    def _record_evidence(self, session, comp_id, evidence):
        assessment = session["assessments"][comp_id]
        assessment["evidence"].append({
            "question": session["next"]["text"],
            "answer": evidence.get("_raw") or session["messages"][-1]["content"][:300],
            "strength": evidence["strength"],
            "score": evidence["score"],
            "rationale": evidence["rationale"],
            "timestamp": _now(),
        })
        assessment["questions_asked"] += 1

        # Adaptive probing: strong answers push to the next level
        if evidence["strength"] == "strong":
            assessment["probe_level"] = min(assessment["required_level"], assessment["probe_level"] + 1)
        elif assessment["probe_level"] > 1 and evidence["strength"] == "weak":
            assessment["probe_level"] = max(1, assessment["probe_level"] - 1)

        # Merge BKT prior with interview evidence (recency weighted)
        prior = assessment["mastery_probability"]
        evs = assessment["evidence"]
        weights = [0.5 + 0.15 * i for i in range(len(evs))][-1::-1]
        wsum = sum(weights) or 1
        evidence_score = sum(e["score"] * w for e, w in zip(evs, weights)) / wsum
        confidence = min(1.0, len(evs) / TARGET_EVIDENCE)

        mastery = prior * (1 - INTERVIEW_WEIGHT * confidence) + evidence_score * (INTERVIEW_WEIGHT * confidence)
        mastery = max(0.0, min(1.0, mastery))

        assessment["mastery_probability"] = round(mastery, 4)
        assessment["current_level"] = _prob_to_level(mastery)
        assessment["gap"] = max(0, assessment["required_level"] - assessment["current_level"])
        assessment["confidence"] = confidence

    def _maybe_finalise(self, session, comp_id):
        assessment = session["assessments"][comp_id]
        if assessment["status"] in ("gap_confirmed", "mastered"):
            return
        strong_count = sum(1 for e in assessment["evidence"] if e["strength"] == "strong")
        enough = assessment["questions_asked"] >= MIN_QUESTIONS_PER_COMP
        if not enough:
            assessment["status"] = "assessing"
            return
        if strong_count >= 2 and assessment["gap"] == 0:
            assessment["status"] = "mastered"
        else:
            assessment["status"] = "gap_confirmed"
        assessment["priority"] = "high" if assessment["gap"] >= 2 else "medium" if assessment["gap"] == 1 else "none"

    # ------------------------------------------------------------------ #
    # Gap synthesis + recommendations
    # ------------------------------------------------------------------ #

    def _synthesise(self, session):
        gaps = {}
        strengths = {}
        for comp_id, assessment in session["assessments"].items():
            if assessment["gap"] <= 0 and assessment["priority"] == "none":
                strengths[comp_id] = assessment
                continue
            if assessment["status"] in ("gap_confirmed", "mastered") or assessment["gap"] > 0:
                gaps[comp_id] = assessment

        # Build gap entries shaped for the recommendation engine
        gap_entries = []
        for assessment in gaps.values():
            gap_entries.append({
                "competency_id": assessment["competency_id"],
                "name": assessment["competency_name"],
                "category": assessment["category"],
                "required_level": assessment["required_level"],
                "current_level": assessment["current_level"],
                "mastery_probability": assessment["mastery_probability"],
                "gap": assessment["gap"],
                "priority": assessment["priority"],
                "reasoning": self._gap_reasoning(assessment),
                "evidence_count": len(assessment["evidence"]),
                "status": assessment["status"],
            })
        gap_entries.sort(key=lambda g: (-g["gap"], g["competency_id"]))

        session["gaps"] = {g["competency_id"]: g for g in gap_entries}
        session["strengths"] = strengths

        total_possible = sum(a["required_level"] for a in session["assessments"].values())
        total_gap = sum(g["gap"] for g in gap_entries)
        session["overall_readiness"] = round(
            1.0 - (total_gap / total_possible), 2
        ) if total_possible > 0 else 1.0

        session["recommendations"] = self.rec_engine.recommend(gap_entries)

    def _gap_reasoning(self, assessment) -> str:
        evs = assessment["evidence"]
        strengths = ", ".join(e["strength"] for e in evs) or "no interview evidence yet"
        lead = (
            f"Assessed across {max(assessment['questions_asked'], 0)} interview question(s); "
            f"answer strength: {strengths}. "
            f"Estimated mastery is {int(assessment['mastery_probability'] * 100)}% "
            f"(working level {assessment['current_level']}) against the "
            f"{assessment['required_level']} required for "
            f"{assessment['competency_name']} in this role."
        )
        if assessment["status"] == "gap_confirmed":
            lead += (
                f" This leaves a gap of {assessment['gap']} level(s). "
                f"Priority: {assessment['priority']}."
            )
        rationales = [e["rationale"] for e in evs if e.get("rationale")]
        if rationales:
            lead += " Evidence: " + " ".join(rationales[:2])
        return lead

    def _feedback_message(self, assessment, gap_entry) -> str:
        score = int(assessment["mastery_probability"] * 100)
        evs = assessment["evidence"]
        last = evs[-1] if evs else {}
        template = {
            "strong": "That's a solid, applied answer",
            "partial": "Good — that shows working familiarity",
            "weak": "Thanks for being honest — that's an area to strengthen",
        }
        opener = template.get(last.get("strength"), "Thanks for your answer")
        msg = f"{opener}. My estimate for **{assessment['competency_name']}** is now **{score}%** (level {assessment['current_level']}, required level {assessment['required_level']})."
        if assessment["status"] == "gap_confirmed":
            msg += f" I'm flagging this as a **{assessment['priority']} priority gap** — I've added supporting iGOT courses for you on the right."
        elif assessment["status"] == "mastered":
            msg += " You've cleared the required level — no training needed here. ✅"
        else:
            msg += " Keep going — one more question to finalise this competency."
        return msg