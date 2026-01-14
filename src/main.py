"""
Main entry point for the Rubik's Cube Solver application.
Handles GUI setup, camera capture, and coordination of all components.
"""

import sys
import cv2
import dearpygui.dearpygui as dpg
from typing import Optional

from .gui.theme import setup_theme
from .cube_detector import CubeDetector
from .color_recognition import ColorRecognition
from .cube_state import CubeState
from .solver import Solver
from .move_tracker import MoveTracker
from .utils.fps import FPS


class RubikSolverApp:
    """Main application class for the Rubik's Cube Solver."""

    def __init__(self) -> None:
        self.cap: Optional[cv2.VideoCapture] = None
        self.selected_camera_index: Optional[int] = None
        self.camera_options = []

        # Detect available cameras
        for i in range(6):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                self.camera_options.append(str(i))
                cap.release()

        if not self.camera_options:
            raise RuntimeError("No webcams detected")

        # Default to first available camera
        self.selected_camera_index = int(self.camera_options[0])
        self.cap = cv2.VideoCapture(self.selected_camera_index)
        if not self.cap.isOpened():
            raise RuntimeError(f"Failed to open camera {self.selected_camera_index}")

        self.status = "Calibrating colors... Show color samples"
        self.moves_text = ""
        self.calibrating = True
        self.solved = False

        self.detector = CubeDetector()
        self.color_rec = ColorRecognition()
        self.cube_state = CubeState()
        self.solver = Solver()
        self.move_tracker = MoveTracker()
        self.fps = FPS()

        self.setup_gui()

    def setup_gui(self) -> None:
        dpg.create_context()
        setup_theme()

        with dpg.window(label="Rubik's Cube Solver", width=1200, height=800) as self.main_window:
            dpg.add_text(self.status, tag="status_text")

            dpg.add_combo(self.camera_options, default_value=str(self.selected_camera_index), label="Select Camera", callback=self.camera_selection_callback, tag="camera_combo")

            with dpg.texture_registry(show=False):
                self.texture = dpg.add_raw_texture(640, 480, [], format=dpg.mvFormat_Float_rgba, tag="camera_texture")
            dpg.add_image("camera_texture", width=640, height=480)

            dpg.add_text("Moves:", tag="moves_label")
            dpg.add_text(self.moves_text, tag="moves_text", wrap=600)

        dpg.create_viewport(title="Rubik's Cube Solver", width=1200, height=800)
        dpg.setup_dearpygui()
        dpg.show_viewport()

    def camera_selection_callback(self, sender, app_data, user_data) -> None:
        new_index = int(app_data)
        if new_index != self.selected_camera_index:
            if self.cap is not None:
                self.cap.release()
            self.cap = cv2.VideoCapture(new_index)
            if not self.cap.isOpened():
                self.status = f"Failed to open camera {new_index}"
                dpg.set_value("status_text", self.status)
            else:
                self.selected_camera_index = new_index
                self.status = f"Switched to camera {new_index}"
                dpg.set_value("status_text", self.status)

    def update_frame(self) -> None:
        ret, frame = self.cap.read()
        if not ret:
            return

        if self.calibrating:
            self.color_rec.calibrate(frame)
            if self.color_rec.is_calibrated():
                self.calibrating = False
                self.status = "Calibration complete. Show cube to camera."
        else:
            detected, faces = self.detector.detect_cube(frame)
            if detected:
                colors = self.color_rec.recognize_colors(faces)
                self.cube_state.update(colors)
                if self.cube_state.is_complete():
                    if not self.solved:
                        solution = self.solver.solve(self.cube_state.get_state())
                        self.move_tracker.set_solution(solution)
                        self.solved = True
                        self.status = "Solving... Follow the moves below."
                else:
                    self.status = f"Scanning cube... {self.cube_state.get_progress()}%"
            else:
                self.status = "Cube not detected. Position cube in view."

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_rgba = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2RGBA).astype(float) / 255.0
        dpg.set_value("camera_texture", frame_rgba.flatten())
        dpg.set_value("status_text", self.status)
        dpg.set_value("moves_text", self.move_tracker.get_display_text())
        self.fps.update()

    def run(self) -> None:
        try:
            while dpg.is_dearpygui_running():
                self.update_frame()
                dpg.render_dearpygui_frame()
        finally:
            if self.cap is not None:
                self.cap.release()
            dpg.destroy_context()


def main() -> None:
    try:
        app = RubikSolverApp()
        app.run()
    except KeyboardInterrupt:
        print("Application interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()


        self.detector: CubeDetector = CubeDetector()
        self.color_rec: ColorRecognition = ColorRecognition()
        self.cube_state: CubeState = CubeState()
        self.solver: Solver = Solver()
        self.move_tracker: MoveTracker = MoveTracker()
        self.fps: FPS = FPS()

        self.calibrating: bool = True
        self.status: str = "Calibrating colors... Show color samples"
        self.moves_text: str = ""
        self.solved: bool = False

        self.setup_gui()

    def setup_gui(self) -> None:
        """Set up the Dear PyGui interface."""
        dpg.create_context()
        setup_theme()

        with dpg.window(label="Rubik's Cube Solver", width=1200, height=800) as self.main_window:
            # Status bar
            dpg.add_text(self.status, tag="status_text")

            # Camera view
            with dpg.texture_registry(show=False):
                self.texture = dpg.add_raw_texture(
                    640, 480, [], format=dpg.mvFormat_Float_rgba, tag="camera_texture"
                )
            dpg.add_image("camera_texture", width=640, height=480)

            # Moves display
            dpg.add_text("Moves:", tag="moves_label")
            dpg.add_text(self.moves_text, tag="moves_text", wrap=600)

        dpg.create_viewport(title="Rubik's Cube Solver", width=1200, height=800)
        dpg.setup_dearpygui()
        dpg.show_viewport()

    def update_frame(self) -> None:
        """Process one frame from the camera and update the GUI."""
        ret, frame = self.cap.read()
        if not ret:
            return

        if self.calibrating:
            # Calibration phase
            self.color_rec.calibrate(frame)
            if self.color_rec.is_calibrated():
                self.calibrating = False
                self.status = "Calibration complete. Show cube to camera."
        else:
            # Detection and solving phase
            detected, faces = self.detector.detect_cube(frame)
            if detected:
                colors = self.color_rec.recognize_colors(faces)
                self.cube_state.update(colors)
                if self.cube_state.is_complete():
                    if not self.solved:
                        solution = self.solver.solve(self.cube_state.get_state())
                        self.move_tracker.set_solution(solution)
                        self.solved = True
                        self.status = "Solving... Follow the moves below."
                else:
                    self.status = f"Scanning cube... {self.cube_state.get_progress()}%"
            else:
                self.status = "Cube not detected. Position cube in view."

        # Update GUI
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_rgba = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2RGBA).astype(float) / 255.0
        dpg.set_value("camera_texture", frame_rgba.flatten())
        dpg.set_value("status_text", self.status)
        dpg.set_value("moves_text", self.move_tracker.get_display_text())
        self.fps.update()

    def run(self) -> None:
        """Main application loop."""
        try:
            while dpg.is_dearpygui_running():
                self.update_frame()
                dpg.render_dearpygui_frame()
        finally:
            self.cap.release()
            dpg.destroy_context()


def main() -> None:
    """Application entry point."""
    try:
        app = RubikSolverApp()
        app.run()
    except KeyboardInterrupt:
        print("Application interrupted by user")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()