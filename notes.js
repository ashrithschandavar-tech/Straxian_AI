import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── DARK MODE INITIALIZATION ───────────────────────────────────────
function initializeDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    applyDarkModeNotes();
  }
}

function applyDarkModeNotes() {
  document.documentElement.classList.add('dark');
  document.body.classList.add('bg-gray-900', 'text-white');
  document.body.classList.remove('bg-gray-50');
  
  document.querySelectorAll('.bg-white, .bg-gray-50').forEach(el => {
    el.classList.remove('bg-white', 'bg-gray-50');
    el.classList.add('bg-gray-800');
  });
  
  document.querySelectorAll('.text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500, .text-gray-900, .text-gray-400').forEach(el => {
    el.classList.remove('text-gray-800', 'text-gray-700', 'text-gray-600', 'text-gray-500', 'text-gray-900', 'text-gray-400');
    el.classList.add('text-gray-100');
  });
  
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.classList.add('bg-gray-700', 'text-white', 'border-gray-600');
    el.classList.remove('bg-white', 'border-gray-200');
  });
  
  const nav = document.querySelector('nav');
  if (nav) {
    nav.classList.remove('bg-white', 'shadow-sm');
    nav.classList.add('bg-gray-800', 'border-gray-700');
  }
  
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('bg-white');
    sidebar.classList.add('bg-gray-800');
  }
  
  addDarkModeNotesStyles();
}

function addDarkModeNotesStyles() {
  if (!document.getElementById('dark-mode-notes-styles')) {
    const style = document.createElement('style');
    style.id = 'dark-mode-notes-styles';
    style.textContent = `
      :root.dark {
        color-scheme: dark;
      }
      :root.dark input:focus, :root.dark select:focus, :root.dark textarea:focus {
        border-color: #eab308;
      }
      :root.dark .bg-yellow-50, :root.dark .bg-gray-50, :root.dark .bg-indigo-50 {
        background-color: #374151;
      }
      :root.dark .bg-red-100 {
        background-color: #7f1d1d;
      }
      :root.dark .text-red-600 {
        color: #fca5a5;
      }
      :root.dark .border-gray-200, :root.dark .border-gray-100, :root.dark .border-b-2, :root.dark .border-b {
        border-color: #4b5563;
      }
      :root.dark .hover\:border-yellow-500:hover {
        border-color: #eab308;
      }
      :root.dark .shadow-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.7);
      }
      :root.dark .text-yellow-700 {
        color: #fcd34d;
      }
      :root.dark #my-timetables-btn {
        background-color: #4b5563;
        color: #e0e7ff;
      }
      :root.dark #my-timetables-btn:hover {
        background-color: #5a6b7f;
      }
      :root.dark #my-notes-btn {
        background-color: #4b5563;
        color: #fcd34d;
      }
      :root.dark #my-notes-btn:hover {
        background-color: #5a6b7f;
      }
      :root.dark .hover\:bg-indigo-100:hover {
        background-color: #4b5563;
      }
      :root.dark .text-indigo-700 {
        color: #e0e7ff;
      }
    `;
    document.head.appendChild(style);
  }
}

initializeDarkMode();

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('history-list');
const newPlanBtn = document.getElementById('new-plan-btn');
const myTimetablesBtn = document.getElementById('my-timetables-btn');
const myNotesBtn = document.getElementById('my-notes-btn');
const logoHome = document.getElementById('logoHome');
const activeTab = document.getElementById('active-tab');
const archiveTab = document.getElementById('archive-tab');

const notesView = document.getElementById('notes-view');
const noteEditorView = document.getElementById('note-editor-view');
const newNoteBtn = document.getElementById('new-note-btn');
const backToNotesBtn = document.getElementById('back-to-notes-btn');
const saveNoteBtn = document.getElementById('save-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const notesGrid = document.getElementById('notes-grid');

let currentEditingNoteId = null;
let autoSaveInterval = null;
let showArchive = false;  // Track which tab is active

// ─── AUTH & SIDEBAR SYNC ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    authBtn.classList.remove('hidden');
    authBtn.style.display = "block"; 
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => { window.location.href = "profile.html"; };
        sidebar.classList.remove('hidden');
        loadHistory(user.uid);
        loadNotes(user.uid);

        myTimetablesBtn.addEventListener('click', () => {
            window.location.href = 'app.html';
        });
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
        sidebar.classList.add('hidden');
    }
});

// ─── ARCHIVE/ACTIVE TAB SWITCHING ────────────────────────────────────
activeTab.addEventListener('click', () => {
    showArchive = false;
    activeTab.classList.add('bg-indigo-600', 'text-white');
    activeTab.classList.remove('bg-gray-300', 'text-gray-700');
    archiveTab.classList.remove('bg-indigo-600', 'text-white');
    archiveTab.classList.add('bg-gray-300', 'text-gray-700');
    const user = auth.currentUser;
    if (user) loadHistory(user.uid);
});

