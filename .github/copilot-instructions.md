# Copilot Instructions - Event Board + Ticket Requests

## Stack & Architecture

**Tech Stack:**
- Vite (build tool)
- Vanilla JavaScript (ES6+ modules)
- Bootstrap 5.3 (CSS framework, via CDN)
- Supabase (Auth, Database, Storage)
- Multi-page app (separate HTML entry points)

**Architecture Pattern:**
- **Pages**: HTML files in `src/` root + corresponding JS modules in `src/pages/`
- **Components**: Reusable rendering functions in `src/components/`
- **Services**: API calls, external integrations in `src/services/`
- **Utils**: Helper functions in `src/utils/`
- **Styles**: Global CSS in `src/styles/`

---

## Folder Structure Conventions

```
src/
├── pages/           # Page initialization modules
├── components/      # Reusable rendering components
├── services/        # API, auth, storage services
├── utils/           # Helper functions, validators
└── styles/          # CSS files
```

**Rules:**
- Each HTML page gets a corresponding `.js` module in `pages/`
- Example: `index.html` → `pages/index.js`
- Components are pure functions, no state management
- Services handle external integrations only
- Utilities are stateless, reusable helpers

---

## Code Style & Module Patterns

### Page Initialization (pages/*.js)

Every page module follows this pattern:

```javascript
import { renderNavbar } from '../components/navbar.js';
import { serviceName } from '../services/serviceName.js';

async function init() {
    try {
        renderNavbar('page-id');
        const contentArea = document.getElementById('content');
        
        // Load data
        const data = await serviceName.getData();
        
        // Render
        renderContent(data);
        attachListeners();
    } catch (error) {
        console.error('Init error:', error);
        showError('Failed to load page');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

### Components (components/*.js)

Components are stateless rendering functions:

```javascript
export function createEventCard(event) {
    return `
        <div class="event-card">
            <h3>${escapeHtml(event.title)}</h3>
        </div>
    `;
}

export function renderEventCards(events, container) {
    container.innerHTML = events.map(createEventCard).join('');
}
```

### Services (services/*.js)

Services encapsulate API logic:

```javascript
import { supabase } from './supabaseClient.js';

export async function fetchEvents() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*');
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
```

### Utilities (utils/*.js)

Small, reusable helper functions:

```javascript
export function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return text.replace(/[&<>]/g, m => map[m]);
}
```

---

## HTML Best Practices

**Rules:**
- NO inline scripts in HTML (except type="module" for page entry)
- All logic in separate `.js` files
- Use semantic HTML5 elements
- Bootstrap classes for styling, minimal custom CSS
- Always include `#navbar-container` for shared navbar
- Always include `#content` div for page content

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="/styles/index.css">
</head>
<body>
    <nav id="navbar-container"></nav>
    <main>
        <div class="container">
            <div id="content"></div>
        </div>
    </main>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="/pages/page-name.js"></script>
</body>
</html>
```

---

## Error Handling & Loading States

**Every async operation must include:**

1. **Try-catch blocks** - Always catch and log errors
2. **Loading UI state** - Show "Loading..." while fetching
3. **Error UI state** - Show error message if fetch fails
4. **User feedback** - Toast notifications or alerts for user actions

**Pattern:**

```javascript
async function loadData() {
    try {
        // Show loading state
        contentArea.innerHTML = '<p class="text-muted">Loading...</p>';
        
        // Fetch data
        const data = await apiCall();
        
        // Render success
        renderContent(data);
    } catch (error) {
        console.error('Load error:', error);
        contentArea.innerHTML = '<div class="alert alert-danger">Failed to load data</div>';
    }
}
```

**Loading States:**
- Show spinner or "Loading..." text
- Disable buttons during async operations
- Use `class="loading"` + `opacity: 0.6; pointer-events: none;`

**Error States:**
- Display Bootstrap alert: `<div class="alert alert-danger">`
- Log full error to console for debugging
- Show user-friendly message
- Provide retry button if applicable

---

## Database Logic Requirements

When adding database operations:

### 1. Create SQL Migration File

Place in `migrations/` folder, named: `YYYY-MM-DD_feature_description.sql`

Example:
```sql
-- Create events table
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  starts_at timestamp not null,
  venue_id uuid references venues(id),
  created_by uuid references auth.users(id),
  status text check (status in ('draft', 'published', 'archived')),
  created_at timestamp default now()
);
```

### 2. Define RLS Policies

Always include row-level security policies:

```sql
-- Enable RLS
alter table events enable row level security;

