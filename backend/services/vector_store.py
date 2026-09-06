"""
Vector Store
Chunks text, creates embeddings, stores in ChromaDB for RAG retrieval.
"""

import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path


class VectorStore:
    """Manages document chunks and their embeddings."""

    def __init__(self, collection_name: str = "saksham_docs"):
        # Load embedding model (runs locally, ~100MB download first time)
        self.embed_model = SentenceTransformer("all-MiniLM-L6-v2")

        # Initialize ChromaDB (stores data locally)
        db_path = Path(__file__).parent.parent / "data" / "chroma_db"
        self.client = chromadb.PersistentClient(path=str(db_path))
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
        """
        Split text into overlapping chunks.

        chunk_size: max characters per chunk
        overlap:    characters to overlap between chunks
        """
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind(".")
                last_newline = chunk.rfind("\n")
                break_point = max(last_period, last_newline)
                if break_point > chunk_size // 2:
                    chunk = text[start : start + break_point + 1]
                    end = start + break_point + 1

            if chunk.strip():
                chunks.append(chunk.strip())

            start = end - overlap

        return chunks

    def add_document(self, filename: str, content: str, doc_id: str = None) -> int:
        """
        Chunk a document and store its embeddings.

        Returns: number of chunks stored
        """
        if doc_id is None:
            doc_id = filename.replace(" ", "_").replace(".", "_")

        chunks = self.chunk_text(content)
        if not chunks:
            return 0

        # Create embeddings
        embeddings = self.embed_model.encode(chunks).tolist()

        # Build IDs and metadata
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"filename": filename, "chunk_index": i, "doc_id": doc_id}
            for i in range(len(chunks))
        ]

        # Store in ChromaDB (upsert = insert or update)
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )

        return len(chunks)

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Find the most relevant chunks for a query.

        Returns: list of {"text": str, "score": float, "metadata": dict}
        """
        query_embedding = self.embed_model.encode([query]).tolist()

        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        output = []
        for i in range(len(results["ids"][0])):
            output.append({
                "text": results["documents"][0][i],
                "score": 1 - results["distances"][0][i],  # convert distance to similarity
                "metadata": results["metadatas"][0][i],
            })

        return output

    def get_stats(self) -> dict:
        """Get stats about stored documents."""
        count = self.collection.count()
        return {
            "total_chunks": count,
            "collection_name": self.collection.name,
        }
