import { renderNavbar } from '../components/navbar.js';
import { getPublishedEvents } from '../services/eventsService.js';
import { renderEventCards } from '../components/eventCard.js';
import { escapeHtml } from '../utils/helpers.js';
import { getEventAssets, getAssetUrl } from '../services/storageService.js';

// Store all events for client-side filtering
let allEvents = [];

/**
 * Enrich events with thumbnail URLs from their first image asset
 * @param {Array} events - Array of events
 * @returns {Promise<Array>} Events with thumbnail_url property
 */
async function enrichEventsWithThumbnails(events) {
    if (!events || events.length === 0) {
        return events;
    }
    
    try {
        // Fetch thumbnails for all events in parallel
        const enrichedEvents = await Promise.all(
            events.map(async (event) => {
                try {
                    // Get first image asset for this event
                    const { data: assets } = await getEventAssets(event.id);
                    
                    if (assets && assets.length > 0) {
                        // Find first image asset
                        const firstImage = assets.find(a => a.mime_type && a.mime_type.startsWith('image/'));
                        
                        if (firstImage) {
                            // Get public URL for the image
                            const { data: url } = await getAssetUrl(firstImage.file_path);
                            return { ...event, thumbnail_url: url };
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to fetch thumbnail for event ${event.id}:`, error);
                }
                
                return event;
            })
        );
        
        return enrichedEvents;
    } catch (error) {
        console.error('Failed to enrich events with thumbnails:', error);
        return events; // Return events without thumbnails on error
    }
}

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
        
        // Enrich events with thumbnail URLs
        const eventsWithThumbnails = await enrichEventsWithThumbnails(events);
        
        // Store events for filtering
        allEvents = eventsWithThumbnails;
        
        // Render events with search
        renderEventsPage(eventsWithThumbnails, contentArea);
        
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
