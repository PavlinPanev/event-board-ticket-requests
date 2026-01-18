# Architecture - Vite Vanilla Multi-Page Application

## 1. Overview

A Vite-based vanilla JavaScript multi-page application (MPA) using HTML, CSS, and ES6+ modules. Each page has its own HTML file with corresponding JavaScript initialization logic. No framework dependencies—pure vanilla JS with modular architecture.

## 2. Folder Structure

```
src/
├── pages/
│   ├── index.html           # Home / Events list
│   ├── event-detail.html    # Event details page
│   ├── create-event.html    # Create/edit event page
│   ├── ticket-request.html  # Ticket request form
│   ├── my-requests.html     # My requests list
│   ├── admin.html           # Admin panel
│   └── not-found.html       # 404 page
│
├── components/
│   ├── event-card.js        # Reusable event card component
│   ├── event-list.js        # Events list component
│   ├── ticket-form.js       # Ticket request form component
│   ├── navbar.js            # Navigation bar
│   ├── sidebar.js           # Admin sidebar
│   ├── modal.js             # Reusable modal component
│   └── pagination.js        # Pagination component
│
├── services/
│   ├── api.js               # HTTP client and API calls
│   ├── auth.js              # Authentication/user session
│   ├── events.js            # Event-related API calls
│   ├── requests.js          # Ticket request API calls
│   ├── storage.js           # Storage bucket integration
│   └── notifications.js     # Toast/notification service
│
├── utils/
│   ├── helpers.js           # General utility functions
│   ├── validators.js        # Form validation
│   ├── formatters.js        # Date, currency, text formatting
│   ├── constants.js         # App constants and config
│   └── dom.js               # DOM manipulation helpers
│
├── styles/
│   ├── index.css            # Global styles
│   ├── variables.css        # CSS custom properties (colors, spacing)
│   ├── layout.css           # Grid, flexbox layouts
│   ├── components.css       # Component-specific styles
│   ├── forms.css            # Form styles
│   ├── responsive.css       # Media queries
│   └── admin.css            # Admin panel styles
│
└── main.js                  # App entry point (if needed for global setup)
```

## 3. Page Structure Convention

Each HTML page follows this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Details</title>
    
    <!-- Global styles -->
    <link rel="stylesheet" href="../styles/index.css">
    <link rel="stylesheet" href="../styles/components.css">
    <link rel="stylesheet" href="../styles/responsive.css">
    <!-- Page-specific styles (if needed) -->
    <link rel="stylesheet" href="../styles/event-detail.css">
</head>
<body>
    <!-- Navigation -->
    <nav id="navbar"></nav>
    
    <!-- Main content -->
    <main id="app">
        <!-- Page content renders here -->
    </main>
    
    <!-- Modals/Alerts -->
    <div id="modal-root"></div>
    <div id="notification-root"></div>
    
    <!-- Page initialization script -->
    <script type="module" src="../pages/event-detail.js"></script>
</body>
</html>
```

## 4. Page Initialization Convention

Each page has a corresponding `.js` file with the same name (e.g., `event-detail.html` → `event-detail.js`):

```javascript
// pages/event-detail.js
import { renderNavbar } from '../components/navbar.js';
import { renderEventDetail } from '../components/event-detail.js';
import { getEventById } from '../services/events.js';
import { getCurrentUser } from '../services/auth.js';

/**
 * Initialize page: run on DOMContentLoaded
 */
async function init() {
    try {
        // 1. Render shared components (navbar, etc.)
        renderNavbar();
        
        // 2. Get user session
        const user = await getCurrentUser();
        
        // 3. Extract page parameters (URL search params, route params)
        const eventId = getPageParam('id');
        
        // 4. Fetch required data
        const event = await getEventById(eventId);
        
        // 5. Check permissions (optional)
        if (!event) {
            window.location.href = '/not-found.html';
            return;
        }
        
        // 6. Render page content
        renderEventDetail(event, user);
        
        // 7. Attach event listeners
        attachEventListeners();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        showErrorNotification('Failed to load page');
    }
}

/**
 * Attach page-specific event listeners
 */
