import { renderNavbar } from '../components/navbar.js';

/**
 * Initialize login page
 */
async function init() {
    try {
        renderNavbar('login');
        
        // Page initialization
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<p class="text-muted">Login form will load here...</p>';
        
        // TODO: Render login form
        
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
