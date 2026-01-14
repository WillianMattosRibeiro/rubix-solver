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
    
    current_state = None
    algorithm = []
    move_index = 0
    calibrated = False
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "frame":
                image_data = base64.b64decode(data["data"])
                np_img = np.frombuffer(image_data, np.uint8)
                img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
                
                status, detected_state = detector.detect_cube(img)
                
                if status == "calibrating":
                    await websocket.send_json({"status": "calibrating", "message": "Calibrating colors..."})
                elif status == "detected":
                    if not calibrated:
                        # Assume calibration done on first detection
                        calibrated = True
                        algorithm = solver_service.solve(detected_state)
                        current_state = detected_state
                        await websocket.send_json({"status": "solving", "moves": algorithm, "current_move": 0})
                    else:
                        # Analyze move
                        feedback = analyzer.analyze_move(current_state, detected_state, algorithm[move_index] if move_index < len(algorithm) else None)
                        if feedback == "correct":
                            move_index += 1
                            if move_index >= len(algorithm):
                                await websocket.send_json({"status": "solved", "message": "SOLVED!"})
                            else:
                                await websocket.send_json({"status": "solving", "moves": algorithm, "current_move": move_index})
                        else:
                            await websocket.send_json({"status": "error", "moves": algorithm, "current_move": move_index, "message": feedback})
                else:
                    await websocket.send_json({"status": status, "message": "Show whole cube"})
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()