function attachEventListeners() {
    document.getElementById('request-btn')?.addEventListener('click', handleRequestClick);
    document.getElementById('edit-btn')?.addEventListener('click', handleEditClick);
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

## 5. Component Convention

Components are reusable, stateless functions that return HTML strings or render to DOM:

```javascript
// components/event-card.js

/**
 * Create event card HTML
 * @param {Object} event - Event data
 * @returns {string} HTML string
 */
export function createEventCard(event) {
    const imageUrl = event.image || '/images/placeholder.jpg';
    const date = new Date(event.starts_at).toLocaleDateString();
    
    return `
        <div class="event-card" data-id="${event.id}">
            <img src="${imageUrl}" alt="${event.title}" class="event-card__image">
            <div class="event-card__content">
                <h3 class="event-card__title">${escapeHtml(event.title)}</h3>
                <p class="event-card__date">${date}</p>
                <p class="event-card__venue">${escapeHtml(event.venue.name)}</p>
            </div>
        </div>
    `;
}

/**
 * Render event cards to container
 * @param {Array} events - Events array
 * @param {Element} container - Target DOM element
 * @param {Function} onCardClick - Click handler
 */
export function renderEventCards(events, container, onCardClick) {
    container.innerHTML = events.map(createEventCard).join('');
    
    container.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', () => {
            const eventId = card.dataset.id;
            onCardClick(eventId);
        });
    });
}
```

## 6. Service Convention

Services handle API calls, authentication, and external integrations:

```javascript
// services/events.js
import { apiClient } from './api.js';

const API_BASE = '/api/events';

/**
 * Get all published events with optional filters
 * @param {Object} filters - { search, venue_id, limit, offset }
 * @returns {Promise<Array>}
 */
export async function getPublishedEvents(filters = {}) {
    return apiClient.get(API_BASE, { params: filters });
}

/**
 * Get event by ID
 * @param {string} eventId
 * @returns {Promise<Object>}
 */
export async function getEventById(eventId) {
    return apiClient.get(`${API_BASE}/${eventId}`);
}

/**
 * Create new event
 * @param {Object} eventData - { title, description, starts_at, venue_id, status }
 * @returns {Promise<Object>}
 */
export async function createEvent(eventData) {
    return apiClient.post(API_BASE, eventData);
}

/**
 * Update event
 * @param {string} eventId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateEvent(eventId, updates) {
    return apiClient.put(`${API_BASE}/${eventId}`, updates);
}

/**
 * Delete event (admin only)
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(eventId) {
    return apiClient.delete(`${API_BASE}/${eventId}`);
}
```

## 7. Utility Convention

Utilities provide reusable helper functions:

```javascript
// utils/helpers.js

/**
 * Get URL search parameter
 * @param {string} param - Parameter name
 * @returns {string|null}
 */
export function getPageParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

/**
 * Navigate to page
 * @param {string} path - Relative path
 */
export function navigateTo(path) {
    window.location.href = path;
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Deep clone object
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Delay execution (for debouncing, etc.)
 * @param {number} ms
 * @returns {Promise}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 8. API Service Convention

Central HTTP client for all API calls:

```javascript
// services/api.js

class ApiClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    /**
     * Make HTTP request
     * @private
     */
    async request(method, endpoint, data = null, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader(),
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options.params);
    }

    async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }

    getAuthHeader() {
        const token = localStorage.getItem('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
}

export const apiClient = new ApiClient();
```

## 9. Styling Convention

- **index.css**: Global resets and base styles
- **variables.css**: CSS custom properties (colors, spacing, fonts)
- **layout.css**: Grid and flexbox utilities
- **components.css**: Shared component styles
- **forms.css**: Form element styles
- **responsive.css**: Mobile-first media queries
- **page-specific.css**: Page-only styles (minimal)

Example BEM naming:
```css
.event-card {
    /* Block */
}

.event-card__image {
    /* Element */
}

.event-card--featured {
    /* Modifier */
}

.event-card:hover {
    /* State */
}
```

## 10. Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        open: true,
    },
});
```

## 11. Development Workflow

1. **Create page**: Add `.html` file in `src/pages/`
2. **Add styles**: Link in page header
3. **Create page init script**: `pages/page-name.js` with `init()` function
4. **Create components**: Reusable rendering functions in `src/components/`
5. **Create services**: API calls in `src/services/`
6. **Add utilities**: Helpers in `src/utils/`
7. **Run dev server**: `npm run dev` (Vite auto-refreshes)
8. **Build for production**: `npm run build`

## 12. Naming Conventions

- **Files**: kebab-case (`event-card.js`, `event-detail.html`)
- **Functions**: camelCase (`getEventById`, `renderEventCard`)
- **CSS classes**: kebab-case with BEM (`event-card__title--active`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_TIMEOUT`)
- **IDs**: kebab-case (`event-list`, `form-submit-btn`)
- **Private functions**: Leading underscore (`_initializeForm()`)
