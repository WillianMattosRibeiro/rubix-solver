"""
Color constants and mappings for Rubik's Cube colors.
"""

from typing import Dict, Tuple

# BGR color values for Rubik's Cube stickers
CUBE_COLORS_BGR: Dict[str, Tuple[int, int, int]] = {
    'W': (255, 255, 255),  # White
    'R': (0, 0, 255),      # Red
    'B': (255, 0, 0),      # Blue
    'O': (0, 165, 255),    # Orange
    'G': (0, 255, 0),      # Green
    'Y': (0, 255, 255)     # Yellow
}

# RGB versions for GUI
CUBE_COLORS_RGB: Dict[str, Tuple[int, int, int]] = {
    'W': (255, 255, 255),  # White
    'R': (255, 0, 0),      # Red
    'B': (0, 0, 255),      # Blue
    'O': (255, 165, 0),    # Orange
    'G': (0, 255, 0),      # Green
    'Y': (255, 255, 0)     # Yellow
}

# Color names for display
COLOR_NAMES: Dict[str, str] = {
    'W': 'White',
    'R': 'Red',
    'B': 'Blue',
    'O': 'Orange',
    'G': 'Green',
    'Y': 'Yellow'
}

def get_color_name(color_code: str) -> str:
    """Get the full name of a color from its code."""
    return COLOR_NAMES.get(color_code, 'Unknown')

def get_color_rgb(color_code: str) -> Tuple[int, int, int]:
    """Get RGB tuple for a color code."""
    return CUBE_COLORS_RGB.get(color_code, (128, 128, 128))