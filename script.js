import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── DARK MODE INITIALIZATION ───────────────────────────────────────
function initializeDarkMode() {
  const savedTheme = localStorage.getItem('darkMode');
  const userPrefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  
  if (savedTheme === 'true' || userPrefs.theme === 'Dark Mode') {
    document.documentElement.classList.add('dark');
  }
}

initializeDarkMode();

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById('sidebar');
const sidebarCollapsed = document.getElementById('sidebar-collapsed');
const historyList = document.getElementById('history-list');
const newPlanBtn = document.getElementById('new-plan-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
const myTimetablesBtn = document.getElementById('my-timetables-btn');
const activeTab = document.getElementById('active-tab');
const archiveTab = document.getElementById('archive-tab');

const generateBtn = document.getElementById('generate-btn');
const inputCard = document.getElementById('input-card');
const loadingState = document.getElementById('loading-state');
const resultContainer = document.getElementById('result-container');
const headerSection = document.getElementById('header-section');
const logoHome = document.getElementById('logoHome');

// Notes button
const myNotesBtn = document.getElementById('my-notes-btn');

let currentPlanData = null;
let currentDocId = null;
let timetablesContainer = null;
let currentUserId = null;
let showArchive = false;  // Track which tab is active
let calendarHasUnsavedChanges = false;  // Track calendar changes

// ─── AUTH & SIDEBAR SYNC ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    authBtn.classList.remove('hidden');
    authBtn.style.display = "block"; 
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => { window.location.href = "profile.html"; };
        sidebar.classList.remove('hidden');
        currentUserId = user.uid;
        loadHistory(user.uid);

        myTimetablesBtn.addEventListener('click', () => {
            showTimetablesView(user.uid);
        });
        
        // Standard Timetable button
        const standardTimetableBtn = document.getElementById('standard-timetable-btn');
        standardTimetableBtn.addEventListener('click', () => {
            showStandardTimetableView(user.uid);
        });
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
        sidebar.classList.add('hidden');
        sidebarCollapsed.classList.add('hidden');
    }
});

// ─── ARCHIVE/ACTIVE TAB SWITCHING ────────────────────────────────────
activeTab.addEventListener('click', () => {
    showArchive = false;
    activeTab.classList.add('bg-indigo-600', 'text-white');
    activeTab.classList.remove('bg-gray-300', 'text-gray-700');
    archiveTab.classList.remove('bg-indigo-600', 'text-white');
    archiveTab.classList.add('bg-gray-300', 'text-gray-700');
    loadHistory(currentUserId);
});

archiveTab.addEventListener('click', () => {
    showArchive = true;
    archiveTab.classList.add('bg-indigo-600', 'text-white');
    archiveTab.classList.remove('bg-gray-300', 'text-gray-700');
    activeTab.classList.remove('bg-indigo-600', 'text-white');
    activeTab.classList.add('bg-gray-300', 'text-gray-700');
    loadHistory(currentUserId);
});

// ─── SIDEBAR TOGGLE ──────────────────────────────────────────────────
closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    sidebarCollapsed.classList.remove('hidden');
});

expandSidebarBtn.addEventListener('click', () => {
    sidebarCollapsed.classList.add('hidden');
    sidebar.classList.remove('hidden');
});

// Collapsed sidebar button functionality
document.getElementById('collapsed-new-plan-btn').addEventListener('click', resetUI);
document.getElementById('collapsed-timetables-btn').addEventListener('click', () => {
    if (currentUserId) showTimetablesView(currentUserId);
});
document.getElementById('collapsed-notes-btn').addEventListener('click', () => {
    window.location.href = 'notes.html';
});
document.getElementById('collapsed-settings-btn').addEventListener('click', () => {
    window.location.href = 'profile.html';
});

// ─── RESET APP ───────────────────────────────────────────────────────
function resetUI() {
    document.getElementById('user-aim').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('difficulty').selectedIndex = 0;
    resultContainer.classList.add('hidden');
    document.getElementById('timetable-section').classList.add('hidden');
    document.getElementById('calendar-section').classList.add('hidden');
    loadingState.classList.add('hidden');
    inputCard.classList.remove('hidden');
    headerSection.classList.remove('hidden');
    if (timetablesContainer) timetablesContainer.classList.add('hidden');
    if (standardTimetableContainer) standardTimetableContainer.classList.add('hidden');
    currentDocId = null;
    currentPlanData = null;
    calendarHasUnsavedChanges = false;
    hideCalendarSaveButton();
    window.scrollTo(0, 0);
}

