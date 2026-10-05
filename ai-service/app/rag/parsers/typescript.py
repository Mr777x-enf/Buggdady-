from tree_sitter import Parser
import tree_sitter_typescript as ts_typescript

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class TypeScriptParser(LanguageParser):

    LANGUAGE = "typescript"
    PARSER_VERSION = "typescript-v1"
    CHUNKER_VERSION = "recursive-v1"

    def __init__(self):

        # Create a Tree-sitter parser specifically for TypeScript.
        #
        # TypeScript has syntax that normal JavaScript does not have,
        # such as:
        #
        # interface User {}
        # type UserId = string | number
        # function getUser(id: number): User {}
        #
        self.parser = Parser(
            ts_typescript.language_typescript()
        )

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:

        # Tree-sitter parses bytes rather than Python strings.
        source_bytes = source.encode("utf-8")

        # Create the TypeScript syntax tree.
        tree = self.parser.parse(source_bytes)

        chunks: list[CodeChunk] = []

        # Walk through the syntax tree and extract
        # useful symbols.
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
        # 1. Function
        #
        # function getUser(id: number): User {}
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
        # 2. Class
        #
        # class UserService {}
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
        # class UserService {
        #     getUser(id: number): User {}
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
        # 4. Interface
        #
        # interface User {
        #     id: number
        #     name: string
        # }
        #
        # This is one of the important additions compared
        # with our JavaScript parser.
        # --------------------------------------------------

        elif node.type == "interface_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:

                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "interface"

        # --------------------------------------------------
        # 5. Type alias
        #
        # type UserId = string | number;
        # --------------------------------------------------

        elif node.type == "type_alias_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:

                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "type"

        # --------------------------------------------------
        # 6. Enum
        #
        # enum Role {
        #     ADMIN,
        #     USER
        # }
        # --------------------------------------------------

        elif node.type == "enum_declaration":

            name_node = node.child_by_field_name("name")

            if name_node:

                symbol_name = self._get_text(
                    source_bytes,
                    name_node,
                )

                symbol_type = "enum"

        # --------------------------------------------------
        # 7. Arrow functions / function expressions
        #
        # const getUser = (id: number) => {};
        #
        # TypeScript still represents these using the
        # JavaScript-style variable/function structure.
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
        # 8. Create CodeChunk
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

        # If this node represents a symbol, its name
        # becomes the parent of nested symbols.
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

        return (
            f"{session_id}:"
            f"{file_path}:"
            f"{start_byte}"
        )