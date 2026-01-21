import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('history-list');
const newPlanBtn = document.getElementById('new-plan-btn');
const myTimetablesBtn = document.getElementById('my-timetables-btn');
const myNotesBtn = document.getElementById('my-notes-btn');
const logoHome = document.getElementById('logoHome');

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
            window.location.href = 'index.html';
        });
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
        sidebar.classList.add('hidden');
    }
});

// ─── NAVIGATION ──────────────────────────────────────────────────────
logoHome.addEventListener('click', () => {
    window.location.href = 'index.html';
});

newPlanBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
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
        historyList.innerHTML = '';
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="text-xs text-gray-400 p-4 text-center">No saved plans.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = "p-3 text-sm text-gray-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors truncate border-b border-gray-50 flex items-center gap-2";
            item.innerHTML = `<i class="fa-solid fa-chess-knight text-indigo-400 text-xs"></i> <span>${data.title}</span>`;
            item.onclick = () => {
                window.location.href = 'index.html';
            };
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
