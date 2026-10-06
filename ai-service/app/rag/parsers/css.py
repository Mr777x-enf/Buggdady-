from tree_sitter import Language, Parser
import tree_sitter_css as ts_css

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class CSSParser(LanguageParser):

    LANGUAGE = "css"
    PARSER_VERSION = "css-v1"
    CHUNKER_VERSION = "recursive-v1"

    SYMBOL_TYPES = {
        "rule_set": "rule",
        "at_rule": "at_rule",
        "keyframes_statement": "keyframes",
    }

    def __init__(self):
        self.parser = Parser(Language(ts_css.language()))

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
        symbol_name = self._symbol_name(node, source_bytes) if symbol_type else None

        if node.type == "declaration":
            property_name = self._property_name(node, source_bytes)
            if property_name and property_name.startswith("--"):
                symbol_name = property_name
                symbol_type = "custom_property"

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

        current_parent = symbol_name if symbol_type in {
            "at_rule",
            "keyframes",
        } and symbol_name else parent_symbol
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

    @classmethod
    def _symbol_name(cls, node, source_bytes: bytes) -> str | None:
        if node.type == "rule_set":
            selectors = node.child_by_field_name("selectors")
            if selectors is not None:
                return cls._get_text(source_bytes, selectors).strip()
            for child in node.named_children:
                if child.type != "block":
                    return cls._get_text(source_bytes, child).strip()
            return None

        first_child = next(iter(node.named_children), None)
        if first_child is not None:
            return cls._get_text(source_bytes, first_child).strip()
        return None

    @classmethod
    def _property_name(cls, node, source_bytes: bytes) -> str | None:
        property_node = node.child_by_field_name("property")
        if property_node is not None:
            return cls._get_text(source_bytes, property_node).strip()
        if node.named_children:
            return cls._get_text(source_bytes, node.named_children[0]).strip()
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
