from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from pydantic import BaseModel
import sys
import os
import importlib
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv()  # loads GROQ_API_KEY (and anything else) from a local .env file, if present

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from security import (
    limiter,
    SecurityHeadersMiddleware,
    RequestSizeLimitMiddleware,
)

from services.gap_analyzer import GapAnalyzer
from services.recommendation_engine import RecommendationEngine

app = FastAPI(title="Saksham API", version="0.3.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Return a clean HTTP 429 response when rate limit is exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Rate limit exceeded: {exc.detail}. Too many attempts from your IP. Please try again in a moment.",
            "error": "rate_limit_exceeded",
        },
        headers={"Retry-After": "60"},
    )


# CORS Configuration - Restrict to trusted development origins + custom environment origins
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
env_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
cors_origins = list(set(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)


# The heavy AI services pull in torch/sentence-transformers/chromadb on import,
# which is very slow (~85s). They are imported lazily on first use so the API
# boots fast and only pays that cost when a quiz feature is actually hit.
_analyzer = None
_rec_engine = None
_quiz_gen = None
_ingestor = None
_chatbot = None


def get_analyzer() -> GapAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = GapAnalyzer()
    return _analyzer


def get_rec_engine() -> RecommendationEngine:
    global _rec_engine
    if _rec_engine is None:
        _rec_engine = RecommendationEngine()
    return _rec_engine


def get_quiz_gen() -> "QuizGenerator":
    global _quiz_gen
    if _quiz_gen is None:
        services = importlib.import_module("services.quiz_generator")
        _quiz_gen = services.QuizGenerator()
    return _quiz_gen


def get_ingestor() -> "DocumentIngestor":
    global _ingestor
    if _ingestor is None:
        services = importlib.import_module("services.document_ingestor")
        _ingestor = services.DocumentIngestor()
    return _ingestor


def get_chatbot() -> "ChatbotService":
    global _chatbot
    if _chatbot is None:
        services = importlib.import_module("services.chatbot_service")
        _chatbot = services.ChatbotService()
    return _chatbot


class OfficerProfile(BaseModel):
    officer_id: str
    name: str
    role: str
    competency_history: dict


class QuizRequest(BaseModel):
    query: str
    num_questions: int = 5
    difficulty: str = "mixed"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@app.get("/")
@limiter.limit("60/minute")
def root(request: Request):
    return {"status": "ok", "service": "Saksham API v0.3 - Phase 3"}


# ============================================
# PHASE 1: Gap Analysis
# ============================================

@app.post("/api/v1/analyze-gaps")
@limiter.limit("15/minute")
def analyze_gaps(request: Request, profile: OfficerProfile):
    analyzer = get_analyzer()

    mastery = {}
    for comp_id, history in profile.competency_history.items():
        mastery[comp_id] = analyzer.engine.compute_mastery_from_history(
            comp_id, history
        )

    result = analyzer.analyze_gaps(profile.role, mastery)
    result["officer_id"] = profile.officer_id
    result["officer_name"] = profile.name
    result["computed_mastery"] = mastery

    return result


@app.get("/api/v1/competencies")
@limiter.limit("60/minute")
def list_competencies(request: Request):
    return get_analyzer().data["competencies"]


@app.get("/api/v1/roles")
@limiter.limit("60/minute")
def list_roles(request: Request):
    return get_analyzer().data["roles"]


# ============================================
# PHASE 2: AI Quiz Generation
# ============================================

@app.post("/api/v1/upload-document")
@limiter.limit("5/minute")
async def upload_document(request: Request, file: UploadFile = File(...)):
    """Upload a document (PDF, DOCX, TXT) for quiz generation."""
    allowed = [".pdf", ".docx", ".txt"]
    safe_filename = os.path.basename(file.filename or "uploaded_document.txt")
    ext = os.path.splitext(safe_filename)[1].lower()

    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed)}",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds maximum 10MB limit.",
        )

    parsed = get_ingestor().ingest_bytes(safe_filename, content)
    result = get_quiz_gen().ingest_document(parsed["filename"], parsed["content"])

    return {
        "filename": parsed["filename"],
        "pages": parsed["num_pages"],
        "text_length": len(parsed["content"]),
        "chunks_stored": result["chunks_stored"],
        "topics": result.get("topics", []),
        "status": "success",
    }


