"""
Quiz Generator
Uses RAG to retrieve relevant context from uploaded documents
and generates high-quality MCQs using an LLM (Groq-hosted) with an upgraded
offline NLP fallback engine. Also extracts major topics/sections from documents.
"""

import os
import json
import random
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
from .vector_store import VectorStore


class QuizGenerator:
    """Generates MCQs and extracts major topics from uploaded documents using RAG."""

    def __init__(self):
        self.vector_store = VectorStore()
        # In-memory storage of extracted topics keyed by filename
        self.document_topics: Dict[str, List[str]] = {}

    def extract_topics(self, content: str) -> List[str]:
        """
        Extract 4 to 8 major topics/concepts from the document content.
        Uses Groq LLM if available, with an NLP heuristic fallback.
        """
        api_key = os.environ.get("GROQ_API_KEY")
        model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

        if api_key:
            try:
                from groq import Groq
                client = Groq(api_key=api_key)
                prompt = (
                    "Analyze the following document text and extract 5 to 8 clear, specific major topics, "
                    "concepts, or sections covered in the document that would be ideal for generating quiz questions.\n"
                    "Requirements:\n"
                    "- Return ONLY a valid JSON list of strings (e.g. [\"Topic 1\", \"Topic 2\", \"Topic 3\"]).\n"
                    "- Keep topic names concise and professional (2 to 6 words each).\n"
                    "- Do not include markdown codeblocks, numbering, or explanation.\n\n"
                    f"Document Content (sample):\n{content[:4000]}"
                )

                resp = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.2,
                )
                text = resp.choices[0].message.content.strip()
                # Strip codeblocks if present
                if "```" in text:
                    text = re.sub(r'```(?:json)?\s*', '', text).strip('` \n\r')

                parsed = json.loads(text)
                if isinstance(parsed, list) and len(parsed) >= 2:
                    return [str(t).strip() for t in parsed if isinstance(t, str) and len(t.strip()) >= 3][:8]
            except Exception:
                pass  # Fallback to NLP heuristics

        return self._extract_topics_nlp(content)

    def _extract_topics_nlp(self, content: str) -> List[str]:
        """Extract major topics using pattern matching and NLP heuristics."""
        topics = []
        seen = set()

        def add_topic(raw: str):
            t = raw.strip(" \t\r\n:.-#*\"'")
            # Remove leading numbers/bullets (e.g. "1. ", "2.1 ")
            t = re.sub(r'^\d+[\.\)]\s*', '', t).strip()
            # Clean leading "The " and trailing verbs
            t = re.sub(r'^The\s+', '', t, flags=re.IGNORECASE).strip()
            t = re.sub(r'\s+(?:include|includes|refer to|is defined as).*$', '', t, flags=re.IGNORECASE).strip()

            if not t or len(t) < 4 or len(t) > 55:
                return
            lower = t.lower()
            if lower in ("table of contents", "introduction", "chapter", "section", "summary", "references", "overview", "index"):
                return

            if lower not in seen:
                seen.add(lower)
                topics.append(t)

        lines = content.splitlines()
        for line in lines:
            line_s = line.strip()
            if not line_s:
                continue
            if line_s.startswith("#"):
                add_topic(line_s.lstrip("#").strip())
            elif ":" in line_s:
                prefix = line_s.split(":")[0].strip()
                if len(prefix) <= 45 and re.search(r'[A-Za-z]', prefix) and not re.match(r'^\d+:\d+', prefix):
                    add_topic(prefix)

        # Technical terms with acronyms: e.g. "National Accounts Statistics (NAS)"
        for m in re.finditer(r'([A-Z][a-zA-Z\s]{3,40}\s*\([A-Z0-9]{2,8}\))', content):
            add_topic(m.group(1).strip())

        # Definition subjects
        for m in re.finditer(r'(?:^|\.\s+)(?:The\s+)?([A-Z][a-zA-Z\s]{3,40}(?:\([A-Z0-9]+\))?)\s+(?:is\s+a|is\s+defined|refers\s+to|provides|follows)', content):
            add_topic(m.group(1).strip())

        # Prominent capitalized multi-word phrases
        for m in re.finditer(r'(?:^|\.\s+)(?:Under\s+the\s+|In\s+the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})', content):
            cand = m.group(1).strip()
            if cand.lower() not in ("the central", "india s", "the national", "all rights"):
                add_topic(cand)

        return topics[:8]

    def ingest_document(self, filename: str, content: str) -> dict:
        """Store a document in vector store and extract its major topics."""
        num_chunks = self.vector_store.add_document(filename, content)
        topics = self.extract_topics(content)
        self.document_topics[filename] = topics

        return {
            "filename": filename,
            "chunks_stored": num_chunks,
            "topics": topics,
            "status": "ingested",
        }

    def get_all_topics(self) -> List[str]:
        """Return combined unique topics extracted from all ingested documents."""
        all_topics = []
        seen = set()
        for t_list in self.document_topics.values():
            for t in t_list:
                k = t.lower()
                if k not in seen:
                    seen.add(k)
                    all_topics.append(t)
        return all_topics

    def get_store_stats(self) -> dict:
        """Get stats about stored documents and chunks."""
        stats = self.vector_store.get_stats()
        stats["topics_count"] = len(self.get_all_topics())
        stats["documents_indexed"] = len(self.document_topics)
        return stats


    def generate_quiz(
        self,
        query: str,
        num_questions: int = 5,
        difficulty: str = "mixed",
        source: str = None,
    ) -> dict:
        """
        Generate high quality MCQs based on retrieved context.
        Uses Groq LLM if available, with an enhanced rule-based fallback.
        """
        search_query = query.strip() if query and query.strip() and query.strip().lower() != "all" else "overview concepts definitions methodology"

        # Step 1: Retrieve relevant chunks
        retrieved = self.vector_store.search(search_query, top_k=8)

        if not retrieved:
            return {
                "error": "No documents found. Upload a document first.",
                "questions": [],
            }

        context = "\n\n".join([r["text"] for r in retrieved])

        # Step 2: Try LLM-based MCQ generation
        llm_result = self._generate_with_llm(context, query, num_questions, difficulty)
        if llm_result:
            return {
                "query": query,
                "num_questions": len(llm_result),
                "difficulty": difficulty,
                "context_chunks_used": len(retrieved),
                "engine": "llm",
                "questions": llm_result,
            }

        # Step 3: Upgraded Rule-based Fallback
        fallback_questions = self._generate_with_rules(context, query, num_questions, difficulty)

        return {
            "query": query,
            "num_questions": len(fallback_questions),
            "difficulty": difficulty,
            "context_chunks_used": len(retrieved),
            "engine": "nlp_fallback",
            "questions": fallback_questions,
        }

    def _generate_with_llm(
        self, context: str, topic: str, num_questions: int, difficulty: str
    ) -> Optional[List[Dict[str, Any]]]:
        """Call Groq LLM to generate high quality exam-standard MCQs."""
        api_key = os.environ.get("GROQ_API_KEY")
        model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

        if not api_key:
            return None

        try:
            from groq import Groq
            client = Groq(api_key=api_key)

            system_prompt = (
                "You are an expert exam author creating high-quality multiple choice questions (MCQs) "
                "for official government officers and analysts based strictly on the provided source text.\n\n"
                "Guidelines:\n"
                f"1. Generate exactly {num_questions} questions covering the topic '{topic}' (difficulty: {difficulty}).\n"
                "2. Each question MUST test specific definitions, methodologies, formulas, indicators, or facts explicitly stated in the context.\n"
                "3. Each question must have exactly 4 plausible options labeled A), B), C), D).\n"
                "4. Specify the correct_answer as a single letter: 'A', 'B', 'C', or 'D'.\n"
                "5. Provide a 1-2 sentence explanation citing the document context.\n"
                "6. Return ONLY valid JSON with no markdown wrapping or preamble, matching this exact structure:\n"
                "{\n"
                '  "questions": [\n'
                "    {\n"
                '      "question": "What is the primary methodology...",\n'
                '      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],\n'
                '      "correct_answer": "A",\n'
                '      "explanation": "According to the document...",\n'
                '      "difficulty": "medium"\n'
                "    }\n"
                "  ]\n"
                "}"
            )

            user_prompt = f"Source Document Context:\n{context[:6000]}\n\nGenerate {num_questions} MCQs for topic: '{topic}'"

            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1500,
                temperature=0.3,
            )

            raw_text = resp.choices[0].message.content.strip()
            # Clean markdown code blocks
            if "```" in raw_text:
                raw_text = re.sub(r'```(?:json)?\s*', '', raw_text).strip('` \n\r')

            data = json.loads(raw_text)
            raw_questions = data.get("questions", []) if isinstance(data, dict) else data

            parsed_questions = []
            for item in raw_questions:
                if not isinstance(item, dict):
                    continue
                q_text = item.get("question", "").strip()
                if not q_text:
                    continue

                raw_opts = item.get("options", [])
                formatted_opts = []

                if isinstance(raw_opts, dict):
                    # Handle {"A": "text", "B": "text", ...}
                    for letter in ["A", "B", "C", "D"]:
                        val = raw_opts.get(letter, "").strip()
                        formatted_opts.append(f"{letter}) {val}" if val else f"{letter}) Option")
                elif isinstance(raw_opts, list):
                    for idx, opt in enumerate(raw_opts[:4]):
                        opt_s = str(opt).strip()
                        letter = chr(65 + idx)
                        if not re.match(r'^[A-D]\)', opt_s):
                            opt_s = f"{letter}) {opt_s}"
                        formatted_opts.append(opt_s)

                if len(formatted_opts) < 4:
                    continue

                # Clean correct answer
                ans = str(item.get("correct_answer") or item.get("answer", "A")).strip().upper()
                if ans not in ("A", "B", "C", "D"):
                    match = re.search(r'\b([A-D])\b', ans)
                    ans = match.group(1) if match else "A"

                parsed_questions.append({
                    "question": q_text,
                    "options": formatted_opts,
                    "correct_answer": ans,
                    "explanation": item.get("explanation", "Refer to the source document context for full details."),
                    "difficulty": item.get("difficulty", difficulty if difficulty != "mixed" else "medium"),
                    "source_chunk": context[:200],
                })

            if len(parsed_questions) >= 1:
                return parsed_questions[:num_questions]
        except Exception:
            pass

        return None

    def _generate_with_rules(
        self, context: str, query: str, num_questions: int, difficulty: str
    ) -> List[Dict[str, Any]]:
        """Upgraded rule-based generator for conceptual, specific MCQs."""
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', context) if len(s.strip()) > 35]
        questions = []
        seen_stems = set()

        for s in sentences:
            if len(questions) >= num_questions:
                break

            mcq = None
            # 1. Definition matcher
            m_def = re.search(
                r'^(?:The\s+)?([A-Z][a-zA-Z\s]{2,45}(?:\([A-Z0-9]+\))?)\s+(?:is defined as|refers to|means|is a|provides)\s+(.+)$',
                s,
                re.IGNORECASE,
            )
            if m_def:
                subject = m_def.group(1).strip()
                meaning = m_def.group(2).strip().rstrip('.')
                if len(meaning) > 15:
                    q_text = f"According to the document, what best describes {subject}?"
                    if q_text not in seen_stems:
                        distractors = self._build_distractors(meaning, sentences)
                        options = [f"A) {meaning}"] + [f"{chr(66+i)}) {d}" for i, d in enumerate(distractors[:3])]
                        random.shuffle(options)
                        # Find correct index
                        correct_idx = next(i for i, opt in enumerate(options) if opt.endswith(meaning))
                        correct_letter = chr(65 + correct_idx)
                        mcq = {
                            "question": q_text,
                            "options": [f"{chr(65+i)}) {opt[3:]}" for i, opt in enumerate(options)],
                            "correct_answer": correct_letter,
                            "explanation": s,
                            "difficulty": "medium",
                            "source_chunk": s[:200],
                        }

            # 2. Number/Indicator matcher (skipping section labels like 2.1)
            if not mcq:
                m_num = re.search(r'([A-Z][a-zA-Z\s]{2,35})\s+(?:was|is|reached|declined to|stood at)\s+(\d+(?:\.\d+)?(?:\s*%)?)', s)
                if m_num and not _is_section_number(m_num.group(2)):
                    indicator = m_num.group(1).strip()
                    val = m_num.group(2).strip()
                    q_text = f"According to the document, what was the reported value for {indicator}?"
                    if q_text not in seen_stems:
                        num_distractors = self._build_num_distractors(val)
                        all_opts = [val] + num_distractors[:3]
                        random.shuffle(all_opts)
                        correct_letter = chr(65 + all_opts.index(val))
                        mcq = {
                            "question": q_text,
                            "options": [f"{chr(65+i)}) {opt}" for i, opt in enumerate(all_opts)],
                            "correct_answer": correct_letter,
                            "explanation": s,
                            "difficulty": "easy",
                            "source_chunk": s[:200],
                        }

            # 3. Method / System matcher
            if not mcq and any(kw in s.lower() for kw in ["method", "system", "approach", "framework"]):
                m_sub = re.search(r'(?:^|\.\s+)(?:The\s+)?([A-Z][a-zA-Z\s]{2,35})\s+uses\s+(?:a\s+)?([^,.]+)', s, re.IGNORECASE)
                if m_sub:
                    entity = m_sub.group(1).strip()
                    method = m_sub.group(2).strip()
                    q_text = f"Which method or approach does {entity} utilize according to the text?"
                    if q_text not in seen_stems and len(method) > 5:
                        distractors = ["Single sample retrospective survey", "Decennial census enumeration", "Linear extrapolation model"]
                        all_opts = [method] + distractors
                        random.shuffle(all_opts)
                        correct_letter = chr(65 + all_opts.index(method))
                        mcq = {
                            "question": q_text,
                            "options": [f"{chr(65+i)}) {opt}" for i, opt in enumerate(all_opts)],
                            "correct_answer": correct_letter,
                            "explanation": s,
                            "difficulty": "medium",
                            "source_chunk": s[:200],
                        }

            if mcq:
                seen_stems.add(mcq["question"])
                questions.append(mcq)

        return questions

    def _build_distractors(self, correct: str, sentences: List[str]) -> List[str]:
        """Produce alternative plausible phrase distractors."""
        pool = []
        for s in sentences:
            m = re.search(r'(?:is defined as|refers to|means|is a|provides)\s+(.+)$', s, re.IGNORECASE)
            if m:
                cand = m.group(1).strip().rstrip('.')
                if cand and cand != correct and cand not in pool and len(cand) > 10:
                    pool.append(cand)

        default_distractors = [
            "A periodic survey covering commercial and non-profit institutions",
            "A decennial administrative registry managed by municipal bodies",
            "An international financial reporting benchmark established by the IMF",
            "A preliminary quarterly estimation system for agricultural output"
        ]
        for d in default_distractors:
            if len(pool) >= 3:
                break
            if d != correct and d not in pool:
                pool.append(d)

        return pool[:3]

    def _build_num_distractors(self, value_str: str) -> List[str]:
        """Build realistic variations of a numerical value."""
        is_pct = "%" in value_str
        cleaned = value_str.replace("%", "").strip()
        try:
            num = float(cleaned)
            v1 = num * 1.25
            v2 = num * 0.75
            v3 = num * 1.5
            suffix = "%" if is_pct else ""

            def fmt(n):
                return f"{int(n)}{suffix}" if n == int(n) else f"{n:.1f}{suffix}"

            return [fmt(v1), fmt(v2), fmt(v3)]
        except ValueError:
            return ["15", "25", "50"]


def _is_section_number(value: str) -> bool:
    """Return True if a number looks like a section index (e.g. 2.1)."""
    if re.fullmatch(r'\d+(?:\.\d+)+', value):
        return True
    try:
        num = float(value.replace(",", ""))
        return 0 < num < 3 and "." not in value
    except ValueError:
        return False
