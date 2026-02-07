/**
 * Calendar Page - Yearly event calendar view
 * Shows all published events in a 12-month grid with venue color coding
 */

import { renderNavbar } from '../components/navbar.js';
import { getPublishedEventsForRange } from '../services/eventsService.js';
import { getAllVenues } from '../services/venuesService.js';

// Color palette for venues (cycling through these)
const VENUE_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

let currentYear = new Date().getFullYear();
let venueColorMap = new Map(); // venueId -> color
let eventsMap = new Map(); // 'YYYY-MM-DD' -> [events]
let tooltip = null;
let tooltipTimeout = null;

/**
 * Page initialization
 */
async function init() {
    try {
        // Render navbar
        await renderNavbar('calendar');
        
        // Setup year selector
        setupYearSelector();
        
        // Load and render calendar
        await loadAndRenderCalendar(currentYear);
        
        // Setup tooltip element
        tooltip = document.getElementById('event-tooltip');
        
        // Attach year change listener
        document.getElementById('year-selector').addEventListener('change', handleYearChange);
        
    } catch (error) {
        console.error('Calendar init error:', error);
        showError('Failed to initialize calendar. Please refresh the page.');
    }
}

/**
 * Setup year selector dropdown
 */
function setupYearSelector() {
    const yearSelector = document.getElementById('year-selector');
    const currentYr = new Date().getFullYear();
    
    // Generate years: current - 1 to current + 2
    for (let year = currentYr - 1; year <= currentYr + 2; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYr) {
            option.selected = true;
        }
        yearSelector.appendChild(option);
    }
}

/**
 * Handle year selection change
 */
async function handleYearChange(event) {
    currentYear = parseInt(event.target.value, 10);
    await loadAndRenderCalendar(currentYear);
}

/**
 * Load data and render calendar for specified year
 */
async function loadAndRenderCalendar(year) {
    try {
        showLoading();
        
        // Calculate date range for the year
        const startDate = new Date(year, 0, 1); // Jan 1
        const endDate = new Date(year + 1, 0, 1); // Jan 1 next year
        
        const startISO = startDate.toISOString();
        const endISO = endDate.toISOString();
        
        // Fetch venues and events in parallel
        const [venuesResult, eventsResult] = await Promise.all([
            getAllVenues(),
            getPublishedEventsForRange(startISO, endISO)
        ]);
        
        if (venuesResult.error) {
            throw new Error('Failed to load venues');
        }
        
        if (eventsResult.error) {
            throw new Error('Failed to load events');
        }
        
        const venues = venuesResult.data || [];
        const events = eventsResult.data || [];
        
        // Build venue color map
        buildVenueColorMap(venues);
        
        // Build events map by date
        buildEventsMap(events);
        
        // Render legend
        renderLegend(venues);
        
        // Render 12-month calendar
        renderCalendar(year);
        
        showCalendar();
        
    } catch (error) {
        console.error('Load calendar error:', error);
        showError('Failed to load calendar data. Please try again.');
    }
}

/**
 * Build venue ID -> color mapping
 */
function buildVenueColorMap(venues) {
    venueColorMap.clear();
    venues.forEach((venue, index) => {
        const color = VENUE_COLORS[index % VENUE_COLORS.length];
        venueColorMap.set(venue.id, color);
    });
}

/**
 * Build date -> events mapping
 * Date key format: YYYY-MM-DD in Europe/Sofia timezone
 */
function buildEventsMap(events) {
    eventsMap.clear();
    
    events.forEach(event => {
        // Parse starts_at in Europe/Sofia timezone
        const eventDate = new Date(event.starts_at);
        const dateKey = formatDateKey(eventDate);
        
        if (!eventsMap.has(dateKey)) {
            eventsMap.set(dateKey, []);
        }
        eventsMap.get(dateKey).push(event);
    });
}

/**
 * Format date as YYYY-MM-DD key
 */
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Render venue legend
 */
