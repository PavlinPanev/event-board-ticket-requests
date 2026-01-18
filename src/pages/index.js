import { renderNavbar } from '../components/navbar.js';

/**
 * Initialize index page (events list)
 */
async function init() {
    try {
        renderNavbar('index');
        
        // Page initialization
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<p class="text-muted">Loading events...</p>';
        
        // TODO: Fetch events and render
        
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
