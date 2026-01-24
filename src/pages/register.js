import { renderNavbar } from '../components/navbar.js';
import { register, getSession, ensureProfile } from '../services/authService.js';

/**
 * Initialize register page
 */
async function init() {
    try {
        // Check if already logged in
        const { user } = await getSession();
        if (user) {
            window.location.href = '/index.html';
            return;
        }

        renderNavbar('register');
        
        // Render registration form
        const contentArea = document.getElementById('content');
        contentArea.innerHTML = renderRegisterForm();
        
        // Attach event listeners
        attachEventListeners();
        
    } catch (error) {
        console.error('Page initialization failed:', error);
        document.getElementById('content').innerHTML = 
            '<div class="alert alert-danger">Failed to load page</div>';
    }
}

/**
 * Render registration form HTML
 */
function renderRegisterForm() {
    return `
        <div class="card">
            <div class="card-body">
                <form id="register-form" novalidate>
                    <div class="mb-3">
                        <label for="display-name" class="form-label">Display Name</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="display-name" 
                            name="display_name"
                            required
                            minlength="2"
                            placeholder="Your name"
                        >
                        <div class="invalid-feedback">Display name must be at least 2 characters.</div>
                    </div>
                    
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
                            placeholder="At least 6 characters"
                        >
                        <div class="invalid-feedback">Password must be at least 6 characters.</div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="password-confirm" class="form-label">Confirm Password</label>
                        <input 
                            type="password" 
                            class="form-control" 
                            id="password-confirm" 
                            name="password_confirm"
                            required
                            minlength="6"
                            placeholder="Re-enter password"
                        >
                        <div class="invalid-feedback">Passwords must match.</div>
                    </div>
                    
                    <div id="error-message" class="alert alert-danger d-none" role="alert"></div>
                    <div id="success-message" class="alert alert-success d-none" role="alert"></div>
                    
                    <button type="submit" class="btn btn-primary w-100" id="submit-btn">
                        Create Account
                    </button>
                </form>
                
                <div class="text-center mt-3">
                    <p class="text-muted">Already have an account? <a href="/login.html">Sign in here</a></p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    const form = document.getElementById('register-form');
    form.addEventListener('submit', handleRegister);
}

/**
 * Handle registration form submission
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    
    // Reset validation
    form.classList.remove('was-validated');
    errorMessage.classList.add('d-none');
    successMessage.classList.add('d-none');
    
    // Validate form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Get form data
    const formData = new FormData(form);
    const displayName = formData.get('display_name').trim();
    const email = formData.get('email').trim();
    const password = formData.get('password');
    const passwordConfirm = formData.get('password_confirm');
    
    // Validation
    if (!displayName || !email || !password || !passwordConfirm) {
        showError('Please fill in all fields');
        return;
    }
    
    if (displayName.length < 2) {
        showError('Display name must be at least 2 characters');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return;
    }
    
    try {
        // Disable form during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
        
        // Attempt registration
        const { user, error } = await register(email, password);
        
        if (error) {
            throw error;
        }
        
        if (!user) {
            throw new Error('Registration failed. Please try again.');
        }
        
        // Create profile entry with display name
        const { error: profileError } = await ensureProfile({
            display_name: displayName,
            role: 'user'
        });
        
        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Continue anyway - login will attempt to create profile again
        }
        
        // Success
        showSuccess('Account created successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showError(error.message || 'Registration failed. Please try again.');
        
        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
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

/**
 * Show success message
 */
function showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    successMessage.textContent = message;
    successMessage.classList.remove('d-none');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
