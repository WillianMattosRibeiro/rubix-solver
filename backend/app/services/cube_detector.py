import cv2
import numpy as np
import kociemba
import random
from ultralytics import YOLO

class CubeDetector:
    def __init__(self):
        # Define HSV color ranges for Rubik's cube colors
        self.color_ranges = {
            # Calibrated HSV ranges for better distinction, especially between red and orange
            'R': ([0, 120, 70], [10, 255, 255]),  # Red lower range
            'R2': ([170, 120, 70], [180, 255, 255]),  # Red upper range
            'O': ([11, 100, 100], [25, 255, 255]),  # Orange
            'Y': ([26, 50, 50], [34, 255, 255]),  # Yellow
            'G': ([35, 50, 50], [85, 255, 255]),  # Green
            'B': ([90, 50, 50], [130, 255, 255]),  # Blue
            'W': ([0, 0, 200], [180, 30, 255]),  # White
        }
        self.calibrated = False

    def detect_presence(self, img):
        # Detect cube presence based on color variance in hue channel
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hue_std = np.std(hsv[:, :, 0])
        return "cube_present" if hue_std > 10 else "cube_absent"

    def calibrate(self, img):
        # Placeholder for calibration logic if needed
        self.calibrated = True
        return True

    def reset_calibration(self):
        self.calibrated = False
        return True

    def is_calibrated(self):
        return self.calibrated

    def isolate_cube(self, img):
        # Isolate the cube from the background using thresholding and contour detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            # Find the largest contour assuming it's the cube
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            # Crop to the cube area
            cube_img = img[y:y+h, x:x+w]
            return cube_img, (x, y, w, h)
        return img, (0, 0, img.shape[1], img.shape[0])  # Fallback to full image

    def detect_face(self, img):
        # First, isolate the cube
        cube_img, bbox = self.isolate_cube(img)
        hsv = cv2.cvtColor(cube_img, cv2.COLOR_BGR2HSV)
        height, width = hsv.shape[:2]
        face_size = min(height, width) // 3

        # Define the center square coordinates (middle piece) within isolated cube
        center_y = height // 2
        center_x = width // 2

        # Calculate the size of each square
        square_size = face_size

        # Extract the middle piece color
        middle_roi = hsv[center_y - square_size//2:center_y + square_size//2, center_x - square_size//2:center_x + square_size//2]
        middle_color = self.get_dominant_color(middle_roi)

        # Initialize face color matrix with middle piece fixed
        face_colors = ['U'] * 9
        face_colors[4] = middle_color  # middle piece fixed

        # Coordinates offsets for surrounding 8 pieces relative to center
        offsets = [(-1, -1), (-1, 0), (-1, 1),
                   (0, -1),           (0, 1),
                   (1, -1),  (1, 0),  (1, 1)]

        for idx, (dy, dx) in enumerate(offsets):
            y = center_y + dy * square_size
            x = center_x + dx * square_size
            roi = hsv[y - square_size//2:y + square_size//2, x - square_size//2:x + square_size//2]
            if roi.size == 0:
                color = 'U'
            else:
                color = self.get_dominant_color(roi)
            # Map to face_colors index (skip middle 4)
            if idx < 4:
                face_colors[idx] = color
            else:
                face_colors[idx + 1] = color

        # Return face detected with color matrix string and bbox for overlay
        face_colors_str = ''.join(face_colors)
        return "face_detected", face_colors_str, bbox



    def extract_colors(self, hsv):
        # Extract colors for all 6 faces with dominant color detection
        height, width = hsv.shape[:2]
        face_size = min(height, width) // 3

        faces = []
        for face_row in range(2):
            for face_col in range(3):
                face_colors = []
                for i in range(3):
                    for j in range(3):
                        y = face_row * 3 * face_size + i * face_size
                        x = face_col * 3 * face_size + j * face_size
                        roi = hsv[y:y+face_size, x:x+face_size]
                        color = self.get_dominant_color(roi)
                        face_colors.append(color)
                faces.append(face_colors)

        middle_colors = [face[4] for face in faces]

        top_color = 'Y'
        bottom_color = 'W'

        front_index = None
        for idx, color in enumerate(middle_colors):
            if color != top_color and color != bottom_color:
                front_index = idx
                break

        if front_index is None:
            front_index = 0

        def left_of(idx):
            return idx - 1 if idx % 3 != 0 else None

        def right_of(idx):
            return idx + 1 if idx % 3 != 2 else None

        face_map = {}
        face_map['top'] = top_color
        face_map['bottom'] = bottom_color
        face_map['front'] = middle_colors[front_index]

        right_idx = right_of(front_index)
        left_idx = left_of(front_index)

        face_map['right'] = middle_colors[right_idx] if right_idx is not None else 'U'
        face_map['left'] = middle_colors[left_idx] if left_idx is not None else 'U'

        back_idx = 5 - front_index if 0 <= front_index <= 5 else None
        face_map['back'] = middle_colors[back_idx] if back_idx is not None else 'U'

        full_state = ''.join([''.join(face) for face in faces])
        return full_state



    def get_dominant_color(self, roi):
        # Calculate dominant color in HSV region
        hist = cv2.calcHist([roi], [0], None, [180], [0, 180])
        dominant_hue = int(np.argmax(hist))
        avg_saturation = np.mean(roi[:, :, 1])
        avg_value = np.mean(roi[:, :, 2])
        for color, (lower, upper) in self.color_ranges.items():
            if lower[0] <= dominant_hue <= upper[0] and avg_saturation >= lower[1] and avg_value >= lower[2]:
                return color
        return 'U'



    def optimize(self):
        # Placeholder for any optimization steps
        pass

    def __str__(self):
        return f"CubeDetector with calibrated={self.calibrated}"

    def __repr__(self):
        return self.__str__()

    def detect_presence(self, img):
        # Improved presence detection based on color variance
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        std_dev = np.std(hsv[:, :, 0])
        return "cube_present" if std_dev > 10 else "cube_absent"

    def extract_colors(self, hsv):
        # Extract colors for all 6 faces with dominant color detection
        height, width = hsv.shape[:2]
        face_size = min(height, width) // 3

        faces = []
        for face_row in range(2):
            for face_col in range(3):
                face_colors = []
                for i in range(3):
                    for j in range(3):
                        y = face_row * 3 * face_size + i * face_size
                        x = face_col * 3 * face_size + j * face_size
                        roi = hsv[y:y+face_size, x:x+face_size]
                        color = self.get_dominant_color(roi)
                        face_colors.append(color)
                faces.append(face_colors)

        middle_colors = [face[4] for face in faces]

        top_color = 'Y'
        bottom_color = 'W'

        front_index = None
        for idx, color in enumerate(middle_colors):
            if color != top_color and color != bottom_color:
                front_index = idx
                break

        if front_index is None:
            front_index = 0

        def left_of(idx):
            return idx - 1 if idx % 3 != 0 else None

        def right_of(idx):
            return idx + 1 if idx % 3 != 2 else None

        face_map = {}
        face_map['top'] = top_color
        face_map['bottom'] = bottom_color
        face_map['front'] = middle_colors[front_index]

        right_idx = right_of(front_index)
        left_idx = left_of(front_index)

        face_map['right'] = middle_colors[right_idx] if right_idx is not None else 'U'
        face_map['left'] = middle_colors[left_idx] if left_idx is not None else 'U'

        back_idx = 5 - front_index if 0 <= front_index <= 5 else None
        face_map['back'] = middle_colors[back_idx] if back_idx is not None else 'U'

        full_state = ''.join([''.join(face) for face in faces])
        return full_state

    def get_dominant_color(self, roi):
        # Calculate dominant color in HSV region
        hist = cv2.calcHist([roi], [0], None, [180], [0, 180])
        dominant_hue = int(np.argmax(hist))
        avg_saturation = np.mean(roi[:, :, 1])
        avg_value = np.mean(roi[:, :, 2])
        for color, (lower, upper) in self.color_ranges.items():
            if lower[0] <= dominant_hue <= upper[0] and avg_saturation >= lower[1] and avg_value >= lower[2]:
                return color
        return 'U'

    def optimize(self):
        # Placeholder for any optimization steps
        pass

    def __str__(self):
        return f"CubeDetector with calibrated={self.calibrated}"

    def __repr__(self):
        return self.__str__()

    def detect_presence(self, img):
        # Improved presence detection based on color variance
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        std_dev = np.std(hsv[:, :, 0])
        return "cube_present" if std_dev > 10 else "cube_absent"