logoHome.addEventListener('click', resetUI);
newPlanBtn.addEventListener('click', resetUI);

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

        filteredDocs.forEach(({ id: docId, data }) => {
            const item = document.createElement('div');
            item.className = "p-3 text-sm text-gray-600 hover:bg-indigo-50 rounded-lg transition-colors truncate border-b border-gray-50 flex items-center gap-2 justify-between group relative";
            
            const titleEl = document.createElement('div');
            titleEl.className = "flex items-center gap-2 flex-1 cursor-pointer";
            titleEl.innerHTML = `<i class="fa-solid fa-chess-knight text-indigo-400 text-xs"></i> <span>${data.title}</span>`;
            
            // 3-dot menu button (horizontal dots)
            const menuBtn = document.createElement('button');
            menuBtn.className = "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 relative z-40";
            menuBtn.innerHTML = '<i class="fa-solid fa-ellipsis-h"></i>';
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showContextMenu(e, docId, data);
            });
            
            item.appendChild(titleEl);
            item.appendChild(menuBtn);
            
            // Load plan when clicked on title
            titleEl.addEventListener('click', () => {
                currentDocId = docId;
                currentPlanData = data.plan;
                inputCard.classList.add('hidden');
                headerSection.classList.add('hidden');
                if (timetablesContainer) timetablesContainer.classList.add('hidden');
                renderUI(data.plan, data.difficulty);
                if (data.plan.timetable && data.plan.timetable.length > 0) {
                    renderTimetable(data.plan.timetable);
                    document.getElementById('generate-timetable-btn').innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Generate Timetable`;
                    showProgressCalendar();
                }
            });
            
            historyList.appendChild(item);
        });
    });
}

// ─── CONTEXT MENU FOR ARCHIVE/DELETE ─────────────────────────────────
function showContextMenu(event, docId, data) {
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
        await toggleArchive(docId, !isArchived);
        menu.remove();
    });

    // Delete action
    menu.querySelector('.delete-action').addEventListener('click', async () => {
        if (confirm('Are you sure you want to permanently delete this plan? This cannot be undone.')) {
            await deletePlan(docId);
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
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// ─── ARCHIVE PLAN ────────────────────────────────────────────────────
async function toggleArchive(docId, shouldArchive) {
    try {
        const planRef = doc(db, "plans", docId);
        await updateDoc(planRef, { archived: shouldArchive });
        console.log(shouldArchive ? "Plan archived" : "Plan unarchived");
        
        // If unarchiving, switch back to active tab
        if (!shouldArchive && showArchive) {
            showArchive = false;
            activeTab.classList.add('bg-indigo-600', 'text-white');
            activeTab.classList.remove('bg-gray-300', 'text-gray-700');
            archiveTab.classList.remove('bg-indigo-600', 'text-white');
            archiveTab.classList.add('bg-gray-300', 'text-gray-700');
            loadHistory(currentUserId);
        }
    } catch (err) {
        console.error("Archive error:", err);
    }
}

// ─── DELETE PLAN ─────────────────────────────────────────────────────
async function deletePlan(docId) {
    try {
        await deleteDoc(doc(db, "plans", docId));
        console.log("Plan deleted permanently");
        resetUI();
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// ─── GENERATION LOGIC ────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        sessionStorage.setItem("postLoginAction", "generate");
        window.location.href = "login.html";
        return;
    }

    const aim = document.getElementById('user-aim').value;
    const category = document.getElementById('category').value;
    const difficulty = document.getElementById('difficulty').value;
    const dueDate = document.getElementById('due-date').value;

    if (!aim || !dueDate) return alert("Please enter your goal and a due date!");

    inputCard.classList.add('hidden');
    headerSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Act as an expert strategist. Today's date is ${today} (Year 2026).
    Goal: "${aim}". Target Date: ${dueDate}. Difficulty: ${difficulty}. Category: ${category}.
    Return ONLY a JSON object:
    {
      "warning": "Timeline warning or null",
      "categoryMismatch": "Mismatch message or null",
      "title": "Title",
      "description": "Short overview",
      "phases": [{"name": "Phase 1", "date": "Month/Year", "desc": "Details"}],
      "habits": ["Habit 1", "Habit 2"],
      "timetable": [{"time": "08:00 AM", "task": "Wake up and Review"}, {"time": "09:00 AM", "task": "Deep Work Session"}],
      "hurdles": [{"issue": "Challenge", "sol": "Solution"}],
      "resources": [{"type": "BOOK", "price": "Free", "name": "Resource Name", "desc": "Description", "link": "https://example.com"}]
    }`;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) throw new Error('Failed to generate plan');
        const plan = await response.json();

        const docRef = await addDoc(collection(db, "plans"), {
            userId: user.uid,
            title: aim,
            plan: plan,
            difficulty: difficulty,
            createdAt: new Date()
        });

        currentDocId = docRef.id;
        currentPlanData = plan;  // Store the plan data
        renderUI(plan, difficulty);

    } catch (error) {
        console.error('Generation error:', error);
        alert('Error: ' + error.message);
        inputCard.classList.remove('hidden');
        headerSection.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }
});

// ─── UI RENDERING ────────────────────────────────────────────────────
function renderUI(plan, difficulty) {
    currentPlanData = plan;
    loadingState.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    const ttSection = document.getElementById('timetable-section');
    const ttList = document.getElementById('timetable-list');
    ttSection.classList.remove('hidden');

    // Don't auto-generate timetable - wait for user to click the button
    ttList.innerHTML = '<p class="text-center text-gray-400 py-4">Click "Generate Daily Schedule" to build your routine.</p>';
    document.getElementById('generate-timetable-btn').innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Daily Schedule`;
    
    // Hide AI editor button initially
    const showAiBtn = document.getElementById('show-ai-editor');
    if (showAiBtn) showAiBtn.classList.add('hidden');

    let warningsHtml = '';
    if (plan.categoryMismatch) {
        warningsHtml += `<div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl mb-4 animate-fade-in"><div class="flex items-start gap-4"><div class="text-blue-600 mt-1"><i class="fa-solid fa-circle-info text-xl"></i></div><div><h4 class="font-bold text-blue-900 text-lg">Category Insight</h4><p class="text-blue-800 mt-1 leading-relaxed text-sm">${plan.categoryMismatch}</p></div></div></div>`;
    }

    if (plan.warning) {
        warningsHtml += `<div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8 animate-fade-in"><div class="flex items-start gap-4"><div class="text-amber-600 mt-1"><i class="fa-solid fa-triangle-exclamation text-xl"></i></div><div><h4 class="font-bold text-amber-900 text-lg">Ambitious Timeline Detected</h4><p class="text-amber-800 mt-1 leading-relaxed text-sm">${plan.warning}</p></div></div></div>`;
    }

    resultContainer.innerHTML = `
        ${warningsHtml}
        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fade-in">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-3xl font-bold text-gray-800">${plan.title}</h2>
                <div class="flex gap-2">
                    <span class="px-3 py-1 ${plan.warning ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'} text-xs font-bold rounded-full tracking-wide">${plan.warning ? 'AMBITIOUS' : 'REALISTIC'}</span>
                    <span class="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full tracking-wide">${difficulty.toUpperCase()}</span>
                </div>
            </div>
            <p class="text-gray-600 leading-relaxed max-w-2xl">${plan.description}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 space-y-4 relative ml-4 md:ml-8 border-l-2 border-dashed border-indigo-200 pl-8">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa-solid fa-map text-indigo-500"></i> Strategic Milestones</h3>
                ${plan.phases.map((p, i) => `<div class="milestone-card shadow-sm animate-fade-in" style="animation-delay: ${i * 0.1}s"><div class="milestone-number">${i + 1}</div><div class="flex justify-between font-bold text-gray-800"><span>${p.name}</span><span class="text-indigo-500 text-sm">${p.date}</span></div><p class="text-gray-500 text-sm mt-2 leading-relaxed">${p.desc}</p></div>`).join('')}
            </div>
            <div class="space-y-6">
                <div class="habits-sidebar shadow-lg">
                    <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Daily Habits</h3>
                    <ul class="space-y-4 text-sm opacity-90">${plan.habits.map(h => `<li class="flex gap-2"><span>•</span> ${h}</li>`).join('')}</ul>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 class="font-bold text-gray-800 mb-4">Common Hurdles</h3>
                    <div class="space-y-4">${plan.hurdles.map(h => `<div><p class="font-bold text-sm text-gray-700">"${h.issue}"</p><p class="text-xs text-gray-500 mt-1">Solution: ${h.sol}</p></div>`).join('')}</div>
                </div>
            </div>
        </div>
        <div class="mt-12">
             <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600"><i class="fa-solid fa-book-open"></i> Curated Resources</h3>
             <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">${plan.resources.map(r => `<a href="${r.link || '#'}" target="_blank" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group block"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">${r.type} • ${r.price}</span><h4 class="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${r.name}</h4><p class="text-xs text-gray-500 mt-1 line-clamp-2">${r.desc}</p>${r.link ? '<div class="mt-2 text-xs text-indigo-600 flex items-center gap-1"><i class="fa-solid fa-external-link"></i> Open Link</div>' : ''}</a>`).join('')}</div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── TIMETABLES VIEW ─────────────────────────────────────────────────

