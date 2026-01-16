import base64
import cv2
import numpy as np
import logging
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
                logger.debug(f"Received frame from frontend, data length: {len(data['data'])}")
                try:
                    image_data = base64.b64decode(data["data"])
                    logger.debug(f"Base64 decoded, length: {len(image_data)}")
                    np_img = np.frombuffer(image_data, np.uint8)
                    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                    if img is None:
                        logger.error("Failed to decode image with OpenCV")
                        await websocket.send_json({"status": "error", "message": "Failed to process image"})
                        continue
                    logger.debug(f"Image decoded successfully, shape: {img.shape}")

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
                    await websocket.send_json({"status": "error", "message": f"Error processing frame: {str(e)}"})
                    continue

            elif calibration_mode:
                # In calibration mode, detect the face and calibrate the color
                status, face_colors, bbox = detector.detect_face(img)
                if status == "face_detected":
                    detected_color = face_colors[4]  # Center color
                    expected_color = calibration_colors[current_calibration_color]
                    last_calibration_img = img  # Store for calibration
                    await websocket.send_json({"status": "calibration_face_detected", "message": f"Detected {detected_color}. Expected {expected_color}. Confirm or select correct color.", "detected_color": detected_color, "expected_color": expected_color})
                    logger.info(f"Calibration face detected: {detected_color}, expected: {expected_color}")
                else:
                    await websocket.send_json({"status": "calibration_face_not_detected", "message": f"Face not detected. Show the {calibration_colors[current_calibration_color]} face clearly."})
                    logger.warning(f"Calibration face not detected for color {calibration_colors[current_calibration_color]}")
            elif not cube_present:
                status = detector.detect_presence(img)
                if status == "cube_present":
                    cube_present = True
                    message = "Cube detected. Show the front face."
                    await websocket.send_json({"status": "cube_detected", "message": message})
                    logger.info("Cube detected")
                else:
                    await websocket.send_json({"status": "no_cube", "message": "No cube detected. Place the cube in front of the camera."})
                    logger.info("No cube detected")
            else:
                if data["type"] == "confirm_face":
                    # Send face_scanned message on confirmation
                    if faces_states[current_face]:
                        await websocket.send_json({"status": "face_scanned", "face": faces[current_face], "colors": faces_states[current_face], "message": f"Face {faces[current_face]} scanned and confirmed."})
                        logger.info(f"Face {faces[current_face]} scanned and confirmed")
                    current_face += 1
                    if current_face < 6:
                        message = f"Confirmed. Now show the {faces[current_face]} face."
                        await websocket.send_json({"status": "face_confirmed", "message": message})
                        logger.info(f"Prompting for next face: {faces[current_face]}")
                    else:
                        # All faces captured
                        full_state = ''.join(faces_states)
                        await websocket.send_json({"status": "processing", "message": "All faces captured. Finding solution..."})
                        algorithm = solver_service.solve(full_state)
                        logger.info(f"Algorithm generated with {len(algorithm)} moves")
                        message = "Solution found!" if algorithm else "No solution found."
                        await websocket.send_json({"status": "solving", "moves": algorithm, "current_move": 0, "message": message})
                        # Reset
                        faces_states = [None] * 6
                        current_face = 0
                        cube_present = False
                        logger.info("Resetting state after solving")
                else:
                    status, face_colors, bbox = detector.detect_face(img)
                    if status == "face_detected":
                        faces_states[current_face] = face_colors
                        message = f"3x3 {faces[current_face].capitalize()} face detected. Please confirm if correct."
                        await websocket.send_json({"status": "face_detected", "message": message, "face": faces[current_face], "colors": face_colors, "bbox": bbox, "cube_type": "3x3"})
                        logger.debug(f"Face detected: {faces[current_face]}")
                    else:
                        await websocket.send_json({"status": "face_not_detected", "message": f"{faces[current_face].capitalize()} face not detected. Adjust the cube to show the {faces[current_face]} face clearly."})
                        logger.debug(f"Face not detected: {faces[current_face]}")

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
