# Machodoc X

A comprehensive medical diagnostic system integrating mobile, backend, and machine learning services.

## Architecture

- **Mobile**: React Native application for patient data collection and interface.
- **Backend**: Node.js/Express service for data management and API orchestration.
- **ML Models**: Python/FastAPI service for diagnostic inference (Audio/Image analysis).
- **Shared**: Common TypeScript types and utilities.

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- React Native environment (Android Studio / Xcode)

## Getting Started

### 1. Install Dependencies

Install all dependencies for the monorepo (use `--legacy-peer-deps` due to React Native dependency conflicts):

```bash
npm install --legacy-peer-deps
```

### 2. Start Infrastructure & ML Service

This command starts PostgreSQL, Redis, and the Python ML service.

```bash
docker-compose up --build
```
*Wait until you see "Uvicorn running on http://0.0.0.0:8000"*

### 3. Start Backend Service

Open a new terminal and run:

```bash
npm run dev:backend
```
*The backend connects to the database started in step 2.*

### 4. Start Mobile Application

Open a new terminal and run:

```bash
# For Android
npm run dev:mobile -- react-native run-android

# For iOS (Mac only)
npm run dev:mobile -- react-native run-ios
```

## Service Ports

- **Backend**: 3000
- **ML Service**: 8000
- **PostgreSQL**: 5432
- **Redis**: 6379

## Development

- **Linting**: `npm run lint`
- **Typecheck**: `npm run typecheck`
