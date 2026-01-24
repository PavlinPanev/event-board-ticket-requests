import { renderNavbar } from '../components/navbar.js';
import { requireAuth } from '../utils/guards.js';

/**
 * Initialize my requests page
 */
async function init() {
    try {
        // Require authentication
        const user = await requireAuth();
        if (!user) return;
        
        renderNavbar('my-requests');
        
        // Page initialization
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<p class="text-muted">Loading your requests...</p>';
        
        // TODO: Fetch user's ticket requests and render list
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load requests</div>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