archiveTab.addEventListener('click', () => {
    showArchive = true;
    archiveTab.classList.add('bg-indigo-600', 'text-white');
    archiveTab.classList.remove('bg-gray-300', 'text-gray-700');
    activeTab.classList.remove('bg-indigo-600', 'text-white');
    activeTab.classList.add('bg-gray-300', 'text-gray-700');
    const user = auth.currentUser;
    if (user) loadHistory(user.uid);
});

// ─── NAVIGATION ──────────────────────────────────────────────────────
logoHome.addEventListener('click', () => {
    window.location.href = 'app.html';
});

newPlanBtn.addEventListener('click', () => {
    window.location.href = 'app.html';
});

myNotesBtn.addEventListener('click', () => {
    noteEditorView.classList.add('hidden');
    notesView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── FIREBASE HISTORY ────────────────────────────────────────────────
function loadHistory(uid) {
    const q = query(collection(db, "plans"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        // Check if there are any archived plans
        let hasArchived = false;
        snapshot.forEach((doc) => {
            if (doc.data().archived) hasArchived = true;
        });

        // Show/hide both tabs together - either show both or hide both
        if (hasArchived) {
            archiveTab.style.display = 'flex';
            activeTab.style.display = 'flex';
        } else {
            archiveTab.style.display = 'none';
            activeTab.style.display = 'none';
        }

        historyList.innerHTML = '';
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="text-xs text-gray-400 p-4 text-center">No saved plans.</p>';
            return;
        }
        
        // Filter by archive status
        const filteredDocs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isArchived = data.archived || false;
            if (isArchived === showArchive) {
                filteredDocs.push({ id: doc.id, data });
            }
        });

        if (filteredDocs.length === 0) {
            const emptyMsg = showArchive ? "No archived plans." : "No saved plans.";
            historyList.innerHTML = `<p class="text-xs text-gray-400 p-4 text-center">${emptyMsg}</p>`;
            return;
        }

        filteredDocs.forEach((docData) => {
            const { id: doc, data } = docData;
            const item = document.createElement('div');
            item.className = "p-3 text-sm text-gray-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 flex items-center justify-between gap-2 group";
            
            const titleEl = document.createElement('div');
            titleEl.className = "flex items-center gap-2 flex-1 cursor-pointer truncate";
            titleEl.innerHTML = `<i class="fa-solid fa-chess-knight text-indigo-400 text-xs"></i> <span>${data.title}</span>`;
            titleEl.onclick = () => {
                window.location.href = 'app.html';
            };
            
            const menuBtn = document.createElement('button');
            menuBtn.className = "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 flex-shrink-0";
            menuBtn.innerHTML = '<i class="fa-solid fa-ellipsis-h"></i>';
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showHistoryContextMenu(e, doc.id, data);
            });
            
            item.appendChild(titleEl);
            item.appendChild(menuBtn);
            historyList.appendChild(item);
        });
    });
}

// ─── NOTES FUNCTIONALITY ─────────────────────────────────────────────

// Create new note
newNoteBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    notesView.classList.add('hidden');
    noteEditorView.classList.remove('hidden');
    noteTitleInput.value = '';
    noteContentInput.value = '';
    currentEditingNoteId = null;
    noteTitleInput.focus();
    clearInterval(autoSaveInterval);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Back to notes list
backToNotesBtn.addEventListener('click', () => {
    notesView.classList.remove('hidden');
    noteEditorView.classList.add('hidden');
    clearInterval(autoSaveInterval);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Load all notes
async function loadNotes(uid) {
    const q = query(
        collection(db, "notes"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        notesGrid.innerHTML = '';

        if (snapshot.empty) {
            notesGrid.innerHTML = '<p class="text-gray-400 text-center py-12 col-span-full">No notes yet. Create your first note!</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        snapshot.forEach((docSnap) => {
            const note = docSnap.data();
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card animate-fade-in';

            const preview = note.content.substring(0, 150);
            const lastSaved = note.updatedAt ? new Date(note.updatedAt.toDate()).toLocaleDateString() : 'N/A';

            noteCard.innerHTML = `
                <div class="note-actions">
                    <button class="delete-note-btn" title="Delete note">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
                <h3>${escapeHtml(note.title || 'Untitled')}</h3>
                <p>${escapeHtml(preview)}${note.content.length > 150 ? '...' : ''}</p>
                <div class="note-date">${lastSaved}</div>
            `;

            // Open note for editing
            noteCard.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-note-btn')) {
                    currentEditingNoteId = docSnap.id;
                    noteTitleInput.value = note.title || '';
                    noteContentInput.value = note.content || '';
                    notesView.classList.add('hidden');
                    noteEditorView.classList.remove('hidden');
                    startAutoSave();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });

            // Delete note
            noteCard.querySelector('.delete-note-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this note?')) {
                    try {
                        await deleteDoc(doc(db, "notes", docSnap.id));
                    } catch (err) {
                        console.error("Delete error:", err);
                    }
                }
            });

            fragment.appendChild(noteCard);
        });

        notesGrid.appendChild(fragment);
    }, (error) => {
        console.error("Notes load error:", error);
        notesGrid.innerHTML = `<p class="text-red-600 col-span-full">Error loading notes: ${error.message}</p>`;
    });
}

