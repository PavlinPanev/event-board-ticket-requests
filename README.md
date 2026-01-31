# Event Board + Ticket Requests

A modern web platform for managing events and ticket requests built with **Vite**, **Vanilla JavaScript**, **Bootstrap**, and **Supabase**.

## 🌐 Live URL

[Deployment Link - Coming Soon](https://placeholder-url.com)

## ✨ Features

- 📅 **Browse Events** - Discover published events with search and filtering
- 🎫 **Request Tickets** - Users can submit ticket requests for events
- ✏️ **Manage Events** - Create, edit, and publish events with assets
- 📊 **Track Requests** - View status of your ticket requests
- 🔐 **Admin Panel** - Approve/reject requests and moderate content
- 🔒 **Secure Auth** - Email/password authentication via Supabase
- 📱 **Responsive** - Mobile-friendly Bootstrap 5 design

## 🛠️ Tech Stack

- **Frontend**: Vite + Vanilla JavaScript (ES6 modules)
- **Styling**: Bootstrap 5.3 (CDN)
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Build Tool**: Vite
- **Package Manager**: npm

## 📋 Project Structure

```
event-board-ticket-requests/
├── src/
│   ├── index.html                 # Events list page
│   ├── event-details.html         # Event details page
│   ├── create-event.html          # Create/edit event page
│   ├── my-requests.html           # User requests list
│   ├── admin.html                 # Admin panel
│   ├── login.html                 # Login page
│   ├── register.html              # Registration page
│   │
│   ├── pages/                     # Page initialization modules
│   ├── components/                # Reusable components
│   ├── services/                  # API & Supabase integration
│   ├── utils/                     # Helper functions
│   └── styles/                    # CSS stylesheets
│
├── migrations/                    # SQL migrations
├── docs/
│   ├── spec.md                    # Technical specification
│   └── architecture.md            # Architecture documentation
├── .github/
│   └── copilot-instructions.md    # Development guidelines
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies & scripts
└── vite.config.js                 # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account (free tier available at https://supabase.com)

### 1. Clone Repository

```bash
git clone <repository-url>
cd event-board-ticket-requests
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get credentials:**
1. Create a project on [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy the **Project URL** and **anon public key**

### 4. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173/` with hot reloading enabled.

### 5. Build for Production

```bash
npm run build
```

Optimized build output goes to `/dist` folder.

### 6. Preview Production Build Locally

```bash
npm run preview
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |

## 🗄️ Database Setup

1. Create required tables in Supabase (see [docs/spec.md](docs/spec.md))
2. Run migrations from `migrations/` folder in Supabase SQL editor
3. Enable Row Level Security (RLS) for tables
4. Create RLS policies (templates in migration files)

### Tables

- `profiles` - User profiles (extends auth.users)
- `venues` - Event venues
- `events` - Event listings
- `ticket_requests` - Ticket request submissions
- `event_assets` - Event images and documents

See [docs/spec.md](docs/spec.md) for detailed schema.

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Publishable API key (safe for browser) | `sb_publishable_xxx` or `eyJhbGc...` |

**⚠️ Never commit `.env` file** - It contains secrets. Use `.env.example` as template.

## 🌍 Deployment

### Deploy to Netlify/Vercel

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload `/dist` folder to your hosting:**

   **Netlify:**
   - Drag and drop `/dist` folder to netlify.com
   - Or connect GitHub repo for auto-deployment
   - Build command: `npm run build`
   - Publish directory: `dist`

   **Vercel:**
   - Import project from GitHub
   - Framework: `Other`
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Set Environment Variables:**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to hosting provider's environment settings

### Deploy to Self-Hosted Server

1. Build the project: `npm run build`
2. Copy `/dist` folder contents to your web server
3. Set environment variables on server
4. Serve static files via nginx/Apache

## 🔐 Security

- **Authentication**: Supabase built-in auth (email/password)
- **Authorization**: Row-level security (RLS) policies on database
- **Secrets**: Environment variables stored in `.env` (never committed)
- **Storage**: Private/public bucket rules for uploaded assets

See `.github/copilot-instructions.md` for RLS policy templates.

## 📚 Documentation

- [Technical Specification](docs/spec.md) - Features, user roles, database schema
- [Architecture Guide](docs/architecture.md) - Folder structure, patterns, conventions
- [Development Guidelines](.github/copilot-instructions.md) - Code style, best practices

## 🛠️ Development Guidelines

### Code Style

- **Modules**: ES6 `import`/`export`
- **Naming**: `kebab-case` files, `camelCase` functions
- **Error Handling**: Try-catch blocks, user-friendly error messages
- **Loading States**: Show UI feedback during async operations
- **No Inline Scripts**: All logic in separate JS files

### Adding Features

1. Create HTML page in `src/`
2. Create page module in `src/pages/`
3. Create components in `src/components/`
4. Create services in `src/services/`
5. Add error handling and loading states
6. Commit with semantic message

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed conventions.

## 🧪 Testing & Evaluation

### Role Toggle Feature (For Examiners)

The application includes a **built-in role toggle** for easy testing of admin vs. user permissions:

1. **Login** to the application
2. **Click "Account"** dropdown in the navbar (top-right)
3. **View current role** - Shows as "user" or "admin" (color-coded)
4. **Click "Toggle Role"** to switch between user and admin
5. **Page reloads** automatically to apply permission changes

**What you can test:**
- **As User**: Browse events, submit ticket requests, view your requests
- **As Admin**: Access Admin Panel, approve/reject requests, manage all events

**No SQL knowledge required** - Switch roles with one click!

See [docs/DEBUG-ADMIN-ACCESS.md](docs/DEBUG-ADMIN-ACCESS.md) for alternative SQL methods.

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Modern mobile browsers

## 🐛 Troubleshooting

### Issue: `VITE_SUPABASE_URL is not defined`

**Solution**: Make sure `.env` file exists with correct Supabase credentials.

```bash
cp .env.example .env
# Edit .env with your credentials
```

### Issue: Module import errors

**Solution**: Check relative paths in imports. Should use `../` to navigate:

```javascript
// ✅ Correct
import { renderNavbar } from '../components/navbar.js';

// ❌ Wrong
import { renderNavbar } from './components/navbar.js';
```

### Issue: Supabase connection fails

**Solution**: Verify credentials in `.env`:
- URL should include `.supabase.co` domain
- Publishable key (ANON_KEY) should be either:
  - New format: `sb_publishable_` followed by random characters
  - Legacy format: JWT string starting with `eyJ`
- Check that Supabase project is active

## 📞 Support

- Vite Docs: https://vitejs.dev
- Supabase Docs: https://supabase.com/docs
- Bootstrap Docs: https://getbootstrap.com/docs

## 📄 License

This project is open source and available under the MIT License.

---

**Last Updated**: January 18, 2026