function showTimetablesView(uid) {
    inputCard.classList.add('hidden');
    headerSection.classList.add('hidden');
    resultContainer.classList.add('hidden');
    document.getElementById('timetable-section').classList.add('hidden');
    document.getElementById('calendar-section').classList.add('hidden'); // Hide calendar

    if (!timetablesContainer) {
        timetablesContainer = document.createElement('div');
        timetablesContainer.id = 'timetables-view';
        timetablesContainer.className = 'max-w-4xl mx-auto py-10 px-4 space-y-5';
        document.querySelector('main').appendChild(timetablesContainer);
    }

    timetablesContainer.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
            My Timetables
        </h2>
        <p class="text-gray-500">Loading your saved schedules...</p>
    `;
    timetablesContainer.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    loadTimetablesList(uid, timetablesContainer);
}

function loadTimetablesList(uid, container) {
    const q = query(
        collection(db, "plans"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        container.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
                My Timetables
            </h2>
        `;

        const fragment = document.createDocumentFragment();

        // Add Standard Timetable card first
        const standardTimetable = localStorage.getItem(`standard_timetable_${uid}`);
        const standardCard = document.createElement('div');
        standardCard.className = `
            bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-5 
            hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group mb-4
        `;

        let standardPreview = '<p class="text-sm text-gray-400 italic">No entries yet</p>';
        if (standardTimetable) {
            const standardData = JSON.parse(standardTimetable);
            if (standardData.length > 0) {
                const sorted = [...standardData].sort((a, b) => compareTimes(a.time, b.time));
                standardPreview = sorted.slice(0, 5).map(item => `
                    <div class="flex gap-3 text-sm py-0.5">
                        <span class="font-mono text-purple-600 w-20 shrink-0">${item.time}</span>
                        <span class="truncate">${item.task}</span>
                    </div>
                `).join('');
                if (standardData.length > 5) standardPreview += '<div class="text-xs text-gray-400 mt-1">… and ' + (standardData.length - 5) + ' more</div>';
            }
        }

        standardCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-purple-900 group-hover:text-purple-700 transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-star text-purple-500"></i>
                    Standard Timetable & Calendar
                </h4>
                <span class="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                    Personal Routine
                </span>
            </div>
            <div class="space-y-1 mb-4">
                ${standardPreview}
            </div>
            <div class="text-right">
                <span class="text-sm text-purple-600 font-medium group-hover:underline">
                    Edit standard routine & calendar →
                </span>
            </div>
        `;

        standardCard.addEventListener('click', () => {
            showStandardTimetableView(uid);
        });

        fragment.appendChild(standardCard);

        if (snapshot.empty) {
            container.appendChild(fragment);
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const plan = data.plan || {};
            const timetable = plan.timetable || [];

            const card = document.createElement('div');
            card.className = `
                bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-400 
                hover:shadow-md transition-all cursor-pointer group
            `;

            let preview = '<p class="text-sm text-gray-400 italic">No timetable entries yet</p>';
            if (timetable.length > 0) {
                const sorted = [...timetable].sort((a, b) => compareTimes(a.time, b.time));
                preview = sorted.slice(0, 5).map(item => `
                    <div class="flex gap-3 text-sm py-0.5">
                        <span class="font-mono text-indigo-600 w-20 shrink-0">${item.time}</span>
                        <span class="truncate">${item.task}</span>
                    </div>
                `).join('');
                if (timetable.length > 5) preview += '<div class="text-xs text-gray-400 mt-1">… and ' + (timetable.length - 5) + ' more</div>';
            }

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                        ${data.title || "Plan"}
                    </h4>
                    <span class="text-xs text-gray-500">
                        ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : '—'}
                    </span>
                </div>
                <div class="space-y-1 mb-4">
                    ${preview}
                </div>
                <div class="text-right">
                    <span class="text-sm text-indigo-600 font-medium group-hover:underline">
                        Open plan & edit schedule →
                    </span>
                </div>
            `;

            card.addEventListener('click', () => {
                currentDocId = docSnap.id;
                currentPlanData = plan;  // Store the plan data
                renderUI(plan, data.difficulty || "Intermediate");
                if (timetablesContainer) timetablesContainer.classList.add('hidden');
                // If timetable exists, render it
                if (plan.timetable && plan.timetable.length > 0) {
                    renderTimetable(plan.timetable);
                    document.getElementById('generate-timetable-btn').innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Generate Timetable`;
                }
            });

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    }, (error) => {
        console.error("Timetables load error:", error);
        container.innerHTML += `<p class="text-red-600 mt-4">Error loading timetables: ${error.message}</p>`;
    });
}

// ─── TIMETABLE LOGIC ─────────────────────────────────────────────────

// Initialize Drag and Drop
const ttListEl = document.getElementById('timetable-list');
Sortable.create(ttListEl, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'bg-indigo-50',
    onEnd: (evt) => {
        // Auto-adjust time based on surrounding slots
        const rows = Array.from(ttListEl.querySelectorAll('.timetable-row'));
        const draggedRow = rows[evt.newIndex];
        
        if (!draggedRow) return;

        const prevRow = rows[evt.newIndex - 1];
        const nextRow = rows[evt.newIndex + 1];

        if (prevRow && nextRow) {
            // Slot is between two other slots
            const prevTime = prevRow.querySelector('.time-input').value;
            const nextTime = nextRow.querySelector('.time-input').value;
            const midTime = calculateMidpointTime(prevTime, nextTime);
            draggedRow.querySelector('.time-input').value = midTime;
        } else if (prevRow) {
            // Slot is after another slot
            const prevTime = prevRow.querySelector('.time-input').value;
            const newTime = addMinutesToTime(prevTime, 30);
            draggedRow.querySelector('.time-input').value = newTime;
        } else if (nextRow) {
            // Slot is before another slot
            const nextTime = nextRow.querySelector('.time-input').value;
            const newTime = subtractMinutesFromTime(nextTime, 30);
            draggedRow.querySelector('.time-input').value = newTime;
        }

        resortRows();
        saveTimetableState();
    }
});

// Trigger Timetable Generation
document.getElementById('generate-timetable-btn').addEventListener('click', async () => {
    if (!currentPlanData) return;

    const generateBtn = document.getElementById('generate-timetable-btn');
    const ttList = document.getElementById('timetable-list');
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Generating...`;
    ttList.innerHTML = '<p class="text-center text-gray-400 py-4">Generating your daily schedule...</p>';

    try {
        // Request fresh timetable from AI
        const aim = currentPlanData.title || 'Goal';
        const today = new Date().toISOString().split('T')[0];
        const prompt = `Act as an expert time management specialist. Generate a FRESH and DIFFERENT daily timetable.
Goal: "${aim}". 
Return ONLY a JSON object with:
{
  "timetable": [{"time": "08:00 AM", "task": "Activity"}, ...]
}
Make it realistic, detailed, and actionable with 10-15 time slots throughout the day.`;

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) throw new Error('Failed to generate timetable');
        const result = await response.json();
        
        if (result.timetable && result.timetable.length > 0) {
            // Update current plan data with new timetable
            currentPlanData.timetable = result.timetable;
            renderTimetable(result.timetable);
            generateBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Generate Timetable`;
            // Save the updated timetable to Firestore
            await saveTimetableState();
            // Show calendar when timetable is generated
            showProgressCalendar();
        } else {
            throw new Error('No timetable generated');
        }
    } catch (error) {
        console.error('Timetable generation error:', error);
        ttList.innerHTML = `<p class="text-center text-red-500 py-4">Error: ${error.message}. Please try again.</p>`;
        generateBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Daily Schedule`;
    } finally {
        generateBtn.disabled = false;
    }
});

function renderTimetable(timetableData) {
    const timetableList = document.getElementById('timetable-list');
    timetableList.innerHTML = ''; 
    const sorted = [...timetableData].sort((a, b) => compareTimes(a.time, b.time));
    sorted.forEach(item => createTimetableRow(item.time, item.task, item.completed || false));
    
    // Show AI editor button only when timetable has data
    const showAiBtn = document.getElementById('show-ai-editor');
    if (showAiBtn && timetableData && timetableData.length > 0) {
        showAiBtn.classList.remove('hidden');
    }
}

function createTimetableRow(time = "09:00 AM", task = "New Task", completed = false) {
    const timetableList = document.getElementById('timetable-list');
    const row = document.createElement('div');
    row.className = "timetable-row animate-fade-in group flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all";

    row.innerHTML = `
        <div class="drag-handle cursor-grab text-gray-300 hover:text-indigo-500 px-1">
            <i class="fa-solid fa-grip-lines"></i>
        </div>
        <input type="checkbox" class="w-5 h-5 accent-indigo-600 cursor-pointer" ${completed ? 'checked' : ''}>
        <input type="text" class="time-input w-24 bg-transparent border-none font-mono text-sm text-indigo-600 focus:ring-0" value="${time}">
        <input type="text" class="task-input flex-1 bg-transparent border-none text-gray-700 focus:ring-0 ${completed ? 'task-done' : ''}" value="${task}">
        <button class="remove-row-btn text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    row.querySelector('.time-input').addEventListener('blur', () => {
        resortRows();
        saveTimetableState();
    });
    row.querySelector('.task-input').addEventListener('blur', () => saveTimetableState());

    const checkbox = row.querySelector('input[type="checkbox"]');
    const taskInput = row.querySelector('.task-input');
    checkbox.addEventListener('change', () => {
        taskInput.classList.toggle('task-done', checkbox.checked);
        saveTimetableState();
    });

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
        row.remove();
        saveTimetableState();
    });

    timetableList.appendChild(row);
}

function compareTimes(t1, t2) {
    const parseTime = (t) => {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return parseInt(hours, 10) * 60 + parseInt(minutes || 0, 10);
    };
    return parseTime(t1) - parseTime(t2);
}

// Helper function to parse time to minutes since midnight
function timeToMinutes(timeStr) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes || 0, 10);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
}

// Helper function to convert minutes since midnight back to time string
function minutesToTime(mins) {
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${modifier}`;
}

// Calculate midpoint time between two times
function calculateMidpointTime(time1, time2) {
    const mins1 = timeToMinutes(time1);
    const mins2 = timeToMinutes(time2);
    const midpoint = Math.round((mins1 + mins2) / 2);
    return minutesToTime(midpoint);
}

// Add minutes to a time
function addMinutesToTime(timeStr, minutesToAdd) {
    const mins = timeToMinutes(timeStr);
    return minutesToTime(mins + minutesToAdd);
}

// Subtract minutes from a time
function subtractMinutesFromTime(timeStr, minutesToSubtract) {
    const mins = timeToMinutes(timeStr);
    return minutesToTime(Math.max(0, mins - minutesToSubtract));
}

function resortRows() {
    const list = document.getElementById('timetable-list');
    const rows = Array.from(list.querySelectorAll('.timetable-row'));
    const rowData = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value,
        completed: r.querySelector('input[type="checkbox"]').checked
    }));

    rowData.sort((a, b) => compareTimes(a.time, b.time));
    list.innerHTML = '';
    rowData.forEach(d => {
        createTimetableRow(d.time, d.task, d.completed);
    });
}

