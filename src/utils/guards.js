/**
 * Auth Guards - Route protection utilities
 * Use these to protect pages that require authentication or admin access
 */

import { getSession } from '../services/authService.js';
import { supabase } from '../services/supabaseClient.js';

/**
 * Require authentication
 * Redirects to login page if user is not authenticated
 * @returns {Promise<Object|null>} Current user or null if redirected
 */
export async function requireAuth() {
    try {
        const { user } = await getSession();
        
        if (!user) {
            // Save current page to redirect back after login
            const currentPath = window.location.pathname;
            sessionStorage.setItem('redirectAfterLogin', currentPath);
            
            // Redirect to login
            window.location.href = '/login.html';
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return null;
    }
}

/**
 * Require admin role
 * Redirects to index page if user is not admin
 * @returns {Promise<Object|null>} Current user if admin, null if redirected
 */
export async function requireAdmin() {
    try {
        // First check if authenticated
        const user = await requireAuth();
        
        if (!user) {
            return null;
        }
        
        // Check if user is admin
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('Profile fetch error:', error);
            window.location.href = '/index.html';
            return null;
        }
        
        if (!profile || profile.role !== 'admin') {
            console.warn('User is not admin');
            // Show alert and redirect
            alert('Access denied. Admin privileges required.');
            window.location.href = '/index.html';
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Admin check failed:', error);
        window.location.href = '/index.html';
        return null;
    }
}

/**
 * Check if current user is admin (without redirect)
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
    try {
        const { user } = await getSession();
        
        if (!user) {
            return false;
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        return profile?.role === 'admin';
    } catch (error) {
        console.error('Admin check error:', error);
        return false;
    }
}

/**
 * Check if user is authenticated (without redirect)
 * @returns {Promise<boolean>} True if user is authenticated
 */
export async function isAuthenticated() {
    try {
        const { user } = await getSession();
        return !!user;
    } catch (error) {
        return false;
    }
}

/**
 * Get redirect path after login
 * @returns {string} Redirect path or default to index
 */
export function getRedirectPath() {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    return redirectPath || '/index.html';
}