// Auto-save notes
function startAutoSave() {
    clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        saveNote(true);
    }, 30000); // Auto-save every 30 seconds
}

// Save note
async function saveNote(isAutoSave = false) {
    const user = auth.currentUser;
    if (!user) return;

    const title = noteTitleInput.value.trim() || 'Untitled';
    const content = noteContentInput.value;

    if (!content.trim()) {
        if (!isAutoSave) {
            alert('Note cannot be empty!');
        }
        return;
    }

    try {
        if (currentEditingNoteId) {
            // Update existing note
            const noteRef = doc(db, "notes", currentEditingNoteId);
            await updateDoc(noteRef, {
                title: title,
                content: content,
                updatedAt: new Date()
            });
        } else {
            // Create new note
            const docRef = await addDoc(collection(db, "notes"), {
                userId: user.uid,
                title: title,
                content: content,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            currentEditingNoteId = docRef.id;
        }

        if (!isAutoSave) {
            updateSaveTime();
            startAutoSave();
        }
    } catch (err) {
        console.error("Save error:", err);
        if (!isAutoSave) {
            alert('Error saving note: ' + err.message);
        }
    }
}

// Delete note
deleteNoteBtn.addEventListener('click', async () => {
    if (!currentEditingNoteId) {
        alert('No note to delete!');
        return;
    }

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        await deleteDoc(doc(db, "notes", currentEditingNoteId));
        clearInterval(autoSaveInterval);
        notesView.classList.remove('hidden');
        noteEditorView.classList.add('hidden');
    } catch (err) {
        console.error("Delete error:", err);
        alert('Error deleting note: ' + err.message);
    }
});

// Save note button
saveNoteBtn.addEventListener('click', () => {
    saveNote(false);
});

// Update save time display
function updateSaveTime() {
    const saveTimeEl = document.getElementById('save-time');
    saveTimeEl.textContent = 'Just now';
}

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ─── CONTEXT MENU FOR HISTORY ITEMS ──────────────────────────────────
function showHistoryContextMenu(event, docId, data) {
    // Close any existing context menu
    const existingMenu = document.querySelector('.context-menu-popup');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = "context-menu-popup bg-white rounded-lg shadow-2xl border border-gray-200 z-50 min-w-[150px]";
    
    const isArchived = data.archived || false;
    const archiveText = isArchived ? "Unarchive" : "Archive";
    
    menu.innerHTML = `
        <button class="archive-action w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 border-b border-gray-100 first:rounded-t-lg transition">
            <i class="fa-solid fa-${isArchived ? 'arrow-turn-up' : 'archive'} text-xs"></i>
            ${archiveText}
        </button>
        <button class="delete-action w-full px-4 py-2 text-left text-sm hover:bg-red-50 hover:text-red-600 flex items-center gap-2 last:rounded-b-lg transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
            Delete
        </button>
    `;

    // Archive action
    menu.querySelector('.archive-action').addEventListener('click', async () => {
        try {
            const planRef = doc(db, "plans", docId);
            await updateDoc(planRef, {
                archived: !isArchived
            });
        } catch (err) {
            console.error("Archive error:", err);
            alert('Error archiving plan: ' + err.message);
        }
        menu.remove();
    });

    // Delete action
    menu.querySelector('.delete-action').addEventListener('click', async () => {
        if (confirm('Are you sure you want to permanently delete this plan? This cannot be undone.')) {
            try {
                await deleteDoc(doc(db, "plans", docId));
            } catch (err) {
                console.error("Delete error:", err);
                alert('Error deleting plan: ' + err.message);
            }
            menu.remove();
        }
    });

    // Position the menu near the clicked button
    const buttonRect = event.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (buttonRect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - buttonRect.right) + 'px';
    menu.style.animation = 'contextMenuFadeIn 0.15s ease-in-out';

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeHistoryContextMenu);
    }, 0);

    function closeHistoryContextMenu() {
        if (menu && menu.parentNode) {
            menu.remove();
        }
        document.removeEventListener('click', closeHistoryContextMenu);
    }
}
