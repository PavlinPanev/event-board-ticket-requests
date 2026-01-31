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
        <div class="py-4">
            <h1 class="mb-4">Admin Dashboard</h1>
            
            <!-- Stats Cards Row -->
            <div id="stats-container" class="row g-3 mb-5">
                <div class="col-12 text-center text-muted">Loading statistics...</div>
            </div>
            
            <!-- Pending Requests Section -->
            <section class="mb-5">
                <h2 class="h4 mb-3">
                    <i class="bi bi-ticket-perforated me-2"></i>Pending Ticket Requests
                </h2>
                <div id="requests-container">
                    <div class="text-center text-muted py-4">Loading requests...</div>
                </div>
            </section>
            
            <!-- Events Moderation Section -->
            <section class="mb-5">
                <h2 class="h4 mb-3">
                    <i class="bi bi-calendar-event me-2"></i>Events Moderation
                </h2>
                <div id="events-container">
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
            <div class="card text-bg-warning h-100">
                <div class="card-body">
                    <h5 class="card-title">Pending Requests</h5>
                    <p class="card-text display-4">${data.pendingRequests}</p>
                </div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="card text-bg-info h-100">
                <div class="card-body">
                    <h5 class="card-title">Total Requests</h5>
                    <p class="card-text display-4">${data.totalRequests}</p>
                </div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="card text-bg-success h-100">
                <div class="card-body">
                    <h5 class="card-title">Upcoming Events</h5>
                    <p class="card-text display-4">${data.upcomingEvents}</p>
                </div>
            </div>
        </div>
        <div class="col-sm-6 col-lg-3">
            <div class="card text-bg-secondary h-100">
                <div class="card-body">
                    <h5 class="card-title">Total Events</h5>
                    <p class="card-text display-4">${data.totalEvents}</p>
                </div>
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
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
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
                <a href="event-details.html?id=${request.event?.id}" class="text-decoration-none">
                    ${escapeHtml(eventTitle)}
                </a>
            </td>
            <td><small>${eventDate}</small></td>
            <td>${escapeHtml(requesterName)}</td>
            <td><span class="badge bg-secondary">${request.quantity}</span></td>
            <td><small>${note}</small></td>
            <td><small class="text-muted">${requestedAt}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-success btn-approve-request" data-request-id="${request.id}" title="Approve">
                        <i class="bi bi-check-lg"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-reject-request" data-request-id="${request.id}" title="Reject">
                        <i class="bi bi-x-lg"></i> Reject
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
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
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
        draft: 'bg-secondary',
        published: 'bg-success',
        archived: 'bg-dark'
    };
    const badgeClass = statusBadges[event.status] || 'bg-secondary';
    
    // Action buttons based on current status
    let actionButtons = '';
    
    if (event.status === 'draft') {
        actionButtons = `
            <button class="btn btn-success btn-sm btn-publish-event" data-event-id="${event.id}" title="Publish">
                <i class="bi bi-globe"></i> Publish
            </button>
        `;
    } else if (event.status === 'published') {
        actionButtons = `
            <button class="btn btn-warning btn-sm btn-archive-event" data-event-id="${event.id}" title="Archive">
                <i class="bi bi-archive"></i> Archive
            </button>
        `;
    } else if (event.status === 'archived') {
        actionButtons = `
            <button class="btn btn-outline-success btn-sm btn-publish-event" data-event-id="${event.id}" title="Republish">
                <i class="bi bi-globe"></i> Republish
            </button>
        `;
    }
    
    actionButtons += `
        <a href="edit-event.html?id=${event.id}" class="btn btn-outline-primary btn-sm" title="Edit">
            <i class="bi bi-pencil"></i>
        </a>
        <button class="btn btn-outline-danger btn-sm btn-delete-event" data-event-id="${event.id}" title="Delete">
            <i class="bi bi-trash"></i>
        </button>
    `;
    
    return `
        <tr data-event-id="${event.id}">
            <td>
                <a href="event-details.html?id=${event.id}" class="text-decoration-none">
                    ${escapeHtml(event.title)}
                </a>
            </td>
            <td><small>${eventDate}</small></td>
            <td>${escapeHtml(venueName)}</td>
            <td>${escapeHtml(creatorName)}</td>
            <td><span class="badge ${badgeClass}">${event.status}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
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
