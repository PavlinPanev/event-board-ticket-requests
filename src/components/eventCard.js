import { escapeHtml, truncate, formatDateTime } from '../utils/helpers.js';

/**
 * Render event card as HTML string
 * @param {Object} event - Event object with venue information
 * @returns {string} Bootstrap card HTML
 */
export function renderEventCard(event) {
    const venue = event.venue || {};
    const venueName = venue.name || 'TBA';
    const venueAddress = venue.address ? `, ${venue.address}` : '';
    
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${escapeHtml(event.title)}</h5>
                    <p class="card-text text-muted small mb-2">
                        <i class="bi bi-calendar-event"></i> ${formatDateTime(event.starts_at)}
                    </p>
                    <p class="card-text text-muted small mb-3">
                        <i class="bi bi-geo-alt"></i> ${escapeHtml(venueName)}${escapeHtml(venueAddress)}
                    </p>
                    ${event.description ? `<p class="card-text">${escapeHtml(truncate(event.description, 100))}</p>` : ''}
                </div>
                <div class="card-footer bg-white border-top-0">
                    <a href="/event-details.html?id=${event.id}" class="btn btn-primary btn-sm w-100">
                        View Details
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render multiple event cards
 * @param {Array} events - Array of event objects
 * @returns {string} HTML string with all cards wrapped in row
 */
export function renderEventCards(events) {
    if (!events || events.length === 0) {
        return `
            <div class="alert alert-info">
                <h5>No events found</h5>
                <p>There are currently no published events. Check back later!</p>
            </div>
        `;
    }
    
    return `
        <div class="row">
            ${events.map(renderEventCard).join('')}
        </div>
    `;
}
