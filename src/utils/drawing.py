"""
Drawing utilities for overlaying information on camera frames.
"""

import cv2
import numpy as np
from typing import Tuple


def draw_cube_outline(frame: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Draw a rectangle outline around the detected cube face."""
    cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
    return frame


def draw_grid(frame: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Draw a 3x3 grid on the detected cube face."""
    cell_w = w // 3
    cell_h = h // 3

    # Vertical lines
    for i in range(1, 3):
        cv2.line(frame, (x + i * cell_w, y), (x + i * cell_w, y + h), (255, 255, 255), 1)

    # Horizontal lines
    for i in range(1, 3):
        cv2.line(frame, (x, y + i * cell_h), (x + w, y + i * cell_h), (255, 255, 255), 1)

    return frame


def draw_status_text(frame: np.ndarray, text: str, position: Tuple[int, int] = (10, 30)) -> np.ndarray:
    """Draw status text on the frame."""
    cv2.putText(frame, text, position, cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    return frame


def draw_arrow(frame: np.ndarray, start: Tuple[int, int], end: Tuple[int, int], color: Tuple[int, int, int] = (0, 255, 0)) -> np.ndarray:
    """Draw an arrow on the frame."""
    cv2.arrowedLine(frame, start, end, color, 2, tipLength=0.3)
    return frame