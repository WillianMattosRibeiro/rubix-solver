"""
Cube detection module using OpenCV contour detection.
Detects a 3x3 Rubik's Cube face in the camera frame.
"""

import cv2
import numpy as np
from typing import Tuple, List, Optional


class CubeDetector:
    """Detects and extracts color samples from a Rubik's Cube face."""

    def __init__(self) -> None:
        self.min_area = 10000  # Minimum contour area to consider
        self.aspect_tolerance = 0.2  # Tolerance for square aspect ratio

    def detect_cube(self, frame: np.ndarray) -> Tuple[bool, Optional[List[np.ndarray]]]:
        """
        Detect a Rubik's Cube face in the frame.

        Args:
            frame: Input camera frame (BGR)

        Returns:
            Tuple of (detected: bool, colors: List of 9 BGR color samples or None)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive thresholding to handle different lighting
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
        )

        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return False, None

        # Find the largest contour that could be a cube face
        largest_contour = max(contours, key=cv2.contourArea)

        if cv2.contourArea(largest_contour) < self.min_area:
            return False, None

        # Approximate the contour to a polygon
        peri = cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, 0.02 * peri, True)

        # Check if it's approximately a quadrilateral
        if len(approx) != 4:
            return False, None

        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(approx)

        # Check aspect ratio (should be close to square)
        aspect_ratio = float(w) / h
        if not (1.0 - self.aspect_tolerance) < aspect_ratio < (1.0 + self.aspect_tolerance):
            return False, None

        # Extract 3x3 grid colors
        colors = self._extract_grid_colors(frame, x, y, w, h)

        return True, colors

    def _extract_grid_colors(self, frame: np.ndarray, x: int, y: int, w: int, h: int) -> List[np.ndarray]:
        """
        Extract color samples from a 3x3 grid within the detected region.

        Args:
            frame: Input frame
            x, y, w, h: Bounding box of the detected face

        Returns:
            List of 9 BGR color samples
        """
        colors = []
        cell_w = w // 3
        cell_h = h // 3

        for row in range(3):
            for col in range(3):
                # Calculate cell boundaries
                cell_x1 = x + col * cell_w
                cell_y1 = y + row * cell_h
                cell_x2 = x + (col + 1) * cell_w
                cell_y2 = y + (row + 1) * cell_h

                # Extract ROI
                roi = frame[cell_y1:cell_y2, cell_x1:cell_x2]

                if roi.size == 0:
                    # Fallback color if ROI is empty
                    colors.append(np.array([0, 0, 0], dtype=np.uint8))
                    continue

                # Sample color from center of cell
                center_y = roi.shape[0] // 2
                center_x = roi.shape[1] // 2
                color = roi[center_y, center_x]
                colors.append(color)

        return colors