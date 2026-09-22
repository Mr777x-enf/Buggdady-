import os
import shutil


def cleanup_repository(repo_dir: str) -> None:
    """
    Delete the temporary cloned repository.
    """

    if not repo_dir:
        return

    if os.path.exists(repo_dir):
        shutil.rmtree(repo_dir)