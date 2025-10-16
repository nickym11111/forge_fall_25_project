# forge_fall_25_project

## Frontend (React Native + TypeScript)

### Prerequisites
- Node.js (>= 18.x recommended)
- npm (comes with Node)
- Expo Go app on your phone (for easy testing)

### Getting Started
1. Install dependencies:
   ```bash
   cd frontend
   npm install
Start the development server:

bash
Copy code
npx expo start
or if using bare React Native CLI:

bash
Copy code
npx react-native start
Run the app:

iOS: npx react-native run-ios

Android: npx react-native run-android

Expo: Scan the QR code in your terminal with the Expo Go app.

BACKEND SETUP:
- Cd into backend folder
- python3 -m venv venv
= source venv/bin/activate  # Mac/Linux
- venv\Scripts\activate     # Windows
- pip install -r requirements.txt
- cp .env.example .env
- Run the backend Server: uvicorn main:app --host 0.0.0.0 --reload
