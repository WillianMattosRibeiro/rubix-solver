"""
Rubik's Cube solver using the kociemba algorithm.
"""

import kociemba
from typing import List


class Solver:
    """Solves Rubik's Cube states using kociemba algorithm."""

    def solve(self, state: str) -> List[str]:
        """
        Solve the cube from the given state.

        Args:
            state: Cube state string (54 characters)

        Returns:
            List of moves in standard notation
        """
        try:
            solution = kociemba.solve(state)
            return solution.split()
        except Exception as e:
            print(f"Solver error: {e}")
            return []