import { renderNavbar } from '../components/navbar.js';
import { requireAuth, isAdmin } from '../utils/guards.js';
import { getEventById, updateEvent, deleteEvent } from '../services/eventsService.js';
import { getVenues } from '../services/venuesService.js';
import { getQueryParam, escapeHtml, formatDateTimeLocal } from '../utils/helpers.js';

// Current event data
let currentEvent = null;
let currentUser = null;

/**
 * Format ISO date to datetime-local input value
 * @param {string} isoDate - ISO date string
 * @returns {string} datetime-local format (YYYY-MM-DDTHH:mm)
 */
function toDateTimeLocal(isoDate) {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    // Format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Render edit event form
 * @param {Object} event - Event data
 * @param {Array} venues - List of venues
 * @param {boolean} canChangeStatus - Whether user can change event status
 * @returns {string} HTML string
 */
function renderEditEventForm(event, venues, canChangeStatus = false) {
    return `
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h2 class="card-title mb-0">Edit Event</h2>
                            <span class="badge bg-${getStatusBadgeColor(event.status)}">${event.status}</span>
                        </div>
                        
                        <div id="form-message"></div>
                        
                        <form id="edit-event-form">
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
                                    value="${escapeHtml(event.title || '')}"
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
                                >${escapeHtml(event.description || '')}</textarea>
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
                                    value="${toDateTimeLocal(event.starts_at)}"
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
                                        <option value="${venue.id}" ${venue.id === event.venue_id ? 'selected' : ''}>
                                            ${escapeHtml(venue.name)} - ${escapeHtml(venue.address)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="mb-4">
                                <label for="status" class="form-label">
                                    Event Status
                                </label>
                                <select 
                                    class="form-select" 
                                    id="status" 
                                    name="status"
                                >
                                    <option value="draft" ${event.status === 'draft' ? 'selected' : ''}>
                                        📝 Draft - Not visible to public
                                    </option>
                                    <option value="published" ${event.status === 'published' ? 'selected' : ''}>
                                        ✅ Published - Visible to everyone
                                    </option>
                                    <option value="archived" ${event.status === 'archived' ? 'selected' : ''}>
                                        📦 Archived - Hidden from listings
                                    </option>
                                </select>
                                <div class="form-text">
                                    Change status to "Published" to make your event visible to the public.
                                </div>
                            </div>
                            
                            <div class="d-flex gap-2 flex-wrap">
                                <button type="submit" class="btn btn-primary" id="submit-btn">
                                    <i class="bi bi-check-circle"></i> Save Changes
                                </button>
                                <a href="/event-details.html?id=${event.id}" class="btn btn-outline-secondary">
                                    <i class="bi bi-arrow-left"></i> Back to Event
                                </a>
                                <button type="button" class="btn btn-outline-danger ms-auto" id="delete-btn">
                                    <i class="bi bi-trash"></i> Delete Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- Quick Actions Card -->
                <div class="card shadow-sm mt-4">
                    <div class="card-body">
                        <h5 class="card-title">Quick Actions</h5>
                        <div class="d-flex gap-2 flex-wrap">
                            ${event.status === 'draft' ? `
                                <button class="btn btn-success btn-sm" id="quick-publish-btn">
                                    <i class="bi bi-check-circle"></i> Publish Now
                                </button>
                            ` : ''}
                            ${event.status === 'published' ? `
                                <button class="btn btn-warning btn-sm" id="quick-archive-btn">
                                    <i class="bi bi-archive"></i> Archive Event
                                </button>
                            ` : ''}
                            <a href="/event-details.html?id=${event.id}" class="btn btn-outline-primary btn-sm">
                                <i class="bi bi-eye"></i> View Public Page
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get Bootstrap badge color for event status
 * @param {string} status - Event status
 * @returns {string} Bootstrap color class
 */
function getStatusBadgeColor(status) {
    switch (status) {
        case 'published': return 'success';
        case 'draft': return 'secondary';
        case 'archived': return 'warning';
        default: return 'secondary';
    }
}

/**
 * Show message in form
 * @param {string} message - Message text
 * @param {string} type - 'success', 'danger', 'warning', 'info'
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
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    
    try {
        // Collect form data
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim() || null,
            starts_at: formData.get('starts_at'),
            venue_id: formData.get('venue_id'),
            status: formData.get('status')
        };
        
        // Validate required fields
        if (!eventData.title || !eventData.starts_at || !eventData.venue_id) {
            showMessage('Please fill in all required fields', 'danger');
            return;
        }
        
        // Update event
        const { data: event, error } = await updateEvent(currentEvent.id, eventData);
        
        if (error) {
            if (error.message && error.message.includes('policy')) {
                showMessage('Permission denied. You can only edit your own events.', 'danger');
            } else {
                showMessage(`Failed to update event: ${error.message}`, 'danger');
            }
            return;
        }
        
        // Update current event data
        currentEvent = event;
        
        // Success
        showMessage('Event updated successfully!', 'success');
        
        // Update status badge
        const badge = document.querySelector('.badge');
        if (badge) {
            badge.className = `badge bg-${getStatusBadgeColor(event.status)}`;
            badge.textContent = event.status;
        }
        
    } catch (error) {
        console.error('Event update error:', error);
        showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Save Changes';
    }
}

/**
 * Handle event deletion
 */
async function handleDelete() {
    if (!currentEvent) return;
    
    // Confirm deletion
    const confirmed = confirm(
        `Are you sure you want to delete "${currentEvent.title}"?\n\n` +
        'This action cannot be undone. All ticket requests for this event will also be deleted.'
    );
    
    if (!confirmed) return;
    
    const deleteBtn = document.getElementById('delete-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
    
    try {
        const { error } = await deleteEvent(currentEvent.id);
        
        if (error) {
            showMessage(`Failed to delete event: ${error.message}`, 'danger');
            return;
        }
        
        // Success - redirect to home
        showMessage('Event deleted successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Event deletion error:', error);
        showMessage('An unexpected error occurred. Please try again.', 'danger');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete Event';
    }
}

/**
 * Handle quick status change
 * @param {string} newStatus - New status to set
 */
async function handleQuickStatusChange(newStatus) {
    if (!currentEvent) return;
    
    try {
        const { data: event, error } = await updateEvent(currentEvent.id, { status: newStatus });
        
        if (error) {
            showMessage(`Failed to update status: ${error.message}`, 'danger');
            return;
        }
        
        // Update current event and reload page to refresh UI
        currentEvent = event;
        showMessage(`Event ${newStatus} successfully!`, 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Status change error:', error);
        showMessage('Failed to change status. Please try again.', 'danger');
    }
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    // Form submission
    const form = document.getElementById('edit-event-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Delete button
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDelete);
    }
    
    // Quick publish button
    const quickPublishBtn = document.getElementById('quick-publish-btn');
    if (quickPublishBtn) {
        quickPublishBtn.addEventListener('click', () => handleQuickStatusChange('published'));
    }
    
    // Quick archive button
    const quickArchiveBtn = document.getElementById('quick-archive-btn');
    if (quickArchiveBtn) {
        quickArchiveBtn.addEventListener('click', () => handleQuickStatusChange('archived'));
    }
}

/**
 * Initialize edit event page
 */
async function init() {
    try {
        // Require authentication
        currentUser = await requireAuth();
        if (!currentUser) return;
        
        renderNavbar('edit-event');
        
        const contentArea = document.getElementById('content');
        
        // Get event ID from URL
        const eventId = getQueryParam('id');
        
        if (!eventId) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Event Not Found</h5>
                    <p>No event ID provided. Please select an event to edit.</p>
                    <a href="/index.html" class="btn btn-primary">Back to Events</a>
                </div>
            `;
            return;
        }
        
        // Fetch event and venues in parallel
        const [eventResult, venuesResult] = await Promise.all([
            getEventById(eventId),
            getVenues()
        ]);
        
        if (eventResult.error) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Failed to Load Event</h5>
                    <p>${escapeHtml(eventResult.error.message)}</p>
                    <a href="/index.html" class="btn btn-primary">Back to Events</a>
                </div>
            `;
            return;
        }
        
        if (!eventResult.data) {
            contentArea.innerHTML = `
                <div class="alert alert-warning">
                    <h5>Event Not Found</h5>
                    <p>The requested event does not exist or has been deleted.</p>
                    <a href="/index.html" class="btn btn-primary">Back to Events</a>
                </div>
            `;
            return;
        }
        
        currentEvent = eventResult.data;
        
        // Check if user can edit this event (owner or admin)
        const userIsAdmin = await isAdmin();
        const isOwner = currentUser.id === currentEvent.created_by;
        
        if (!isOwner && !userIsAdmin) {
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Access Denied</h5>
                    <p>You do not have permission to edit this event. Only the event creator or an admin can edit it.</p>
                    <a href="/event-details.html?id=${eventId}" class="btn btn-primary">View Event</a>
                </div>
            `;
            return;
        }
        
        if (venuesResult.error || !venuesResult.data || venuesResult.data.length === 0) {
            contentArea.innerHTML = `
                <div class="alert alert-warning">
                    <h5>No Venues Available</h5>
                    <p>Cannot edit event without venues. Please contact an administrator.</p>
                </div>
            `;
            return;
        }
        
        // Render form
        contentArea.innerHTML = renderEditEventForm(currentEvent, venuesResult.data, userIsAdmin);
        
        // Attach event listeners
        attachEventListeners();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = `
            <div class="alert alert-danger">
                <h5>Failed to Load Page</h5>
                <p>An unexpected error occurred. Please try again.</p>
                <a href="/index.html" class="btn btn-primary">Back to Events</a>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
