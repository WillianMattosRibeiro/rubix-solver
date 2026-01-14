import kociemba

class MoveAnalyzer:
    def analyze_move(self, prev_state: str, current_state: str, expected_move: str) -> str:
        """
        Analyze if the expected move was performed correctly.
        Returns "correct" or "wrong".
        """
        try:
            # Apply the expected move to the previous state
            new_state = kociemba.apply_move(prev_state, expected_move)
            if new_state == current_state:
                return "correct"
            else:
                return "wrong"
        except Exception as e:
            print(f"Move analyzer error: {e}")
            return "wrong"