from app.llm.db.connection import get_db


async def search_similar_chunks(
    query_embedding: list[float],
    repository_id: str,
    commit_sha: str,
    limit: int = 5,
) -> list[dict]:
    """
    Find the most relevant code chunks for a query.
    """

    if not query_embedding:
        return []

    if len(query_embedding) != 1536:
        raise ValueError(
            f"Expected 1536-dimensional embedding, got {len(query_embedding)}"
        )

    db = await get_db()

    try:
        rows = await db.fetch(
            """
            SELECT
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
                embedding <=> $1 AS distance
            FROM code_chunks
            WHERE repository_id = $2
              AND commit_sha = $3
            ORDER BY embedding <=> $1
            LIMIT $4
            """,
            query_embedding,
            repository_id,
            commit_sha,
            limit,
        )

        return [dict(row) for row in rows]

    finally:
        await db.close()