document.getElementById('add-slot-btn').addEventListener('click', () => {
    createTimetableRow("12:00 PM", "New Activity");
    resortRows();
    saveTimetableState();
});

// ─── AI TIMETABLE EDITOR ─────────────────────────────────────────────

// Show/Hide AI Editor
document.getElementById('show-ai-editor').addEventListener('click', () => {
    const aiSection = document.getElementById('ai-editor-section');
    const showBtn = document.getElementById('show-ai-editor');
    aiSection.classList.remove('hidden');
    showBtn.classList.add('hidden');
    document.getElementById('ai-instruction').focus();
});

document.getElementById('toggle-ai-editor').addEventListener('click', () => {
    const aiSection = document.getElementById('ai-editor-section');
    const showBtn = document.getElementById('show-ai-editor');
    aiSection.classList.add('hidden');
    showBtn.classList.remove('hidden');
    document.getElementById('ai-instruction').value = '';
});

// AI Edit Timetable
document.getElementById('ai-edit-btn').addEventListener('click', async () => {
    const instruction = document.getElementById('ai-instruction').value.trim();
    const aiEditBtn = document.getElementById('ai-edit-btn');
    
    if (!instruction) {
        alert('Please provide instructions for how to modify your timetable.');
        return;
    }
    
    if (!currentPlanData || !currentPlanData.timetable) {
        alert('No timetable found to edit. Please generate a timetable first.');
        return;
    }
    
    // Show loading state
    aiEditBtn.disabled = true;
    aiEditBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> AI is thinking...`;
    
    try {
        // Get current timetable
        const currentTimetable = currentPlanData.timetable;
        const goalTitle = currentPlanData.title || 'Goal';
        
        // Create AI prompt
        const prompt = `You are an expert time management coach. The user has a daily timetable for their goal: "${goalTitle}".

CURRENT TIMETABLE:
${currentTimetable.map(slot => `${slot.time} - ${slot.task}`).join('\n')}

USER REQUEST: "${instruction}"

Please modify the timetable based on the user's request. Consider their feedback about what's working or not working. Return ONLY a JSON object with:
{
  "timetable": [{"time": "08:00 AM", "task": "Modified Activity"}, ...]
}

Make realistic adjustments that address their specific concerns while maintaining a productive schedule.`;
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) throw new Error('Failed to get AI suggestions');
        const result = await response.json();
        
        if (result.timetable && result.timetable.length > 0) {
            // Update timetable with AI suggestions
            currentPlanData.timetable = result.timetable;
            renderTimetable(result.timetable);
            await saveTimetableState();
            
            // Hide AI editor and show success
            document.getElementById('ai-editor-section').classList.add('hidden');
            document.getElementById('show-ai-editor').classList.remove('hidden');
            document.getElementById('ai-instruction').value = '';
            
            // Show success message
            showTimetableMessage('AI has successfully updated your timetable based on your feedback!', 'success');
        } else {
            throw new Error('AI could not generate a valid timetable');
        }
    } catch (error) {
        console.error('AI edit error:', error);
        showTimetableMessage('Error: ' + error.message + '. Please try again.', 'error');
    } finally {
        aiEditBtn.disabled = false;
        aiEditBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Apply AI Changes`;
    }
});