-- Anyone can view published events
create policy "anyone_can_view_published" on events
  for select using (status = 'published' or auth.uid() = created_by);

-- Only owner/admin can edit
create policy "owner_can_edit" on events
  for update using (auth.uid() = created_by or auth.jwt() ->> 'user_role' = 'admin');

-- Only owner/admin can delete
create policy "owner_can_delete" on events
  for delete using (auth.uid() = created_by or auth.jwt() ->> 'user_role' = 'admin');
```

### 3. Create Service Function

Create service in `src/services/` for the new table:

```javascript
// src/services/eventsService.js
import { supabase } from './supabaseClient.js';

export async function getPublishedEvents(filters = {}) {
    try {
        let query = supabase.from('events').select('*');
        
        if (filters.search) {
            query = query.ilike('title', `%${filters.search}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Fetch events error:', error);
        throw error;
    }
}
```

---

## Commit Message Convention

After any change, follow this format:

```
<type>: <subject>

<optional body explaining why/what>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Build, deps, config changes
- `docs:` - Documentation
- `style:` - Formatting, no logic change
- `refactor:` - Code reorganization
- `perf:` - Performance improvement
- `test:` - Tests

**Examples:**

```
feat: add event creation form with validation
fix: resolve navbar active link highlighting issue
chore: update Supabase dependencies to latest version
docs: add RLS policy documentation
refactor: extract event card rendering to component
```

---

## Import Patterns

**Always use explicit relative paths:**

```javascript
// ✅ Good
import { renderNavbar } from '../components/navbar.js';
import { getEvents } from '../services/eventsService.js';

// ❌ Bad
import { renderNavbar } from './components/navbar.js';
import { getEvents } from './services/eventsService.js';
```

---

## Naming Conventions

- **Files**: `kebab-case` (`event-card.js`, `auth-service.js`)
- **Functions**: `camelCase` (`renderEventCard`, `getEventById`)
- **Classes**: `PascalCase` (`EventCard`, `AuthService`)
- **CSS classes**: `kebab-case` + BEM (`event-card__title--active`)
- **IDs**: `kebab-case` (`event-list`, `form-submit-btn`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_FILE_SIZE`, `API_TIMEOUT`)

---

## Environment Variables

Keep secrets in `.env` (not committed):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Reference in code:
```javascript
const url = import.meta.env.VITE_SUPABASE_URL;
```

---

## Common Pitfalls to Avoid

❌ **Don't:**
- Inline event listeners in HTML
- Put business logic in components
- Create global variables
- Use `var` keyword
- Make API calls in component functions
- Skip error handling
- Leave console.log statements in production code
- Mix concerns (e.g., rendering + fetching in same function)

✅ **Do:**
- Use ES6 modules
- Keep components pure and simple
- Handle all error cases
- Use async/await for async operations
- Separate concerns (data fetching, rendering, UI state)
- Use consistent naming
- Document complex logic with comments
- Test on mobile viewport

---

## Quick Checklist for New Features

- [ ] Created HTML page in `src/`
- [ ] Created page module in `src/pages/`
- [ ] Created component(s) in `src/components/` (if reusable)
- [ ] Created service(s) in `src/services/` (if external calls)
- [ ] Added error handling (try-catch)
- [ ] Added loading UI state
- [ ] Added error UI state
- [ ] Navbar renders on page
- [ ] Navigation links work
- [ ] Bootstrap responsive classes used
- [ ] No inline scripts in HTML
- [ ] All imports use relative paths
- [ ] No console.log left behind
- [ ] Commit message follows convention

---

## Resources

- **Vite Docs**: https://vitejs.dev
- **Supabase Docs**: https://supabase.com/docs
- **Bootstrap Docs**: https://getbootstrap.com/docs
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security
- **ES6 Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
