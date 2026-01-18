# Event Board + Ticket Requests - Setup Guide

## Project Structure

```
event-board-ticket-requests/
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies & scripts
├── README.md                   # This file
│
├── docs/
│   ├── spec.md                 # Technical specification
│   └── architecture.md         # Architecture documentation
│
└── src/
    ├── index.html              # Events list page
    ├── event-details.html      # Event details page
    ├── create-event.html       # Create/edit event page
    ├── my-requests.html        # User's ticket requests
    ├── admin.html              # Admin panel
    ├── login.html              # Login page
    ├── register.html           # Registration page
    │
    ├── pages/
    │   ├── index.js            # Events list logic
    │   ├── event-details.js    # Event details logic
    │   ├── create-event.js     # Create event logic
    │   ├── my-requests.js      # My requests logic
    │   ├── admin.js            # Admin panel logic
    │   ├── login.js            # Login logic
    │   └── register.js         # Registration logic
    │
    ├── components/
    │   └── navbar.js           # Shared navbar component
    │
    └── styles/
        └── index.css           # Global styles
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173/` with hot module reloading.

### 3. Build for Production

```bash
npm run build
```

Optimized build output goes to `/dist` folder with organized structure:

```
dist/
├── index.html              # Events list page
├── event-details.html      # Event details page
├── create-event.html       # Create event page
├── my-requests.html        # My requests page
├── admin.html              # Admin panel page
├── login.html              # Login page
├── register.html           # Register page
│
├── js/
│   ├── index.js            # Events list module
│   ├── event-details.js    # Event details module
│   ├── create-event.js     # Create event module
│   ├── my-requests.js      # My requests module
│   ├── admin.js            # Admin module
│   ├── login.js            # Login module
│   ├── register.js         # Register module
│   └── *.js                # Shared chunks
│
├── css/
│   └── index.*.css         # Global styles
│
└── images/
    └── *                   # Optimized images
```

### 4. Preview Production Build

```bash
npm run preview
```

## Key Features

### Multi-Page Architecture
- **Separate HTML files** for each page (index, event-details, create-event, etc.)
- **Vite multi-entry** configuration for each page
- **Automatic reloading** on file changes during development

### Shared Navbar Component
- Single `navbar.js` component used on all pages
- Receives `currentPage` parameter to highlight active link
- Consistent navigation across the entire app
- Responsive Bootstrap navbar with dropdown menu

### Per-Page Modules
Each HTML page loads its own JavaScript module:
- `index.html` → `/pages/index.js`
- `event-details.html` → `/pages/event-details.js`
- `create-event.html` → `/pages/create-event.js`
- `my-requests.html` → `/pages/my-requests.js`
- `admin.html` → `/pages/admin.js`
- `login.html` → `/pages/login.js`
- `register.html` → `/pages/register.js`

### Bootstrap Integration
- Bootstrap 5.3 via CDN
- Responsive grid system
- Pre-styled components (navbar, forms, alerts, buttons)
- Mobile-friendly layout

### Page Initialization Pattern

Each page module follows the same pattern:

```javascript
import { renderNavbar } from './components/navbar.js';

async function init() {
    // 1. Render navbar
    renderNavbar('page-id');
    
    // 2. Get content area
    const contentArea = document.getElementById('content');
    
    // 3. Show loading state
    contentArea.innerHTML = '<p class="text-muted">Loading...</p>';
    
    // 4. TODO: Fetch data and render content
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

## Navigation Links

All pages are accessible via the navbar:

- **Events** → `/index.html`
- **Create Event** → `/create-event.html`
- **My Requests** → `/my-requests.html`
- **Admin** → `/admin.html`
- **Account Dropdown**
  - Login → `/login.html`
  - Register → `/register.html`
  - Logout → Calls logout logic

## Next Steps

1. **Implement Page Components**: Fill in TODO placeholders in each page module
2. **Add API Services**: Create `/src/services/` for API calls
3. **Add Form Components**: Create reusable form components in `/src/components/`
4. **Add Utilities**: Create helper functions in `/src/utils/`
5. **Add Authentication**: Implement login/logout logic
6. **Connect Database**: Wire up Supabase or your backend
7. **Add Styling**: Expand `/src/styles/` with component-specific CSS

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Modern mobile browsers

## Tips

- Use ES6 module syntax (`import`/`export`) throughout
- Keep components stateless and pure
- Use `renderNavbar(pageName)` on every page
- Check browser console for errors during development
- Use Bootstrap classes for styling to minimize custom CSS
