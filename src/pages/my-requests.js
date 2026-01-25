import { renderNavbar } from '../components/navbar.js';
import { requireAuth } from '../utils/guards.js';
import { getMyRequests, deleteRequest } from '../services/ticketRequestsService.js';
import { formatDateTime, escapeHtml } from '../utils/helpers.js';

/**
 * Get status badge HTML
 * @param {string} status - Request status
 * @returns {string} HTML string
 */
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge bg-warning text-dark">Pending</span>',
        'approved': '<span class="badge bg-success">Approved</span>',
        'rejected': '<span class="badge bg-danger">Rejected</span>'
    };
    return badges[status] || `<span class="badge bg-secondary">${escapeHtml(status)}</span>`;
}

/**
 * Render requests table
 * @param {Array} requests - Array of ticket requests
 * @returns {string} HTML string
 */
function renderRequestsTable(requests) {
    if (requests.length === 0) {
        return `
            <div class="alert alert-info">
                <h5><i class="bi bi-info-circle"></i> No Requests Yet</h5>
                <p>You haven't made any ticket requests yet.</p>
                <a href="/index.html" class="btn btn-primary">
                    <i class="bi bi-calendar-event"></i> Browse Events
                </a>
            </div>
        `;
    }
    
    return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Requested On</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(request => renderRequestRow(request)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render single request row
 * @param {Object} request - Request object with event
 * @returns {string} HTML string
 */
function renderRequestRow(request) {
    const event = request.event || {};
    const isPending = request.status === 'pending';
    
    return `
        <tr>
            <td>
                <a href="/event-details.html?id=${event.id}" class="text-decoration-none">
                    ${escapeHtml(event.title || 'Unknown Event')}
                </a>
            </td>
            <td class="text-muted small">
                ${event.starts_at ? formatDateTime(event.starts_at) : 'TBA'}
            </td>
            <td>
                <i class="bi bi-ticket"></i> ${request.quantity}
            </td>
            <td>
                ${getStatusBadge(request.status)}
            </td>
            <td class="text-muted small">
                ${formatDateTime(request.created_at)}
            </td>
            <td>
                ${isPending ? `
                    <button 
                        class="btn btn-sm btn-outline-danger cancel-btn" 
                        data-request-id="${request.id}"
                        data-event-title="${escapeHtml(event.title || 'this event')}"
                    >
                        <i class="bi bi-x-circle"></i> Cancel
                    </button>
                ` : '-'}
            </td>
        </tr>
    `;
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
            <p class="text-muted mt-3">Loading your requests...</p>
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
            <h5><i class="bi bi-exclamation-triangle"></i> Error</h5>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                <i class="bi bi-arrow-clockwise"></i> Retry
            </button>
        </div>
    `;
}

/**
 * Show toast notification
 * @param {string} message - Message text
 * @param {string} type - 'success' or 'danger'
 */
function showToast(message, type = 'success') {
    // Simple toast implementation
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.innerHTML = `
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

/**
 * Create toast container if it doesn't exist
 * @returns {HTMLElement} Toast container
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.minWidth = '300px';
    document.body.appendChild(container);
    return container;
}

/**
 * Handle cancel request
 * @param {string} requestId - Request ID
 * @param {string} eventTitle - Event title for confirmation
 */
async function handleCancelRequest(requestId, eventTitle) {
    if (!confirm(`Are you sure you want to cancel your ticket request for "${eventTitle}"?`)) {
        return;
    }
    
    const cancelBtn = document.querySelector(`[data-request-id="${requestId}"]`);
    if (!cancelBtn) return;
    
    // Disable button
    const originalHTML = cancelBtn.innerHTML;
    cancelBtn.disabled = true;
    cancelBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    
    try {
        const { error } = await deleteRequest(requestId);
        
        if (error) {
            showToast(`Failed to cancel request: ${error.message}`, 'danger');
            cancelBtn.disabled = false;
            cancelBtn.innerHTML = originalHTML;
            return;
        }
        
        // Success - reload the requests list
        showToast('Ticket request cancelled successfully', 'success');
        await loadRequests();
        
    } catch (error) {
        console.error('Cancel request error:', error);
        showToast('An unexpected error occurred', 'danger');
        cancelBtn.disabled = false;
        cancelBtn.innerHTML = originalHTML;
    }
}

/**
 * Load and render requests
 */
async function loadRequests() {
    const contentArea = document.getElementById('content');
    showLoading(contentArea);
    
    try {
        const { data: requests, error } = await getMyRequests();
        
        if (error) {
            showError(contentArea, error.message);
            return;
        }
        
        // Render requests
        contentArea.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body">
                    <h2 class="card-title mb-4">
                        <i class="bi bi-ticket-perforated"></i> My Ticket Requests
                    </h2>
                    ${renderRequestsTable(requests)}
                </div>
            </div>
        `;
        
        // Attach cancel button handlers
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.currentTarget.dataset.requestId;
                const eventTitle = e.currentTarget.dataset.eventTitle;
                handleCancelRequest(requestId, eventTitle);
            });
        });
        
    } catch (error) {
        console.error('Failed to load requests:', error);
        showError(contentArea, 'An unexpected error occurred');
    }
}

/**
 * Initialize my requests page
 */
async function init() {
    try {
        // Require authentication
        const user = await requireAuth();
        if (!user) return;
        
        renderNavbar('my-requests');
        
        // Load requests
        await loadRequests();
        
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
