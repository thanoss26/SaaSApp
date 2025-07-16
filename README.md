# SaaS Employee Management System

A secure, scalable SaaS employee management system built with Node.js, Express.js, and Supabase. Features role-based access control, organization management, and a beautiful modern UI.

## 🚀 Features

### Core Features
- ✅ User registration & authentication (Supabase Auth)
- ✅ Role-based access control (Admin & Organization Member)
- ✅ Organization creation with unique 6-digit join codes
- ✅ Employee management and profile updates
- ✅ Real-time dashboard with statistics
- ✅ Secure API with JWT authentication
- ✅ Row Level Security (RLS) policies
- ✅ Modern, responsive UI

### User Types
- **Admin**: Can manage organizations, employees, and generate join codes
- **Organization Member**: Can view/edit own profile and access organization data

### Security Features
- Supabase Row Level Security (RLS)
- JWT token authentication
- Role-based API access
- Input validation and sanitization
- Rate limiting
- CORS protection

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Modern CSS with Flexbox/Grid
- **Icons**: Font Awesome
- **Fonts**: Inter (Google Fonts)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd saas-employee-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project settings and copy the following:
   - Project URL
   - Anon (public) key
   - Service role key

### 4. Configure Environment Variables

1. Copy the environment template:
```bash
cp env.example .env
```

2. Update `.env` with your Supabase credentials:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### 5. Set Up Database

1. Go to your Supabase project SQL editor
2. Copy and paste the contents of `database/schema.sql`
3. Execute the SQL to create all tables and policies

### 6. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 📊 Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with role and organization info |
| `organizations` | Organization data with join codes |
| `messages` | Internal team chat (optional) |
| `timesheets` | Time tracking (optional) |

### Key Features
- UUID primary keys
- Automatic timestamps
- Foreign key relationships
- Row Level Security (RLS) policies
- Unique 6-digit join codes

## 🔐 Authentication Flow

1. **Registration**: Users sign up with email/password
2. **Role Assignment**: 
   - Emails ending with `@company.com` → Admin role
   - Other emails → Organization Member role
3. **Organization Join**: Members enter 6-digit code to join organization
4. **Login**: JWT-based authentication with role-based access

## 🎨 UI Features

- **Modern Design**: Clean, professional interface
- **Responsive**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Beautiful gradient backgrounds
- **Interactive Elements**: Hover effects, animations
- **Toast Notifications**: Real-time feedback
- **Modal Dialogs**: Clean overlay interactions

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/join-organization` - Join organization
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - User logout

### Organizations
- `GET /api/organizations` - Get organization details
- `POST /api/organizations` - Create organization (admin)
- `PUT /api/organizations/:id` - Update organization (admin)
- `POST /api/organizations/:id/regenerate-join-code` - Regenerate join code
- `GET /api/organizations/:id/members` - Get organization members
- `GET /api/organizations/:id/stats` - Get organization statistics

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/search/:query` - Search users
- `GET /api/users/:id/activity` - Get user activity
- `GET /api/users/stats/overview` - Get user statistics

## 🔒 Security Features

### Row Level Security (RLS)
- Users can only access their own profile
- Organization members can only access their organization's data
- Admins have broader access within their organization

### API Security
- JWT token validation
- Role-based middleware
- Input validation with express-validator
- Rate limiting
- CORS protection
- Helmet.js security headers

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://yourdomain.com
```

### Deployment Options
- **Heroku**: Easy deployment with Git integration
- **Vercel**: Serverless deployment
- **DigitalOcean**: App Platform or Droplet
- **AWS**: EC2 or Elastic Beanstalk

## 🔧 Development

### Project Structure
```
saas-employee-management/
├── config/
│   └── supabase.js          # Supabase configuration
├── database/
│   └── schema.sql           # Database schema
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── organizations.js     # Organization routes
│   └── users.js             # User routes
├── public/
│   ├── index.html           # Main HTML file
│   ├── styles.css           # CSS styles
│   └── app.js               # Frontend JavaScript
├── server.js                # Express server
├── package.json             # Dependencies
└── README.md                # Documentation
```

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests (when implemented)
```

## 🧪 Testing

To run tests (when implemented):
```bash
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Features

- [ ] Stripe billing integration
- [ ] Timesheet system
- [ ] Email notifications
- [ ] File uploads
- [ ] Advanced analytics
- [ ] Multi-organization support
- [ ] Mobile app
- [ ] API rate limiting dashboard
- [ ] Audit logs
- [ ] Two-factor authentication

## 📊 Performance

- Optimized database queries with indexes
- Efficient RLS policies
- Minimal API calls with data aggregation
- Responsive design for all devices
- Fast loading with CDN resources

---

**Built with ❤️ using modern web technologies** 