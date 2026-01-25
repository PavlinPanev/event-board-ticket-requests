import { renderNavbar } from '../components/navbar.js';
import { getEventById } from '../services/eventsService.js';
import { createTicketRequest } from '../services/ticketRequestsService.js';
import { getSession } from '../services/authService.js';
import { getQueryParam, formatDateTime, escapeHtml } from '../utils/helpers.js';

/**
 * Render event details
 * @param {Object} event - Event object with venue
 * @param {Object|null} user - Current user or null
 * @returns {string} HTML string
 */
function renderEventDetails(event, user) {
    const venue = event.venue || {};
    
    return `
        <div class="row">
            <div class="col-lg-8">
                <div class="card shadow-sm mb-4">
                    <div class="card-body">
                        <h2 class="card-title mb-3">${escapeHtml(event.title)}</h2>
                        
                        <div class="mb-3">
                            <p class="mb-2">
                                <i class="bi bi-calendar-event text-primary"></i>
                                <strong>When:</strong> ${formatDateTime(event.starts_at)}
                            </p>
                            <p class="mb-2">
                                <i class="bi bi-geo-alt text-primary"></i>
                                <strong>Where:</strong> ${escapeHtml(venue.name || 'TBA')}
                            </p>
                            ${venue.address ? `<p class="ms-4 text-muted small">${escapeHtml(venue.address)}</p>` : ''}
                            ${venue.capacity ? `<p class="mb-2">
                                <i class="bi bi-people text-primary"></i>
                                <strong>Capacity:</strong> ${venue.capacity}
                            </p>` : ''}
                        </div>
                        
                        ${event.description ? `
                            <hr>
                            <h5>About This Event</h5>
                            <p class="text-muted">${escapeHtml(event.description)}</p>
                        ` : ''}
                    </div>
                </div>
                
                <a href="/index.html" class="btn btn-outline-secondary">
                    <i class="bi bi-arrow-left"></i> Back to Events
                </a>
            </div>
            
            <div class="col-lg-4">
                ${user ? renderTicketRequestForm() : renderLoginPrompt()}
            </div>
        </div>
    `;
}

/**
 * Render ticket request form for authenticated users
 * @returns {string} HTML string
 */
function renderTicketRequestForm() {
    return `
        <div class="card shadow-sm sticky-top" style="top: 20px;">
            <div class="card-body">
                <h5 class="card-title mb-3">Request Tickets</h5>
                
                <div id="form-message"></div>
                
                <form id="ticket-request-form">
                    <div class="mb-3">
                        <label for="quantity" class="form-label">Number of Tickets <span class="text-danger">*</span></label>
                        <input 
                            type="number" 
                            class="form-control" 
                            id="quantity" 
                            name="quantity" 
                            min="1" 
                            max="10" 
                            value="1" 
                            required
                        >
                        <div class="form-text">Maximum 10 tickets per request</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="note" class="form-label">Additional Notes</label>
                        <textarea 
                            class="form-control" 
                            id="note" 
                            name="note" 
                            rows="3" 
                            placeholder="Any special requests or comments..."
                        ></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary w-100" id="submit-btn">
                        <i class="bi bi-ticket"></i> Submit Request
                    </button>
                </form>
            </div>
        </div>
    `;
}

/**
 * Render login prompt for unauthenticated users
 * @returns {string} HTML string
 */
function renderLoginPrompt() {
    return `
        <div class="card shadow-sm sticky-top" style="top: 20px;">
            <div class="card-body text-center py-5">
                <i class="bi bi-lock text-muted" style="font-size: 3rem;"></i>
                <h5 class="mt-3">Login Required</h5>
                <p class="text-muted">Please log in to request tickets for this event.</p>
                <a href="/login.html" class="btn btn-primary">
                    <i class="bi bi-box-arrow-in-right"></i> Login
                </a>
                <p class="mt-3 small">
                    Don't have an account? 
                    <a href="/register.html">Register here</a>
                </p>
            </div>
        </div>
    `;
}

/**
 * Show message in form
 * @param {string} message - Message text
 * @param {string} type - 'success' or 'danger'
 */
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('form-message');
    if (!messageDiv) return;
    
    messageDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

/**
 * Handle ticket request form submission
 * @param {Event} e - Form submit event
 * @param {string} eventId - Event ID
 */
async function handleTicketRequest(e, eventId) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const form = e.target;
    const quantityInput = form.querySelector('#quantity');
    const noteInput = form.querySelector('#note');
    
    // Disable form
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
    
    try {
        const quantity = parseInt(quantityInput.value);
        const note = noteInput.value.trim();
        
        // Validate quantity
        if (quantity < 1 || quantity > 10) {
            showMessage('Please enter a quantity between 1 and 10', 'danger');
            return;
        }
        
        // Submit request
        const { data, error } = await createTicketRequest(eventId, quantity, note);
        
        if (error) {
            showMessage(`Failed to submit request: ${error.message}`, 'danger');
            return;
        }
        
        // Success
        showMessage('Ticket request submitted successfully! Check "My Requests" to track status.', 'success');
        form.reset();
        
    } catch (error) {
        console.error('Ticket request error:', error);
        showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-ticket"></i> Submit Request';
    }
}

/**
 * Show error page
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container element
 */
function showError(message, container) {
    container.innerHTML = `
        <div class="alert alert-danger">
            <h5><i class="bi bi-exclamation-triangle"></i> Error</h5>
            <p>${escapeHtml(message)}</p>
            <a href="/index.html" class="btn btn-primary">
                <i class="bi bi-arrow-left"></i> Back to Events
            </a>
        </div>
    `;
}

/**
 * Initialize event details page
 */
async function init() {
    try {
        renderNavbar('event-details');
        
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-3">Loading event details...</p></div>';
        
        // Get event ID from URL
        const eventId = getQueryParam('id');
        
        if (!eventId) {
            showError('No event ID provided in URL', contentArea);
            return;
        }
        
        // Fetch event details
        const { data: event, error } = await getEventById(eventId);
        
        if (error) {
            showError(`Failed to load event: ${error.message}`, contentArea);
            return;
        }
        
        if (!event) {
            showError('Event not found', contentArea);
            return;
        }
        
        // Check if user is authenticated
        const { session } = await getSession();
        const user = session?.user || null;
        
        // Render event details
        contentArea.innerHTML = renderEventDetails(event, user);
        
        // Attach form handler if user is authenticated
        if (user) {
            const form = document.getElementById('ticket-request-form');
            if (form) {
                form.addEventListener('submit', (e) => handleTicketRequest(e, eventId));
            }
        }
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        const contentArea = document.getElementById('content');
        showError('An unexpected error occurred', contentArea);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
