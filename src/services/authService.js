import { supabase } from './supabaseClient.js';

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user, session, error}>}
 */
export async function register(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        
        if (error) throw error;
        
        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        console.error('Registration error:', error);
        return { user: null, session: null, error };
    }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user, session, error}>}
 */
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        
        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        console.error('Login error:', error);
        return { user: null, session: null, error };
    }
}

/**
 * Logout current user
 * @returns {Promise<{error}>}
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        return { error: null };
    } catch (error) {
        console.error('Logout error:', error);
        return { error };
    }
}

/**
 * Get current user session
 * @returns {Promise<{user, session, error}>}
 */
export async function getSession() {
    try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        return { 
            user: data.session?.user || null, 
            session: data.session, 
            error: null 
        };
    } catch (error) {
        console.error('Get session error:', error);
        return { user: null, session: null, error };
    }
}

/**
 * Listen to authentication state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            callback({
                event,
                user: session?.user || null,
                session,
            });
        });
        
        // Return unsubscribe function
        return () => subscription?.unsubscribe();
    } catch (error) {
        console.error('Auth state change listener error:', error);
        return () => {};
    }
}

/**
 * Get current user (convenience function)
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
    const { user } = await getSession();
    return user;
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return !!user;
}
