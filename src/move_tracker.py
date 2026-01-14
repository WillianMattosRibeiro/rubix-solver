"""
Move tracker for Rubik's Cube solving.
Tracks the solving sequence and provides visual feedback for performed moves.
"""

import time
from typing import List, Dict


class MoveTracker:
    """Tracks solving moves and provides feedback on user performance."""

    def __init__(self) -> None:
        self.solution: List[str] = []
        self.current_index = 0
        self.feedback: List[str] = []  # 'white', 'green', 'red'
        self.red_times: Dict[int, float] = {}
        self.red_duration = 1.5

    def set_solution(self, solution: List[str]) -> None:
        """Set the solving solution."""
        self.solution = solution
        self.current_index = 0
        self.feedback = ['white'] * len(solution)
        self.red_times = {}

    def perform_move(self, move: str) -> None:
        """
        Record a performed move and update feedback.
        In a real implementation, this would detect moves from cube state changes.
        """
        if self.current_index < len(self.solution):
            expected = self.solution[self.current_index]
            if move == expected:
                self.feedback[self.current_index] = 'green'
                self.current_index += 1
            else:
                self.feedback[self.current_index] = 'red'
                self.red_times[self.current_index] = time.time()

    def update(self) -> None:
        """Update feedback states (e.g., reset red moves after timeout)."""
        current_time = time.time()
        to_reset = []
        for idx, red_time in self.red_times.items():
            if current_time - red_time > self.red_duration:
                self.feedback[idx] = 'white'
                to_reset.append(idx)
        for idx in to_reset:
            del self.red_times[idx]

    def get_display_text(self) -> str:
        """Get the moves text with color indicators."""
        self.update()
        parts = []
        for i, move in enumerate(self.solution):
            color = self.feedback[i]
            # In a real GUI, this would use colored text
            if color == 'green':
                parts.append(f"[GREEN]{move}[/GREEN]")
            elif color == 'red':
                parts.append(f"[RED]{move}[/RED]")
            else:
                parts.append(move)
        return ' '.join(parts)

    def is_complete(self) -> bool:
        """Check if all moves have been completed."""
        return self.current_index >= len(self.solution)