from tree_sitter import Language, Parser
import tree_sitter_python

from ..models import CodeChunk
from ..parser import LanguageParser


DEFINITION_TYPES = {"function_definition", "class_definition"}


class PythonParser(LanguageParser):

    LANGUAGE = "python"
    parser_version = "python-v1"
    chunker_version = "v2"

    def __init__(self):
        self.parser = Parser(Language(tree_sitter_python.language()))

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

        self._extract_nodes(
            node=tree.root_node,
            source_bytes=source_bytes,
            file_path=file_path,
            repository_id=repository_id,
            commit_sha=commit_sha,
            session_id=session_id,
            chunks=chunks,
            parent_symbol=None,
            parent_type=None,
        )

        return chunks

    def _extract_nodes(
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
        # Decorated definitions are not chunked themselves. We chunk the
        # inner function/class and use the wrapper's range so decorators
        # stay attached to the code.
        if node.type in DEFINITION_TYPES:
            name = self._get_name(node, source_bytes)

            if name:
                outer = (
                    node.parent
                    if node.parent is not None
                    and node.parent.type == "decorated_definition"
                    else node
                )

                qualified_name = (
                    f"{parent_symbol}.{name}" if parent_symbol else name
                )
                symbol_type = self._get_symbol_type(node, parent_type)

                chunks.append(
                    CodeChunk(
                        id=f"{session_id}:{file_path}:{outer.start_byte}",
                        repository_id=repository_id,
                        commit_sha=commit_sha,
                        session_id=session_id,
                        file_path=file_path,
                        language=self.LANGUAGE,
                        symbol_name=qualified_name,
                        symbol_type=symbol_type,
                        parent_symbol=parent_symbol,
                        start_line=outer.start_point[0] + 1,
                        end_line=outer.end_point[0] + 1,
                        source=source_bytes[
                            outer.start_byte:outer.end_byte
                        ].decode("utf-8", errors="replace"),
                        parser_version=self.parser_version,
                        chunker_version=self.chunker_version,
                    )
                )

                # Children now belong to this symbol
                parent_symbol = qualified_name
                parent_type = symbol_type

        for child in node.named_children:
            self._extract_nodes(
                node=child,
                source_bytes=source_bytes,
                file_path=file_path,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
                chunks=chunks,
                parent_symbol=parent_symbol,
                parent_type=parent_type,
            )

    @staticmethod
    def _get_name(node, source_bytes: bytes) -> str | None:
        name_node = node.child_by_field_name("name")
        if name_node is None:
            return None
        return source_bytes[
            name_node.start_byte:name_node.end_byte
        ].decode("utf-8", errors="replace")

    @staticmethod
    def _get_symbol_type(node, parent_type: str | None) -> str:
        if node.type == "class_definition":
            return "class"

        # A function defined directly inside a class is a method
        if parent_type == "class":
            return "method"

        return "function"