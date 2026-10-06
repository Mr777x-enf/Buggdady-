from tree_sitter import Language, Parser
import tree_sitter_dart as ts_dart

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class DartParser(LanguageParser):

    LANGUAGE = "dart"
    PARSER_VERSION = "dart-v1"
    CHUNKER_VERSION = "recursive-v1"

    SYMBOL_TYPES = {
        "class_declaration": "class",
        "enum_declaration": "enum",
        "mixin_declaration": "mixin",
        "extension_declaration": "extension",
        "function_declaration": "function",
        "method_signature": "method",
    }

    def __init__(self):
        self.parser = Parser(Language(ts_dart.language()))

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
            None,
            None,
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
        parent_symbol: str | None,
        parent_type: str | None,
    ):
        symbol_type = self.SYMBOL_TYPES.get(node.type)
        symbol_name = None

        if symbol_type:
            name_node = node.child_by_field_name("name")
            if name_node is None:
                name_node = self._find_identifier(node)
            if name_node is not None:
                symbol_name = self._get_text(source_bytes, name_node)

        if node.type in {"function_declaration", "method_signature"} and parent_type in {
            "class",
            "mixin",
            "extension",
            "enum",
        }:
            symbol_type = "method"

        if symbol_name and symbol_type:
            chunks.append(
                CodeChunk(
                    id=self._create_chunk_id(session_id, file_path, node.start_byte),
                    repository_id=repository_id,
                    commit_sha=commit_sha,
                    session_id=session_id,
                    file_path=file_path,
                    language=self.LANGUAGE,
                    symbol_name=symbol_name,
                    symbol_type=symbol_type,
                    parent_symbol=parent_symbol,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    source=self._get_text(source_bytes, node),
                    parser_version=self.PARSER_VERSION,
                    chunker_version=self.CHUNKER_VERSION,
                )
            )

        current_parent = symbol_name or parent_symbol
        current_type = symbol_type or parent_type
        for child in node.named_children:
            self._walk_tree(
                child,
                source_bytes,
                file_path,
                repository_id,
                commit_sha,
                session_id,
                chunks,
                current_parent,
                current_type,
            )

    @staticmethod
    def _find_identifier(node):
        if node.type in {"identifier", "type_identifier"}:
            return node
        for child in node.named_children:
            identifier = DartParser._find_identifier(child)
            if identifier is not None:
                return identifier
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
