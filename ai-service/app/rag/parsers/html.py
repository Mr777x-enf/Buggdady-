from tree_sitter import Language, Parser
import tree_sitter_html as ts_html

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class HTMLParser(LanguageParser):

    LANGUAGE = "html"
    PARSER_VERSION = "html-v1"
    CHUNKER_VERSION = "recursive-v1"

    STRUCTURAL_TAGS = {
        "html",
        "head",
        "body",
        "script",
        "style",
        "form",
        "main",
        "header",
        "footer",
        "nav",
        "section",
        "article",
        "aside",
        "template",
        "dialog",
        "table",
        "svg",
    }

    def __init__(self):
        self.parser = Parser(Language(ts_html.language()))

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
        tag_name = None
        symbol_type = None

        if node.type in {"element", "script_element", "style_element"}:
            tag_name = self._element_tag_name(node, source_bytes)
            if tag_name and (
                tag_name in self.STRUCTURAL_TAGS
                or tag_name.startswith("h")
                and tag_name[1:].isdigit()
            ):
                symbol_type = (
                    "form"
                    if tag_name == "form"
                    else "script"
                    if tag_name == "script"
                    else "style"
                    if tag_name == "style"
                    else "element"
                )

        if tag_name and symbol_type:
            chunks.append(
                CodeChunk(
                    id=self._create_chunk_id(session_id, file_path, node.start_byte),
                    repository_id=repository_id,
                    commit_sha=commit_sha,
                    session_id=session_id,
                    file_path=file_path,
                    language=self.LANGUAGE,
                    symbol_name=tag_name,
                    symbol_type=symbol_type,
                    parent_symbol=parent_symbol,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    source=self._get_text(source_bytes, node),
                    parser_version=self.PARSER_VERSION,
                    chunker_version=self.CHUNKER_VERSION,
                )
            )

        current_parent = tag_name if symbol_type else parent_symbol
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
    def _element_tag_name(cls, node, source_bytes: bytes) -> str | None:
        if node.type in {"script_element", "style_element"}:
            return node.type.removesuffix("_element")

        for child in node.named_children:
            if child.type == "start_tag":
                for tag_child in child.named_children:
                    if tag_child.type == "tag_name":
                        return cls._get_text(source_bytes, tag_child).lower()
            if child.type == "tag_name":
                return cls._get_text(source_bytes, child).lower()
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
