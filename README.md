# WebRTC Video Sender

## Overview
WebRTC Video Sender is a project designed to enable real-time video transmission using WebRTC technology. It consists of a frontend for the user interface and a backend for signaling and managing connections.

## Project Structure
```
/backend   - Contains the server-side code (Node.js/Express/WebSocket signaling)
/frontend  - Contains the client-side code (React/TypeScript/CSS)
LICENSE    - MIT License
```

## Features
- Real-time video streaming via WebRTC
- Peer-to-peer communication
- Backend signaling for establishing connections
- Modern UI built with TypeScript and CSS

## Tech Stack
- **Frontend**: TypeScript, HTML, CSS
- **Backend**: Node.js (Express/WebSocket)
- **WebRTC**: Used for video streaming

## Installation & Setup
1. **Clone the repository:**
   ```sh
   git clone https://github.com/Vaibhavk0202/webrtc-videosender.git
   cd webrtc-videosender
   ```

2. **Install dependencies:**
   ```sh
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Run the backend server:**
   ```sh
   cd backend
   npm start
   ```

4. **Run the frontend application:**
   ```sh
   cd frontend
   npm start
   ```

5. Open `http://localhost:3000` in your browser to access the application.

## Usage
1. Open the frontend application in your browser.
2. Allow camera and microphone access when prompted.
3. Use the provided interface to start a video call.
4. Share the connection details with another user to establish a peer-to-peer connection.

## Contributing
Contributions are welcome! Feel free to fork the repository and submit a pull request.

## License
This project is licensed under the MIT License.
