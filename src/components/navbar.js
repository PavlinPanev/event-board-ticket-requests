/**
 * Shared navbar component
 * Renders the same navbar markup on every page
 */

import { getSession, logout } from '../services/authService.js';

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
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/index.html">
                    📋 Event Board
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
                                <a class="nav-link dropdown-toggle" href="#" id="authDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    👤 Account
                                </a>
                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="authDropdown">
                                    <li><h6 class="dropdown-header">${user.email}</h6></li>
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
                                <a class="nav-link ${currentPage === 'register' ? 'active' : ''}" href="/register.html">
                                    Register
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
}
