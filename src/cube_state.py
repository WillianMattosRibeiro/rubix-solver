"""
Cube state representation for the Rubik's Cube solver.
Manages the current state of all 6 faces and tracks scanning progress.
"""

from typing import Dict, List


class CubeState:
    """Represents the current state of a Rubik's Cube."""

    # Face order for kociemba solver: U R F D L B
    FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

    def __init__(self) -> None:
        # Initialize all faces with unknown stickers
        self.faces: Dict[str, List[str]] = {face: ['U'] * 9 for face in self.FACE_ORDER}
        self.current_face_index = 0
        self.complete = False

    def update(self, colors: List[str]) -> None:
        """
        Update the cube state with colors from a detected face.

        Args:
            colors: List of 9 color labels for the current face
        """
        if self.complete or self.current_face_index >= len(self.FACE_ORDER):
            return

        if len(colors) != 9:
            return  # Invalid input

        face = self.FACE_ORDER[self.current_face_index]
        self.faces[face] = colors.copy()
        self.current_face_index += 1

        if self.current_face_index >= len(self.FACE_ORDER):
            self.complete = True

    def is_complete(self) -> bool:
        """Check if all faces have been scanned."""
        return self.complete

    def get_state(self) -> str:
        """
        Get the cube state as a string for the solver.

        Returns:
            String representation in kociemba format (54 characters)
        """
        if not self.complete:
            raise ValueError("Cube state is not complete")

        return ''.join(''.join(self.faces[face]) for face in self.FACE_ORDER)

    def get_progress(self) -> int:
        """
        Get scanning progress as percentage.

        Returns:
            Progress percentage (0-100)
        """
        return int((self.current_face_index / len(self.FACE_ORDER)) * 100)

    def reset(self) -> None:
        """Reset the cube state for a new scan."""
        self.__init__()