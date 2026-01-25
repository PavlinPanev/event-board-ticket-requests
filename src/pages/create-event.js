import { renderNavbar } from '../components/navbar.js';
import { requireAuth } from '../utils/guards.js';
import { createEvent } from '../services/eventsService.js';
import { getVenues } from '../services/venuesService.js';
import { escapeHtml } from '../utils/helpers.js';

/**
 * Render create event form
 * @param {Array} venues - List of venues
 * @returns {string} HTML string
 */
function renderCreateEventForm(venues) {
    return `
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h2 class="card-title mb-4">Create New Event</h2>
                        
                        <div id="form-message"></div>
                        
                        <form id="create-event-form">
                            <div class="mb-3">
                                <label for="title" class="form-label">
                                    Event Title <span class="text-danger">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    class="form-control" 
                                    id="title" 
                                    name="title" 
                                    required
                                    placeholder="e.g. Summer Music Festival 2026"
                                >
                            </div>
                            
                            <div class="mb-3">
                                <label for="description" class="form-label">Description</label>
                                <textarea 
                                    class="form-control" 
                                    id="description" 
                                    name="description" 
                                    rows="4"
                                    placeholder="Describe your event..."
                                ></textarea>
                            </div>
                            
                            <div class="mb-3">
                                <label for="starts_at" class="form-label">
                                    Event Date & Time <span class="text-danger">*</span>
                                </label>
                                <input 
                                    type="datetime-local" 
                                    class="form-control" 
                                    id="starts_at" 
                                    name="starts_at" 
                                    required
                                >
                                <div class="form-text">Select when the event will start</div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="venue_id" class="form-label">
                                    Venue <span class="text-danger">*</span>
                                </label>
                                <select 
                                    class="form-select" 
                                    id="venue_id" 
                                    name="venue_id" 
                                    required
                                >
                                    <option value="">-- Select a venue --</option>
                                    ${venues.map(venue => `
                                        <option value="${venue.id}">
                                            ${escapeHtml(venue.name)} - ${escapeHtml(venue.address)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="mb-4">
                                <label for="status" class="form-label">Status</label>
                                <select class="form-select" id="status" name="status">
                                    <option value="draft" selected>Draft (not visible to public)</option>
                                    <option value="published">Published (visible to public)</option>
                                </select>
                                <div class="form-text">
                                    <strong>Note:</strong> Per security policy, events are created as 'draft' by default. 
                                    You can publish after creation.
                                </div>
                            </div>
                            
                            <div class="d-flex gap-2">
                                <button type="submit" class="btn btn-primary" id="submit-btn">
                                    <i class="bi bi-plus-circle"></i> Create Event
                                </button>
                                <a href="/index.html" class="btn btn-outline-secondary">
                                    Cancel
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
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
    
    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Handle form submission
 * @param {Event} e - Form submit event
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const form = e.target;
    
    // Disable form
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
    
    try {
        // Collect form data
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim() || null,
            starts_at: formData.get('starts_at'),
            venue_id: formData.get('venue_id'),
            status: formData.get('status') || 'draft'
        };
        
        // Validate required fields
        if (!eventData.title || !eventData.starts_at || !eventData.venue_id) {
            showMessage('Please fill in all required fields', 'danger');
            return;
        }
        
        // Validate date is in the future
        const eventDate = new Date(eventData.starts_at);
        if (eventDate < new Date()) {
            showMessage('Event date must be in the future', 'danger');
            return;
        }
        
        // Create event
        const { data: event, error } = await createEvent(eventData);
        
        if (error) {
            // Check if it's the security policy error (status must be draft)
            if (error.message && error.message.includes('draft')) {
                showMessage('Events can only be created as draft. You can publish them after creation.', 'warning');
                // Force status to draft and retry
                eventData.status = 'draft';
                const { data: retryEvent, error: retryError } = await createEvent(eventData);
                if (retryError) {
                    showMessage(`Failed to create event: ${retryError.message}`, 'danger');
                    return;
                }
                // Success on retry
                showMessage('Event created successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = `/event-details.html?id=${retryEvent.id}`;
                }, 1500);
                return;
            }
            
            showMessage(`Failed to create event: ${error.message}`, 'danger');
            return;
        }
        
        // Success - redirect to event details
        showMessage('Event created successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = `/event-details.html?id=${event.id}`;
        }, 1500);
        
    } catch (error) {
        console.error('Event creation error:', error);
        showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Create Event';
    }
}

/**
 * Initialize create event page
 */
async function init() {
    try {
        // Require authentication
        const user = await requireAuth();
        if (!user) return;
        
        renderNavbar('create-event');
        
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-3">Loading form...</p></div>';
        
        // Fetch venues
        const { data: venues, error } = await getVenues();
        
        if (error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Failed to load venues</h5>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
            return;
        }
        
        if (!venues || venues.length === 0) {
            contentArea.innerHTML = `
                <div class="alert alert-warning">
                    <h5>No venues available</h5>
                    <p>There are no venues in the system. Please contact an administrator to add venues first.</p>
                </div>
            `;
            return;
        }
        
        // Render form
        contentArea.innerHTML = renderCreateEventForm(venues);
        
        // Attach form handler
        const form = document.getElementById('create-event-form');
        form.addEventListener('submit', handleSubmit);
        
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
