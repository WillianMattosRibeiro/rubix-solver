import base64
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket
from ..services.cube_detector import CubeDetector
from ..services.solver import Solver
from ..services.move_analyzer import MoveAnalyzer

router = APIRouter()

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
            print("Received data:", data["type"])

            # Validate cubeBbox coordinates if present
            cube_bbox = data.get("cubeBbox")
            if cube_bbox and (not isinstance(cube_bbox, list) or len(cube_bbox) != 4):
                await websocket.send_json({"status": "error", "message": "Invalid cubeBbox format. Expected list of 4 numbers."})
                continue

            if data["type"] == "start_calibration":
            
                calibration_mode = True
                current_calibration_color = 0
                await websocket.send_json({"status": "calibration_started", "message": f"Calibration started. Show the {calibration_colors[current_calibration_color]} face."})

            elif data["type"] == "calibrate_specific_color":
                color = data.get("color")
                if color in calibration_colors:
                    calibration_mode = True
                    current_calibration_color = calibration_colors.index(color)
                    await websocket.send_json({"status": "calibration_specific", "message": f"Calibrating {color}. Show the {color} face."})
                else:
                    await websocket.send_json({"status": "error", "message": "Invalid color for calibration."})

            elif data["type"] == "reset_calibration":
                detector.reset_calibration()
                await websocket.send_json({"status": "calibration_reset", "message": "Calibration reset to default."})

            elif data["type"] == "frame":
                print("Received frame from frontend, data length:", len(data["data"]))
                try:
                    image_data = base64.b64decode(data["data"])
                    print("Base64 decoded, length:", len(image_data))
                    np_img = np.frombuffer(image_data, np.uint8)
                    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                    if img is None:
                        print("Failed to decode image with OpenCV")
                        await websocket.send_json({"status": "error", "message": "Failed to process image"})
                        continue
                    print("Image decoded successfully, shape:", img.shape)

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
                        print(f"Cropped image to bbox: x={x}, y={y}, w={w}, h={h}")

                except Exception as e:
                    print("Error processing frame:", str(e))
                    await websocket.send_json({"status": "error", "message": f"Error processing frame: {str(e)}"})
                    continue

                if calibration_mode:
                    # In calibration mode, detect the face and calibrate the color
                    status, face_colors, bbox = detector.detect_face(img)
                    if status == "face_detected":
                        detected_color = face_colors[4]  # Center color
                        expected_color = calibration_colors[current_calibration_color]
                        last_calibration_img = img  # Store for calibration
                        await websocket.send_json({"status": "calibration_face_detected", "message": f"Detected {detected_color}. Expected {expected_color}. Confirm or select correct color.", "detected_color": detected_color, "expected_color": expected_color})
                    else:
                        await websocket.send_json({"status": "calibration_face_not_detected", "message": f"Face not detected. Show the {calibration_colors[current_calibration_color]} face clearly."})
                elif not cube_present:
                    status = detector.detect_presence(img)
                    if status == "cube_present":
                        cube_present = True
                        message = "Cube detected. Show the front face."
                        await websocket.send_json({"status": "cube_detected", "message": message})
                    else:
                        await websocket.send_json({"status": "no_cube", "message": "No cube detected. Place the cube in front of the camera."})
                else:
                    if data["type"] == "confirm_face":
                        current_face += 1
                        if current_face < 6:
                            message = f"Confirmed. Now show the {faces[current_face]} face."
                            await websocket.send_json({"status": "face_confirmed", "message": message})
                        else:
                            # All faces captured
                            full_state = ''.join(faces_states)
                            await websocket.send_json({"status": "processing", "message": "All faces captured. Finding solution..."})
                            algorithm = solver_service.solve(full_state)
                            print("Algorithm generated:", len(algorithm), "moves")
                            message = "Solution found!" if algorithm else "No solution found."
                            await websocket.send_json({"status": "solving", "moves": algorithm, "current_move": 0, "message": message})
                            # Reset
                            faces_states = [None] * 6
                            current_face = 0
                            cube_present = False
                    else:
                        status, face_colors, bbox = detector.detect_face(img)
                        if status == "face_detected":
                            faces_states[current_face] = face_colors
                            message = f"3x3 {faces[current_face].capitalize()} face detected. Please confirm if correct."
                            await websocket.send_json({"status": "face_detected", "message": message, "face": faces[current_face], "colors": face_colors, "bbox": bbox, "cube_type": "3x3"})
                        else:
                            await websocket.send_json({"status": "face_not_detected", "message": f"{faces[current_face].capitalize()} face not detected. Adjust the cube to show the {faces[current_face]} face clearly."})

            elif data["type"] == "confirm_calibration":
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
                else:
                    calibration_mode = False
                    await websocket.send_json({"status": "calibration_complete", "message": "Calibration complete."})

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
                    else:
                        calibration_mode = False
                        await websocket.send_json({"status": "calibration_complete", "message": "Calibration complete."})
                else:
                    await websocket.send_json({"status": "error", "message": "Invalid color."})

    except Exception as e:
        print(f"WebSocket error: {e}")