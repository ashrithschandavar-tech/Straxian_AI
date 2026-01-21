# Note-Taking Feature Documentation

## Overview
A complete note-taking system integrated into the Straxian AI application. Users can create, edit, delete, and organize their notes with automatic saving.

## Features

### 1. **Create Notes**
- Click "My Notes" in the sidebar to navigate to the notes section
- Click "New Note" button to create a fresh note
- Add a title and content
- Notes are automatically saved every 30 seconds

### 2. **Edit Notes**
- Click on any note card to open the editor
- Modify the title and content
- Auto-saves every 30 seconds
- Manual save button available for immediate saving

### 3. **Delete Notes**
- Click the trash icon on a note card in the grid view
- Or use the "Delete" button in the editor view
- Confirmation required before deletion

### 4. **View Notes**
- Grid layout showing all notes with previews
- Each note card displays:
  - Note title
  - First 150 characters of content
  - Last modified date
  - Delete button

### 5. **Auto-Save**
- Notes are automatically saved every 30 seconds
- Manual save button for immediate saving
- Last saved timestamp displayed in editor

## File Structure

### New Files Created:
- **notes.html** - Dedicated notes page with full UI
- **notes.js** - JavaScript for notes functionality
- **style.css** (updated) - Added `.note-card` and related styles

### Modified Files:
- **index.html** - Added "My Notes" button in sidebar
- **script.js** - Added notes navigation button handler

## Database Schema

Notes are stored in Firestore with the following structure:

```
Collection: "notes"
Documents:
{
  userId: string,           // User ID from authentication
  title: string,            // Note title
  content: string,          // Note content
  createdAt: timestamp,     // Creation date
  updatedAt: timestamp      // Last modified date
}
```

## User Interface

### Notes Grid View
- Responsive grid layout (1 column on mobile, 2 on tablet, 3 on desktop)
- Yellow sticky-note inspired cards
- Hover effects showing delete buttons
- Preview of note content
- Last modified date display

### Note Editor View
- Full-width textarea for note content
- Editable title input
- Auto-save indicator with timestamp
- Save and Delete buttons
- Back button to return to grid view

## Styling

### Color Scheme
- **Primary**: Yellow (#fbbf24, #fcd34d) - Sticky note theme
- **Background**: Linear gradient from #fffacd to #fffef0
- **Text**: Dark brown (#78350f, #92400e)
- **Hover**: Subtle lift effect with enhanced shadow

### CSS Classes
- `.note-card` - Main note card container
- `.note-actions` - Action buttons container
- `.note-date` - Date display styling
- `.animate-fade-in` - Fade-in animation for cards

## Functionality Details

### Auto-Save System
- Triggers every 30 seconds when editing a note
- Saves to Firestore in the background
- No user interaction needed
- Manual save button for immediate saving

### Validation
- Prevents saving empty notes
- Confirmation dialogs for deletions
- HTML escaping for security

### Real-time Updates
- Firestore listener for live note updates
- Grid refreshes when notes are added/deleted by other sessions
- Timestamps update automatically

## Navigation

From the main dashboard:
1. Click "My Notes" in the sidebar
2. View all your notes in grid format
3. Click any note to edit
4. Use "New Note" button to create a fresh note
5. Click "Back" or sidebar button to return

## Best Practices

1. **Frequent Saving**: Auto-save every 30 seconds ensures no data loss
2. **Clear Titles**: Use descriptive titles for easy note organization
3. **Organized Content**: Keep notes focused and well-structured
4. **Regular Review**: Periodically review and clean up old notes

## Future Enhancements

Potential improvements for the note-taking system:
- Search functionality
- Note categories/tags
- Rich text editor (bold, italic, lists)
- Note sharing
- Export to PDF
- Cloud sync across devices
- Note templates
- Collaboration features
