"""
Quiz Generator
Uses RAG to retrieve relevant context from uploaded documents
and generates MCQs using a template-based approach (no external LLM needed).
"""

import random
import re
from .vector_store import VectorStore


class QuizGenerator:
    """Generates MCQs from uploaded documents using RAG."""

    def __init__(self):
        self.vector_store = VectorStore()

    def ingest_document(self, filename: str, content: str) -> dict:
        """Store a document for later quiz generation."""
        num_chunks = self.vector_store.add_document(filename, content)
        return {
            "filename": filename,
            "chunks_stored": num_chunks,
            "status": "ingested",
        }

    def generate_quiz(
        self,
        query: str,
        num_questions: int = 5,
        difficulty: str = "mixed",
        source: str = None,
    ) -> dict:
        """
        Generate MCQs based on retrieved context.

        query:          what to generate questions about
        num_questions:  how many MCQs to generate
        difficulty:     "easy", "medium", "hard", or "mixed"
        source:         optional filename to filter by

        Returns: dict with questions list
        """
        # Step 1: Retrieve relevant chunks
        retrieved = self.vector_store.search(query, top_k=8)

        if not retrieved:
            return {
                "error": "No documents found. Upload a document first.",
                "questions": [],
            }

        # Combine retrieved chunks into context
        context = "\n".join([r["text"] for r in retrieved])

        # Step 2: Extract candidate sentences (facts) from the context
        facts = self._extract_facts(context)

        # Step 3: Generate MCQs until we reach the requested number
        # (or run out of usable sentences, whichever comes first)
        questions = []
        used_facts = set()
        for fact in facts:
            if len(questions) >= num_questions:
                break
            q = self._create_mcq(fact, context, difficulty, len(questions))
            # Deduplicate by the underlying answer/fact (questions that share
            # an identical stem such as "which statement is correct?" are still
            # distinct MCQs, so we must NOT deduplicate on the question text).
            if q and q["explanation"] not in used_facts:
                used_facts.add(q["explanation"])
                questions.append(q)

        return {
            "query": query,
            "num_questions": len(questions),
            "difficulty": difficulty,
            "context_chunks_used": len(retrieved),
            "questions": questions,
        }

    def _extract_facts(self, context: str) -> list[dict]:
        """
        Extract candidate sentences from the context that are meaningful enough
        to become quiz questions. Keeps every reasonably-sized, content-rich
        sentence rather than a tiny filtered subset, so we can reach the target
        question count.
        """
        facts = []
        sentences = re.split(r'(?<=[.!?])\s+', context)

        for sentence in sentences:
            sentence = sentence.strip()
            # Skip headers, very short fragments, and acronym-only lines
            # like "PO CO" by requiring a minimum length and a wordy structure.
            if len(sentence) < 40:
                continue
            if _looks_like_header(sentence):
                continue
            # Skip sentences contaminated by chunk-boundary header remnants
            # (e.g. "ethods & National Accounts\n  Chapter 2: ...\n2.1 ...").
            if _looks_fragmented(sentence):
                continue

            # Classify the kind of fact so we can ask a meaningful question type
            has_number = bool(re.search(r'\d+', sentence))
            has_definition = any(
                word in sentence.lower()
                for word in ["is defined as", "refers to", "means", "known as", "called", "is a"]
            )
            has_comparison = any(
                word in sentence.lower()
                for word in ["higher than", "lower than", "more than", "less than", "compared"]
            )

            fact_type = "definition" if has_definition else "number" if has_number else "general"
            if has_comparison:
                fact_type = "comparison"

            facts.append({
                "text": sentence,
                "type": fact_type,
            })

        # Deduplicate similar facts
        unique_facts = []
        seen = set()
        for f in facts:
            key = f["text"][:60].lower()
            if key not in seen:
                seen.add(key)
                unique_facts.append(f)

        return unique_facts

    def _create_mcq(self, fact: dict, full_context: str, difficulty: str, index: int) -> dict:
        """
        Create one MCQ from a fact.

        Builds a proper question stem, pairs it with a correct answer, and
        generates plausible distractors so every question has 4 options.
        """
        fact_text = fact["text"]
        fact_type = fact["type"]

        question, correct_answer = self._build_question_and_answer(fact_text, fact_type)
        if not question:
            return None

        distractors = self._generate_distractors(
            correct_answer, fact_type, fact_text, full_context
        )
        if len(distractors) < 3:
            return None

        # Build 4 options and shuffle them
        options = [correct_answer] + distractors[:3]
        random.shuffle(options)
        correct_letter = chr(65 + options.index(correct_answer))  # A, B, C, or D

        # Map difficulty
        if difficulty == "mixed":
            diff = random.choice(["easy", "medium", "hard"])
        else:
            diff = difficulty

        return {
            "question": question,
            "options": [f"{chr(65+i)}) {opt}" for i, opt in enumerate(options)],
            "correct_answer": correct_letter,
            "explanation": fact_text,
            "difficulty": diff,
            "source_chunk": fact_text[:200],
        }

    def _build_question_and_answer(self, fact: str, fact_type: str) -> tuple:
        """
        Return a (question, correct_answer) pair that reads like a real MCQ,
        rather than a clipped sentence fragment.
        """
        # 1) Number-based fact: ask for the value and use the number as answer
        if fact_type == "number" or fact_type == "comparison":
            number_matches = list(re.finditer(r'\d+(?:[.,]\d+)*\s*%?', fact))
            if number_matches:
                # Use the first explicit numeric value as the answer
                # (using the last can pick up the tail of a date range)
                match = number_matches[0]
                value = match.group(0).strip()
                before = fact[: match.start()].strip()
                topic = _clean_topic(before)
                if topic and value:
                    question = f"According to the document, what is the value related to {topic}?"
                    return question, value

        # 2) Definition-based fact: ask "What is X?"
        if fact_type == "definition":
            m = re.search(
                r'^(.{3,60}?)\s+(?:is defined as|refers to|means|is known as|is called|is)\s+(.+)$',
                fact,
                re.IGNORECASE,
            )
            if m and len(m.group(2)) > 15:
                subject = _clean_subject(m.group(1).strip())
                definition = _clean_definition(m.group(2).strip())
                question = f"What best describes {subject}?"
                return question, definition

        # 3) Fallback: treat a full sentence as a "which statement is correct" question
        cleaned = _clean_definition(fact)
        return f"Based on the document, which of the following statements is correct?", cleaned

    def _generate_distractors(self, correct: str, fact_type: str, fact_text: str, context: str) -> list[str]:
        """
        Generate 3+ plausible wrong answers (distractors) matching the type of
        the correct answer.

        - number/comparison: distractors are other numbers from the context or
          numerically-mangled versions of the correct value.
        - definition/general: distractors are other meaningful statements from
          the context, plus (if needed) slightly mutated versions.
        """
        distractors = []

        if fact_type in ("number", "comparison"):
            return self._extract_number_distractors(correct, context)

        # Definition / general: use other full sentences as distractors
        sentences = re.split(r'(?<=[.!?])\s+', context)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 40:
                continue
            if _looks_like_header(sentence):
                continue
            candidate = _clean_definition(sentence)
            if not candidate or candidate == correct:
                continue
            if candidate not in distractors:
                distractors.append(candidate)
            if len(distractors) >= 4:
                break

        # Fallback: mutate the correct definition by swapping a known keyword
        if len(distractors) < 3:
            fallback = self._mutate_definition(correct, context)
            for f_ in fallback:
                if f_ and f_ != correct and f_ not in distractors:
                    distractors.append(f_)
                if len(distractors) >= 3:
                    break

        return distractors[:4]

    def _extract_number_distractors(self, correct: str, context: str) -> list[str]:
        """Build number-based distractor options for a numeric answer."""
        distractors = []
        # 1) Other numbers that appear elsewhere in the context, skipping
        #    section / figure labels (e.g. "2", "2.1", "1.3") which are
        #    not meaningful answer options.
        for m in re.finditer(r'\d+(?:[.,]\d+)*', context):
            candidate = m.group(0).strip()
            if candidate == correct:
                continue
            if _is_section_number(candidate):
                continue
            if candidate not in distractors:
                distractors.append(candidate)
            if len(distractors) >= 4:
                break

        # 2) If not enough, mangle the correct number
        if len(distractors) < 3:
            number_matches = list(re.finditer(r'\d+(?:[.,]\d+)*', correct))
            if number_matches:
                base_number = number_matches[-1].group(0)
                try:
                    base_val = float(base_number.replace(",", ""))
                except ValueError:
                    base_val = None
                if base_val is not None:
                    for delta in [1, -1, 5, 10, 100, 0.5]:
                        wrong_number = _format_number(base_val + delta)
                        if wrong_number == base_number or wrong_number in distractors:
                            continue
                        distractors.append(wrong_number)
                        if len(distractors) >= 3:
                            break

        return distractors

    def _mutate_definition(self, correct: str, context: str) -> list[str]:
        """Create plausible wrong statements by negating a sentence-keyword."""
        mutations = []
        # Try to swap a key phrase seen in other sentences' context
        sentences = re.split(r'(?<=[.!?])\s+', context)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 40:
                continue
            words = sentence.split()
            if len(words) > 6:
                # replace the middle 4 words of the correct statement with
                # the middle 4 words of another statement
                mid = len(words) // 2
                phrase = " ".join(words[mid : mid + 4])
                wrong = correct.replace(
                    " ".join(correct.split()[max(0, len(correct.split()) // 2 - 2): len(correct.split()) // 2 + 2]),
                    phrase,
                )
                if wrong != correct:
                    mutations.append(wrong)
            if len(mutations) >= 3:
                break
        return mutations


    def get_store_stats(self) -> dict:
        """Get info about stored documents."""
        return self.vector_store.get_stats()


def _looks_like_header(text: str) -> bool:
    """Detect heading-like fragments such as 'PO CO' or 'Chapter 1: ...'."""
    # Pure acronym / short token strings (e.g. "PO CO", "GDP GVA GDP")
    tokens = text.split()
    if 1 <= len(tokens) <= 4:
        all_acronyms = all(
            re.fullmatch(r'[A-Z0-9][A-Z0-9&\-/\s]*', t) for t in tokens
        )
        # Skip if every token is short acronyms/uppercase abbreviations
        if all_acronyms and all(len(t) <= 6 for t in tokens):
            return True
    # Heading pattern like "Chapter 1:", "Section 1.1", "3.1 Overview"
    if re.match(r'^(chapter|section)\s+\d', text, re.IGNORECASE) or re.match(r'^\d+(\.\d+)*\s', text):
        return True
    return False


def _looks_fragmented(text: str) -> bool:
    """
    Detect sentences contaminated by document/chunk artifacts: an embedded
    heading or a truncated leading token (e.g. "ethods & ...", "...Chapter 2:").
    Such fragments don't make for clean quiz questions.
    """
    # Contains an embedded heading line like "Chapter 2:" or "2.1" within it
    if re.search(r'\n\s*(?:chapter|section)\s+\d', text, re.IGNORECASE):
        return True
    if re.search(r'\n\s*\d+(?:\.\d+)*[\s:].{0,30}', text):
        return True
    # Starts mid-word (a truncated leading token with no preceding whitespace)
    first_token = re.split(r'\s+', text.strip())[0]
    # e.g. "ethods", "hapter", or ends with "&" as a remnant
    if first_token and (first_token.endswith('&') or not re.match(r'^[A-Z][a-zA-Z]*', first_token)):
        return True
    return False


def _clean_subject(text: str) -> str:
    """Clean up a definition subject for display in a question."""
    text = text.strip().strip(':').strip()
    # Strip leading section numbers like "2.1" or "GDP"
    text = re.sub(r'^[\d.]+[:\s]+', '', text)
    return text.strip()


def _clean_topic(before: str) -> str:
    """
    Derive a clean topic phrase from the text preceding a number, dropping
    trailing verbs / prepositions so the question reads naturally.

    e.g. "India's IMR was" -> "India's IMR"
         "the value related to for national accounts is" -> "the national accounts"
    """
    text = before.strip()
    # strip trailing section labels / header remnants (e.g. "Chapter 2", "2.1", "... &")
    text = re.sub(r'(?:chapter|section)\s*\d.*$', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*[^\w&]+&?\s*$', '', text)   # leading ampersand / symbol remnants
    # stop words that usually follow the subject, not precede it
    trailing = re.split(
        r'\s+(?:is|are|was|were|has|had|have|of|to|for|per|in|at|by|from|the|a|an)\s*$',
        text,
        maxsplit=1,
    )[0].strip()
    trailing = trailing.rstrip(' ,:;')
    # collapse the tail if it contains a filler phrase like "value related to"
    words = re.split(r'\s+', trailing)
    # keep at most the last 4 meaningful tokens
    topic_words = words[-4:]
    return " ".join(topic_words) if topic_words else "the value in the document"


def _is_section_number(value: str) -> bool:
    """Return True if a number string looks like a document section/figure label."""
    # Section labels like "2.1", "1.3.2"; also standalone tiny integers used
    # as list markers ("2", "3") are excluded.
    if re.fullmatch(r'\d+(?:\.\d+)+', value):
        return True
    try:
        num = float(value.replace(",", ""))
    except ValueError:
        return False
    return 0 < num < 3


def _clean_definition(text: str) -> str:
    """Normalize a definition/statement for display as an option."""
    text = text.strip()
    if text.endswith('.'):
        text = text[:-1]
    return text


def _format_number(value: float) -> str:
    """Format a numeric value as a display string."""
    if value == int(value):
        return str(int(value))
    return f"{value:.1f}"
