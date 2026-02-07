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
            <a href="/event-details.html?id=${event.id}" class="event-card-link">
                <article class="event-card">
                    <div class="event-card-content">
                        <h3 class="event-card-title">${escapeHtml(event.title)}</h3>
                        
                        <div class="event-card-meta">
                            <span class="event-card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="event-card-icon">
                                    <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                                    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                </svg>
                                ${formatDateTime(event.starts_at)}
                            </span>
                            <span class="event-card-meta-item">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="event-card-icon">
                                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                                </svg>
                                ${escapeHtml(venueName)}${escapeHtml(venueAddress)}
                            </span>
                        </div>
                        
                        ${event.description ? `
                            <p class="event-card-description">${escapeHtml(truncate(event.description, 100))}</p>
                        ` : ''}
                        
                        <div class="event-card-action">
                            <span class="event-card-link-text">View Details</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="event-card-arrow">
                                <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"/>
                            </svg>
                        </div>
                    </div>
                </article>
            </a>
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
