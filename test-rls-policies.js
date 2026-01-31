/**
 * RLS Policy Testing Script
 * Tests all RLS policies end-to-end by simulating UI flows
 * 
 * To run this test:
 * 1. Ensure Supabase is configured in .env
 * 2. Run: node test-rls-policies.js
 * 
 * This script will:
 * - Test guest browse events (anon access)
 * - Test user registration and event creation
 * - Test user ticket requests
 * - Test admin approval flows
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// If running in Node.js, environment variables might not be loaded
// Try to read from .env file manually if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// If not found in process.env, check if .env file exists
if (!supabaseUrl || !supabaseAnonKey) {
    try {
        const envPath = join(__dirname, '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        const envLines = envContent.split('\n');
        
        envLines.forEach(line => {
            const match = line.match(/^VITE_SUPABASE_URL=(.+)$/);
            if (match) supabaseUrl = match[1].trim();
            
            const keyMatch = line.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/);
            if (keyMatch) supabaseAnonKey = keyMatch[1].trim();
        });
    } catch (error) {
        console.error('⚠️  Could not read .env file:', error.message);
    }
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
    console.error('\nTo create .env file:');
    console.error('1. Copy .env.example to .env');
    console.error('2. Fill in your Supabase URL and publishable key');
    console.error('3. Get credentials from: Supabase Dashboard → Settings → API');
    process.exit(1);
}

// Create Supabase clients
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking
const results = {
    passed: [],
    failed: []
};

/**
 * Log test result
 */
function logResult(testName, passed, error = null) {
    if (passed) {
        results.passed.push(testName);
        console.log(`✅ ${testName}`);
    } else {
        results.failed.push({ testName, error });
        console.log(`❌ ${testName}`);
        if (error) {
            console.log(`   Error: ${error.message}`);
            console.log(`   Code: ${error.code || 'N/A'}`);
            console.log(`   Details: ${JSON.stringify(error.details || {})}`);
        }
    }
}

/**
 * Test 1: Guest Browse Events (Anon RLS)
 */
async function testGuestBrowseEvents() {
    console.log('\n📋 Testing: Guest Browse Events');
    
    try {
        // Query published events (should succeed with RLS)
        const { data, error } = await anonClient
            .from('events')
            .select(`
                *,
                venue:venues(id, name, address, capacity)
            `)
            .eq('status', 'published')
            .order('starts_at', { ascending: true });
        
        if (error) {
            logResult('Guest can view published events', false, error);
            return;
        }
        
        logResult('Guest can view published events', true);
        console.log(`   Found ${data.length} published events`);
        
        // Try to query draft events (should return empty or fail RLS)
        const { data: draftData, error: draftError } = await anonClient
            .from('events')
            .select('*')
            .eq('status', 'draft');
        
        if (draftError) {
            logResult('Guest cannot view draft events', true);
        } else if (draftData && draftData.length === 0) {
            logResult('Guest cannot view draft events (empty result)', true);
        } else {
            logResult('Guest cannot view draft events', false, { 
                message: 'Guest could see draft events - RLS violation',
                data: draftData 
            });
        }
        
        // Try to view venues (should succeed - public table)
        const { data: venuesData, error: venuesError } = await anonClient
            .from('venues')
            .select('*');
        
        if (venuesError) {
            logResult('Guest can view venues', false, venuesError);
        } else {
            logResult('Guest can view venues', true);
            console.log(`   Found ${venuesData.length} venues`);
        }
        
    } catch (error) {
        logResult('Guest Browse Events - Unexpected Error', false, error);
    }
}

/**
 * Test 2: User Login (using existing user to avoid rate limits)
 */
async function testUserLogin() {
    console.log('\n📋 Testing: User Login');
    
    // Try to use an existing test user
    // If this fails, we'll skip authenticated tests
    const testEmail = 'admin@eventboard.com'; // Common test account
    const testPassword = 'admin123'; // Common test password
    
    try {
        // Try to sign in
        const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });
        
        if (signInError) {
            console.log(`   ℹ️  Could not login with test account: ${signInError.message}`);
            console.log('   ℹ️  Skipping authenticated tests - please create test user manually:');
            console.log('   1. Navigate to http://localhost:5174/register.html');
            console.log('   2. Register with: admin@eventboard.com / admin123');
            console.log('   3. Re-run this test script');
            logResult('User can login', false, signInError);
            return null;
        }
        
        logResult('User can login', true);
        const userId = signInData.user?.id;
        console.log(`   User ID: ${userId}`);
        
        // Create authenticated client
        const userClient = createClient(supabaseUrl, supabaseAnonKey);
        await userClient.auth.setSession({
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token
        });
        
        // Check profile
        const { data: profileData, error: profileError } = await userClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (profileError) {
            logResult('User has profile', false, profileError);
        } else {
            logResult('User has profile', true);
            console.log(`   Profile: ${profileData.display_name}, Role: ${profileData.role}`);
        }
        
        return { userId, userClient, email: testEmail, isAdmin: profileData?.role === 'admin' };
        
    } catch (error) {
        logResult('User Login - Unexpected Error', false, error);
        return null;
    }
}

