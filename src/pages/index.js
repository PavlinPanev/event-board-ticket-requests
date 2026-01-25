import { renderNavbar } from '../components/navbar.js';
import { getPublishedEvents } from '../services/eventsService.js';
import { renderEventCards } from '../components/eventCard.js';
import { escapeHtml } from '../utils/helpers.js';

// Store all events for client-side filtering
let allEvents = [];

/**
 * Filter events by search query
 * @param {Array} events - All events
 * @param {string} query - Search query
 * @returns {Array} Filtered events
 */
function filterEvents(events, query) {
    if (!query || query.trim() === '') {
        return events;
    }
    
    const lowerQuery = query.toLowerCase();
    return events.filter(event => {
        const title = (event.title || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const venueName = (event.venue?.name || '').toLowerCase();
        
        return title.includes(lowerQuery) || 
               description.includes(lowerQuery) || 
               venueName.includes(lowerQuery);
    });
}

/**
 * Render search bar
 * @returns {string} HTML string
 */
function renderSearchBar() {
    return `
        <div class="row mb-4">
            <div class="col-md-6 offset-md-3">
                <div class="input-group">
                    <span class="input-group-text">
                        <i class="bi bi-search"></i>
                    </span>
                    <input 
                        type="text" 
                        id="search-input" 
                        class="form-control" 
                        placeholder="Search events by title, description, or venue..."
                        aria-label="Search events"
                    >
                </div>
            </div>
        </div>
    `;
}

/**
 * Render events with search bar
 * @param {Array} events - Filtered events to display
 * @param {HTMLElement} container - Container element
 */
function renderEventsPage(events, container) {
    const searchBar = renderSearchBar();
    const eventCards = renderEventCards(events);
    
    container.innerHTML = `
        ${searchBar}
        <div id="events-container">
            ${eventCards}
        </div>
    `;
    
    // Attach search listener
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        const filtered = filterEvents(allEvents, query);
        const eventsContainer = document.getElementById('events-container');
        eventsContainer.innerHTML = renderEventCards(filtered);
    });
}

/**
 * Show loading state
 * @param {HTMLElement} container - Container element
 */
function showLoading(container) {
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted mt-3">Loading events...</p>
        </div>
    `;
}

/**
 * Show error state
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 */
function showError(container, message) {
    container.innerHTML = `
        <div class="alert alert-danger">
            <h5><i class="bi bi-exclamation-triangle"></i> Failed to load events</h5>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

/**
 * Initialize index page (events list)
 */
async function init() {
    try {
        renderNavbar('index');
        
        const contentArea = document.getElementById('content');
        
        // Show loading state
        showLoading(contentArea);
        
        // Fetch events with error handling
        const { data: events, error } = await getPublishedEvents();
        
        if (error) {
            showError(contentArea, error.message);
            return;
        }
        
        // Store events for filtering
        allEvents = events;
        
        // Render events with search
        renderEventsPage(events, contentArea);
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        const contentArea = document.getElementById('content');
        showError(contentArea, 'An unexpected error occurred. Please try again later.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