function showTimetableMessage(message, type) {
    // Create or update message element
    let messageEl = document.getElementById('timetable-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'timetable-message';
        messageEl.className = 'mt-4 p-3 rounded-lg text-sm font-medium text-center';
        document.getElementById('timetable-section').appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.className = `mt-4 p-3 rounded-lg text-sm font-medium text-center ${
        type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
    }`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (messageEl) messageEl.remove();
    }, 5000);
}

async function saveTimetableState() {
    if (!currentDocId || !currentPlanData) return;

    const list = document.getElementById('timetable-list');
    const rows = Array.from(list.querySelectorAll('.timetable-row'));

    const updatedTimetable = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value,
        completed: r.querySelector('input[type="checkbox"]').checked
    }));

    // Update the local currentPlanData
    currentPlanData.timetable = updatedTimetable;

    try {
        const planRef = doc(db, "plans", currentDocId);
        // Save entire plan object with updated timetable
        await updateDoc(planRef, {
            plan: currentPlanData
        });
        console.log("Timetable saved successfully.");
    } catch (err) {
        console.error("Save error:", err);
    }
}

// ─── NOTES FUNCTIONALITY ─────────────────────────────────────────────

// Navigate to notes page
myNotesBtn.addEventListener('click', () => {
    window.location.href = 'notes.html';
});

// ─── PROGRESS CALENDAR ───────────────────────────────────────────────

let currentCalendarDate = new Date();
let progressData = new Map(); // Store progress for each date

function showProgressCalendar() {
    const calendarSection = document.getElementById('calendar-section');
    calendarSection.classList.remove('hidden');
    renderCalendar();
    loadProgressData();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Clear previous calendar
    calendarGrid.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'h-12';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        
        dayEl.className = `h-12 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:scale-105 ${
            dateStr === today ? 'ring-2 ring-indigo-500' : ''
        }`;
        
        dayEl.innerHTML = `
            <div class="text-center">
                <div class="text-sm font-medium">${day}</div>
                <div class="w-2 h-2 rounded-full mx-auto mt-1 progress-dot" data-date="${dateStr}"></div>
            </div>
        `;
        
        // Set initial status
        updateDayStatus(dayEl, dateStr);
        
        // Add click handler
        dayEl.addEventListener('click', () => toggleDayStatus(dateStr, dayEl));
        
        calendarGrid.appendChild(dayEl);
    }
}

function updateDayStatus(dayEl, dateStr) {
    const dot = dayEl.querySelector('.progress-dot');
    const status = progressData.get(dateStr) || 'not-started';
    
    // Remove existing status classes
    dot.classList.remove('bg-green-500', 'bg-red-500', 'bg-gray-300');
    dayEl.classList.remove('bg-green-50', 'bg-red-50', 'bg-gray-50');
    
    // Apply status
    switch (status) {
        case 'completed':
            dot.classList.add('bg-green-500');
            dayEl.classList.add('bg-green-50');
            break;
        case 'missed':
            dot.classList.add('bg-red-500');
            dayEl.classList.add('bg-red-50');
            break;
        default:
            dot.classList.add('bg-gray-300');
            dayEl.classList.add('bg-gray-50');
    }
}

