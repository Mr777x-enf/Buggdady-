from pathlib import Path
from uuid import uuid4

from tree_sitter import Language, Parser
import tree_sitter_python

from ..models import CodeChunk
from ..parser import LanguageParser


PYTHON_LANGUAGE = Language(
    tree_sitter_python.language()
)

parser = Parser(PYTHON_LANGUAGE)


CODE_NODE_TYPES = {
    "function_definition",
    "class_definition",
    "decorated_definition",
}


class PythonParser(LanguageParser):

    parser_version = "python-v1"

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:

        source_bytes = source.encode("utf-8")

        tree = parser.parse(source_bytes)

        chunks = []

        self._extract_nodes(
            node=tree.root_node,
            source_bytes=source_bytes,
            file_path=file_path,
            repository_id=repository_id,
            commit_sha=commit_sha,
            session_id=session_id,
            chunks=chunks,
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
        parent_symbol: str | None = None,
    ):

        if node.type in CODE_NODE_TYPES:

            source = source_bytes[
                node.start_byte:node.end_byte
            ].decode("utf-8")

            symbol_name = self._get_symbol_name(node)

            symbol_type = self._get_symbol_type(node)

            qualified_name = (
                f"{parent_symbol}.{symbol_name}"
                if parent_symbol and symbol_name
                else symbol_name
            )

            chunks.append(
                CodeChunk(
                    id=str(uuid4()),

                    repository_id=repository_id,
                    commit_sha=commit_sha,
                    session_id=session_id,

                    file_path=file_path,
                    language="python",

                    symbol_name=qualified_name,
                    symbol_type=symbol_type,
                    parent_symbol=parent_symbol,

                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,

                    source=source,

                    parser_version=self.parser_version,
                    chunker_version="v1",
                )
            )

            parent_symbol = qualified_name

        for child in node.children:

            self._extract_nodes(
                node=child,
                source_bytes=source_bytes,
                file_path=file_path,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
                chunks=chunks,
                parent_symbol=parent_symbol,
            )

    def _get_symbol_name(self, node) -> str | None:

        if node.type == "function_definition":

            name_node = node.child_by_field_name("name")

            if name_node:
                return name_node.text.decode("utf-8")

        elif node.type == "class_definition":

            name_node = node.child_by_field_name("name")

            if name_node:
                return name_node.text.decode("utf-8")

        elif node.type == "decorated_definition":

            for child in node.children:

                if child.type in {
                    "function_definition",
                    "class_definition",
                }:
                    return self._get_symbol_name(child)

        return None

    def _get_symbol_type(self, node) -> str:

        if node.type == "function_definition":
            return "function"

        if node.type == "class_definition":
            return "class"

        if node.type == "decorated_definition":

            for child in node.children:

                if child.type == "function_definition":
                    return "function"

                if child.type == "class_definition":
                    return "class"

            return "decorated"

        return "unknown"