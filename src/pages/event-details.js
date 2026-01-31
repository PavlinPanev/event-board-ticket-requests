/**
 * Event Details Page
 * 
 * Features:
 * - View event details with venue information
 * - Submit ticket requests (authenticated users only)
 * - DEBUG: Asset URL verification helper (development mode)
 * 
 * DEBUG HELPER USAGE:
 * After uploading a file, call debugAssetUrl() to verify the public URL is accessible:
 * 
 *   import { uploadEventAsset } from '../services/storageService.js';
 *   const { data } = await uploadEventAsset(eventId, file);
 *   await debugAssetUrl(data.filePath, file.name);
 * 
 * Or test manually from browser console:
 *   debugAssetUrl('events/123/456-image.jpg', 'test-image.jpg');
 * 
 * The debug widget only appears on localhost or when ?debug=true is in the URL.
 */

import { renderNavbar } from '../components/navbar.js';
import { getEventById } from '../services/eventsService.js';
import { createTicketRequest } from '../services/ticketRequestsService.js';
import { getSession } from '../services/authService.js';
import { getQueryParam, formatDateTime, escapeHtml } from '../utils/helpers.js';
import { getAssetUrl } from '../services/storageService.js';

/**
 * DEBUG HELPER: Verify uploaded asset URL accessibility
 * Call this function after uploadEventAsset() to test if the URL is publicly accessible
 * @param {string} filePath - File path from upload (e.g., 'events/123/456-image.jpg')
 * @param {string} fileName - Original file name for display
 */
async function debugAssetUrl(filePath, fileName = 'uploaded file') {
    // Only run in development/debug mode
    const isDebugMode = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.search.includes('debug=true');
    
    if (!isDebugMode) return;
    
    try {
        // Get the public URL
        const { data: publicUrl, error } = await getAssetUrl(filePath);
        
        if (error) {
            console.error('❌ [DEBUG] Failed to get asset URL:', error);
            return;
        }
        
        // Log to console with styling
        console.group('🔍 [DEBUG] Asset URL Verification');
        console.log('File Path:', filePath);
        console.log('File Name:', fileName);
        console.log('Public URL:', publicUrl);
        console.log('Click to test:', publicUrl);
        console.groupEnd();
        
        // Render debug widget on page
        renderDebugWidget(publicUrl, fileName, filePath);
        
        // Optional: Automatically test accessibility
        testUrlAccessibility(publicUrl);
        
    } catch (error) {
        console.error('❌ [DEBUG] Asset URL verification error:', error);
    }
}

/**
 * Render debug widget with clickable link on the page
 * @param {string} url - Public URL to test
 * @param {string} fileName - File name for display
 * @param {string} filePath - Storage file path
 */
function renderDebugWidget(url, fileName, filePath) {
    // Remove existing debug widget if present
    const existing = document.getElementById('debug-asset-widget');
    if (existing) existing.remove();
    
    // Create debug widget
    const widget = document.createElement('div');
    widget.id = 'debug-asset-widget';
    widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        max-width: 400px;
        background: #2d3748;
        color: #fff;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    
    widget.innerHTML = `
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            #debug-asset-widget button {
                background: #e53e3e;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            }
            #debug-asset-widget button:hover {
                background: #c53030;
            }
            #debug-asset-widget a {
                color: #63b3ed;
                word-break: break-all;
            }
            #debug-asset-widget a:hover {
                color: #90cdf4;
            }
            #debug-asset-widget .badge {
                display: inline-block;
                padding: 2px 6px;
                background: #48bb78;
                color: white;
                border-radius: 3px;
                font-size: 10px;
                margin-left: 8px;
            }
        </style>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <strong style="color: #63b3ed;">🔍 DEBUG: Asset URL</strong>
            <button onclick="this.closest('#debug-asset-widget').remove()">✕</button>
        </div>
        <div style="margin-bottom: 8px;">
            <div style="color: #a0aec0; font-size: 10px; margin-bottom: 4px;">File:</div>
            <div style="color: #edf2f7;">${escapeHtml(fileName)}</div>
        </div>
        <div style="margin-bottom: 8px;">
            <div style="color: #a0aec0; font-size: 10px; margin-bottom: 4px;">Storage Path:</div>
            <div style="color: #cbd5e0; font-size: 10px;">${escapeHtml(filePath)}</div>
        </div>
        <div style="margin-bottom: 8px;">
            <div style="color: #a0aec0; font-size: 10px; margin-bottom: 4px;">
                Public URL <span class="badge">CLICK TO TEST</span>
            </div>
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" 
               style="display: block; padding: 8px; background: #1a202c; border-radius: 4px; margin-top: 4px;">
                ${escapeHtml(url)}
            </a>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #4a5568; font-size: 10px; color: #a0aec0;">
            💡 Tip: Click the URL to verify it's publicly accessible
        </div>
    `;
    
    document.body.appendChild(widget);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (widget.parentElement) {
            widget.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => widget.remove(), 300);
        }
    }, 30000);
}

/**
 * Test if URL is actually accessible
 * @param {string} url - URL to test
 */
async function testUrlAccessibility(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
            console.log('✅ [DEBUG] Asset URL is publicly accessible');
        } else {
            console.warn(`⚠️ [DEBUG] Asset URL returned status ${response.status}`);
            console.warn('The file may not be publicly accessible. Check bucket permissions.');
        }
    } catch (error) {
        console.warn('⚠️ [DEBUG] Could not verify URL accessibility:', error.message);
        console.warn('This may be due to CORS restrictions, but the URL might still work.');
    }
}

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

// Export debug helper for use in console or future upload functionality
// Usage example after upload:
//   const { data } = await uploadEventAsset(eventId, file);
//   debugAssetUrl(data.filePath, file.name);
window.debugAssetUrl = debugAssetUrl;
