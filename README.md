# Brand Management Application

A full-stack web application built with React frontend and Express.js backend for managing brands, user allocations, and data export functionality.

## Features

### Admin Dashboard
- **Brand Management**: Add, edit, and delete brands with master outlet IDs
- **User Allocation**: Allocate brands to users and manage permissions
- **Data Export**: Export brand-wise data and bulk data across all brands
- **Data View**: View login data with filtering capabilities

### User Dashboard
- **Data View**: View allocated brand data with date filtering
- **Data Export**: Download personal data based on allocated brands

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite** database for data storage
- **JWT** authentication
- **CSV export** functionality
- **bcryptjs** for password hashing

### Frontend
- **React 18** with hooks
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **Axios** for API calls
- **React Datepicker** for date selection

## Project Structure

```
brand-management-app/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   ├── .env                   # Environment variables
│   ├── scripts/
│   │   └── init-db.js         # Database initialization
│   ├── routes/                # API routes
│   │   ├── auth.js           # Authentication routes
│   │   ├── brands.js         # Brand management
│   │   ├── users.js          # User management
│   │   ├── data.js           # Data retrieval
│   │   └── export.js         # CSV export routes
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── utils/
│       └── database.js        # Database utilities
├── frontend/
│   ├── package.json          # Frontend dependencies
│   ├── .env                  # Environment variables
│   ├── public/
│   │   └── index.html        # HTML template
│   └── src/
│       ├── index.js          # React entry point
│       ├── App.js            # Main App component
│       ├── App.css           # Global styles
│       ├── contexts/
│       │   └── AuthContext.js # Authentication context
│       ├── components/       # Reusable components
│       │   ├── ProtectedRoute.js
│       │   ├── BrandManagement.js
│       │   ├── UserAllocation.js
│       │   ├── DataExport.js
│       │   ├── DataView.js
│       │   ├── UserDataView.js
│       │   └── UserDataExport.js
│       └── pages/            # Page components
│           ├── Login.js
│           ├── AdminDashboard.js
│           └── UserDashboard.js
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd brand-management-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   npm run init-db
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

The backend will be running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd brand-management-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

The frontend will be running on `http://localhost:3000`

## Default Users

The application comes with pre-configured demo accounts:

- **Admin User**:
  - Username: `admin`
  - Password: `admin123`
  - Role: Admin (full access)

- **Regular User**:
  - Username: `user1`
  - Password: `user123`
  - Role: User (limited access)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

### Brands
- `GET /api/brands` - Get all brands (admin sees all, users see allocated)
- `POST /api/brands` - Create brand (admin only)
- `PUT /api/brands/:id` - Update brand (admin only)
- `DELETE /api/brands/:id` - Delete brand (admin only)

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user details
- `POST /api/users/:userId/allocate/:brandId` - Allocate brand to user
- `DELETE /api/users/:userId/allocate/:brandId` - Remove allocation
- `GET /api/users/me/allocated-brands` - Get current user's allocated brands

### Data
- `GET /api/data/login-logs` - Get login data with filtering
- `GET /api/data/daily-summary` - Get daily summary
- `GET /api/data/brand-summary` - Get brand summary

### Export
- `GET /api/export/daily-login/:brandId` - Export daily login data for a brand
- `GET /api/export/all-brands` - Export all brands data
- `GET /api/export/my-data` - Export current user's data

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `password` - Hashed password
- `role` - 'admin' or 'user'
- `email` - User email
- `created_at` - Creation timestamp

### Brands Table
- `id` - Primary key
- `brand_name` - Brand name
- `master_outlet_id` - Master outlet identifier
- `created_by` - Admin user ID who created the brand
- `created_at` - Creation timestamp

### User Allocations Table
- `id` - Primary key
- `user_id` - User ID
- `brand_id` - Brand ID
- `allocated_by` - Admin user ID who allocated
- `created_at` - Allocation timestamp

### Login Logs Table
- `id` - Primary key
- `store_id` - Store identifier
- `actual_client_store_id` - Client store ID
- `store_manager_name` - Manager name
- `store_manager_number` - Manager phone number
- `login_type` - 'parent' or 'team member'
- `login_date` - Date of login
- `brand_id` - Associated brand ID
- `created_at` - Record creation timestamp

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with bcryptjs
- Protected API routes
- Input validation and sanitization

## CSV Export Format

Exported data includes the following columns:
- Brand Name
- Master Outlet ID
- Store ID
- Actual Client Store ID
- Store Manager Name
- Store Manager Number
- Login Type (Parent/Team Member)
- Login Date

## Usage Examples

### Admin Workflow
1. Login as admin
2. Create new brands with master outlet IDs
3. Allocate brands to users
4. Export data by brand or in bulk
5. View comprehensive data analytics

### User Workflow
1. Login as regular user
2. View data for allocated brands only
3. Filter data by date range
4. Export personal data

## Future Enhancements

- User registration functionality
- Advanced analytics and reporting
- Data visualization with charts
- Email notifications
- Bulk user import/export
- Advanced filtering options
- API rate limiting
- Database migration support

## Contributing

This project is created by MiniMax Agent for demonstration purposes. For improvements or issues, please refer to the code structure and documentation provided.

## License

MIT License - feel free to use and modify for your own projects.