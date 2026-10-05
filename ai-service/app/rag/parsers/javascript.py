from tree_sitter import Parser
import tree_sitter_javascript as ts_javascript

from app.rag.models import CodeChunk
from app.rag.parser import CodeParser


class JavaScriptParser(CodeParser):

    LANGUAGE = "javascript"
    PARSER_VERSION = "javascript-v1"
    CHUNKER_VERSION = "recursive-v1"

    def __init__(self):
        self.parser = Parser(
            ts_javascript.language()
        )

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

        # --------------------------------------------------
        # 1. Function declaration
        #
        # function login() {}
        # async function login() {}
        # --------------------------------------------------

        if node.type == "function_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "function"

        # --------------------------------------------------
        # 2. Class declaration
        #
        # class User {}
        # export class User {}
        # --------------------------------------------------

        elif node.type == "class_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "class"

        # --------------------------------------------------
        # 3. Class method
        #
        # class User {
        #     login() {}
        # }
        # --------------------------------------------------

        elif node.type == "method_definition":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "method"

        # --------------------------------------------------
        # 4. Arrow function / function expression
        #
        # const login = () => {}
        # let login = function() {}
        # var login = () => {}
        # --------------------------------------------------

        elif node.type in (
            "lexical_declaration",
            "variable_declaration",
        ):

            for declaration in node.named_children:

                if declaration.type != "variable_declarator":
                    continue

                name_node = declaration.child_by_field_name(
                    "name"
                )

                value_node = declaration.child_by_field_name(
                    "value"
                )

                if not name_node or not value_node:
                    continue

                if value_node.type in (
                    "arrow_function",
                    "function_expression",
                ):

                    symbol_name = self._get_text(
                        source_bytes,
                        name_node,
                    )

                    symbol_type = "function"

                    break

        # --------------------------------------------------
        # Create CodeChunk if we found a symbol
        # --------------------------------------------------

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

        # --------------------------------------------------
        # If this node is a symbol, its children should
        # know about it as their parent.
        # --------------------------------------------------

        current_parent = (
            symbol_name
            if symbol_name
            else parent_symbol
        )

        # --------------------------------------------------
        # Walk children recursively
        # --------------------------------------------------

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

    # ------------------------------------------------------
    # Helpers
    # ------------------------------------------------------

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

        return (
            f"{session_id}:"
            f"{file_path}:"
            f"{start_byte}"
        )