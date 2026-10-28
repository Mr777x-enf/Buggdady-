
from pathlib import Path
import os
import shutil
import stat
import time


def _handle_remove_error(func, path, exc_info):
    """
    Retry deletion after clearing read-only attributes.
    Useful for Git files on Windows.
    """
    try:
        os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
        func(path)
    except FileNotFoundError:
        pass


def cleanup_repository(repo_dir: str | None) -> None:
    """
    Safely remove a temporary cloned repository.
    Retries briefly if Windows temporarily locks a file.
    """
    path = Path(repo_dir)

    if not path.exists():
        return

    last_error = None

    for attempt in range(3):
        try:
            shutil.rmtree(
                path,
                onerror=_handle_remove_error,
            )
            return
        except PermissionError as exc:
            last_error = exc
            time.sleep(0.5)

    raise RuntimeError(
        f"Could not remove temporary repository: {path}"
    ) from last_error
