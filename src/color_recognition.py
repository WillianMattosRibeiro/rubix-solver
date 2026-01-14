"""
Color recognition module for Rubik's Cube stickers.
Uses LAB color space for robust color classification under varying lighting.
"""

import cv2
import numpy as np
from typing import List, Dict
from sklearn.cluster import KMeans


class ColorRecognition:
    """Handles color calibration and recognition for Rubik's Cube faces."""

    # Standard Rubik's Cube colors in BGR
    STANDARD_COLORS = {
        'W': np.array([255, 255, 255]),  # White
        'R': np.array([0, 0, 255]),      # Red
        'B': np.array([255, 0, 0]),      # Blue
        'O': np.array([0, 165, 255]),    # Orange
        'G': np.array([0, 255, 0]),      # Green
        'Y': np.array([0, 255, 255])     # Yellow
    }

    def __init__(self) -> None:
        self.calibrated = False
        self.color_centroids: Dict[str, np.ndarray] = {}
        self.lab_centroids: Dict[str, np.ndarray] = {}

    def calibrate(self, frame: np.ndarray) -> None:
        """
        Perform color calibration using standard colors.
        In a real implementation, this would collect samples from user input.
        For now, use predefined standard colors.
        """
        # Convert standard colors to LAB space
        for color_name, bgr in self.STANDARD_COLORS.items():
            lab = cv2.cvtColor(np.uint8([[bgr]]), cv2.COLOR_BGR2LAB)[0][0]
            self.lab_centroids[color_name] = lab.astype(float)

        self.calibrated = True

    def is_calibrated(self) -> bool:
        """Check if color calibration is complete."""
        return self.calibrated

    def recognize_colors(self, bgr_samples: List[np.ndarray]) -> List[str]:
        """
        Recognize colors from BGR samples.

        Args:
            bgr_samples: List of BGR color samples

        Returns:
            List of color labels ('W', 'R', 'B', 'O', 'G', 'Y')
        """
        if not self.calibrated:
            raise RuntimeError("Color recognition not calibrated")

        labels = []
        for bgr in bgr_samples:
            # Convert to LAB
            lab = cv2.cvtColor(np.uint8([[bgr]]), cv2.COLOR_BGR2LAB)[0][0].astype(float)

            # Find closest color in LAB space
            min_distance = float('inf')
            best_color = 'U'  # Unknown

            for color_name, centroid in self.lab_centroids.items():
                distance = np.linalg.norm(lab - centroid)
                if distance < min_distance:
                    min_distance = distance
                    best_color = color_name

            labels.append(best_color)

        return labels

    def get_color_rgb(self, color: str) -> tuple:
        """Get RGB tuple for a color label."""
        bgr = self.STANDARD_COLORS.get(color, np.array([0, 0, 0]))
        return tuple(bgr[::-1])  # BGR to RGB