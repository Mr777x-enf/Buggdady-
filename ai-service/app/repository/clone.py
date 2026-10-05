from pathlib import Path
import re
import shutil
import tempfile

from git import Repo
from git.exc import GitCommandError


CLONE_TIMEOUT_SECONDS = 300


def clone_repository(
    repo_url: str,
    session_id: str,
) -> str:
    """
    Clone a repository into a temporary directory.

    The cloned repository is temporary and should be
    removed by the ingestion cleanup process after
    indexing is complete or when an error occurs.
    """

    # 1. Validate session_id before using it in a path
    if not session_id:
        raise ValueError("session_id is required")

    if not re.fullmatch(
        r"[A-Za-z0-9_-]+",
        session_id,
    ):
        raise ValueError(
            "Invalid session_id"
        )

    # 2. Create temporary repository path
    base_dir = Path(tempfile.gettempdir())

    repo_dir = (
        base_dir
        / f"bugdady_{session_id}"
    )

    # 3. Remove stale clone if present
    if repo_dir.exists():
        shutil.rmtree(repo_dir)

    # 4. Clone repository
    try:
        Repo.clone_from(
            repo_url,
            str(repo_dir),
            depth=1,
            timeout=CLONE_TIMEOUT_SECONDS,
        )

    except GitCommandError as exc:

        # Remove partially cloned repository
        if repo_dir.exists():
            shutil.rmtree(repo_dir)

        raise RuntimeError(
            "Failed to clone repository"
        ) from exc

    except Exception:

        # Cleanup unexpected failures
        if repo_dir.exists():
            shutil.rmtree(repo_dir)

        raise

    # 5. Make sure clone actually exists
    if not repo_dir.exists():
        raise RuntimeError(
            "Repository clone directory was not created"
        )

    return str(repo_dir)