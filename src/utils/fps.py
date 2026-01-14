"""
Simple FPS (Frames Per Second) counter.
"""

import time
from typing import Optional


class FPS:
    """Simple FPS counter for performance monitoring."""

    def __init__(self) -> None:
        self._start_time: Optional[float] = None
        self._frame_count = 0
        self._fps = 0.0

    def update(self) -> None:
        """Update the FPS counter."""
        if self._start_time is None:
            self._start_time = time.time()
        else:
            self._frame_count += 1
            elapsed = time.time() - self._start_time
            if elapsed > 1.0:  # Update FPS every second
                self._fps = self._frame_count / elapsed
                self._frame_count = 0
                self._start_time = time.time()

    def get_fps(self) -> float:
        """Get the current FPS value."""
        return self._fps

    def reset(self) -> None:
        """Reset the FPS counter."""
        self._start_time = None
        self._frame_count = 0
        self._fps = 0.0