/**
 * Test 3: User Create Event
 */
async function testUserCreateEvent(userContext) {
    console.log('\n📋 Testing: User Create Event');
    
    if (!userContext) {
        console.log('⏭️  Skipping - no user context');
        return null;
    }
    
    const { userId, userClient } = userContext;
    
    try {
        // Get a venue for the event
        const { data: venues } = await userClient.from('venues').select('id').limit(1);
        
        if (!venues || venues.length === 0) {
            logResult('Create event - no venues available', false, { message: 'No venues in database' });
            return null;
        }
        
        const venueId = venues[0].id;
        
        // Create a draft event
        const eventData = {
            title: 'Test Event - RLS Test',
            description: 'Testing RLS policies for event creation',
            starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            venue_id: venueId,
            created_by: userId,
            status: 'draft'
        };
        
        const { data: draftEvent, error: draftError } = await userClient
            .from('events')
            .insert(eventData)
            .select()
            .single();
        
        if (draftError) {
            logResult('User can create draft event', false, draftError);
            return null;
        }
        
        logResult('User can create draft event', true);
        console.log(`   Event ID: ${draftEvent.id}`);
        
        // Try to publish the event (update status)
        const { data: publishedEvent, error: publishError } = await userClient
            .from('events')
            .update({ status: 'published' })
            .eq('id', draftEvent.id)
            .select()
            .single();
        
        if (publishError) {
            logResult('User can publish own event', false, publishError);
            return draftEvent;
        }
        
        logResult('User can publish own event', true);
        
        // Try to view own event
        const { data: ownEvent, error: viewError } = await userClient
            .from('events')
            .select('*')
            .eq('id', publishedEvent.id)
            .single();
        
        if (viewError) {
            logResult('User can view own event', false, viewError);
        } else {
            logResult('User can view own event', true);
        }
        
        return publishedEvent;
        
    } catch (error) {
        logResult('User Create Event - Unexpected Error', false, error);
        return null;
    }
}

/**
 * Test 4: User Request Ticket
 */
async function testUserRequestTicket(userContext, event) {
    console.log('\n📋 Testing: User Request Ticket');
    
    if (!userContext || !event) {
        console.log('⏭️  Skipping - no user context or event');
        return null;
    }
    
    const { userId, userClient } = userContext;
    
    try {
        // Create ticket request
        const requestData = {
            event_id: event.id,
            requester_id: userId,
            quantity: 2,
            note: 'RLS policy test request',
            status: 'pending'
        };
        
        const { data: ticketRequest, error: requestError } = await userClient
            .from('ticket_requests')
            .insert(requestData)
            .select()
            .single();
        
        if (requestError) {
            logResult('User can request ticket for published event', false, requestError);
            return null;
        }
        
        logResult('User can request ticket for published event', true);
        console.log(`   Request ID: ${ticketRequest.id}`);
        
        // Try to view own request
        const { data: ownRequest, error: viewError } = await userClient
            .from('ticket_requests')
            .select(`
                *,
                event:events(id, title, starts_at)
            `)
            .eq('id', ticketRequest.id)
            .single();
        
        if (viewError) {
            logResult('User can view own ticket request', false, viewError);
        } else {
            logResult('User can view own ticket request', true);
        }
        
        // Try to view all own requests
        const { data: allRequests, error: allError } = await userClient
            .from('ticket_requests')
            .select('*')
            .eq('requester_id', userId);
        
        if (allError) {
            logResult('User can view all own requests', false, allError);
        } else {
            logResult('User can view all own requests', true);
            console.log(`   Total requests: ${allRequests.length}`);
        }
        
        // Try to update own pending request
        const { data: updatedRequest, error: updateError } = await userClient
            .from('ticket_requests')
            .update({ quantity: 3 })
            .eq('id', ticketRequest.id)
            .eq('status', 'pending')
            .select()
            .single();
        
        if (updateError) {
            logResult('User can update own pending request', false, updateError);
        } else {
            logResult('User can update own pending request', true);
        }
        
        return ticketRequest;
        
    } catch (error) {
        logResult('User Request Ticket - Unexpected Error', false, error);
        return null;
    }
}

/**
 * Test 5: Admin Operations
 */
