/**
 * Shared navbar component
 * Renders the same navbar markup on every page
 */

import { getSession, logout } from '../services/authService.js';
import { supabase } from '../services/supabaseClient.js';

export async function renderNavbar(currentPage = '') {
    const navbarContainer = document.getElementById('navbar-container');
    
    if (!navbarContainer) {
        console.warn('Navbar container not found');
        return;
    }

    // Get current session
    const { user } = await getSession();
    
    navbarContainer.innerHTML = createNavbarMarkup(currentPage, user);
    attachNavbarEventListeners();
}

/**
 * Create navbar HTML markup
 * @param {string} currentPage - Current page identifier for active link highlighting
 * @param {Object|null} user - Current authenticated user or null
 * @returns {string} HTML string
 */
function createNavbarMarkup(currentPage, user = null) {
    return `
        <nav class="navbar navbar-expand-lg">
            <div class="container-fluid">
                <a class="navbar-brand" href="/index.html">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="navbar-logo-icon">
                        <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor"/>
                        <rect x="3" y="13" width="7" height="7" rx="1" fill="currentColor"/>
                        <rect x="13" y="3" width="7" height="7" rx="1" fill="currentColor"/>
                        <rect x="13" y="13" width="7" height="7" rx="1" fill="currentColor"/>
                    </svg>
                    <span class="navbar-brand-text">Event Board</span>
                </a>
                
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link ${currentPage === 'index' ? 'active' : ''}" href="/index.html">
                                Events
                            </a>
                        </li>
                        
                        ${user ? `
                            <li class="nav-item">
                                <a class="nav-link ${currentPage === 'create-event' ? 'active' : ''}" href="/create-event.html">
                                    Create Event
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${currentPage === 'my-requests' ? 'active' : ''}" href="/my-requests.html">
                                    My Requests
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link ${currentPage === 'admin' ? 'active' : ''}" href="/admin.html">
                                    Admin
                                </a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link dropdown-toggle nav-account" href="#" id="authDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="nav-account-icon">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    <span class="nav-account-text">Account</span>
                                </a>
                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="authDropdown">
                                    <li><h6 class="dropdown-header">${user.email}</h6></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <button class="dropdown-item" id="toggle-role-btn">
                                            🔄 Toggle Role (Current: <span id="current-role">Loading...</span>)
                                        </button>
                                    </li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li>
                                        <a class="dropdown-item" href="#" id="logout-btn">
                                            Logout
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        ` : `
                            <li class="nav-item">
                                <a class="nav-link ${currentPage === 'login' ? 'active' : ''}" href="/login.html">
                                    Login
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="btn btn-primary btn-sm nav-cta" href="/register.html">
                                    Get Started
                                </a>
                            </li>
                        `}
                    </ul>
                </div>
            </div>
        </nav>
    `;
}

/**
 * Attach event listeners to navbar elements
 */
function attachNavbarEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    const toggleRoleBtn = document.getElementById('toggle-role-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                await logout();
                // Redirect to home after logout
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Failed to logout. Please try again.');
            }
        });
    }
    
    if (toggleRoleBtn) {
        // Load and display current role
        loadCurrentRole();
        
        toggleRoleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await toggleUserRole();
        });
    }
}

/**
 * Load and display current user role
 */
async function loadCurrentRole() {
    try {
        const { user } = await getSession();
        if (!user) return;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        const roleSpan = document.getElementById('current-role');
        if (roleSpan && profile) {
            roleSpan.textContent = profile.role;
            roleSpan.style.fontWeight = 'bold';
            roleSpan.style.color = profile.role === 'admin' ? '#dc3545' : '#0d6efd';
        }
    } catch (error) {
        console.error('Load role error:', error);
    }
}

/**
 * Toggle user role between 'user' and 'admin' (for testing/evaluation purposes)
 */
async function toggleUserRole() {
    try {
        const { user } = await getSession();
        if (!user) {
            alert('You must be logged in to toggle role');
            return;
        }
        
        // Get current role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (!profile) {
            alert('Profile not found. Please contact administrator.');
            return;
        }
        
        // Toggle role
        const newRole = profile.role === 'admin' ? 'user' : 'admin';
        
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', user.id);
        
        if (error) {
            console.error('Toggle role error:', error);
            alert('Failed to toggle role: ' + error.message);
            return;
        }
        
        // Show success message and reload
        alert(`Role changed to: ${newRole.toUpperCase()}\n\nPage will reload to apply changes.`);
        window.location.reload();
        
    } catch (error) {
        console.error('Toggle role error:', error);
        alert('An error occurred while toggling role.');
    }
}
