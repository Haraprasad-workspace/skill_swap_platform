# Skill Swap Platform

A platform where users can connect and swap skills with each other. Users can offer skills they can teach and request to learn skills from others.

## Features

- **User Authentication**: JWT-based login and registration system
- **Profile Management**: Public/private profiles with editable information
- **Skill Swapping**: Request and manage skill exchange proposals
- **Notifications**: Track received and sent swap requests
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Admin Panel**: Comprehensive admin dashboard with user management, analytics, and notifications

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens
- **File Upload**: Multer + Cloudinary
- **Frontend**: EJS templates with Tailwind CSS
- **Password Hashing**: bcrypt

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skill-swap-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGO_URL=mongodb://localhost:27017/skill_swap_platform
   MYSECRETKEY=your_jwt_secret_key_here_change_in_production
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   NODE_ENV=development
   ```

4. **Start the application**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

6. **Set up admin user** (after registering your first user)
   ```bash
   npm run create-admin
   ```
   This will make the first registered user an admin. Access the admin panel at `http://localhost:3000/admin`

## Usage

### For Users

1. **Registration**: Create an account with your email and password
2. **Profile Setup**: Add your skills, location, and availability
3. **Browse Users**: View other users' profiles on the home page
4. **Request Swaps**: Send skill swap requests to other users
5. **Manage Requests**: Accept or reject incoming swap requests
6. **Privacy Control**: Make your profile public or private

### Workflow

1. **Home Page**: Shows all public users in card format
2. **Authentication**: Login/register when accessing protected features
3. **Profile Viewing**: Click on user cards to view detailed profiles
4. **Skill Requests**: Request skill swaps with specific skills offered/wanted
5. **Notifications**: Manage all swap requests in the notifications page

### For Administrators

1. **Admin Dashboard**: Overview of platform statistics and recent activity
2. **User Management**: View, ban/unban users, and manage admin privileges
3. **Request Management**: Monitor and delete suspicious swap requests
4. **Notifications**: Send alerts to users (all, active, banned, or specific users)
5. **Analytics**: View detailed statistics and download reports
6. **Data Export**: Download user and request data as CSV files

## API Endpoints

### User Endpoints
- `GET /` - Home page with user listings
- `GET /login` - Login page
- `POST /login` - Login authentication
- `GET /register` - Registration page
- `POST /register` - User registration
- `GET /profile` - User's own profile
- `GET /profile/:userId` - View specific user profile
- `GET /profile/edit` - Edit profile page
- `POST /profile/edit` - Update profile
- `GET /request/:userId` - Skill swap request form
- `POST /request/:userId` - Submit swap request
- `GET /notifications` - View all requests
- `POST /notifications/accept/:requestId` - Accept request
- `POST /notifications/reject/:requestId` - Reject request
- `GET /logout` - Logout user

### Admin Endpoints
- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management
- `POST /admin/users/:userId/ban` - Ban user
- `POST /admin/users/:userId/unban` - Unban user
- `POST /admin/users/:userId/make-admin` - Make user admin
- `POST /admin/users/:userId/remove-admin` - Remove admin privileges
- `GET /admin/requests` - Request management
- `POST /admin/requests/:requestId/delete` - Delete request
- `GET /admin/notifications` - Notification management
- `POST /admin/notifications/create` - Create notification
- `POST /admin/notifications/:notificationId/delete` - Delete notification
- `GET /admin/analytics` - Analytics and reports
- `GET /admin/download/users` - Download users CSV
- `GET /admin/download/requests` - Download requests CSV

## Database Models

### User Model
- Basic info (name, email, password)
- Profile details (location, availability, photo)
- Skills (offered and wanted)
- Privacy settings (public/private)

### SwapRequest Model
- Request details (from/to users)
- Skills offered and wanted
- Status tracking (pending/accepted/rejected/completed)
- Timestamps

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- HTTP-only cookies
- Input validation and sanitization
- Private profile protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License. 