function renderLegend(venues) {
    const legendContainer = document.getElementById('calendar-legend');
    
    if (venues.length === 0) {
        legendContainer.innerHTML = '<p class="text-muted small">No venues available</p>';
        return;
    }
    
    const legendItems = venues.map(venue => {
        const color = venueColorMap.get(venue.id) || '#6c757d';
        return `
            <div class="legend-item">
                <span class="legend-dot" style="background-color: ${color};"></span>
                <span class="legend-label">${escapeHtml(venue.name)}</span>
            </div>
        `;
    }).join('');
    
    legendContainer.innerHTML = `
        <div class="legend-container">
            <strong class="legend-title">Venues:</strong>
            <div class="legend-items">
                ${legendItems}
            </div>
        </div>
    `;
}

/**
 * Render 12-month calendar grid
 */
function renderCalendar(year) {
    const calendarRoot = document.getElementById('calendar-root');
    
    const monthsHTML = Array.from({ length: 12 }, (_, monthIndex) => {
        return renderMonth(year, monthIndex);
    }).join('');
    
    calendarRoot.innerHTML = `
        <div class="row g-4">
            ${monthsHTML}
        </div>
    `;
    
    // Attach event listeners to all day buttons
    attachDayEventListeners();
}

/**
 * Render a single month calendar
 */
