import { renderNavbar } from '../components/navbar.js';
import { requireAdmin } from '../utils/guards.js';

/**
 * Initialize admin panel page
 */
async function init() {
    try {
        // Require admin privileges
        const user = await requireAdmin();
        if (!user) return;
        
        renderNavbar('admin');
        
        // Page initialization
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = '<p class="text-muted">Loading admin panel...</p>';
        
        // TODO: Render admin dashboard, manage requests, events, etc.
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load admin panel</div>';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
