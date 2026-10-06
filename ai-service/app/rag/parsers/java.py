from tree_sitter import Parser
import tree_sitter_java as ts_java

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class JavaParser(LanguageParser):

    LANGUAGE = "java"
    PARSER_VERSION = "java-v1"
    CHUNKER_VERSION = "recursive-v1"

    def __init__(self):
        self.parser = Parser(ts_java.language())

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:

        source_bytes = source.encode("utf-8")

        # Create Tree-sitter syntax tree
        tree = self.parser.parse(source_bytes)

        chunks: list[CodeChunk] = []

        self._walk_tree(
            node=tree.root_node,
            source_bytes=source_bytes,
            file_path=file_path,
            repository_id=repository_id,
            commit_sha=commit_sha,
            session_id=session_id,
            chunks=chunks,
            parent_symbol=None,
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

        symbol_name = None
        symbol_type = None

        # Java class
        if node.type == "class_declaration":
            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "class"

        # Java interface
        elif node.type == "interface_declaration":
            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "interface"

        # Java enum
        elif node.type == "enum_declaration":
            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "enum"

        # Java method
        elif node.type == "method_declaration":
            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "method"

        # Java constructor
        elif node.type == "constructor_declaration":
            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "constructor"

        # Create CodeChunk when we found a meaningful symbol
        if symbol_name:

            content = self._get_text(
                source_bytes,
                node
            )

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
                    parent_symbol=parent_symbol,

                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,

                    source=content,

                    parser_version=self.PARSER_VERSION,
                    chunker_version=self.CHUNKER_VERSION,
                )
            )

        # If this node is a symbol, it becomes the parent
        current_parent = (
            symbol_name
            if symbol_name
            else parent_symbol
        )

        # Continue walking the tree
        for child in node.named_children:

            self._walk_tree(
                node=child,
                source_bytes=source_bytes,
                file_path=file_path,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
                chunks=chunks,
                parent_symbol=current_parent,
            )

    @staticmethod
    def _get_text(
        source_bytes: bytes,
        node,
    ) -> str:

        return source_bytes[
            node.start_byte:node.end_byte
        ].decode("utf-8")

    @staticmethod
    def _create_chunk_id(
        session_id: str,
        file_path: str,
        start_byte: int,
    ) -> str:

        return f"{session_id}:{file_path}:{start_byte}"