async function testAdminOperations(userContext, event, ticketRequest) {
    console.log('\n📋 Testing: Admin Operations');
    
    if (!event || !ticketRequest) {
        console.log('⏭️  Skipping - no event or ticket request to test');
        return;
    }
    
    const { userClient, isAdmin } = userContext || {};
    
    try {
        // Test as non-authenticated user first
        // Try to view all ticket requests (should fail for non-admin/anon)
        const { data: allRequests, error: viewAllError } = await anonClient
            .from('ticket_requests')
            .select('*');
        
        if (viewAllError || (allRequests && allRequests.length === 0)) {
            logResult('Anon user cannot view all requests', true);
        } else {
            logResult('Anon user cannot view all requests', false, {
                message: 'Anon user could view all requests - possible RLS violation',
                count: allRequests?.length
            });
        }
        
        // Try to approve a request as anon (should fail)
        const { data: approvedRequest, error: approveError } = await anonClient
            .from('ticket_requests')
            .update({ status: 'approved' })
            .eq('id', ticketRequest.id)
            .select();
        
        if (approveError) {
            logResult('Anon user cannot approve requests', true);
        } else {
            logResult('Anon user cannot approve requests', false, {
                message: 'Anon user could approve request - RLS violation'
            });
        }
        
        // If we have an admin user, test admin operations
        if (isAdmin && userClient) {
            console.log('\n   Testing with admin user...');
            
            // Admin should view all requests
            const { data: adminViewAll, error: adminViewError } = await userClient
                .from('ticket_requests')
                .select('*');
            
            if (adminViewError) {
                logResult('Admin can view all requests', false, adminViewError);
            } else {
                logResult('Admin can view all requests', true);
                console.log(`   Admin sees ${adminViewAll.length} total requests`);
            }
            
            // Admin should view all events (including drafts)
            const { data: adminEvents, error: adminEventsError } = await userClient
                .from('events')
                .select('*');
            
            if (adminEventsError) {
                logResult('Admin can view all events', false, adminEventsError);
            } else {
                logResult('Admin can view all events', true);
                console.log(`   Admin sees ${adminEvents.length} total events`);
            }
        } else {
            console.log('\n   ℹ️  Note: No admin user available for full admin tests');
            console.log('   To test admin operations:');
            console.log('   1. Login or create a user via the UI');
            console.log('   2. Update their role to "admin" in profiles table');
            console.log('   3. Update test credentials in this script');
        }
        
    } catch (error) {
        logResult('Admin Operations - Unexpected Error', false, error);
    }
}

/**
 * Test 6: Event Owner Operations
 */
async function testEventOwnerOperations(userContext, event, ticketRequest) {
    console.log('\n📋 Testing: Event Owner Operations');
    
    if (!userContext || !event || !ticketRequest) {
        console.log('⏭️  Skipping - no context');
        return;
    }
    
    const { userClient } = userContext;
    
    try {
        // Event owner should be able to view requests for their event
        const { data: eventRequests, error: viewError } = await userClient
            .from('ticket_requests')
            .select('*')
            .eq('event_id', event.id);
        
        if (viewError) {
            logResult('Event owner can view requests for their event', false, viewError);
        } else {
            logResult('Event owner can view requests for their event', true);
            console.log(`   Requests for event: ${eventRequests.length}`);
        }
        
        // Event owner should be able to approve/reject requests
        const { data: updatedRequest, error: updateError } = await userClient
            .from('ticket_requests')
            .update({ status: 'approved' })
            .eq('id', ticketRequest.id)
            .select()
            .single();
        
        if (updateError) {
            logResult('Event owner can approve requests for their event', false, updateError);
        } else {
            logResult('Event owner can approve requests for their event', true);
        }
        
    } catch (error) {
        logResult('Event Owner Operations - Unexpected Error', false, error);
    }
}

/**
 * Print summary
 */
function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(60));
    
    if (results.failed.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.failed.forEach(({ testName, error }) => {
            console.log(`\n  • ${testName}`);
            if (error) {
                console.log(`    Error Message: ${error.message}`);
                console.log(`    Supabase Code: ${error.code || 'N/A'}`);
                console.log(`    Details: ${JSON.stringify(error.details || {}, null, 2)}`);
                if (error.hint) {
                    console.log(`    Hint: ${error.hint}`);
                }
            }
        });
    }
    
    console.log('\n');
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('🚀 Starting RLS Policy Tests');
    console.log('='.repeat(60));
    
    // Test 1: Guest browse
    await testGuestBrowseEvents();
    
    // Test 2: User login (instead of registration to avoid rate limits)
    const userContext = await testUserLogin();
    
    // Test 3: User create event
    const event = await testUserCreateEvent(userContext);
    
    // Test 4: User request ticket
    const ticketRequest = await testUserRequestTicket(userContext, event);
    
    // Test 5: Admin operations
    await testAdminOperations(userContext, event, ticketRequest);
    
    // Test 6: Event owner operations
    await testEventOwnerOperations(userContext, event, ticketRequest);
    
    // Print summary
    printSummary();
    
    // Cleanup: Sign out
    if (userContext) {
        await userContext.userClient.auth.signOut();
    }
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    console.error('💥 Fatal error running tests:', error);
    process.exit(1);
});
