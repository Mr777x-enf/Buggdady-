from tree_sitter import Language, Parser
import tree_sitter_c_sharp as ts_c_sharp

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class CSharpParser(LanguageParser):

    LANGUAGE = "csharp"
    PARSER_VERSION = "csharp-v1"
    CHUNKER_VERSION = "recursive-v1"

    SYMBOL_TYPES = {
        "class_declaration": "class",
        "interface_declaration": "interface",
        "struct_declaration": "struct",
        "enum_declaration": "enum",
        "method_declaration": "method",
        "constructor_declaration": "constructor",
        "property_declaration": "property",
        "local_function_statement": "function",
    }

    def __init__(self):
        self.parser = Parser(Language(ts_c_sharp.language()))

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
    ):
        symbol_type = self.SYMBOL_TYPES.get(node.type)
        name_node = node.child_by_field_name("name") if symbol_type else None
        symbol_name = self._get_text(source_bytes, name_node) if name_node else None

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
            )

    @staticmethod
    def _get_text(source_bytes: bytes, node) -> str:
        return source_bytes[node.start_byte:node.end_byte].decode(
            "utf-8",
            errors="replace",
        )

    @staticmethod
    def _create_chunk_id(session_id: str, file_path: str, start_byte: int) -> str:
        return f"{session_id}:{file_path}:{start_byte}"
