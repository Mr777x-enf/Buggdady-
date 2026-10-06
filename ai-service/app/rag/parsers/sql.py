from tree_sitter import Language, Parser
import tree_sitter_sql as ts_sql

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class SQLParser(LanguageParser):

    LANGUAGE = "sql"
    PARSER_VERSION = "sql-v1"
    CHUNKER_VERSION = "recursive-v1"

    SYMBOL_TYPES = {
        "create_table": "table",
        "create_view": "view",
        "create_index": "index",
        "create_function": "function",
        "create_procedure": "procedure",
        "create_trigger": "trigger",
    }

    def __init__(self):
        self.parser = Parser(Language(ts_sql.language()))

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:
        source_bytes = source.encode("utf-8")
        tree = self.parser.parse(source_bytes)
        chunks: list[CodeChunk] = []

        self._walk_tree(
            tree.root_node,
            source_bytes,
            file_path,
            repository_id,
            commit_sha,
            session_id,
            chunks,
        )
        return chunks

    def _walk_tree(
        self,
        node,
        source_bytes: bytes,
        file_path: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
        chunks: list[CodeChunk],
    ):
        symbol_type = self.SYMBOL_TYPES.get(node.type)
        if symbol_type:
            name_node = self._find_object_reference(node)
            if name_node is not None:
                symbol_name = self._get_text(source_bytes, name_node)
                chunks.append(
                    CodeChunk(
                        id=self._create_chunk_id(
                            session_id,
                            file_path,
                            node.start_byte,
                        ),
                        repository_id=repository_id,
                        commit_sha=commit_sha,
                        session_id=session_id,
                        file_path=file_path,
                        language=self.LANGUAGE,
                        symbol_name=symbol_name,
                        symbol_type=symbol_type,
                        parent_symbol=None,
                        start_line=node.start_point[0] + 1,
                        end_line=node.end_point[0] + 1,
                        source=self._get_text(source_bytes, node),
                        parser_version=self.PARSER_VERSION,
                        chunker_version=self.CHUNKER_VERSION,
                    )
                )

        for child in node.named_children:
            self._walk_tree(
                child,
                source_bytes,
                file_path,
                repository_id,
                commit_sha,
                session_id,
                chunks,
            )

    @staticmethod
    def _find_object_reference(node):
        for child in node.named_children:
            if child.type == "object_reference":
                return child
        return None

    @staticmethod
    def _get_text(source_bytes: bytes, node) -> str:
        return source_bytes[node.start_byte:node.end_byte].decode(
            "utf-8",
            errors="replace",
        )

    @staticmethod
    def _create_chunk_id(session_id: str, file_path: str, start_byte: int) -> str:
        return f"{session_id}:{file_path}:{start_byte}"
