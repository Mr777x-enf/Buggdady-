from app.repository.clone import clone_repository
from app.repository.files import get_source_files
from app.repository.cleanup import cleanup_repository

from app.rag.code_chunker import chunk_python_file
from app.rag.recursive_splitter import recursive_split_chunk


async def ingest_repository(
    repo_url: str,
    session_id: str
):

    repo_dir = None

    try:

        # 1. Clone
        repo_dir = clone_repository(
            repo_url,
            session_id
        )

        # 2. Find source files
        files = get_source_files(repo_dir)

        all_chunks = []

        # 3. Code-aware chunking
        for file_path in files:

            if file_path.endswith(".py"):

                chunks = chunk_python_file(
                    file_path,
                    session_id
                )

                # 4. Recursive splitting
                for chunk in chunks:

                    final_chunks = recursive_split_chunk(
                        chunk
                    )

                    all_chunks.extend(
                        final_chunks
                    )

        return {
            "session_id": session_id,
            "file_count": len(files),
            "chunk_count": len(all_chunks),
            "status": "chunked"
        }

    finally:

        cleanup_repository(repo_dir)