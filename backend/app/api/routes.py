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

    try:
        while True:
            data = await websocket.receive_json()
            print("Received data:", data["type"])

            if data["type"] == "frame":
                image_data = base64.b64decode(data["data"])
                np_img = np.frombuffer(image_data, np.uint8)
                img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                if img is None:
                    print("Failed to decode image")
                    continue
                print("Image shape:", img.shape)

                status, detected_state = detector.detect_cube(img)
                print("Detection status:", status)

                if status == "calibrating":
                    await websocket.send_json({"status": "calibrating", "message": "Calibrating colors..."})
                elif status == "detected":
                    # Solve on every detection for demo purposes
                    algorithm = solver_service.solve(detected_state)
                    print("Algorithm:", algorithm)
                    await websocket.send_json({"status": "solving", "moves": algorithm, "current_move": 0})
                else:
                    await websocket.send_json({"status": status, "message": "Position the cube so all faces are visible"})
    except Exception as e:
        print(f"WebSocket error: {e}")