function toggleDayStatus(dateStr, dayEl) {
    const currentStatus = progressData.get(dateStr) || 'not-started';
    let newStatus;
    
    // Cycle through statuses: not-started -> completed -> missed -> not-started
    switch (currentStatus) {
        case 'not-started':
            newStatus = 'completed';
            break;
        case 'completed':
            newStatus = 'missed';
            break;
        case 'missed':
            newStatus = 'not-started';
            break;
        default:
            newStatus = 'completed';
    }
    
    progressData.set(dateStr, newStatus);
    updateDayStatus(dayEl, dateStr);
    
    // Mark calendar as having unsaved changes
    calendarHasUnsavedChanges = true;
    showCalendarSaveButton();
}

function loadProgressData() {
    if (!currentDocId || !currentUserId) return;
    
    // Simple fix: each chat gets its own calendar data
    const savedProgress = localStorage.getItem(`calendar_${currentDocId}`);
    if (savedProgress) {
        const data = JSON.parse(savedProgress);
        progressData = new Map(Object.entries(data));
        
        // Update calendar display
        document.querySelectorAll('.progress-dot').forEach(dot => {
            const dateStr = dot.getAttribute('data-date');
            const dayEl = dot.closest('div').parentElement;
            updateDayStatus(dayEl, dateStr);
        });
    } else {
        // Clear calendar for new chat
        progressData = new Map();
    }
    
    calendarHasUnsavedChanges = false;
    hideCalendarSaveButton();
}

function saveProgressData() {
    if (!currentDocId) return;
    
    const dataObj = Object.fromEntries(progressData);
    // Simple fix: save calendar data per chat
    localStorage.setItem(`calendar_${currentDocId}`, JSON.stringify(dataObj));
    
    calendarHasUnsavedChanges = false;
    hideCalendarSaveButton();
    showCalendarMessage('Calendar progress saved successfully!', 'success');
}

function showCalendarSaveButton() {
    const saveBtn = document.getElementById('save-calendar-btn');
    if (saveBtn) {
        saveBtn.classList.remove('hidden');
    }
}

function hideCalendarSaveButton() {
    const saveBtn = document.getElementById('save-calendar-btn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }
}

function showCalendarMessage(message, type) {
    // Create or update message element
    let messageEl = document.getElementById('calendar-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'calendar-message';
        messageEl.className = 'mt-4 p-3 rounded-lg text-sm font-medium text-center';
        document.getElementById('calendar-section').appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.className = `mt-4 p-3 rounded-lg text-sm font-medium text-center ${
        type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
    }`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (messageEl) messageEl.remove();
    }, 3000);
}

// Calendar navigation
document.getElementById('prev-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
    loadProgressData();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
    loadProgressData();
});

// Calendar save button
document.getElementById('save-calendar-btn').addEventListener('click', () => {
    saveProgressData();
});

// ─── STANDARD TIMETABLE ──────────────────────────────────────────────

function showStandardTimetableView(uid) {
    inputCard.classList.add('hidden');
    headerSection.classList.add('hidden');
    resultContainer.classList.add('hidden');
    document.getElementById('timetable-section').classList.add('hidden');
    document.getElementById('calendar-section').classList.add('hidden');
    if (timetablesContainer) timetablesContainer.classList.add('hidden');

    if (!standardTimetableContainer) {
        standardTimetableContainer = document.createElement('div');
        standardTimetableContainer.id = 'standard-timetable-view';
        standardTimetableContainer.className = 'max-w-4xl mx-auto py-10 px-4 space-y-5';
        document.querySelector('main').appendChild(standardTimetableContainer);
    }

    standardTimetableContainer.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <i class="fa-solid fa-calendar-plus text-purple-600"></i>
                Standard Timetable
            </h2>
            <button id="save-standard-timetable-btn" class="hidden px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2">
                <i class="fa-solid fa-save"></i>
                Save Changes
            </button>
        </div>
        <p class="text-gray-600 mb-6">Create your personal daily routine. This is separate from your goal-specific timetables.</p>
        
        <div class="card-modern bg-gradient-to-br from-white via-purple-50 to-indigo-50 min-h-[300px]">
            <div id="standard-timetable-list" class="space-y-3">
                <!-- Standard timetable entries will be added here -->
            </div>
            
            <button id="add-standard-slot-btn" class="mt-4 text-sm font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105">
                <i class="fa-solid fa-plus text-xs"></i> Add Time Slot
            </button>
        </div>
        
        <!-- AI Editor Section -->
        <div id="standard-ai-editor-section" class="hidden bg-white rounded-2xl border border-gray-200 p-6 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <i class="fa-solid fa-wand-magic-sparkles text-purple-600"></i>
                    AI Timetable Editor
                </h3>
                <button id="standard-toggle-ai-editor" class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            <textarea id="standard-ai-instruction" class="w-full p-3 border border-gray-300 rounded-lg resize-none" rows="3" placeholder="Tell AI how to modify your standard timetable (e.g., 'Add more study time in the morning' or 'Move workout to evening')"></textarea>
            <button id="standard-ai-edit-btn" class="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                Apply AI Changes
            </button>
        </div>
        
        <button id="standard-show-ai-editor" class="mt-4 text-sm font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 transform hover:scale-105">
            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Edit Timetable
        </button>
        
        <!-- Standard Calendar Section -->
        <div class="bg-white rounded-2xl border border-gray-200 p-6 mt-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <i class="fa-solid fa-calendar-days text-purple-600"></i>
                    Standard Calendar
                </h3>
                <button id="save-standard-calendar-btn" class="hidden px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
                    <i class="fa-solid fa-save"></i>
                    Save Calendar
                </button>
            </div>
            <p class="text-gray-600 mb-4">Track your daily routine progress.</p>
            
            <div class="flex justify-between items-center mb-4">
                <button id="standard-prev-month" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <h4 id="standard-current-month" class="text-lg font-semibold text-gray-800"></h4>
                <button id="standard-next-month" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-7 gap-1 mb-2 text-xs font-medium text-gray-500 text-center">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            
            <div id="standard-calendar-grid" class="grid grid-cols-7 gap-1"></div>
            
            <div class="flex justify-center gap-6 mt-4 text-xs">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Completed</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Missed</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-gray-300 rounded-full"></div>
                    <span>Not Started</span>
                </div>
            </div>
        </div>
    `;
    
    standardTimetableContainer.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    loadStandardTimetable(uid);
    setupStandardTimetableEvents();
    setupStandardCalendar(uid);
}

function loadStandardTimetable(uid) {
    const savedTimetable = localStorage.getItem(`standard_timetable_${uid}`);
    if (savedTimetable) {
        const timetableData = JSON.parse(savedTimetable);
        renderStandardTimetable(timetableData);
    } else {
        // Create default empty timetable
        createStandardTimetableRow('08:00 AM', 'Morning Routine');
        createStandardTimetableRow('12:00 PM', 'Lunch Break');
        createStandardTimetableRow('06:00 PM', 'Evening Activities');
    }
}

function renderStandardTimetable(timetableData) {
    const list = document.getElementById('standard-timetable-list');
    list.innerHTML = '';
    const sorted = [...timetableData].sort((a, b) => compareTimes(a.time, b.time));
    sorted.forEach(item => createStandardTimetableRow(item.time, item.task));
}

function createStandardTimetableRow(time = '09:00 AM', task = 'New Activity') {
    const list = document.getElementById('standard-timetable-list');
    const row = document.createElement('div');
    row.className = 'standard-timetable-row animate-fade-in group flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all';

    row.innerHTML = `
        <div class="drag-handle cursor-grab text-gray-300 hover:text-purple-500 px-1">
            <i class="fa-solid fa-grip-lines"></i>
        </div>
        <input type="text" class="time-input w-24 bg-transparent border-none font-mono text-sm text-purple-600 focus:ring-0" value="${time}">
        <input type="text" class="task-input flex-1 bg-transparent border-none text-gray-700 focus:ring-0" value="${task}">
        <button class="remove-row-btn text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    row.querySelector('.time-input').addEventListener('blur', () => {
        resortStandardRows();
        markStandardTimetableChanged();
    });
    row.querySelector('.task-input').addEventListener('blur', () => markStandardTimetableChanged());

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
        row.remove();
        markStandardTimetableChanged();
    });

    list.appendChild(row);
}

