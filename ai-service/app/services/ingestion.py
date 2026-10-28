
import asyncio
from pathlib import Path

from app.repository.clone import clone_repository
from app.repository.files import get_source_files
from app.repository.cleanup import cleanup_repository

from app.rag.registry import parser_registry
from app.rag.recursive_splitter import recursive_split_chunk
from app.rag.embeddings import create_embeddings
from app.rag.vector_store import store_chunks


async def ingest_repository(
    repo_url: str,
    session_id: str,
    repository_id: str,
):
    repo_dir = None

    try:
        # 1. Clone repository
        clone_result = clone_repository(
            repo_url=repo_url,
            session_id=session_id,
        )

        repo_dir = clone_result["repo_dir"]
        commit_sha = clone_result["commit_sha"]

        files = get_source_files(repo_dir)

        all_chunks = []

        for file_path in files:
            parser = parser_registry.get_parser(file_path)

            if parser is None:
                continue

            source = Path(file_path).read_text(
                encoding="utf-8"
            )

            chunks = parser.parse_file(
                file_path=file_path,
                source=source,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
            )

            # 5. Split chunks
            for chunk in chunks:
                final_chunks = recursive_split_chunk(chunk)
                all_chunks.extend(final_chunks)

        if not all_chunks:
            raise ValueError("Repository contains no supported code chunks")

        embedded_chunks = await asyncio.to_thread(
            create_embeddings,
            all_chunks,
        )
        if len(embedded_chunks) != len(all_chunks):
            raise RuntimeError("Embedding service returned an incomplete result")
        await store_chunks(embedded_chunks)

        return {
            "session_id": session_id,
            "repository_id": repository_id,
            "commit_sha": commit_sha,
            "file_count": len(files),
            "chunk_count": len(all_chunks),
            "status": "indexed",
        }

    finally:
        # 6. Remove the cloned repository
        if repo_dir is not None:
            cleanup_repository(repo_dir)
