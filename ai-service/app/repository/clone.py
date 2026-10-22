
from pathlib import Path
import re
import shutil
import subprocess
import tempfile


CLONE_TIMEOUT_SECONDS = 300


def clone_repository(
    repo_url: str,
    session_id: str,
) -> dict[str, str]:
    """
    Clone a repository into a temporary directory.

    Returns:
        {
            "repo_dir": "...",
            "commit_sha": "..."
        }

    The caller is responsible for cleaning up the cloned directory.
    """

    # 1. Validate session ID
    if not session_id:
        raise ValueError("session_id is required")

    if not re.fullmatch(r"[A-Za-z0-9_-]+", session_id):
        raise ValueError("Invalid session_id")

    # 2. Create temporary repository path
    base_dir = Path(tempfile.gettempdir())
    repo_dir = base_dir / f"bugdady_{session_id}"

    # 3. Remove stale clone if present
    if repo_dir.exists():
        shutil.rmtree(repo_dir)

    # 4. Clone repository
    try:
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--",
                repo_url,
                str(repo_dir),
            ],
            capture_output=True,
            text=True,
            timeout=CLONE_TIMEOUT_SECONDS,
            check=True,
        )

    except subprocess.TimeoutExpired as exc:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)

        raise RuntimeError(
            f"Repository cloning timed out after "
            f"{CLONE_TIMEOUT_SECONDS} seconds"
        ) from exc

    except subprocess.CalledProcessError as exc:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)

        error_details = exc.stderr or str(exc)

        print("Git command:", exc.cmd)
        print("Git stderr:", exc.stderr)
        print("Git stdout:", exc.stdout)

        raise RuntimeError(
            f"Failed to clone repository: {error_details}"
        ) from exc

    except Exception:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)
        raise

    # 5. Verify clone
    if not repo_dir.is_dir():
        raise RuntimeError(
            "Repository clone directory was not created"
        )

    # 6. Get the exact commit SHA that was cloned
    try:
        result = subprocess.run(
            [
                "git",
                "-C",
                str(repo_dir),
                "rev-parse",
                "HEAD",
            ],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )

        commit_sha = result.stdout.strip()

        if not re.fullmatch(r"[0-9a-fA-F]{40}", commit_sha):
            raise RuntimeError("Git returned an invalid commit SHA")

    except Exception as exc:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)

        raise RuntimeError(
            f"Failed to get repository commit SHA: {exc}"
        ) from exc

    # 7. Return both values
    return {
        "repo_dir": str(repo_dir),
        "commit_sha": commit_sha,
    }
