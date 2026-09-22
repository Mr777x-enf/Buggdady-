import os


# Files/directories that we don't want to process
IGNORED_DIRECTORIES = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".next",
}


ALLOWED_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".sql",
    ".html",
    ".css",
}


def get_source_files(repo_dir: str) -> list[str]:

    source_files = []

    for root, dirs, files in os.walk(repo_dir):

        # Don't enter ignored directories
        dirs[:] = [
            directory
            for directory in dirs
            if directory not in IGNORED_DIRECTORIES
        ]

        for file in files:

            extension = os.path.splitext(file)[1].lower()

            if extension in ALLOWED_EXTENSIONS:

                file_path = os.path.join(
                    root,
                    file
                )

                source_files.append(file_path)

    return source_files