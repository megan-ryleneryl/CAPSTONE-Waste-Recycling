# Capstone Waste Recycling Platform 🌱♻️

A comprehensive platform connecting waste givers with collectors to promote sustainable recycling practices.

### Prerequisites
- Node.js 16+
- Firebase project setup

## 📋 Features

### 🔐 User Management
- User registration and authentication
- Role-based access (Giver, Collector, Admin)
- Organization verification system
- Profile management with preferences

### ♻️ Waste Management
- Create waste collection posts
- Material categorization and pricing
- Pickup request system
- Real-time status tracking

### 🤝 Community Features
- Forum discussions (Tips, News, Questions)
- Community initiatives and projects
- Commenting and engagement system
- Direct messaging between users

### 🎮 Gamification
- Point-based reward system
- Achievement badges
- User leaderboards
- Activity tracking

### 📊 Analytics
- Recycling metrics and trends
- Location-based activity tracking
- Material pricing history
- User engagement statistics

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **File Storage:** Local filesystem
- **Notifications:** Firebase Cloud Messaging

## 📁 Project Structure
```
├── config/           # Firebase configuration
├── models/           # Firestore data models (13 models)
├── services/         # Business logic (auth, storage, notifications)
├── controllers/      # API route handlers
├── routes/           # API endpoint definitions
├── middleware/       # Express middleware
├── uploads/          # File storage
└── client/           # Frontend application
```


## 🎯 Model Architecture

### Inheritance Design
- **Post** (base class) → **WastePost**, **InitiativePost**, **ForumPost**
- All posts stored in single `posts` collection
- Type-specific fields and methods per subclass
- Automatic polymorphic behavior

### Key Models
- **User** - Authentication and profiles
- **Application** - Verification requests
- **Pickup** - Collection workflow
- **Notification** - In-app and push notifications
- **Point/Badge** - Gamification system

## 🧪 Development

### Available Scripts
```bash
npm run dev        # Start development server
npm run start      # Start production server
npm test          # Run tests
npm run lint      # Code linting
npm run clean     # Clean temporary files
```

## 👥 Team
**Capstone Project Team**
Aniago, Luke
Ople, Patricia
Sioco, Megan
Vidal, Kenneth


