import subprocess
from pathlib import Path


def get_commit_sha(repo_dir: str | Path) -> str:
    """
    Return the commit SHA of the currently checked-out
    commit in the cloned repository.
    """

    repo_path = Path(repo_dir)

    result = subprocess.run(
        [
            "git",
            "-C",
            str(repo_path),
            "rev-parse",
            "HEAD",
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    commit_sha = result.stdout.strip()

    if not commit_sha:
        raise RuntimeError(
            "Unable to determine repository commit SHA"
        )

    return commit_sha