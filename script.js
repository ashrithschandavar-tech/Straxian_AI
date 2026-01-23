import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('history-list');
const newPlanBtn = document.getElementById('new-plan-btn');
const myTimetablesBtn = document.getElementById('my-timetables-btn');

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

// ─── AUTH & SIDEBAR SYNC ─────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    authBtn.classList.remove('hidden');
    authBtn.style.display = "block"; 
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => { window.location.href = "profile.html"; };
        sidebar.classList.remove('hidden');
        loadHistory(user.uid);

        myTimetablesBtn.addEventListener('click', () => {
            showTimetablesView(user.uid);
        });
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
        sidebar.classList.add('hidden');
    }
});

// ─── RESET APP ───────────────────────────────────────────────────────
function resetUI() {
    document.getElementById('user-aim').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('difficulty').selectedIndex = 0;
    resultContainer.classList.add('hidden');
    document.getElementById('timetable-section').classList.add('hidden');
    loadingState.classList.add('hidden');
    inputCard.classList.remove('hidden');
    headerSection.classList.remove('hidden');
    if (timetablesContainer) timetablesContainer.classList.add('hidden');
    currentDocId = null;
    currentPlanData = null;
    window.scrollTo(0, 0);
}

logoHome.addEventListener('click', resetUI);
newPlanBtn.addEventListener('click', resetUI);

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
                currentDocId = doc.id;
                inputCard.classList.add('hidden');
                headerSection.classList.add('hidden');
                if (timetablesContainer) timetablesContainer.classList.add('hidden');
                renderUI(data.plan, data.difficulty);
            };
            historyList.appendChild(item);
        });
    });
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
      "resources": [{"type": "BOOK", "price": "Free", "name": "Resource Name", "desc": "Description"}]
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
             <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">${plan.resources.map(r => `<div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">${r.type} • ${r.price}</span><h4 class="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${r.name}</h4><p class="text-xs text-gray-500 mt-1 line-clamp-2">${r.desc}</p></div>`).join('')}</div>
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

        if (snapshot.empty) {
            container.innerHTML += `
                <div class="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <i class="fa-solid fa-calendar-xmark text-6xl text-gray-300 mb-4"></i>
                    <p class="text-lg font-medium text-gray-600">No timetables yet</p>
                    <p class="text-sm text-gray-500 mt-2">Generate a plan and create a daily schedule first.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

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
                renderUI(plan, data.difficulty || "Intermediate");
                if (timetablesContainer) timetablesContainer.classList.add('hidden');
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
    onEnd: () => saveTimetableState()
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
            saveTimetableState();
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
    sorted.forEach(item => createTimetableRow(item.time, item.task));
}

function createTimetableRow(time = "09:00 AM", task = "New Task") {
    const timetableList = document.getElementById('timetable-list');
    const row = document.createElement('div');
    row.className = "timetable-row animate-fade-in group flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all";

    row.innerHTML = `
        <div class="drag-handle cursor-grab text-gray-300 hover:text-indigo-500 px-1">
            <i class="fa-solid fa-grip-lines"></i>
        </div>
        <input type="checkbox" class="w-5 h-5 accent-indigo-600 cursor-pointer">
        <input type="text" class="time-input w-24 bg-transparent border-none font-mono text-sm text-indigo-600 focus:ring-0" value="${time}">
        <input type="text" class="task-input flex-1 bg-transparent border-none text-gray-700 focus:ring-0" value="${task}">
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

function resortRows() {
    const list = document.getElementById('timetable-list');
    const rows = Array.from(list.querySelectorAll('.timetable-row'));
    const rowData = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value,
        checked: r.querySelector('input[type="checkbox"]').checked
    }));

    rowData.sort((a, b) => compareTimes(a.time, b.time));
    list.innerHTML = '';
    rowData.forEach(d => {
        createTimetableRow(d.time, d.task);
        if (d.checked) {
            const last = list.lastElementChild;
            last.querySelector('input[type="checkbox"]').checked = true;
            last.querySelector('.task-input').classList.add('task-done');
        }
    });
}

document.getElementById('add-slot-btn').addEventListener('click', () => {
    createTimetableRow("12:00 PM", "New Activity");
    resortRows();
    saveTimetableState();
});

async function saveTimetableState() {
    if (!currentDocId) return;

    const list = document.getElementById('timetable-list');
    const rows = Array.from(list.querySelectorAll('.timetable-row'));

    const updatedTimetable = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value
    }));

    try {
        const planRef = doc(db, "plans", currentDocId);
        await updateDoc(planRef, {
            "plan.timetable": updatedTimetable
        });
        console.log("Timetable saved.");
    } catch (err) {
        console.error("Save error:", err);
    }
}

// ─── NOTES FUNCTIONALITY ─────────────────────────────────────────────

// Navigate to notes page
myNotesBtn.addEventListener('click', () => {
    window.location.href = 'notes.html';
});