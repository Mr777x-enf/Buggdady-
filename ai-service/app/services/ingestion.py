from pathlib import Path
from app.repository.git import get_commit_sha

from app.repository.clone import clone_repository
from app.repository.files import get_source_files
from app.repository.cleanup import cleanup_repository

from app.rag.registry import parser_registry
from app.rag.recursive_splitter import recursive_split_chunk


async def ingest_repository(
    repo_url: str,
    session_id: str,
    repository_id: str,
):
    repo_dir = None

    try:
        # 1. Clone repository
        repo_dir = clone_repository(
            repo_url=repo_url,
            session_id=session_id,
        )

        # 2. Get the exact commit that was cloned
        commit_sha = get_commit_sha(repo_dir)

        # 3. Discover source files
        files = get_source_files(repo_dir)

        all_chunks = []

        # 4. Process every supported source file
        for file_path in files:

            # Ask the registry which parser handles this file
            parser = parser_registry.get_parser(file_path)

            # Unsupported language/file type
            if parser is None:
                continue

            # Read source code
            source = Path(file_path).read_text(
                encoding="utf-8"
            )

            # Parse source code
            chunks = parser.parse_file(
                file_path=file_path,
                source=source,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
            )

            # 5. Apply size-based splitting
            for chunk in chunks:

                final_chunks = recursive_split_chunk(
                    chunk
                )

                all_chunks.extend(final_chunks)

        return {
            "session_id": session_id,
            "repository_id": repository_id,
            "commit_sha": commit_sha,
            "file_count": len(files),
            "chunk_count": len(all_chunks),
            "status": "chunked",
        }

    finally:
        # Always remove cloned repository
        cleanup_repository(repo_dir)