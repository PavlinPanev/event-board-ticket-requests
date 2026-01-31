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
import { getAssetUrl, getEventAssets, uploadEventAsset, deleteAsset } from '../services/storageService.js';
import { isAdmin } from '../utils/guards.js';

// Global state for current event and user
let currentEvent = null;
let currentUser = null;
let currentEventId = null;

/**
 * Check if current user can manage assets
 * @param {Object} user - Current user object
 * @param {Object} event - Event object
 * @returns {Promise<boolean>} True if user can manage assets
 */
async function canManageAssets(user, event) {
    if (!user || !event) {
        console.log('[canManageAssets] No user or event:', { user: !!user, event: !!event });
        return false;
    }
    
    // Check if user is admin
    const userIsAdmin = await isAdmin();
    console.log('[canManageAssets] Is admin:', userIsAdmin);
    if (userIsAdmin) {
        return true;
    }
    
    // Check if user is event owner
    const isOwner = user.id === event.created_by;
    console.log('[canManageAssets] Is owner:', isOwner, { userId: user.id, createdBy: event.created_by });
    return isOwner;
}

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
 * Render assets section
 * @param {Array} assets - Array of asset objects
 * @param {boolean} canManage - Whether user can manage assets
 * @returns {string} HTML string
 */
function renderAssets(assets, canManage = false) {
    console.log('[renderAssets] Called with:', { assetsCount: assets?.length, canManage });
    let html = '';
    
    // Upload form for authorized users
    if (canManage) {
        html += `
            <form id="asset-upload-form" class="mb-4">
                <div class="mb-3">
                    <label for="asset-file" class="form-label">Upload Asset</label>
                    <input 
                        type="file" 
                        class="form-control" 
                        id="asset-file" 
                        name="file"
                        accept="image/*,.pdf"
                        required
                    >
                    <div class="form-text">
                        Max 5MB. Allowed types: images (JPG, PNG, GIF, WebP, SVG) and PDF
                    </div>
                </div>
                <div id="upload-message"></div>
                <button type="submit" class="btn btn-primary btn-sm" id="upload-btn">
                    <i class="bi bi-upload"></i> Upload
                </button>
            </form>
            <hr>
        `;
    }
    
    // Empty state
    if (!assets || assets.length === 0) {
        html += '<p class="text-muted small">No assets uploaded yet.</p>';
        return html;
    }
    
    // Separate images and other files
    const images = assets.filter(a => a.mime_type && a.mime_type.startsWith('image/'));
    const others = assets.filter(a => !a.mime_type || !a.mime_type.startsWith('image/'));
    
    // Render images in grid
    if (images.length > 0) {
        html += '<div class="row g-2 mb-3">';
        images.forEach(asset => {
            html += `
                <div class="col-6 col-md-4" data-asset-id="${asset.id}">
                    <div class="position-relative">
                        <a href="${escapeHtml(asset.url || '#')}" target="_blank" rel="noopener noreferrer">
                            <img 
                                src="${escapeHtml(asset.url || '')}" 
                                alt="${escapeHtml(asset.file_name)}" 
                                class="img-thumbnail w-100" 
                                style="height: 120px; object-fit: cover; cursor: pointer;"
                                loading="lazy"
                            >
                        </a>
                        ${canManage ? `
                            <button 
                                class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 delete-asset-btn" 
                                data-asset-id="${asset.id}"
                                data-file-path="${escapeHtml(asset.file_path)}"
                                style="padding: 2px 6px; font-size: 11px;"
                                title="Delete ${escapeHtml(asset.file_name)}"
                            >
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <small class="text-muted d-block mt-1" style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(asset.file_name)}
                    </small>
                </div>
            `;
        });
        html += '</div>';
    }
    
    // Render other files as list
    if (others.length > 0) {
        html += '<div class="list-group list-group-flush">';
        others.forEach(asset => {
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center px-0" data-asset-id="${asset.id}">
                    <div class="flex-grow-1">
                        <a href="${escapeHtml(asset.url || '#')}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                            <i class="bi bi-file-earmark-pdf text-danger"></i>
                            ${escapeHtml(asset.file_name)}
                        </a>
                        <small class="text-muted d-block">
                            ${(asset.file_size / 1024).toFixed(1)} KB
                        </small>
                    </div>
                    ${canManage ? `
                        <button 
                            class="btn btn-danger btn-sm delete-asset-btn" 
                            data-asset-id="${asset.id}"
                            data-file-path="${escapeHtml(asset.file_path)}"
                        >
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    return html;
}

/**
 * Load and display event assets
 */
async function loadAssets() {
    const section = document.getElementById('assets-section');
    if (!section) return;
    
    try {
        // Initial loading state with full card structure
        section.innerHTML = `
            <div class="row mt-4">
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title mb-3">Assets</h5>
                            <p class="text-muted">Loading assets...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Fetch assets
        const { data: assets, error } = await getEventAssets(currentEventId);
        
        if (error) {
            console.error('Failed to load assets:', error);
            
            // Check if it's a missing column error (file_size not migrated)
            const errorMsg = error.message || '';
            let userMessage = 'Failed to load assets';
            
            if (errorMsg.includes('column') && errorMsg.includes('file_size')) {
                userMessage = 'Database migration required: file_size column missing. Run migration 005.';
            } else if (errorMsg) {
                userMessage = `Failed to load assets: ${errorMsg}`;
            }
            
            section.innerHTML = `
                <div class="row mt-4">
                    <div class="col-lg-8">
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Assets</h5>
                                <p class="text-danger small">${escapeHtml(userMessage)}</p>
                                ${errorMsg.includes('file_size') ? `
                                    <div class="alert alert-warning small">
                                        <strong>Fix:</strong> Run this SQL in Supabase Dashboard:<br>
                                        <code>ALTER TABLE event_assets ADD COLUMN IF NOT EXISTS file_size integer;</code>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Add URLs to assets
        const assetsWithUrls = await Promise.all(
            (assets || []).map(async (asset) => {
                const { data: url } = await getAssetUrl(asset.file_path);
                return { ...asset, url };
            })
        );
        
        // Check if user can manage assets (owner or admin)
        const canManage = await canManageAssets(currentUser, currentEvent);
        
        // Render assets in full card structure
        section.innerHTML = `
            <div class="row mt-4">
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title mb-3">Assets</h5>
                            ${renderAssets(assetsWithUrls, canManage)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Attach event listeners
        if (canManage) {
            attachAssetEventListeners();
        }
        
    } catch (error) {
        console.error('Load assets error:', error);
        section.innerHTML = `
            <div class="row mt-4">
                <div class="col-lg-8">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title mb-3">Assets</h5>
                            <p class="text-danger small">An error occurred</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * Handle asset upload
 * @param {Event} e - Form submit event
 */
async function handleUpload(e) {
    e.preventDefault();
    
    const form = e.target;
    const fileInput = form.querySelector('#asset-file');
    const uploadBtn = form.querySelector('#upload-btn');
    const messageDiv = form.querySelector('#upload-message');
    const file = fileInput.files[0];
    
    if (!file) {
        messageDiv.innerHTML = '<div class="alert alert-warning alert-dismissible fade show" role="alert">Please select a file<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        return;
    }
    
    // Disable form
    uploadBtn.disabled = true;
    fileInput.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Uploading...';
    
    try {
        // Upload file
        const { data, error } = await uploadEventAsset({ eventId: currentEventId, file });
        
        if (error) {
            messageDiv.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">${escapeHtml(error.message)}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
            return;
        }
        
        // Success
        messageDiv.innerHTML = '<div class="alert alert-success alert-dismissible fade show" role="alert">File uploaded successfully!<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        form.reset();
        
        // Debug helper (disabled by default, uncomment for debugging)
        // if (data && data.asset) {
        //     await debugAssetUrl(data.asset.file_path, data.asset.file_name);
        // }
        
        // Reload assets
        await loadAssets();
        
    } catch (error) {
        console.error('Upload error:', error);
        messageDiv.innerHTML = '<div class="alert alert-danger alert-dismissible fade show" role="alert">An unexpected error occurred<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
    } finally {
        // Re-enable form
        uploadBtn.disabled = false;
        fileInput.disabled = false;
        uploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload';
    }
}

/**
 * Handle asset deletion
 * @param {string} assetId - Asset ID
 * @param {string} filePath - File path in storage
 */
async function handleDelete(assetId, filePath) {
    if (!confirm('Are you sure you want to delete this asset?')) {
        return;
    }
    
    const assetElement = document.querySelector(`[data-asset-id="${assetId}"]`);
    if (assetElement) {
        assetElement.style.opacity = '0.5';
        assetElement.style.pointerEvents = 'none';
    }
    
    try {
        const { error } = await deleteAsset({ id: assetId, file_path: filePath });
        
        if (error) {
            alert(`Failed to delete asset: ${error.message}`);
            if (assetElement) {
                assetElement.style.opacity = '1';
                assetElement.style.pointerEvents = 'auto';
            }
            return;
        }
        
        // Reload assets
        await loadAssets();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('An unexpected error occurred');
        if (assetElement) {
            assetElement.style.opacity = '1';
            assetElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Attach event listeners for asset management
 */
function attachAssetEventListeners() {
    // Upload form
    const uploadForm = document.getElementById('asset-upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
    
    // Delete buttons
    const deleteButtons = document.querySelectorAll('.delete-asset-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const assetId = btn.dataset.assetId;
            const filePath = btn.dataset.filePath;
            handleDelete(assetId, filePath);
        });
    });
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
        
        // Store in global state
        currentEvent = event;
        currentUser = user;
        currentEventId = eventId;
        
        // Render event details
        contentArea.innerHTML = renderEventDetails(event, user);
        
        // Attach form handler if user is authenticated
        if (user) {
            const form = document.getElementById('ticket-request-form');
            if (form) {
                form.addEventListener('submit', (e) => handleTicketRequest(e, eventId));
            }
        }
        
        // Load assets
        await loadAssets();
        
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
