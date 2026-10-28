from app.llm.db.connection import get_db
from app.rag.models import CodeChunk


async def store_chunks(
    embedded_chunks: list[tuple[CodeChunk, list[float]]],
) -> None:
    """
    Store CodeChunks and their embeddings in PostgreSQL.
    """

    if not embedded_chunks:
        return

    db = await get_db()

    try:
        async with db.transaction():
            for chunk, embedding in embedded_chunks:
                if len(embedding) != 1536:
                    raise ValueError(
                        f"Invalid embedding dimension for {chunk.id}: "
                        f"expected 1536, got {len(embedding)}"
                    )

                await db.execute(
                    """
                    INSERT INTO code_chunks (
                        id,
                        repository_id,
                        commit_sha,
                        session_id,
                        file_path,
                        language,
                        symbol_name,
                        symbol_type,
                        parent_symbol,
                        start_line,
                        end_line,
                        source,
                        parser_version,
                        chunker_version,
                        embedding
                    )
                    VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        repository_id = EXCLUDED.repository_id,
                        commit_sha = EXCLUDED.commit_sha,
                        session_id = EXCLUDED.session_id,
                        file_path = EXCLUDED.file_path,
                        language = EXCLUDED.language,
                        symbol_name = EXCLUDED.symbol_name,
                        symbol_type = EXCLUDED.symbol_type,
                        parent_symbol = EXCLUDED.parent_symbol,
                        start_line = EXCLUDED.start_line,
                        end_line = EXCLUDED.end_line,
                        source = EXCLUDED.source,
                        parser_version = EXCLUDED.parser_version,
                        chunker_version = EXCLUDED.chunker_version,
                        embedding = EXCLUDED.embedding
                    """,
                    chunk.id,
                    chunk.repository_id,
                    chunk.commit_sha,
                    chunk.session_id,
                    chunk.file_path,
                    chunk.language,
                    chunk.symbol_name,
                    chunk.symbol_type,
                    chunk.parent_symbol,
                    chunk.start_line,
                    chunk.end_line,
                    chunk.source,
                    chunk.parser_version,
                    chunk.chunker_version,
                    embedding,
                )

    finally:
        await db.close()