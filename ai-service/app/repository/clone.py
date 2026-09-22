import os
import shutil
import tempfile

from git import Repo


def clone_repository(repo_url: str, session_id: str) -> str:

    # Create a temporary directory
    base_dir = tempfile.gettempdir()

    repo_dir = os.path.join(
        base_dir,
        f"code_debugger_{session_id}"
    )

    # Remove old copy if it exists
    if os.path.exists(repo_dir):
        shutil.rmtree(repo_dir)

    # Clone repository
    Repo.clone_from(
        repo_url,
        repo_dir
    )

    return repo_dir