function renderMonth(year, monthIndex) {
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, monthIndex));
    
    // Get first day of month and total days
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get starting day of week (0 = Sunday, adjust to Monday = 0)
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday = 0
    
    // Build day cells
    const dayCells = [];
    
    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        dayCells.push('<div class="calendar-day calendar-day-empty"></div>');
    }
    
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = eventsMap.get(dateKey) || [];
        
        dayCells.push(renderDayCell(day, dayEvents, dateKey));
    }
    
    // Weekday headers
    const weekdayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        .map(day => `<div class="calendar-weekday">${day}</div>`)
        .join('');
    
    return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="month-container">
                <h5 class="month-title">${monthName} ${year}</h5>
                <div class="calendar-grid">
                    ${weekdayHeaders}
                    ${dayCells.join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render a single day cell
 */
function renderDayCell(day, events, dateKey) {
    const hasEvents = events.length > 0;
    
    if (!hasEvents) {
        return `
            <div class="calendar-day">
                <span class="calendar-day-number">${day}</span>
            </div>
        `;
    }
    
    // Get unique venue colors for this day
    const venueIds = [...new Set(events.map(e => e.venue_id).filter(Boolean))];
    const colors = venueIds.map(id => venueColorMap.get(id) || '#6c757d');
    
    // Create color indicators
    const indicatorsHTML = colors.slice(0, 3).map(color => 
        `<span class="event-indicator" style="background-color: ${color};"></span>`
    ).join('');
    
    const overflowCount = colors.length > 3 ? colors.length - 3 : 0;
    const overflowHTML = overflowCount > 0 ? `<span class="event-overflow">+${overflowCount}</span>` : '';
    
    return `
        <button 
            class="calendar-day calendar-day-with-events" 
            data-date="${dateKey}"
            aria-label="${day} - ${events.length} event${events.length > 1 ? 's' : ''}"
            tabindex="0"
        >
            <span class="calendar-day-number">${day}</span>
            <div class="event-indicators">
                ${indicatorsHTML}
                ${overflowHTML}
            </div>
        </button>
    `;
}

/**
 * Attach event listeners to day cells
 */
function attachDayEventListeners() {
    const dayCells = document.querySelectorAll('.calendar-day-with-events');
    
    dayCells.forEach(cell => {
        // Mouse events
        cell.addEventListener('mouseenter', handleDayHover);
        cell.addEventListener('mouseleave', handleDayLeave);
        
        // Keyboard focus events
        cell.addEventListener('focus', handleDayHover);
        cell.addEventListener('blur', handleDayLeave);
        
        // Mobile tap events
        cell.addEventListener('click', handleDayClick);
    });
    
    // Click outside to close tooltip on mobile
    document.addEventListener('click', handleOutsideClick);
}

/**
 * Handle day cell hover/focus
 */
function handleDayHover(event) {
    const dateKey = event.currentTarget.dataset.date;
    const events = eventsMap.get(dateKey) || [];
    
    if (events.length === 0) return;
    
    clearTimeout(tooltipTimeout);
    showTooltip(event.currentTarget, events);
}

/**
 * Handle day cell leave/blur
 */
function handleDayLeave() {
    tooltipTimeout = setTimeout(() => {
        hideTooltip();
    }, 150);
}

/**
 * Handle day cell click (for mobile)
 */
function handleDayClick(event) {
    event.stopPropagation();
    
    // On mobile, toggle tooltip
    if (window.innerWidth < 768) {
        const dateKey = event.currentTarget.dataset.date;
        const events = eventsMap.get(dateKey) || [];
        
        if (tooltip.style.display === 'block' && tooltip.dataset.currentDate === dateKey) {
            hideTooltip();
        } else {
            showTooltip(event.currentTarget, events, dateKey);
        }
    }
}

/**
 * Handle click outside tooltip (mobile)
 */
function handleOutsideClick(event) {
    if (!event.target.closest('.calendar-day-with-events') && !event.target.closest('#event-tooltip')) {
        hideTooltip();
    }
}

/**
 * Show tooltip with event details
 */
function showTooltip(target, events, dateKey = '') {
    const rect = target.getBoundingClientRect();
    
    // Show up to 3 events
    const displayEvents = events.slice(0, 3);
    const hasMore = events.length > 3;
    
    const eventsHTML = displayEvents.map(event => {
        const venueName = event.venue ? escapeHtml(event.venue.name) : 'No venue';
        const venueColor = event.venue_id ? venueColorMap.get(event.venue_id) : '#6c757d';
        const timeStr = formatEventTime(event.starts_at);
        
        return `
            <div class="tooltip-event">
                <div class="tooltip-event-header">
                    <span class="tooltip-event-dot" style="background-color: ${venueColor};"></span>
                    <strong>${escapeHtml(event.title)}</strong>
                </div>
                <div class="tooltip-event-details">
                    <small class="text-muted">${timeStr} • ${venueName}</small>
                </div>
                <a href="/event-details.html?id=${event.id}" class="tooltip-event-link">View details →</a>
            </div>
        `;
    }).join('');
    
    const moreHTML = hasMore ? `<p class="tooltip-more text-muted small mb-0">+${events.length - 3} more event${events.length - 3 > 1 ? 's' : ''}...</p>` : '';
    
    tooltip.querySelector('.event-tooltip-content').innerHTML = eventsHTML + moreHTML;
    tooltip.style.display = 'block';
    tooltip.dataset.currentDate = dateKey;
    
    // Position tooltip
    positionTooltip(rect);
}

/**
 * Position tooltip relative to target element
 */
function positionTooltip(targetRect) {
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Default: position above the target, centered
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    let top = targetRect.top - tooltipRect.height - 10;
    
    // Adjust if tooltip goes off-screen horizontally
    if (left < 10) {
        left = 10;
    } else if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // Adjust if tooltip goes off-screen vertically (show below instead)
    if (top < 10) {
        top = targetRect.bottom + 10;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.dataset.currentDate = '';
    }
}

/**
 * Format event time for display
 */
function formatEventTime(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Sofia'
    }).format(date);
}

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('calendar-loading').style.display = 'block';
    document.getElementById('calendar-root').style.display = 'none';
    document.getElementById('calendar-error').style.display = 'none';
}

/**
 * Show calendar content
 */
function showCalendar() {
    document.getElementById('calendar-loading').style.display = 'none';
    document.getElementById('calendar-root').style.display = 'block';
    document.getElementById('calendar-error').style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    const errorContainer = document.getElementById('calendar-error');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    document.getElementById('calendar-loading').style.display = 'none';
    document.getElementById('calendar-root').style.display = 'none';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
