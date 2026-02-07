import { renderNavbar } from '../components/navbar.js';
import { requireAdmin } from '../utils/guards.js';
import { 
    getAdminStats, 
    getPendingRequests, 
    setRequestStatus, 
    getEventsForModeration, 
    setEventStatus, 
    deleteEvent 
} from '../services/adminService.js';
import { formatDateTime, escapeHtml } from '../utils/helpers.js';

/**
 * Initialize admin panel page
 */
async function init() {
    try {
        // Require admin privileges
        const user = await requireAdmin();
        if (!user) return;
        
        renderNavbar('admin');
        
        // Render page layout
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = renderAdminLayout();
        
        // Load all sections
        await Promise.all([
            loadStats(),
            loadPendingRequests(),
            loadEventsModeration()
        ]);
        
        // Attach event listeners using delegation
        attachEventListeners();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load admin panel</div>';
    }
}

/**
 * Render the main admin layout structure
 */
function renderAdminLayout() {
    return `
        <div class="admin-panel">
            <!-- Stats Cards Row -->
            <div id="stats-container" class="admin-stats row g-4 mb-5">
                <div class="col-12 text-center text-muted">Loading statistics...</div>
            </div>
            
            <!-- Pending Requests Section -->
            <section class="admin-section mb-5">
                <div class="admin-section-header">
                    <h2 class="admin-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="admin-section-icon">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Pending Ticket Requests
                    </h2>
                </div>
                <div id="requests-container" class="admin-section-content">
                    <div class="text-center text-muted py-4">Loading requests...</div>
                </div>
            </section>
            
            <!-- Events Moderation Section -->
            <section class="admin-section mb-5">
                <div class="admin-section-header">
                    <h2 class="admin-section-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="admin-section-icon">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Events Moderation
                    </h2>
                </div>
                <div id="events-container" class="admin-section-content">
                    <div class="text-center text-muted py-4">Loading events...</div>
                </div>
            </section>
        </div>
    `;
}

/**
 * Load and render statistics cards
 */
