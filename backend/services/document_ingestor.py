"""
Document Ingestor
Parses PDFs, DOCX, and TXT files into plain text.
"""

import pymupdf
from docx import Document
from pathlib import Path


class DocumentIngestor:
    """Reads files and extracts text content."""

    def ingest(self, file_path: str) -> dict:
        """
        Parse a file and return its text content.

        Returns: {"filename": str, "content": str, "num_pages": int}
        """
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix == ".pdf":
            return self._ingest_pdf(path)
        elif suffix == ".docx":
            return self._ingest_docx(path)
        elif suffix == ".txt":
            return self._ingest_txt(path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")

    def ingest_bytes(self, filename: str, content: bytes) -> dict:
        """Parse file from raw bytes (for uploaded files)."""
        import tempfile
        import os

        suffix = Path(filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            return self.ingest(tmp_path)
        finally:
            os.unlink(tmp_path)

    def _ingest_pdf(self, path: Path) -> dict:
        doc = pymupdf.open(str(path))
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        num_pages = len(doc)
        doc.close()
        return {
            "filename": path.name,
            "content": "\n".join(text_parts),
            "num_pages": num_pages,
        }

    def _ingest_docx(self, path: Path) -> dict:
        doc = Document(str(path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return {
            "filename": path.name,
            "content": "\n".join(paragraphs),
            "num_pages": 0,
        }

    def _ingest_txt(self, path: Path) -> dict:
        content = path.read_text(encoding="utf-8")
        return {
            "filename": path.name,
            "content": content,
            "num_pages": 0,
        }
