# Rubik's Cube Solver Web App

A web-based application that uses computer vision to detect a Rubik's Cube from your webcam and provides step-by-step solving instructions.

## Features

- Real-time cube detection using webcam
- Automatic color recognition and calibration
- Step-by-step solving algorithm display
- Clean, minimalist dark UI
- Responsive design for desktop and tablets

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- OpenCV for image processing
- Ultralytics YOLOv8 for object detection
- Kociemba algorithm for cube solving

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- WebSocket for real-time communication

## Setup and Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rubix-solver-web
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Allow camera access when prompted
2. Show the entire Rubik's Cube to the camera
3. Wait for color calibration
4. Follow the displayed moves to solve the cube
5. Each correct move will turn green, incorrect moves will flash red

## API Endpoints

- `GET /` - Health check
- `WebSocket /ws` - Real-time cube detection and solving

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Limitations

- Requires good lighting conditions
- Cube must be fully visible in the camera frame
- Currently optimized for desktop/tablet; mobile support is limited
- Color detection may need recalibration for different lighting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License