async function loadStats() {
    const container = document.getElementById('stats-container');
    
    const { data, error } = await getAdminStats();
    
    if (error) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">Failed to load statistics</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="col-sm-6 col-lg-3">
            <div class="stat-card stat-card-warning">
                <div class="stat-card-label">Pending Requests</div>
                <div class="stat-card-value">${data.pendingRequests}</div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="stat-card stat-card-info">
                <div class="stat-card-label">Total Requests</div>
                <div class="stat-card-value">${data.totalRequests}</div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="stat-card stat-card-success">
                <div class="stat-card-label">Upcoming Events</div>
                <div class="stat-card-value">${data.upcomingEvents}</div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="stat-card stat-card-secondary">
                <div class="stat-card-label">Total Events</div>
                <div class="stat-card-value">${data.totalEvents}</div>
            </div>
        </div>
    `;
}

/**
 * Load and render pending ticket requests table
 */
async function loadPendingRequests() {
    const container = document.getElementById('requests-container');
    
    const { data, error } = await getPendingRequests();
    
    if (error) {
        container.innerHTML = `
            <div class="alert alert-danger">Failed to load pending requests</div>
        `;
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>No pending requests. All caught up!
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Event Date</th>
                        <th>Requester</th>
                        <th>Qty</th>
                        <th>Note</th>
                        <th>Requested</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(request => renderRequestRow(request)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render a single request table row
 */
function renderRequestRow(request) {
    const eventTitle = request.event?.title || 'Unknown Event';
    const eventDate = request.event?.starts_at ? formatDateTime(request.event.starts_at) : 'N/A';
    const requesterName = request.requester?.display_name || 'Unknown User';
    const requestedAt = formatDateTime(request.created_at);
    const note = request.note ? escapeHtml(request.note) : '<span class="text-muted">—</span>';
    
    return `
        <tr data-request-id="${request.id}">
            <td>
                <a href="event-details.html?id=${request.event?.id}" class="admin-table-link">
                    ${escapeHtml(eventTitle)}
                </a>
            </td>
            <td class="admin-table-secondary">${eventDate}</td>
            <td>${escapeHtml(requesterName)}</td>
            <td><span class="admin-badge admin-badge-neutral">${request.quantity}</span></td>
            <td class="admin-table-secondary">${note}</td>
            <td class="admin-table-muted">${requestedAt}</td>
            <td>
                <div class="admin-actions">
                    <button class="admin-btn admin-btn-success btn-approve-request" data-request-id="${request.id}" title="Approve">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                    </button>
                    <button class="admin-btn admin-btn-danger btn-reject-request" data-request-id="${request.id}" title="Reject">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Load and render events moderation table
 */
async function loadEventsModeration() {
    const container = document.getElementById('events-container');
    
    const { data, error } = await getEventsForModeration();
    
    if (error) {
        container.innerHTML = `
            <div class="alert alert-danger">Failed to load events</div>
        `;
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>No events found.
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Creator</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(event => renderEventRow(event)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render a single event table row
 */
function renderEventRow(event) {
    const venueName = event.venue?.name || 'No Venue';
    const creatorName = event.creator?.display_name || 'Unknown';
    const eventDate = formatDateTime(event.starts_at);
    
    // Status badge colors
    const statusBadges = {
        draft: 'admin-badge-neutral',
        published: 'admin-badge-success',
        archived: 'admin-badge-dark'
    };
    const badgeClass = statusBadges[event.status] || 'admin-badge-neutral';
    
    // Action buttons based on current status
    let actionButtons = '';
    
    if (event.status === 'draft') {
        actionButtons = `
            <button class="admin-btn admin-btn-success btn-publish-event" data-event-id="${event.id}" title="Publish">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5z"/>
                </svg>
            </button>
        `;
    } else if (event.status === 'published') {
        actionButtons = `
            <button class="admin-btn admin-btn-warning btn-archive-event" data-event-id="${event.id}" title="Archive">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1V2zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                </svg>
            </button>
        `;
    } else if (event.status === 'archived') {
        actionButtons = `
            <button class="admin-btn admin-btn-success btn-publish-event" data-event-id="${event.id}" title="Republish">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5z"/>
                </svg>
            </button>
        `;
    }
    
    actionButtons += `
        <a href="edit-event.html?id=${event.id}" class="admin-btn admin-btn-primary" title="Edit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
            </svg>
        </a>
        <button class="admin-btn admin-btn-danger btn-delete-event" data-event-id="${event.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
        </button>
    `;
    
    return `
        <tr data-event-id="${event.id}">
            <td>
                <a href="event-details.html?id=${event.id}" class="admin-table-link">
                    ${escapeHtml(event.title)}
                </a>
            </td>
            <td class="admin-table-secondary">${eventDate}</td>
            <td class="admin-table-secondary">${escapeHtml(venueName)}</td>
            <td class="admin-table-secondary">${escapeHtml(creatorName)}</td>
            <td><span class="admin-badge ${badgeClass}">${event.status}</span></td>
            <td>
                <div class="admin-actions">
                    ${actionButtons}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Attach event listeners using delegation
 */
function attachEventListeners() {
    const content = document.getElementById('content');
    
    content.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        // Disable button during action
        target.disabled = true;
        
        try {
            // Request actions
            if (target.classList.contains('btn-approve-request')) {
                const requestId = target.dataset.requestId;
                await handleRequestAction(requestId, 'approved');
            } 
            else if (target.classList.contains('btn-reject-request')) {
                const requestId = target.dataset.requestId;
                await handleRequestAction(requestId, 'rejected');
            }
            // Event actions
            else if (target.classList.contains('btn-publish-event')) {
                const eventId = target.dataset.eventId;
                await handleEventStatusChange(eventId, 'published');
            }
            else if (target.classList.contains('btn-archive-event')) {
                const eventId = target.dataset.eventId;
                await handleEventStatusChange(eventId, 'archived');
            }
            else if (target.classList.contains('btn-delete-event')) {
                const eventId = target.dataset.eventId;
                await handleEventDelete(eventId);
            }
        } finally {
            target.disabled = false;
        }
    });
}

/**
 * Handle approve/reject request action
 */
async function handleRequestAction(requestId, status) {
    const actionName = status === 'approved' ? 'approve' : 'reject';
    
    if (!confirm(`Are you sure you want to ${actionName} this request?`)) {
        return;
    }
    
    const { error } = await setRequestStatus(requestId, status);
    
    if (error) {
        showToast(`Failed to ${actionName} request: ${error.message}`, 'danger');
        return;
    }
    
    showToast(`Request ${status} successfully`, 'success');
    
    // Refresh requests table and stats
    await Promise.all([
        loadPendingRequests(),
        loadStats()
    ]);
}

/**
 * Handle event status change (publish/archive)
 */
async function handleEventStatusChange(eventId, status) {
    const actionName = status === 'published' ? 'publish' : 'archive';
    
    if (!confirm(`Are you sure you want to ${actionName} this event?`)) {
        return;
    }
    
    const { error } = await setEventStatus(eventId, status);
    
    if (error) {
        showToast(`Failed to ${actionName} event: ${error.message}`, 'danger');
        return;
    }
    
    showToast(`Event ${status} successfully`, 'success');
    
    // Refresh events table and stats
    await Promise.all([
        loadEventsModeration(),
        loadStats()
    ]);
}

/**
 * Handle event deletion
 */
async function handleEventDelete(eventId) {
    if (!confirm('Are you sure you want to DELETE this event? This action cannot be undone.')) {
        return;
    }
    
    const { error } = await deleteEvent(eventId);
    
    if (error) {
        showToast(`Failed to delete event: ${error.message}`, 'danger');
        return;
    }
    
    showToast('Event deleted successfully', 'success');
    
    // Refresh events table and stats
    await Promise.all([
        loadEventsModeration(),
        loadStats()
    ]);
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast-container');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toastHtml = `
        <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
            <div class="toast show align-items-center text-bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${escapeHtml(message)}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        const toast = document.querySelector('.toast-container');
        if (toast) toast.remove();
    }, 4000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