@app.post("/api/v1/generate-quiz")
@limiter.limit("10/minute")
def generate_quiz(request: Request, quiz_req: QuizRequest):
    """Generate MCQs from uploaded documents using RAG."""
    if len(quiz_req.query) > 500:
        raise HTTPException(status_code=400, detail="Query cannot exceed 500 characters.")
    if quiz_req.num_questions < 1 or quiz_req.num_questions > 20:
        raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20.")

    result = get_quiz_gen().generate_quiz(
        query=quiz_req.query,
        num_questions=quiz_req.num_questions,
        difficulty=quiz_req.difficulty,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@app.get("/api/v1/document-stats")
@limiter.limit("60/minute")
def document_stats(request: Request):
    """Check how many documents/chunks are stored."""
    return get_quiz_gen().get_store_stats()


@app.get("/api/v1/document-topics")
@limiter.limit("60/minute")
def document_topics(request: Request):
    """Return extracted major topics from all ingested documents."""
    return {"topics": get_quiz_gen().get_all_topics()}



# ============================================
# PHASE 3: iGOT Karmayogi Integration
# ============================================

@app.get("/api/v1/igot-courses")
@limiter.limit("60/minute")
def list_igot_courses(request: Request):
    """List all courses from the iGOT Karmayogi catalog."""
    return get_rec_engine().get_all_courses()


@app.get("/api/v1/igot-courses/{competency_id}")
@limiter.limit("60/minute")
def get_courses_for_competency(request: Request, competency_id: str):
    """Get courses tagged for a specific competency."""
    courses = get_rec_engine().get_courses_by_competency(competency_id)
    return {"competency_id": competency_id, "courses": courses}


@app.get("/api/v1/recommendations")
@limiter.limit("20/minute")
def get_recommendations_demo(request: Request):
    """Demo: Get course recommendations for a sample officer with known gaps."""
    analyzer = get_analyzer()
    demo_mastery = {
        "FMT_001": 0.9758,
        "FMT_002": 0.6481,
        "NAS_001": 0.1149,
        "SRS_001": 0.1453,
        "DDI_001": 0.6285,
    }
    gap_result = analyzer.analyze_gaps("deputy_director", demo_mastery)
    return get_rec_engine().recommend(gap_result["gaps"])


@app.post("/api/v1/recommendations")
@limiter.limit("15/minute")
def get_personalized_recommendations(request: Request, profile: OfficerProfile):
    """Get personalized course recommendations based on officer's gaps."""
    analyzer = get_analyzer()

    mastery = {}
    for comp_id, history in profile.competency_history.items():
        mastery[comp_id] = analyzer.engine.compute_mastery_from_history(
            comp_id, history
        )

    gap_result = analyzer.analyze_gaps(profile.role, mastery)
    recs = get_rec_engine().recommend(gap_result["gaps"])

    return {
        "officer_id": profile.officer_id,
        "officer_name": profile.name,
        "role": profile.role,
        "readiness": gap_result["overall_readiness"],
        "gaps": gap_result["gaps"],
        "recommendations": recs,
    }


# ============================================
# Website Assistant Chatbot (Groq-hosted LLM)
# ============================================

@app.post("/api/v1/chat")
@limiter.limit("10/minute")
def chat(request: Request, chat_req: ChatRequest):
    """Ask the Saksham website assistant a question.

    Runs on a cloud-hosted model served by Groq. Requires GROQ_API_KEY to be set.
    """
    message = chat_req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message must not be empty")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="message cannot exceed 2000 characters")

    try:
        bot = get_chatbot()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    history = [turn.model_dump() for turn in chat_req.history]

    try:
        result = bot.reply(message, history)
    except Exception as exc:  # groq client errors, rate limits, etc.
        raise HTTPException(status_code=502, detail=f"Chatbot request failed: {exc}")

    return result