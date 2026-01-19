import base64
import cv2
import numpy as np
import logging
import time
from collections import deque
from fastapi import APIRouter, WebSocket
from ..services.cube_detector import CubeDetector
from ..services.solver import Solver
from ..services.move_analyzer import MoveAnalyzer
from ..core.logging_config import logger, set_log_level

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is healthy"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    detector = CubeDetector()
    solver_service = Solver()
    analyzer = MoveAnalyzer()

    faces = ['front', 'right', 'back', 'left', 'top', 'bottom']
    faces_states = [None] * 6
    current_face = 0
    cube_present = False
    calibration_mode = False
    calibration_colors = ['Y', 'W', 'R', 'G', 'B', 'O']  # Order for calibration
    current_calibration_color = 0
    last_calibration_img = None

    # Performance monitoring
    processing_times = deque(maxlen=10)
    detection_success_count = 0
    detection_failure_count = 0
    frame_count = 0

    try:
        while True:
            data = await websocket.receive_json()
            logger.debug(f"Received data: {data['type']}")

            # Validate cubeBbox coordinates if present
            cube_bbox = data.get("cubeBbox")
            if cube_bbox and (not isinstance(cube_bbox, list) or len(cube_bbox) != 4):
                await websocket.send_json({"status": "error", "message": "Invalid cubeBbox format. Expected list of 4 numbers."})
                logger.warning("Invalid cubeBbox format received")
                continue

            if data["type"] == "start_calibration":
                calibration_mode = True
                current_calibration_color = 0
                await websocket.send_json({"status": "calibration_started", "message": f"Calibration started. Show the {calibration_colors[current_calibration_color]} face."})
                logger.info("Calibration started")

            elif data["type"] == "calibrate_specific_color":
                color = data.get("color")
                if color in calibration_colors:
                    calibration_mode = True
                    current_calibration_color = calibration_colors.index(color)
                    await websocket.send_json({"status": "calibration_specific", "message": f"Calibrating {color}. Show the {color} face."})
                    logger.info(f"Calibrating specific color: {color}")
                else:
                    await websocket.send_json({"status": "error", "message": "Invalid color for calibration."})
                    logger.warning(f"Invalid color for calibration: {color}")

            elif data["type"] == "reset_calibration":
                detector.reset_calibration()
                await websocket.send_json({"status": "calibration_reset", "message": "Calibration reset to default."})
                logger.info("Calibration reset to default")

            elif data["type"] == "frame":
                frame_receive_time = time.time()
                frame_count += 1
                logger.debug(f"Received frame {frame_count} from frontend, data length: {len(data['data'])}")
                try:
                    image_data = base64.b64decode(data["data"])
                    logger.debug(f"Base64 decoded, length: {len(image_data)}")
                    np_img = np.frombuffer(image_data, np.uint8)
                    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                    if img is None:
                        logger.error("Failed to decode image with OpenCV")
                        await websocket.send_json({"status": "detection_error", "message": "Failed to decode image"})
                        continue
                    logger.debug(f"Image decoded successfully, shape: {img.shape}")

                    # Frame preprocessing
                    # Brightness/contrast normalization
                    img = cv2.convertScaleAbs(img, alpha=1.2, beta=10)  # Increase contrast and brightness
                    # Gaussian blur for noise reduction
                    img = cv2.GaussianBlur(img, (3, 3), 0)
                    # Resize optimization for faster processing (max 640x480)
                    height, width = img.shape[:2]
                    if width > 640 or height > 480:
                        aspect_ratio = width / height
                        if width > height:
                            new_width = 640
                            new_height = int(640 / aspect_ratio)
                        else:
                            new_height = 480
                            new_width = int(480 * aspect_ratio)
                        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
                        logger.debug(f"Resized image to {new_width}x{new_height}")

                    # Check for cubeBbox in data and crop image accordingly
                    bbox = data.get("cubeBbox")
                    if bbox and isinstance(bbox, list) and len(bbox) == 4:
                        x, y, w, h = bbox
                        # Validate bbox coordinates
                        x = max(0, int(x))
                        y = max(0, int(y))
                        w = max(1, int(w))
                        h = max(1, int(h))
                        if x + w > img.shape[1]:
                            w = img.shape[1] - x
                        if y + h > img.shape[0]:
                            h = img.shape[0] - y
                        img = img[y:y+h, x:x+w]
                        logger.debug(f"Cropped image to bbox: x={x}, y={y}, w={w}, h={h}")

                except Exception as e:
                    logger.error(f"Error processing frame: {str(e)}")
                    await websocket.send_json({"status": "detection_error", "message": f"Error processing frame: {str(e)}"})
                    continue

            elif calibration_mode:
                # In calibration mode, detect the face and calibrate the color
                processing_start = time.time()
                status, face_colors, bbox = detector.detect_face(img, None)  # No expected center for calibration
                processing_time = time.time() - processing_start
                processing_times.append(processing_time)
                avg_processing_time = sum(processing_times) / len(processing_times)
                logger.debug(f"Calibration detection took {processing_time:.4f}s, avg: {avg_processing_time:.4f}s")
                if processing_time > 0.25:
                    logger.warning(f"Calibration detection exceeded 250ms: {processing_time:.4f}s")
                    await websocket.send_json({"status": "detection_warning", "message": f"Detection slow: {processing_time:.2f}s"})

                if status == "face_detected":
                    detection_success_count += 1
                    detected_color = face_colors[4]  # Center color
                    expected_color = calibration_colors[current_calibration_color]
                    last_calibration_img = img  # Store for calibration
                    await websocket.send_json({"status": "calibration_face_detected", "message": f"Detected {detected_color}. Expected {expected_color}. Confirm or select correct color.", "detected_color": detected_color, "expected_color": expected_color})
                    await websocket.send_json({"status": "debug_info", "bbox": bbox, "face_colors": face_colors, "processing_time": processing_time})
                    logger.info(f"Calibration face detected: {detected_color}, expected: {expected_color}")
                else:
                    detection_failure_count += 1
                    await websocket.send_json({"status": "calibration_face_not_detected", "message": f"Face not detected. Show the {calibration_colors[current_calibration_color]} face clearly."})
                    await websocket.send_json({"status": "debug_info", "processing_time": processing_time, "failure_reason": "face_not_detected"})
                    logger.warning(f"Calibration face not detected for color {calibration_colors[current_calibration_color]}")
            elif not cube_present:
                status = detector.detect_presence(img)
                if status == "cube_present":
                    cube_present = True
                    message = "Cube detected. Starting cube scan..."
                    await websocket.send_json({"status": "cube_detected", "message": message})
                    logger.info("Cube detected, starting scan")
                else:
                    await websocket.send_json({"status": "no_cube", "message": "No cube detected. Please place the Rubik's Cube in front of the camera."})
                    logger.info("No cube detected")
            else:
                # In scanning phase, detect faces sequentially
                processing_start = time.time()
                # Set expected center color for top and bottom faces
                expected_center = None
                if current_face == 4:  # top face
                    expected_center = 'Y'
                elif current_face == 5:  # bottom face
                    expected_center = 'W'
                status, face_colors, bbox = detector.detect_face(img, expected_center)
                processing_time = time.time() - processing_start
                processing_times.append(processing_time)
                avg_processing_time = sum(processing_times) / len(processing_times)
                logger.debug(f"Detection took {processing_time:.4f}s, avg: {avg_processing_time:.4f}s")
                if processing_time > 0.25:
                    logger.warning(f"Detection exceeded 250ms: {processing_time:.4f}s")
                    await websocket.send_json({"status": "detection_warning", "message": f"Detection slow: {processing_time:.2f}s"})

                if status == "face_detected":
                    detection_success_count += 1
                    faces_states[current_face] = face_colors
                    message = f"✓ {faces[current_face].capitalize()} face scanned successfully"
                    await websocket.send_json({"status": "face_detected", "message": message, "face": faces[current_face], "colors": face_colors, "bbox": bbox})
                    await websocket.send_json({"status": "debug_info", "bbox": bbox, "face_colors": face_colors, "processing_time": processing_time})
                    logger.debug(f"Face detected: {faces[current_face]}")

                    # Automatically advance to next face
                    current_face += 1
                    if current_face < 6:
                        logger.info(f"Advancing to next face: {faces[current_face]}")
                    else:
                        # All faces captured
                        full_state = ''.join(faces_states)
                        await websocket.send_json({"status": "scan_complete", "message": "All faces scanned. Generating solution..."})
                        logger.info("All faces scanned, generating solution")
                        algorithm = solver_service.solve(full_state)
                        logger.info(f"Algorithm generated with {len(algorithm)} moves")
                        message = "Solution found!" if algorithm else "Unable to solve cube. Please check scanned faces and try rescanning."
                        await websocket.send_json({"status": "solution_ready", "message": message, "moves": algorithm})
                        # Reset
                        faces_states = [None] * 6
                        current_face = 0
                        cube_present = False
                        logger.info("Resetting state after solving")
                else:
                    detection_failure_count += 1
                    await websocket.send_json({"status": "face_not_detected", "message": f"Face detection failed. Please ensure the {faces[current_face]} face is clearly visible and well-lit."})
                    await websocket.send_json({"status": "debug_info", "processing_time": processing_time, "failure_reason": "face_not_detected"})
                    logger.debug(f"Face not detected: {faces[current_face]}")

                # Periodic status update every 10 frames
                if frame_count % 10 == 0:
                    total_time = time.time() - frame_receive_time
                    fps = frame_count / total_time if total_time > 0 else 0
                    success_rate = detection_success_count / (detection_success_count + detection_failure_count) if (detection_success_count + detection_failure_count) > 0 else 0
                    await websocket.send_json({"status": "processing_stats", "avg_processing_time": avg_processing_time, "fps": fps, "success_rate": success_rate})
                    logger.info(f"Frame {frame_count}: avg_time={avg_processing_time:.4f}s, fps={fps:.2f}, success_rate={success_rate:.2f}")

            if data["type"] == "confirm_calibration":
                selected_color = data.get("selected_color")
                if selected_color and selected_color in calibration_colors:
                    color_to_calibrate = selected_color
                else:
                    color_to_calibrate = calibration_colors[current_calibration_color]
                if last_calibration_img is not None:
                    detector.calibrate_color(color_to_calibrate, last_calibration_img)
                current_calibration_color += 1
                if current_calibration_color < len(calibration_colors):
                    await websocket.send_json({"status": "calibration_next", "message": f"Color {color_to_calibrate} calibrated. Now show the {calibration_colors[current_calibration_color]} face."})
                    logger.info(f"Color {color_to_calibrate} calibrated, moving to next color")
                else:
                    calibration_mode = False
                    await websocket.send_json({"status": "calibration_complete", "message": "Calibration complete."})
                    logger.info("Calibration complete")

            elif data["type"] == "select_calibration_color":
                selected_color = data.get("color")
                if selected_color in calibration_colors:
                    # Override the detected color
                    color = calibration_colors[current_calibration_color]
                    # Since no img, just proceed, assuming calibration is not updated, or perhaps reset to default for that color.
                    # For simplicity, just proceed.
                    current_calibration_color += 1
                    if current_calibration_color < len(calibration_colors):
                        await websocket.send_json({"status": "calibration_next", "message": f"Color set to {selected_color}. Now show the {calibration_colors[current_calibration_color]} face."})
                        logger.info(f"Calibration color set to {selected_color}, moving to next color")
                    else:
                        calibration_mode = False
                        await websocket.send_json({"status": "calibration_complete", "message": "Calibration complete."})
                        logger.info("Calibration complete")
                else:
                    await websocket.send_json({"status": "error", "message": "Invalid color."})
                    logger.warning(f"Invalid color selected for calibration: {selected_color}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

# Runtime log level adjustment endpoint
@router.post('/loglevel')
async def set_log_level_endpoint(level: str):
    try:
        set_log_level(level)
        return {"status": "success", "message": f"Log level set to {level}"}
    except ValueError as ve:
        return {"status": "error", "message": str(ve)}
