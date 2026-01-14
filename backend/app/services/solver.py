import kociemba

class Solver:
    def solve(self, state: str) -> list:
        """
        Solve the Rubik's cube given the state string (54 characters).
        Returns list of moves.
        """
        try:
            algorithm = kociemba.solve(state)
            return algorithm.split()
        except Exception as e:
            print(f"Solver error: {e}")
            return []