function resortStandardRows() {
    const list = document.getElementById('standard-timetable-list');
    const rows = Array.from(list.querySelectorAll('.standard-timetable-row'));
    const rowData = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value
    }));

    rowData.sort((a, b) => compareTimes(a.time, b.time));
    list.innerHTML = '';
    rowData.forEach(d => {
        createStandardTimetableRow(d.time, d.task);
    });
}

function markStandardTimetableChanged() {
    const saveBtn = document.getElementById('save-standard-timetable-btn');
    if (saveBtn) {
        saveBtn.classList.remove('hidden');
    }
}

function saveStandardTimetable() {
    if (!currentUserId) return;
    
    const list = document.getElementById('standard-timetable-list');
    const rows = Array.from(list.querySelectorAll('.standard-timetable-row'));
    
    const timetableData = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value
    }));
    
    localStorage.setItem(`standard_timetable_${currentUserId}`, JSON.stringify(timetableData));
    
    const saveBtn = document.getElementById('save-standard-timetable-btn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }
    
    showStandardTimetableMessage('Standard timetable saved successfully!', 'success');
}

function showStandardTimetableMessage(message, type) {
    let messageEl = document.getElementById('standard-timetable-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'standard-timetable-message';
        messageEl.className = 'mt-4 p-3 rounded-lg text-sm font-medium text-center';
        standardTimetableContainer.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.className = `mt-4 p-3 rounded-lg text-sm font-medium text-center ${
        type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
    }`;
    
    setTimeout(() => {
        if (messageEl) messageEl.remove();
    }, 3000);
}

function setupStandardTimetableEvents() {
    // Add slot button
    document.getElementById('add-standard-slot-btn').addEventListener('click', () => {
        createStandardTimetableRow('12:00 PM', 'New Activity');
        resortStandardRows();
        markStandardTimetableChanged();
    });
    
    // Save button
    document.getElementById('save-standard-timetable-btn').addEventListener('click', () => {
        saveStandardTimetable();
    });
    
    // AI Editor buttons
    document.getElementById('standard-show-ai-editor').addEventListener('click', () => {
        document.getElementById('standard-ai-editor-section').classList.remove('hidden');
        document.getElementById('standard-show-ai-editor').classList.add('hidden');
        document.getElementById('standard-ai-instruction').focus();
    });
    
    document.getElementById('standard-toggle-ai-editor').addEventListener('click', () => {
        document.getElementById('standard-ai-editor-section').classList.add('hidden');
        document.getElementById('standard-show-ai-editor').classList.remove('hidden');
        document.getElementById('standard-ai-instruction').value = '';
    });
    
    document.getElementById('standard-ai-edit-btn').addEventListener('click', async () => {
        const instruction = document.getElementById('standard-ai-instruction').value.trim();
        const aiEditBtn = document.getElementById('standard-ai-edit-btn');
        
        if (!instruction) {
            alert('Please provide instructions for how to modify your standard timetable.');
            return;
        }
        
        const list = document.getElementById('standard-timetable-list');
        const rows = Array.from(list.querySelectorAll('.standard-timetable-row'));
        const currentTimetable = rows.map(r => ({
            time: r.querySelector('.time-input').value,
            task: r.querySelector('.task-input').value
        }));
        
        if (currentTimetable.length === 0) {
            alert('No timetable found to edit. Please add some time slots first.');
            return;
        }
        
        aiEditBtn.disabled = true;
        aiEditBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> AI is thinking...`;
        
        try {
            const prompt = `You are an expert time management coach. The user has a standard daily timetable.

CURRENT TIMETABLE:
${currentTimetable.map(slot => `${slot.time} - ${slot.task}`).join('\n')}

USER REQUEST: "${instruction}"

Please modify the timetable based on the user's request. Return ONLY a JSON object with:
{
  "timetable": [{"time": "08:00 AM", "task": "Modified Activity"}, ...]
}

Make realistic adjustments that address their specific concerns while maintaining a productive schedule.`;
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            if (!response.ok) throw new Error('Failed to get AI suggestions');
            const result = await response.json();
            
            if (result.timetable && result.timetable.length > 0) {
                renderStandardTimetable(result.timetable);
                markStandardTimetableChanged();
                
                document.getElementById('standard-ai-editor-section').classList.add('hidden');
                document.getElementById('standard-show-ai-editor').classList.remove('hidden');
                document.getElementById('standard-ai-instruction').value = '';
                
                showStandardTimetableMessage('AI has successfully updated your standard timetable!', 'success');
            } else {
                throw new Error('AI could not generate a valid timetable');
            }
        } catch (error) {
            console.error('AI edit error:', error);
            showStandardTimetableMessage('Error: ' + error.message + '. Please try again.', 'error');
        } finally {
            aiEditBtn.disabled = false;
            aiEditBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Apply AI Changes`;
        }
    });
    
    // Setup drag and drop for standard timetable with auto-positioning
    const standardList = document.getElementById('standard-timetable-list');
    Sortable.create(standardList, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'bg-purple-50',
        onEnd: (evt) => {
            const rows = Array.from(standardList.querySelectorAll('.standard-timetable-row'));
            const draggedRow = rows[evt.newIndex];
            
            if (!draggedRow) return;

            const prevRow = rows[evt.newIndex - 1];
            const nextRow = rows[evt.newIndex + 1];

            if (prevRow && nextRow) {
                const prevTime = prevRow.querySelector('.time-input').value;
                const nextTime = nextRow.querySelector('.time-input').value;
                const midTime = calculateMidpointTime(prevTime, nextTime);
                draggedRow.querySelector('.time-input').value = midTime;
            } else if (prevRow) {
                const prevTime = prevRow.querySelector('.time-input').value;
                const newTime = addMinutesToTime(prevTime, 30);
                draggedRow.querySelector('.time-input').value = newTime;
            } else if (nextRow) {
                const nextTime = nextRow.querySelector('.time-input').value;
                const newTime = subtractMinutesFromTime(nextTime, 30);
                draggedRow.querySelector('.time-input').value = newTime;
            }

            resortStandardRows();
            markStandardTimetableChanged();
        }
    });
}

