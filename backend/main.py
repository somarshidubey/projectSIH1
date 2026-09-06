from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import importlib

sys.path.insert(0, os.path.dirname(__file__))

from services.gap_analyzer import GapAnalyzer
from services.recommendation_engine import RecommendationEngine

app = FastAPI(title="Saksham API", version="0.3.0")

# The deployed frontend lives on a different origin (e.g. Vercel), so CORS is
# required for browser calls. The demo app is public: allow all origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.get("/")
def root():
    return {"status": "ok", "service": "Saksham API v0.3 - Phase 3"}


# ============================================
# PHASE 1: Gap Analysis
# ============================================

@app.post("/api/v1/analyze-gaps")
def analyze_gaps(profile: OfficerProfile):
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
def list_competencies():
    return get_analyzer().data["competencies"]


@app.get("/api/v1/roles")
def list_roles():
    return get_analyzer().data["roles"]


# ============================================
# PHASE 2: AI Quiz Generation
# ============================================

@app.post("/api/v1/upload-document")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document (PDF, DOCX, TXT) for quiz generation."""
    allowed = [".pdf", ".docx", ".txt"]
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed)}",
        )

    content = await file.read()
    parsed = get_ingestor().ingest_bytes(file.filename, content)

    result = get_quiz_gen().ingest_document(parsed["filename"], parsed["content"])

    return {
        "filename": parsed["filename"],
        "pages": parsed["num_pages"],
        "text_length": len(parsed["content"]),
        "chunks_stored": result["chunks_stored"],
        "status": "success",
    }


@app.post("/api/v1/generate-quiz")
def generate_quiz(request: QuizRequest):
    """Generate MCQs from uploaded documents using RAG."""
    result = get_quiz_gen().generate_quiz(
        query=request.query,
        num_questions=request.num_questions,
        difficulty=request.difficulty,
    )

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@app.get("/api/v1/document-stats")
def document_stats():
    """Check how many documents/chunks are stored."""
    return get_quiz_gen().get_store_stats()


# ============================================
# PHASE 3: iGOT Karmayogi Integration
# ============================================

@app.get("/api/v1/igot-courses")
def list_igot_courses():
    """List all courses from the iGOT Karmayogi catalog."""
    return get_rec_engine().get_all_courses()


@app.get("/api/v1/igot-courses/{competency_id}")
def get_courses_for_competency(competency_id: str):
    """Get courses tagged for a specific competency."""
    courses = get_rec_engine().get_courses_by_competency(competency_id)
    return {"competency_id": competency_id, "courses": courses}


@app.get("/api/v1/recommendations")
def get_recommendations_demo():
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
def get_personalized_recommendations(profile: OfficerProfile):
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
# CHATBOT (Saksham Assistant)
# ============================================

@app.post("/api/v1/chat")
def chat(request: ChatRequest):
    """Answer a question about the Saksham platform using the Groq-powered chatbot."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        result = get_chatbot().reply(request.message, request.history)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result