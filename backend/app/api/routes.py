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

    try:
        while True:
            data = await websocket.receive_json()
            print("Received data:", data["type"])

            if data["type"] == "frame":
                print("Received frame from frontend")
                image_data = base64.b64decode(data["data"])
                np_img = np.frombuffer(image_data, np.uint8)
                img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                if img is None:
                    print("Failed to decode image")
                    continue
                print("Image decoded, shape:", img.shape)

                if not cube_present:
                    status = detector.detect_presence(img)
                    if status == "cube_present":
                        cube_present = True
                        message = "Cube detected. Show the front face."
                        await websocket.send_json({"status": "cube_detected", "message": message})
                    else:
                        await websocket.send_json({"status": "no_cube", "message": "No cube detected. Place the cube in front of the camera."})
                else:
                    status, face_colors = detector.detect_face(img)
                    if status == "face_detected":
                        faces_states[current_face] = face_colors
                        current_face += 1
                        if current_face < 6:
                            message = f"{faces[current_face-1].capitalize()} face detected. Now show the {faces[current_face]} face."
                            await websocket.send_json({"status": "face_detected", "message": message})
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
                        await websocket.send_json({"status": "face_not_detected", "message": f"{faces[current_face].capitalize()} face not detected. Adjust the cube to show the {faces[current_face]} face clearly."})
    except Exception as e:
        print(f"WebSocket error: {e}")