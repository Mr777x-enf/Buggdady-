from tree_sitter import Parser
import tree_sitter_php as ts_php

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class PHPParser(LanguageParser):

    LANGUAGE = "php"
    PARSER_VERSION = "php-v1"
    CHUNKER_VERSION = "recursive-v1"

    def __init__(self):
        self.parser = Parser(ts_php.language_php())

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

        # function foo() {}
        if node.type == "function_definition":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )
                symbol_type = "function"

        # class User {}
        elif node.type == "class_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )
                symbol_type = "class"

        # interface UserService {}
        elif node.type == "interface_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )
                symbol_type = "interface"

        # trait Loggable {}
        elif node.type == "trait_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )
                symbol_type = "trait"

        # class methods
        elif node.type == "method_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )
                symbol_type = "method"

        if symbol_name:

            content = self._get_text(
                source_bytes,
                node,
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

        current_parent = (
            symbol_name
            if symbol_name
            else parent_symbol
        )

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