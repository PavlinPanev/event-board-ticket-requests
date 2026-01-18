# Event Board + Ticket Requests - Technical Specification

## 1. Overview

A web platform for managing events and ticket requests. Users can browse published events, request tickets, and track their requests. Administrators manage events, venues, and approve/reject ticket requests.

## 2. User Roles

### Guest
- View published events and event details
- Access search and filter functionality
- No ticket request capabilities

### User (Authenticated)
- All guest permissions
- Create/edit own events
- Submit ticket requests for events
- View own ticket requests history
- Upload event assets (images, posters, PDFs)

### Admin
- All user permissions
- Edit/delete any event
- Approve, reject, or manage all ticket requests
- Moderate event content
- Full access to admin panel

## 3. Screens

### 3.1 Home / Events List
- Display all published events
- Search functionality (title, description)
- Filter by date, venue, status
- Pagination/infinite scroll
- Event card preview (image, title, date, venue)

### 3.2 Event Details
- Full event information (title, description, date, time, venue, capacity)
- Event assets gallery (images, PDFs)
- Ticket request form (if logged in)
- Display venue information
- Show organizer name
- Related events section

### 3.3 Create/Edit Event
- Form fields: title, description, starts_at, venue_id, capacity notes
- File upload for event assets
- Status selection (draft/published/archived)
- Save as draft or publish immediately
- Validation and error handling

### 3.4 Ticket Request Form
- Quantity selector
- Additional notes/special requests
- Display event details context
- Submit request
- Confirmation message

### 3.5 My Requests
- List of user's ticket requests
- Columns: event name, quantity requested, status (pending/approved/rejected), submission date
- Filter by status
- Cancel/edit pending requests option
- Sorted by most recent

### 3.6 Admin Panel
- **Requests Management**: View all ticket requests, approve/reject with optional notes
- **Events Moderation**: List all events, edit/delete, change status, view request count
- **Analytics**: Events count, total requests, pending requests
- **User Management**: View profiles, role assignment

## 4. Core User Flows

### Flow 1: Browse & Request Tickets
1. Guest/User visits Home
2. Browse events (search, filter)
3. Click event → Event Details
4. If logged in: Fill Ticket Request form → Submit
5. User receives confirmation

### Flow 2: Create & Publish Event
1. Logged-in user clicks "Create Event"
2. Fill event form (title, description, venue, date)
3. Upload event assets
4. Save as draft or publish
5. Event appears in public list (if published)

### Flow 3: Admin Request Management
1. Admin visits Admin Panel
2. View pending ticket requests
3. Click request → Review event details & requester info
4. Approve or reject with notes
5. Requester receives notification/email

### Flow 4: Admin Event Moderation
1. Admin views all events in Admin Panel
2. Can edit any event (change details, status)
3. Can delete events
4. Change event status (draft → published → archived)

## 5. Database Tables

### 5.1 `profiles` (extends auth.users)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, links to auth.users |
| role | enum | 'user' or 'admin' (default: 'user') |
| display_name | text | User's public name |
| created_at | timestamp | Profile creation time |
| updated_at | timestamp | Last profile update |

### 5.2 `venues`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Venue name |
| address | text | Full address |
| capacity | integer | Maximum capacity |
| created_at | timestamp | Record creation time |

### 5.3 `events`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | text | Event title |
| description | text | Detailed description |
| starts_at | timestamp | Event date and time |
| venue_id | UUID | Foreign key to venues |
| created_by | UUID | Foreign key to auth.users |
| status | enum | 'draft', 'published', 'archived' |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Last update time |

### 5.4 `ticket_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | Foreign key to events |
| requester_id | UUID | Foreign key to auth.users |
| quantity | integer | Number of tickets requested |
| note | text | Special requests or notes |
| status | enum | 'pending', 'approved', 'rejected' |
| created_at | timestamp | Request submission time |
| updated_at | timestamp | Last status change time |

### 5.5 `event_assets`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_id | UUID | Foreign key to events |
| uploaded_by | UUID | Foreign key to auth.users |
| file_path | text | Storage path (e.g., event-assets/event-uuid/filename) |
| file_name | text | Original file name |
| mime_type | text | File MIME type (image/jpeg, application/pdf, etc.) |
| created_at | timestamp | Upload time |

## 6. Storage Bucket

### Bucket Structure
```
event-assets/
├── {event_id}/
│   ├── poster.jpg
│   ├── image-1.png
│   ├── flyer.pdf
│   └── ...
```

### Permissions
- **Upload**: Logged-in users only (for their own events)
- **Read**: Public (or read-only for published event assets)
- **Delete**: Event owner or admin only

### Supported File Types
- Images: jpg, jpeg, png, gif
- Documents: pdf
- Max file size: 10MB per file

## 7. Access Control Rules

### Events
- **View**: Everyone can see published events
- **Create/Edit**: Only logged-in users (own events)
- **Edit/Delete**: Event owner or admin only
- **Drafts**: Owner and admin only

### Ticket Requests
- **Create**: Logged-in users only
- **View**: User sees only own requests; admin sees all
- **Approve/Reject**: Admin only

### Storage
- **Upload**: Logged-in users only
- **Read**: Public or published events only
- **Delete**: Uploader or admin only
