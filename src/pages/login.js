import { renderNavbar } from '../components/navbar.js';
import { login, getSession, ensureProfile } from '../services/authService.js';

/**
 * Initialize login page
 */
async function init() {
    try {
        // Check if already logged in
        const { user } = await getSession();
        if (user) {
            window.location.href = '/index.html';
            return;
        }

        renderNavbar('login');
        
        // Render login form
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = renderLoginForm();
        
        // Attach event listeners
        attachEventListeners();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load page</div>';
    }
}

/**
 * Render login form HTML
 */
function renderLoginForm() {
    return `
        <div class="card">
            <div class="card-body">
                <form id="login-form" novalidate>
                    <div class="mb-3">
                        <label for="email" class="form-label">Email address</label>
                        <input 
                            type="email" 
                            class="form-control" 
                            id="email" 
                            name="email"
                            required
                            placeholder="you@example.com"
                        >
                        <div class="invalid-feedback">Please enter a valid email.</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="password" 
                            name="password"
                            required
                            minlength="6"
                            placeholder="Enter your password"
                        >
                        <div class="invalid-feedback">Password must be at least 6 characters.</div>
                    </div>
                    
                    <div id="error-message" class="alert alert-danger d-none" role="alert"></div>
                    
                    <button type="submit" class="btn btn-primary w-100" id="submit-btn">
                        Sign In
                    </button>
                </form>
                
                <div class="text-center mt-3">
                    <p class="text-muted">Don't have an account? <a href="/register.html">Register here</a></p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', handleLogin);
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');
    
    // Reset validation
    form.classList.remove('was-validated');
    errorMessage.classList.add('d-none');
    
    // Validate form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get form data
    const formData = new FormData(form);
    const email = formData.get('email').trim();
    const password = formData.get('password');
    
    // Basic validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    try {
        // Disable form during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
        
        // Attempt login
        const { user, error } = await login(email, password);
        
        if (error) {
            throw error;
        }
        
        if (!user) {
            throw new Error('Login failed. Please check your credentials.');
        }
        
        // Ensure profile exists
        await ensureProfile();
        
        // Success - redirect to home
        window.location.href = '/index.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Invalid email or password. Please try again.');
        
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.classList.remove('d-none');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
