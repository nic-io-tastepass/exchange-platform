# Exchange Platform

A fully responsive web application for exchanging goods and interests with comprehensive authentication features.

## Features

### Authentication
- **Password Authentication**: Standard email/password registration and login
- **TOTP Multi-Factor Authentication**: Setup via QR code with authenticator apps (Google Authenticator, Authy, etc.)
- **WebAuthn Biometrics**: Fingerprint, Face ID, Touch ID support for modern devices

### Core Features
- **Listings Management**: Create, view, search, and filter listings by type (goods/interests) and category
- **Offers System**: Make offers on listings, accept/decline offers
- **Messaging**: Direct messaging between users with conversation threads
- **User Settings**: Profile management, MFA setup, biometrics enrollment

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- In-memory database (proof of concept - data resets on restart)
- bcrypt for password hashing
- JWT tokens with httpOnly cookies
- speakeasy for TOTP MFA
- @simplewebauthn/server for WebAuthn biometrics

### Frontend
- React + Vite + TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- @simplewebauthn/browser for WebAuthn client
- PWA-ready with manifest for mobile installation

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd exchange-platform
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend/exchange-platform-frontend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:8000

2. Start the frontend server (in a new terminal):
```bash
cd frontend/exchange-platform-frontend
npm run dev
```
The frontend will run on http://localhost:5173

3. Open http://localhost:5173 in your browser

## Usage

1. **Register**: Create a new account at http://localhost:5173/register
2. **Login**: Sign in with your credentials
3. **Explore Listings**: Browse and search listings on the home page
4. **Create Listings**: Click "Create Listing" to add new goods or interests
5. **Make Offers**: View listing details and make offers to other users
6. **Messaging**: Chat with other users through the messaging system
7. **Settings**: Set up TOTP MFA or WebAuthn biometrics for enhanced security

## Security Features

### TOTP Multi-Factor Authentication
1. Go to Settings → Setup TOTP
2. Scan the QR code with your authenticator app
3. Enter the 6-digit code to enable MFA
4. Future logins will require both password and TOTP code

### WebAuthn Biometrics
1. Go to Settings → Setup Biometrics
2. Follow browser prompts to register your fingerprint/Face ID
3. Use "Login with Biometrics" on the login page for quick access

## Project Structure

```
exchange-platform/
├── backend/
│   ├── src/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Authentication middleware
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Express server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   └── exchange-platform-frontend/
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   ├── contexts/    # React contexts
│       │   ├── lib/         # API client
│       │   └── App.tsx
│       ├── public/
│       │   └── manifest.json  # PWA manifest
│       └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/mfa/totp/setup` - Setup TOTP MFA
- `POST /api/auth/mfa/totp/verify` - Verify TOTP code
- `POST /api/auth/mfa/totp/authenticate` - Authenticate with TOTP
- `DELETE /api/auth/mfa/totp` - Disable TOTP
- `POST /api/auth/webauthn/register/options` - Get WebAuthn registration options
- `POST /api/auth/webauthn/register/verify` - Verify WebAuthn registration
- `POST /api/auth/webauthn/authenticate/options` - Get WebAuthn authentication options
- `POST /api/auth/webauthn/authenticate/verify` - Verify WebAuthn authentication

### Listings
- `GET /api/listings` - Get all listings (with optional filters)
- `GET /api/listings/:id` - Get listing by ID
- `POST /api/listings` - Create new listing
- `PATCH /api/listings/:id` - Update listing

### Offers
- `GET /api/offers` - Get user's offers
- `GET /api/offers/:id` - Get offer by ID
- `POST /api/offers` - Create new offer
- `POST /api/offers/:id/accept` - Accept offer
- `POST /api/offers/:id/decline` - Decline offer

### Messaging
- `GET /api/messages/threads` - Get user's message threads
- `POST /api/messages/threads` - Create new thread
- `GET /api/messages/threads/:id/messages` - Get messages in thread
- `POST /api/messages/threads/:id/messages` - Send message

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile

## Notes

- This is a proof of concept using an in-memory database
- All data will be lost when the backend server restarts
- For production use, connect to a real MongoDB instance
- WebAuthn requires HTTPS in production (localhost works for development)
- The application is PWA-ready and can be installed on mobile devices

## License

MIT
