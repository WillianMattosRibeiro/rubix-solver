import cv2
import numpy as np
import kociemba
import random
import time
import logging
from functools import wraps
from ultralytics import YOLO

logger = logging.getLogger(__name__)

def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        logger.debug(f"{func.__name__} took {end_time - start_time:.4f} seconds")
        return result
    return wrapper

class CubeDetector:
    def __init__(self):
        # Define default HSV color ranges for Rubik's cube colors
        self.default_color_ranges = {
            # Adjusted HSV ranges to better match manual RGB validation
            # Manual RGB validation:
            # Y: [180, 173, 42],    // Yellow
            # W: [130, 125, 130],  // White
            # R: [170, 18, 33],      // Red
            # G: [4, 97, 21],      // Green
            # B: [0, 33, 84],      // Blue
            # O: [234, 53, 25]     // Orange
            'R': ([0, 120, 70], [10, 255, 255]),  # Red lower range
            'R2': ([170, 120, 70], [180, 255, 255]),  # Red upper range
            'O': ([11, 100, 100], [25, 255, 255]),  # Orange
            'Y': ([26, 50, 50], [34, 255, 255]),  # Yellow
            'G': ([35, 50, 50], [85, 255, 255]),  # Green
            'B': ([90, 50, 50], [130, 255, 255]),  # Blue
            'W': ([0, 0, 200], [180, 30, 255]),  # White
        }

        self.color_ranges = self.default_color_ranges.copy()
        self.calibrated_colors = set()  # Track which colors have been calibrated

    def detect_presence(self, img, roi=None):
        # If ROI is specified, crop the image
        if roi:
            x, y, w, h = roi
            x = max(0, int(x))
            y = max(0, int(y))
            w = max(1, int(w))
            h = max(1, int(h))
            if x + w > img.shape[1]:
                w = img.shape[1] - x
            if y + h > img.shape[0]:
                h = img.shape[0] - y
            img = img[y:y+h, x:x+w]

        # Convert to HSV and analyze color distribution
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Check for sufficient color variation (cube should have multiple colors)
        std_hue = np.std(hsv[:, :, 0])
        std_sat = np.std(hsv[:, :, 1])
        std_val = np.std(hsv[:, :, 2])

        # Look for cube-like color patterns (high saturation areas for colored stickers)
        sat_mask = hsv[:, :, 1] > 50
        color_pixels = np.sum(sat_mask)

        # Cube should occupy reasonable portion of image and have color variation
        total_pixels = img.shape[0] * img.shape[1]
        color_ratio = color_pixels / total_pixels

        # Improved detection: check for cube-like characteristics
        has_color_variation = std_hue > 15 or std_sat > 20
        has_sufficient_colors = color_ratio > 0.1  # At least 10% colored pixels

        return "cube_present" if has_color_variation and has_sufficient_colors else "cube_absent"

    def calibrate_color(self, color, img):
        # Calibrate a specific color by analyzing the provided image
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        # Flatten the image to get all pixels
        pixels = hsv.reshape(-1, 3)
        # Filter out low saturation/value for white/black, but for now, use all
        if color == 'W':
            # For white, use low saturation
            mask = pixels[:, 1] < 50
        else:
            mask = pixels[:, 1] > 50  # High saturation for colors

        if np.sum(mask) == 0:
            return False

        filtered_pixels = pixels[mask]
        h_vals = filtered_pixels[:, 0]
        s_vals = filtered_pixels[:, 1]
        v_vals = filtered_pixels[:, 2]

        # For red, handle wrap-around
        if color == 'R':
            # Red can be 0-10 or 170-180
            h_min = np.min(h_vals)
            h_max = np.max(h_vals)
            if h_max - h_min > 100:  # Wrap around
                # Split into two ranges, but for simplicity, use the range
                h_min = 0
                h_max = 180
            s_min = max(0, np.min(s_vals) - 20)
            s_max = 255
            v_min = max(0, np.min(v_vals) - 20)
            v_max = 255
            self.color_ranges['R'] = ([h_min, s_min, v_min], [h_max, s_max, v_max])
            self.color_ranges['R2'] = ([h_min, s_min, v_min], [h_max, s_max, v_max])  # Same for now
        else:
            h_min = max(0, np.min(h_vals) - 10)
            h_max = min(180, np.max(h_vals) + 10)
            s_min = max(0, np.min(s_vals) - 20)
            s_max = 255
            v_min = max(0, np.min(v_vals) - 20)
            v_max = 255
            self.color_ranges[color] = ([h_min, s_min, v_min], [h_max, s_max, v_max])

        self.calibrated_colors.add(color)
        return True

    def reset_calibration(self):
        self.color_ranges = self.default_color_ranges.copy()
        self.calibrated_colors.clear()
        return True

    def is_color_calibrated(self, color):
        return color in self.calibrated_colors

    def validate_face_string(self, face_str):
        # Validate that face string is exactly 9 characters for 3x3 face
        return len(face_str) == 9 and all(c in 'ROYGBW' for c in face_str)

    @timeit
    def isolate_cube(self, img):
        # Isolate the cube from the background using thresholding and contour detection
        # Enforce 3x3 cube support: resize cropped area to fixed 90x90 for consistent 3x3 grid
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            # Find the largest contour assuming it's the cube
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            logger.debug(f"isolate_cube: bbox coordinates x={x}, y={y}, w={w}, h={h}")
            # Check if bbox is square-ish for cube
            aspect_ratio = w / h if h > 0 else 0
            if not 0.8 <= aspect_ratio <= 1.2:
                logger.warning(f"isolate_cube: bbox aspect ratio {aspect_ratio:.2f} not square-ish, may not be cube")
            # Crop to the cube area
            cube_img = img[y:y+h, x:x+w]
            # Resize to fixed 90x90 to enforce 3x3 grid (30x30 per sticker)
            cube_img = cv2.resize(cube_img, (90, 90), interpolation=cv2.INTER_LINEAR)
            return cube_img, (x, y, w, h)
        logger.warning("isolate_cube: no contours found, using fallback")
        return cv2.resize(img, (90, 90), interpolation=cv2.INTER_LINEAR), (0, 0, img.shape[1], img.shape[0])  # Fallback, resized

    @timeit
    def detect_face(self, img, expected_center_color=None):
        # First, isolate the cube
        cube_img, bbox = self.isolate_cube(img)
        hsv = cv2.cvtColor(cube_img, cv2.COLOR_BGR2HSV)
        height, width = hsv.shape[:2]
        face_size = min(height, width) // 3
        logger.debug(f"detect_face: processing image of size {height}x{width}, face_size={face_size}")

        # Define the center square coordinates (middle piece) within isolated cube
        center_y = height // 2
        center_x = width // 2

        # Calculate the size of each square
        square_size = face_size

        # Extract the middle piece color
        middle_roi = hsv[center_y - square_size//2:center_y + square_size//2, center_x - square_size//2:center_x + square_size//2]
        middle_color = self.get_dominant_color(middle_roi)
        logger.debug(f"detect_face: middle color detected as {middle_color}")

        # Validate center color if expected
        if expected_center_color and middle_color != expected_center_color:
            logger.warning(f"detect_face: Center color {middle_color} does not match expected {expected_center_color}")
            return "face_not_detected", 'UUUUUUUUU', bbox

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
                logger.warning(f"detect_face: ROI at offset ({dy}, {dx}) is empty")
            else:
                color = self.get_dominant_color(roi)
            # Map to face_colors index (skip middle 4)
            if idx < 4:
                face_colors[idx] = color
            else:
                face_colors[idx + 1] = color

        # Return face detected with color matrix string and bbox for overlay
        face_colors_str = ''.join(face_colors)
        logger.debug(f"detect_face: detected colors {face_colors_str}")
        # Enforce 3x3: validate exactly 9 colors
        if len(face_colors_str) != 9:
            logger.warning(f"detect_face: Detected face has {len(face_colors_str)} colors, expected 9. Rejecting as invalid for 3x3 cube.")
            return "face_not_detected", 'UUUUUUUUU', bbox
        # Validate that it's a valid 3x3 color pattern (all colors are valid cube colors)
        if not all(c in 'ROYGBW' for c in face_colors_str):
            logger.warning(f"detect_face: Invalid colors in face: {face_colors_str}")
            return "face_not_detected", 'UUUUUUUUU', bbox
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
        # Enforce 3x3: validate exactly 54 colors (6 faces x 9 stickers)
        if len(full_state) != 54:
            print(f"Warning: Detected full cube has {len(full_state)} colors, expected 54. Rejecting as invalid for 3x3 cube.")
            return 'U' * 54
        return full_state



    @timeit
    def get_dominant_color(self, roi):
        # Calculate dominant color in HSV region
        hist = cv2.calcHist([roi], [0], None, [180], [0, 180])
        dominant_hue = int(np.argmax(hist))
        avg_saturation = np.mean(roi[:, :, 1])
        avg_value = np.mean(roi[:, :, 2])
        logger.debug(f"get_dominant_color: dominant_hue={dominant_hue}, avg_sat={avg_saturation:.2f}, avg_val={avg_value:.2f}")

        # Refine white detection: white has low saturation but high value
        if avg_saturation < 40 and avg_value > 200:
            logger.debug("get_dominant_color: detected white")
            return 'W'

        for color, (lower, upper) in self.color_ranges.items():
            # Adjust hue range check to handle wrap-around for red
            if color == 'R' or color == 'R2':
                if (dominant_hue >= lower[0] or dominant_hue <= upper[0]) and avg_saturation >= lower[1] and avg_value >= lower[2]:
                    logger.debug(f"get_dominant_color: detected red using range {color}")
                    return 'R'
            else:
                if lower[0] <= dominant_hue <= upper[0] and avg_saturation >= lower[1] and avg_value >= lower[2]:
                    logger.debug(f"get_dominant_color: detected {color}")
                    return color
        logger.debug("get_dominant_color: no match, returning unknown")
        return 'U'



    def optimize(self):
        # Placeholder for any optimization steps
        pass

    def __str__(self):
        return f"CubeDetector with calibrated={self.calibrated}"

    def __repr__(self):
        return self.__str__()


