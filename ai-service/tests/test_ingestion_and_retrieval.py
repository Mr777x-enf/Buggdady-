import os
import unittest
from unittest.mock import AsyncMock, Mock, patch

os.environ.setdefault("GEMINI_API_KEY", "unit-test-key")

from app.rag.models import CodeChunk
from app.rag.retriever import search_similar_chunks
from app.rag.vector_store import store_chunks
from app.services import ingestion


def make_chunk():
    return CodeChunk(
        id="session-1:src/main.py:0",
        repository_id="42",
        commit_sha="commit-1",
        session_id="session-1",
        file_path="src/main.py",
        language="python",
        symbol_name="run",
        symbol_type="function",
        parent_symbol=None,
        start_line=1,
        end_line=2,
        source="def run(): pass",
        parser_version="python-v1",
        chunker_version="v2",
    )


class FakeConnection:
    def __init__(self):
        self.fetch_args = None
        self.execute_args = []
        self.closed = False

    async def fetch(self, *args):
        self.fetch_args = args
        return [{"repository_id": "42", "commit_sha": "commit-1"}]

    async def execute(self, *args):
        self.execute_args.append(args)

    async def close(self):
        self.closed = True

    def transaction(self):
        return FakeTransaction()


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, _type, _value, _traceback):
        return False


class RetrievalIsolationTests(unittest.IsolatedAsyncioTestCase):
    async def test_query_filters_repository_and_exact_commit_before_ranking(self):
        connection = FakeConnection()
        with patch(
            "app.rag.retriever.get_db",
            new=AsyncMock(return_value=connection),
        ):
            results = await search_similar_chunks(
                query_embedding=[0.1] * 1536,
                repository_id="42",
                commit_sha="commit-1",
            )

        query, _embedding, repository_id, commit_sha, _limit = (
            connection.fetch_args
        )
        self.assertIn("WHERE repository_id = $2", query)
        self.assertIn("AND commit_sha = $3", query)
        self.assertLess(
            query.index("WHERE repository_id"),
            query.index("ORDER BY embedding"),
        )
        self.assertEqual((repository_id, commit_sha), ("42", "commit-1"))
        self.assertEqual(results[0]["repository_id"], "42")
        self.assertTrue(connection.closed)

    async def test_store_persists_repository_and_commit_metadata_transactionally(self):
        connection = FakeConnection()
        chunk = make_chunk()
        with patch(
            "app.rag.vector_store.get_db",
            new=AsyncMock(return_value=connection),
        ):
            await store_chunks([(chunk, [0.0] * 1536)])

        self.assertEqual(len(connection.execute_args), 1)
        sql, chunk_id, repository_id, commit_sha = connection.execute_args[0][:4]
        self.assertIn("ON CONFLICT (id) DO UPDATE", sql)
        self.assertEqual(
            (chunk_id, repository_id, commit_sha),
            (chunk.id, chunk.repository_id, chunk.commit_sha),
        )
        self.assertTrue(connection.closed)


class IngestionTests(unittest.IsolatedAsyncioTestCase):
    async def test_indexes_chunks_before_reporting_success_and_cleans_repository(self):
        chunk = make_chunk()
        parser = Mock()
        parser.parse_file.return_value = [chunk]
        embedded = [(chunk, [0.0] * 1536)]

        with (
            patch.object(
                ingestion,
                "clone_repository",
                return_value={
                    "repo_dir": "temporary-repository",
                    "commit_sha": "commit-1",
                },
            ),
            patch.object(ingestion, "get_source_files", return_value=["src/main.py"]),
            patch.object(ingestion.parser_registry, "get_parser", return_value=parser),
            patch.object(ingestion.Path, "read_text", return_value="source"),
            patch.object(ingestion, "recursive_split_chunk", side_effect=lambda item: [item]),
            patch.object(ingestion, "create_embeddings", return_value=embedded),
            patch.object(ingestion, "store_chunks", new=AsyncMock()) as store,
            patch.object(ingestion, "cleanup_repository") as cleanup,
        ):
            result = await ingestion.ingest_repository(
                "https://github.com/owner/repository",
                "session-1",
                "42",
            )

        self.assertEqual(result["status"], "indexed")
        self.assertEqual(result["commit_sha"], "commit-1")
        store.assert_awaited_once_with(embedded)
        cleanup.assert_called_once_with("temporary-repository")

    async def test_indexing_failure_propagates_and_still_cleans_repository(self):
        parser = Mock()
        parser.parse_file.return_value = [make_chunk()]

        with (
            patch.object(
                ingestion,
                "clone_repository",
                return_value={
                    "repo_dir": "temporary-repository",
                    "commit_sha": "commit-1",
                },
            ),
            patch.object(ingestion, "get_source_files", return_value=["src/main.py"]),
            patch.object(ingestion.parser_registry, "get_parser", return_value=parser),
            patch.object(ingestion.Path, "read_text", return_value="source"),
            patch.object(ingestion, "recursive_split_chunk", return_value=[make_chunk()]),
            patch.object(
                ingestion,
                "create_embeddings",
                side_effect=RuntimeError("embedding service unavailable"),
            ),
            patch.object(ingestion, "cleanup_repository") as cleanup,
        ):
            with self.assertRaisesRegex(RuntimeError, "embedding service unavailable"):
                await ingestion.ingest_repository(
                    "https://github.com/owner/repository",
                    "session-1",
                    "42",
                )

        cleanup.assert_called_once_with("temporary-repository")
