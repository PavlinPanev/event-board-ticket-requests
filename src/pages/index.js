import { renderNavbar } from '../components/navbar.js';
import { getPublishedEvents } from '../services/eventsService.js';
import { formatDate, escapeHtml, truncate } from '../utils/helpers.js';

/**
 * Render event card
 * @param {Object} event - Event object
 * @returns {string} HTML string
 */
function createEventCard(event) {
    const venue = event.venue || {};
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(event.title)}</h5>
                    <p class="card-text text-muted small">
                        <i class="bi bi-calendar-event"></i> ${formatDate(event.starts_at)}
                    </p>
                    <p class="card-text text-muted small">
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(venue.name || 'TBA')}
                    </p>
                    ${event.description ? `<p class="card-text">${escapeHtml(truncate(event.description, 100))}</p>` : ''}
                </div>
                <div class="card-footer bg-white border-top-0">
                    <a href="/event-details.html?id=${event.id}" class="btn btn-primary btn-sm w-100">View Details</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render events list
 * @param {Array} events - Array of events
 * @param {HTMLElement} container - Container element
 */
function renderEvents(events, container) {
    if (events.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <h5>No events found</h5>
                <p>There are currently no published events. Check back later!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="row">
            ${events.map(createEventCard).join('')}
        </div>
    `;
}

/**
 * Initialize index page (events list)
 */
async function init() {
    try {
        renderNavbar('index');
        
        // Page initialization
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<p class="text-muted">Loading events...</p>';
        
        // Fetch events with error handling
        const { data: events, error } = await getPublishedEvents();
        
        if (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Failed to load events</h5>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
            return;
        }
        
        // Render events
        renderEvents(events, contentArea);
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load page</div>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
