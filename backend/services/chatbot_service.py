"""
Website Assistant Chatbot
-------------------------
A lightweight help-desk chatbot for the Saksham platform, powered by a
cloud-hosted LLM served over Groq's inference API. It answers questions
about how to use the site (gap analysis, quiz generation, iGOT course
recommendations, course records, etc.) and stays on-topic for anything
unrelated to the platform.

Groq is used purely as the model host: `GROQ_API_KEY` must be set as an
environment variable, and the model (default: llama-3.3-70b-versatile) is
a cloud-hosted model that Groq serves on its own infrastructure - nothing
runs locally.
"""

import os
from dotenv import load_dotenv
from groq import Groq

from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


SYSTEM_PROMPT = """You are "Saksham Assistant", the built-in help chatbot for \
the Saksham platform - an AI-powered competency training tool for MoSPI \
(Ministry of Statistics and Programme Implementation) officers.

Your job is ONLY to help users understand and use this website. You know the \
following about the site:

- **Dashboard** ("/"): Overview of platform stats, quick actions, and recent \
  activity.
- **Gap Analysis** ("/gaps"): Uses Bayesian Knowledge Tracing (BKT) to \
  estimate an officer's mastery of each competency from their quiz/course \
  history, then compares it against the competencies required for their \
  role to surface skill gaps.
- **Quiz Generator** ("/quiz"): Users upload a document (PDF, DOCX, or TXT). \
  The backend chunks and embeds it into a vector store (ChromaDB) and uses \
  retrieval-augmented generation (RAG) to generate multiple-choice \
  questions from that material, at a chosen difficulty and question count.
- **Recommendations** ("/recommendations"): Matches an officer's detected \
  competency gaps to relevant courses in the iGOT Karmayogi course catalog, \
  producing a personalized learning path.
- **Course Records** ("/records"): Shows courses an officer has enrolled in \
  and their completion progress.
- **Course Detail** ("/course/:courseId"): Details for a single iGOT course.
- Users log in via the Login page; the sidebar (desktop) or top menu \
  (mobile) is used to navigate between these pages, and there is a light/ \
  dark theme toggle.

Guidelines:
1. Only help with questions about navigating, using, or understanding this \
   website and its features (gap analysis, quizzes, recommendations, course \
   records, competencies, roles, login/theme, etc.).
2. If a user asks something unrelated to the website (general trivia, \
   coding help for other projects, personal advice, etc.), politely say you \
   can only help with questions about the Saksham platform and steer them \
   back.
3. Keep answers short, clear, and friendly. Use plain language, not jargon, \
   unless the user is asking about a technical concept like BKT or RAG - \
   then explain it simply.
4. If you don't know something specific about the user's account/data \
   (since you have no access to their live data), say so and point them to \
   the relevant page instead of guessing.
5. Never claim to take actions on the user's behalf (you cannot submit \
   forms, upload files, or change settings) - just guide them on how to do \
   it themselves.
"""

DEFAULT_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_HISTORY_MESSAGES = 12


class ChatbotService:
    """Thin wrapper around the Groq chat completions API."""

    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY environment variable is not set. Get a free "
                "key at https://console.groq.com/keys and set it before "
                "using the chatbot."
            )
        self.client = Groq(api_key=api_key)
        self.model = DEFAULT_MODEL

    def reply(self, message: str, history: list[dict] | None = None) -> dict:
        """Generate an assistant reply for the given user message.

        `history` is an optional list of prior turns, each shaped like
        {"role": "user" | "assistant", "content": "..."}. Only the most
        recent turns are kept to bound the request size.
        """
        history = history or []
        trimmed_history = history[-MAX_HISTORY_MESSAGES:]

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for turn in trimmed_history:
            role = turn.get("role")
            content = turn.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.4,
            max_tokens=600,
        )

        reply_text = completion.choices[0].message.content
        return {"reply": reply_text, "model": self.model}