// Declare standardTimetableContainer globally
let standardTimetableContainer = null;
let standardCalendarDate = new Date();
let standardProgressData = new Map();

// Standard Calendar Functions
function setupStandardCalendar(uid) {
    standardCalendarDate = new Date();
    renderStandardCalendar();
    loadStandardProgressData(uid);
    
    document.getElementById('standard-prev-month').addEventListener('click', () => {
        standardCalendarDate.setMonth(standardCalendarDate.getMonth() - 1);
        renderStandardCalendar();
        loadStandardProgressData(uid);
    });
    
    document.getElementById('standard-next-month').addEventListener('click', () => {
        standardCalendarDate.setMonth(standardCalendarDate.getMonth() + 1);
        renderStandardCalendar();
        loadStandardProgressData(uid);
    });
    
    document.getElementById('save-standard-calendar-btn').addEventListener('click', () => {
        saveStandardProgressData(uid);
    });
}

function renderStandardCalendar() {
    const calendarGrid = document.getElementById('standard-calendar-grid');
    const currentMonthEl = document.getElementById('standard-current-month');
    
    if (!calendarGrid || !currentMonthEl) return;
    
    const year = standardCalendarDate.getFullYear();
    const month = standardCalendarDate.getMonth();
    
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    calendarGrid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'h-12';
        calendarGrid.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const today = new Date().toISOString().split('T')[0];
        
        dayEl.className = `h-12 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:scale-105 ${
            dateStr === today ? 'ring-2 ring-purple-500' : ''
        }`;
        
        dayEl.innerHTML = `
            <div class="text-center">
                <div class="text-sm font-medium">${day}</div>
                <div class="w-2 h-2 rounded-full mx-auto mt-1 standard-progress-dot" data-date="${dateStr}"></div>
            </div>
        `;
        
        updateStandardDayStatus(dayEl, dateStr);
        dayEl.addEventListener('click', () => toggleStandardDayStatus(dateStr, dayEl));
        calendarGrid.appendChild(dayEl);
    }
}

function updateStandardDayStatus(dayEl, dateStr) {
    const dot = dayEl.querySelector('.standard-progress-dot');
    const status = standardProgressData.get(dateStr) || 'not-started';
    
    dot.classList.remove('bg-green-500', 'bg-red-500', 'bg-gray-300');
    dayEl.classList.remove('bg-green-50', 'bg-red-50', 'bg-gray-50');
    
    switch (status) {
        case 'completed':
            dot.classList.add('bg-green-500');
            dayEl.classList.add('bg-green-50');
            break;
        case 'missed':
            dot.classList.add('bg-red-500');
            dayEl.classList.add('bg-red-50');
            break;
        default:
            dot.classList.add('bg-gray-300');
            dayEl.classList.add('bg-gray-50');
    }
}

function toggleStandardDayStatus(dateStr, dayEl) {
    const currentStatus = standardProgressData.get(dateStr) || 'not-started';
    let newStatus = currentStatus === 'not-started' ? 'completed' : currentStatus === 'completed' ? 'missed' : 'not-started';
    
    standardProgressData.set(dateStr, newStatus);
    updateStandardDayStatus(dayEl, dateStr);
    
    const saveBtn = document.getElementById('save-standard-calendar-btn');
    if (saveBtn) saveBtn.classList.remove('hidden');
}

function loadStandardProgressData(uid) {
    const savedProgress = localStorage.getItem(`standard_calendar_${uid}`);
    if (savedProgress) {
        const data = JSON.parse(savedProgress);
        standardProgressData = new Map(Object.entries(data));
        
        setTimeout(() => {
            document.querySelectorAll('.standard-progress-dot').forEach(dot => {
                const dateStr = dot.getAttribute('data-date');
                if (dateStr) {
                    const dayEl = dot.closest('div').parentElement;
                    if (dayEl) updateStandardDayStatus(dayEl, dateStr);
                }
            });
        }, 50);
    }
    
    const saveBtn = document.getElementById('save-standard-calendar-btn');
    if (saveBtn) saveBtn.classList.add('hidden');
}

function saveStandardProgressData(uid) {
    const dataObj = Object.fromEntries(standardProgressData);
    localStorage.setItem(`standard_calendar_${uid}`, JSON.stringify(dataObj));
    
    const saveBtn = document.getElementById('save-standard-calendar-btn');
    if (saveBtn) saveBtn.classList.add('hidden');
    
    showStandardTimetableMessage('Standard calendar saved successfully!', 'success');
}