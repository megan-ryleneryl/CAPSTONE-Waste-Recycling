# EcoTayo - Circular Economy Platform

Your Partner in a Circular Economy

EcoTayo is a digital waste management platform that connects recyclable waste from households to collectors and environmental initiatives. We address waste disposal inefficiencies by providing a centralized space where individuals and organizations collaborate to recycle materials better, making the waste cycle more circular.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [User Types](#user-types)
4. [Core Modules](#core-modules)
5. [Tech Stack](#tech-stack)
6. [Getting Started](#getting-started)
7. [Project Structure](#project-structure)
8. [Development](#development)
9. [API Endpoints](#api-endpoints)
10. [Database Schema](#database-schema)
11. [Contributing](#contributing)
12. [License](#license)
13. [Support](#support)

## Overview

EcoTayo connects individuals and organizations in the recycling ecosystem through a user-friendly platform. Whether you're looking to dispose of recyclable materials, source them for a project, or participate in environmental initiatives, EcoTayo makes it easy to find the right partners and coordinate pickups.

### Problem Statement

Waste disposal inefficiencies stem from a lack of data sharing between waste producers and collectors. This disconnect results in:

- Recyclable materials going to landfills unnecessarily
- Inefficient collection routes and schedules
- Limited community engagement in environmental initiatives
- No centralized tracking of environmental impact

### Our Solution

EcoTayo provides:

- A unified platform for waste posting and collection
- Real-time coordination and tracking
- Environmental impact visualization
- Community engagement through gamification (points & badges)
- Verified user network for trust and reliability

## Key Features

### Waste Posting
Upload photos and details of recyclable materials you want to dispose of. Set your preferred pickup times and locations.

### Efficient Collection
Collectors can claim waste posts, publish collection initiatives, and coordinate pickups with givers through the built-in chat system.

### Initiative Support
Browse and support collection initiatives from verified organizations and environmental projects.

### Community Forum
Share knowledge, ask questions, and build community awareness about recycling practices.

### Environmental Impact Tracking
Visualize your contribution to environmental sustainability with interactive maps, heat maps, and aggregated impact statistics.

### Rewards and Gamification
Earn reputation points for successful transactions and unlock badges as you become more active in the community.

### Verified Network
All users must complete identity verification to ensure a trusted and accountable community.

### Location-Based Discovery
Find nearby disposal sites, recycling hotspots, and active initiatives in your area.

## User Types

### Givers

Individuals, households, or organizations with recyclable materials to dispose of.

#### Capabilities:
- Create waste posts for disposal
- Create forum posts for community discussion
- Post pickup location preferences
- Support collector initiatives with donations
- Track environmental contribution
- Earn reputation points

#### Examples: 
Person with accumulated plastic bottles, company with old electronics, household with e-waste

### Collectors

Individuals, households, or organizations that need recyclable materials.

#### Capabilities:
- Claim waste posts from givers
- Create initiative posts to call for materials
- Create forum posts for community engagement
- Coordinate pickups via chat system
- Schedule pickups with finalized details
- Accept donations for initiatives
- Track collection statistics
- Build organization reputation

#### Examples: 
Material Recovery Facilities (MRFs), NGOs, schools with projects, individuals with DIY initiatives

### Admins

System owners and developers responsible for monitoring and management.

#### Capabilities:
- Monitor system health and performance
- Manage user verifications and roles
- Oversee data analytics and reporting
- Handle disputes and complaints
- Manage system configurations

## Core Modules

### Module 1: Post Management

Users create and browse three types of posts:

#### Waste Posts
- Created by: All user types
- Action: Claimable by collectors
- Purpose: Disposal of recyclable materials (may include payment)

#### Initiative Posts
- Created by: Collectors only
- Action: Supportable by givers with donations
- Purpose: Environmental projects requesting specific materials

#### Forum Posts
- Created by: All user types
- Action: Likeable and commentable by all
- Purpose: Community knowledge sharing and discussions

#### Features:
- Filtered search by location, waste type, initiative category
- Sorting by distance, date, relevance
- Tagged categorization system
- Real-time post visibility

### Module 2: Pickup Management

Handles coordination of waste collection between givers and collectors.

#### Workflow:

1. **Claim & Chat**: Collector claims waste post; coordination begins via chat
2. **Schedule Creation**: Collector submits finalized pickup details via form
3. **Giver Confirmation**: Giver reviews and confirms schedule before activation
4. **Pickup Execution**: Collector arrives with ID verification; pickup occurs
5. **Completion**: Giver inputs final amounts, types, and payment details
6. **Cancellation**: Either party can cancel up to 5 hours before scheduled time

#### Pickup Details Include:
- Pickup person's name and credentials
- Date and time window
- Collection location
- Materials list
- Payment information (if applicable)

### Module 3: Data Analytics and Visualization

Presents actionable insights to encourage engagement and informed decision-making.

#### Three Main Visualizations:

**Interactive Map**
- Shows nearby disposal sites and MRF locations
- Call-to-action: Post recyclables or message disposal hubs

**Recycling Heat Maps**
- Displays high-activity recycling zones
- Shows concentration of initiatives
- Call-to-action: Browse localized posts and initiatives

**Aggregated Analytics**
- Recycling totals (kg collected, items, types)
- Environmental impact numbers
- Community participation metrics
- Call-to-action: Post recyclables, support initiatives, engage in forums

### Module 4: Points System

Gamification layer integrated across all modules to enhance engagement.

#### Point Earning:
- Post interactions and contributions (Module 1)
- Successful pickup transactions (Module 2)
- Activity tracking and analytics engagement (Module 3)
- Prestige and badge achievements (Module 5)

#### Current Use:
- "Reputation Points" or "Prestige Points"
- Display user reliability and account credibility
- Show activity levels on user profiles
- Build community trust

#### Future Use:
- Convert to vouchers and incentives
- Enable revenue model integration

### Module 5: Profile Management

Manages personalized user experience and account verification.

#### Account Verification:
- Users upload government-issued ID
- Admin approval required before full account activation
- New users default to "Giver" role

#### Collector Application:
- Users apply to become collectors
- Submit justifications with document proof
- Admin approval process
- Examples: Business permit for MRF, school ID for academic projects

#### Organization Representation:
- MRFs and NGOs submit business permits or official documents
- Organization name displayed alongside personal account name

#### Features:
- Prestige and badge display
- User history tracking (donations, collections, points)
- Profile editing and statistics viewing
- Verification progress monitoring
- Account preferences and deletion options

## Tech Stack

### Frontend
- React - UI library
- React Router - Client-side routing
- Firebase SDK - Authentication and database
- Axios - HTTP client for API requests
- CSS Modules - Component-scoped styling

### Backend
- Node.js - JavaScript runtime
- Express.js - Web application framework
- Firebase - Authentication, Firestore database, storage
- Firebase Admin SDK - Server-side operations
- Multer - File upload handling
- Bcryptjs - Password hashing
- JWT - Token-based authentication
- Express Validator - Input validation
- Morgan - HTTP request logging

### Cloud Services
- Firebase Authentication - User auth and management
- Firestore - Real-time NoSQL database
- Firebase Storage - File and image storage
- Google Cloud - Service account and APIs
- Google Maps API - Location services and mapping

### Development Tools
- Nodemon - Auto-restart during development
- ESLint - Code quality linting
- Prettier - Code formatting
- Jest - Testing framework
- Concurrently - Run multiple npm scripts

## Getting Started

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm (v8.0.0 or higher)
- Git
- Firebase account
- Google Cloud account

### Quick Setup

1. Clone Repository

```bash
git clone https://github.com/your-username/recycling-platform-backend.git
cd recycling-platform-backend
```

2. Install Dependencies

```bash
npm install
```

3. Configure Environment

Create .env files for frontend and backend with Firebase and Google API credentials. See DEVELOPER_INSTALLATION.md for detailed setup.

```bash
# Root .env and backend
cp .env.example .env

# Frontend
cp client/.env.example client/.env
```

4. Start Development Servers

```bash
# Option 1: Run both services concurrently
npm run dev

# Option 2: Run services separately
npm run server          # Terminal 1
npm run client          # Terminal 2
```

5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Detailed Setup Guide

For comprehensive setup instructions including Firebase configuration and Google API setup, see DEVELOPER_INSTALLATION.md.

## Project Structure

```
recycling-platform-backend/
├── client/                          # React frontend application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API and Firebase services
│   │   ├── styles/                  # CSS modules
│   │   ├── App.js                   # Root component
│   │   └── index.js                 # Entry point
│   ├── package.json
│   └── .env                         # Frontend config
│
├── config/                          # Configuration
│   ├── firebase.js                  # Firebase admin setup
│   └── serviceAccountKey.json       # Google service account key
│
├── models/                          # Data models
│   ├── User.js
│   ├── Post.js
│   ├── Message.js
│   ├── Pickup.js
│   └── Badge.js
│
├── routes/                          # API routes
│   ├── auth.js
│   ├── posts.js
│   ├── users.js
│   ├── pickups.js
│   └── messages.js
│
├── controllers/                     # Route handlers
│   ├── authController.js
│   ├── postController.js
│   ├── userController.js
│   └── pickupController.js
│
├── middleware/                      # Express middleware
│   ├── authentication.js
│   ├── validation.js
│   └── errorHandler.js
│
├── services/                        # Business logic
│   ├── userService.js
│   ├── postService.js
│   ├── pickupService.js
│   └── pointsService.js
│
├── scripts/                         # Utility scripts
│   └── setup.js
│
├── uploads/                         # File uploads
│   └── temp/
│
├── server.js                        # Backend entry point
├── package.json
├── .env                             # Backend config
├── .gitignore
├── README.md                        # This file
└── DEVELOPER_INSTALLATION.md        # Setup guide
```

## Development

### Available Scripts

#### Backend
```bash
npm run server              # Start backend server
npm run test               # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run clean             # Clear temp uploads
npm run setup             # Run setup script
```

#### Frontend
```bash
npm start --prefix client  # Start React dev server
npm run build --prefix client # Build for production
```

#### Both Services
```bash
npm run dev               # Start backend and frontend concurrently
```

### Git Workflow

1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

2. Commit Changes

```bash
git add .
git commit -m "feat: describe your changes"
```

3. Push to Remote

```bash
git push origin feature/your-feature-name
```

4. Create Pull Request

- Go to GitHub repository
- Create PR from your branch to dev or main
- Request code review
- Merge after approval

### Code Standards

- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic
- Keep functions focused and DRY

## API Endpoints

### Authentication

- POST /auth/register - Register new user
- POST /auth/login - Login user
- POST /auth/logout - Logout user
- POST /auth/refresh - Refresh auth token

### Posts

- GET /posts - Get all posts (with filters)
- GET /posts/:id - Get post details
- POST /posts - Create new post
- PUT /posts/:id - Update post
- DELETE /posts/:id - Delete post
- POST /posts/:id/claim - Claim waste post

### Pickups

- GET /pickups - Get user's pickup schedules
- POST /pickups - Create pickup schedule
- PUT /pickups/:id - Update pickup schedule
- DELETE /pickups/:id - Cancel pickup
- PUT /pickups/:id/complete - Mark pickup as complete

### Messages and Chat

- GET /messages/:postId - Get conversation for post
- POST /messages - Send message
- DELETE /messages/:id - Delete message

### Users

- GET /users/profile - Get current user profile
- PUT /users/profile - Update profile
- POST /users/verify - Submit verification
- POST /users/collector-application - Apply to become collector
- GET /users/statistics - Get user statistics

### Analytics

- GET /analytics/heatmap - Get recycling heat map data
- GET /analytics/aggregated - Get aggregated statistics
- GET /analytics/personal - Get personal environmental impact

## Database Schema

### Users Collection

```javascript
{
  userID: string,
  email: string,
  firstName: string,
  lastName: string,
  profilePicture: string,
  userType: "Giver" | "Collector" | "Admin",
  status: "Verified" | "Pending" | "Rejected",
  isCollector: boolean,
  points: number,
  badges: string[],
  preferredLocations: GeoLocation[],
  joinedDate: timestamp,
  lastActive: timestamp,
  isDeleted: boolean
}
```

### Posts Collection

```javascript
{
  postID: string,
  creatorID: string,
  postType: "Waste" | "Initiative" | "Forum",
  title: string,
  description: string,
  location: GeoLocation,
  wasteType: string[],
  images: string[],
  status: "Active" | "Claimed" | "Completed" | "Closed",
  createdDate: timestamp,
  updatedDate: timestamp,
  likes: number,
  comments: Comment[]
}
```

### Pickups Collection

```javascript
{
  pickupID: string,
  postID: string,
  giverID: string,
  collectorID: string,
  scheduledDate: timestamp,
  scheduledTime: string,
  location: GeoLocation,
  pickupPerson: string,
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled",
  materialsCollected: Material[],
  paymentAmount: number,
  createdDate: timestamp,
  completedDate: timestamp
}
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository on GitHub
2. Create a feature branch from dev
3. Make your changes and test thoroughly
4. Commit with clear messages following conventional commits
5. Push to your fork and create a Pull Request
6. Request code review and address feedback

### Contribution Areas

- Bug fixes and improvements
- Feature implementation
- Documentation enhancement
- UI/UX improvements
- Performance optimization
- Security improvements

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

### Documentation

- Developer Installation Guide - Setup instructions
- API Endpoints - Endpoint reference
- Database Schema - Data models

### Issues and Questions

- Report Bugs: Open an issue on GitHub with the bug label
- Request Features: Use the enhancement label
- Ask Questions: Use the question label

### Contact

- Email: capstone.milk@gmail.com

## Environmental Impact

Every transaction on EcoTayo contributes to a more sustainable future. By connecting waste producers with collectors, we reduce landfill waste, optimize collection routes, and build community awareness about recycling. Join us in making the waste cycle truly circular.

## Acknowledgments

Built by the EcoTayo Development Team as a capstone project to promote circular economy principles and environmental sustainability.

---

Last Updated: October 2025

Version: 1.0.0