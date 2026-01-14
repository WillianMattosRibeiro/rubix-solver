# Rubik's Cube Solver

A real-time computer vision application that detects a 3x3 Rubik's Cube from webcam feed, recognizes colors, solves the cube, and provides a step-by-step solving guide with visual feedback.

## Features

- **Real-time Detection**: Uses computer vision to detect Rubik's Cube faces in webcam feed
- **Color Recognition**: Robust color classification using LAB color space for lighting invariance
- **Automatic Solving**: Integrates with kociemba algorithm for optimal solutions
- **Interactive GUI**: Clean, minimalist dark-mode interface inspired by SpaceX/Grok aesthetics
- **Move Tracking**: Visual feedback for each solving move (green for correct, red for incorrect)
- **Calibration**: Built-in color calibration for reliable recognition under different lighting

## Requirements

- Python 3.11+
- Webcam
- Linux/Windows/macOS

## Quick Start

### Using Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rubix-solver
   ```

2. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

### Local Installation

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application**:
   ```bash
   python src/main.py
   ```

## How to Use

1. **Launch the application** - The GUI will open with camera feed
2. **Calibration phase** - Show color samples when prompted (currently uses predefined colors)
3. **Scan cube faces** - Show each of the 6 faces (U/R/F/D/L/B) to the camera sequentially
4. **Solve** - Follow the displayed moves, performing them on your physical cube
5. **Feedback** - Moves turn green when performed correctly, red when incorrect

## Calibration Tips

- Ensure good, even lighting without harsh shadows
- Hold the cube steady when scanning faces
- Keep the cube face parallel to the camera
- Avoid reflective surfaces or backgrounds that match cube colors
- If colors are misrecognized, restart the application for recalibration

## Project Structure

```
rubix-solver/
├── src/
│   ├── main.py                 # Application entry point
│   ├── cube_detector.py        # Cube face detection
│   ├── color_recognition.py    # Color classification
│   ├── cube_state.py          # Cube state management
│   ├── solver.py              # Kociemba solver integration
│   ├── move_tracker.py        # Move feedback system
│   ├── gui/
│   │   ├── theme.py           # Dark theme configuration
│   │   └── widgets.py         # UI components
│   └── utils/
│       ├── colors.py          # Color constants
│       ├── drawing.py         # CV drawing helpers
│       └── fps.py             # Performance monitoring
├── assets/
│   └── fonts/                 # Font references
├── Dockerfile                 # Container build
├── docker-compose.yml         # Container orchestration
└── requirements.txt           # Python dependencies
```

## Technical Details

- **Computer Vision**: OpenCV with contour detection for cube face identification
- **Color Space**: LAB color space for robust color distance calculations
- **Solver**: Kociemba two-phase algorithm for optimal solutions
- **GUI**: Dear PyGui for immediate mode UI with custom dark theme
- **Performance**: Targets 15+ FPS on standard hardware

## Known Limitations

- Requires sequential face scanning (not simultaneous 6-face detection)
- Color recognition may struggle with very poor lighting or unusual cube colors
- Move detection is not fully implemented (feedback is placeholder)
- GUI colors for moves are indicated in text, not visually colored
- No audio feedback or advanced animations
- Webcam resolution and angle sensitivity

## Troubleshooting

**Camera not detected**:
- Ensure webcam permissions are granted
- Try different camera index in `cv2.VideoCapture(0)`

**Poor color recognition**:
- Improve lighting conditions
- Clean camera lens
- Ensure cube stickers are not worn

**Application crashes**:
- Check Python version compatibility
- Verify all dependencies are installed
- Ensure webcam is not used by other applications

## Development

### Adding New Features

1. Extend modules in `src/` following existing patterns
2. Add type hints for all new functions
3. Update GUI components in `src/gui/`
4. Test with various lighting conditions

### Building Docker Image

```bash
docker build -t rubix-solver .
docker run --device=/dev/video0 -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix rubix-solver
```

## License

[Add license information]

## Contributing

[Add contribution guidelines]

## Acknowledgments

- Kociemba algorithm for cube solving
- OpenCV community for computer vision tools
- Dear PyGui for the UI framework