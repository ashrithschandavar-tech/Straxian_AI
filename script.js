import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";// Note: Ensure your firebase.js exports 'db' correctly. 
// I added 'doc' and 'updateDoc' to the imports above.

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('history-list');
const newPlanBtn = document.getElementById('new-plan-btn');

const generateBtn = document.getElementById('generate-btn');
const inputCard = document.getElementById('input-card');
const loadingState = document.getElementById('loading-state');
const resultContainer = document.getElementById('result-container');
const headerSection = document.getElementById('header-section');
const logoHome = document.getElementById('logoHome');

let currentPlanData = null; 
let currentDocId = null; // Track the active Firestore Document ID

// --- AUTH & SIDEBAR SYNC ---
onAuthStateChanged(auth, (user) => {
    authBtn.classList.remove('hidden');
    authBtn.style.display = "block"; 
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => { window.location.href = "profile.html"; };
        sidebar.classList.remove('hidden');
        loadHistory(user.uid);
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
        sidebar.classList.add('hidden');
    }
});

// --- RESET APP ---
function resetUI() {
    currentDocId = null;
    document.getElementById('user-aim').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('difficulty').selectedIndex = 0;
    resultContainer.classList.add('hidden');
    document.getElementById('timetable-section').classList.add('hidden');
    loadingState.classList.add('hidden');
    inputCard.classList.remove('hidden');
    headerSection.classList.remove('hidden');
    window.scrollTo(0, 0);
}

logoHome.addEventListener('click', resetUI);
newPlanBtn.addEventListener('click', resetUI);

// --- FIREBASE HISTORY ---
function loadHistory(uid) {
    const q = query(collection(db, "plans"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        historyList.innerHTML = '';
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="text-xs text-gray-400 p-4 text-center">No saved plans.</p>';
            return;
        }
        snapshot.forEach((fbDoc) => {
            const data = fbDoc.data();
            const item = document.createElement('div');
            item.className = "p-3 text-sm text-gray-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors truncate border-b border-gray-50 flex items-center gap-2";
            item.innerHTML = `<i class="fa-solid fa-calendar-check text-indigo-400 text-xs"></i> <span>${data.title}</span>`;
            item.onclick = () => {
                currentDocId = fbDoc.id; // Store ID for saving changes
                inputCard.classList.add('hidden');
                headerSection.classList.add('hidden');
                renderUI(data.plan, data.difficulty);
            };
            historyList.appendChild(item);
        });
    });
}

// --- GENERATION LOGIC ---
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

        // Save to Firestore first to get the ID
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

// --- UI RENDERING ---
function renderUI(plan, difficulty) {
    currentPlanData = plan; 
    loadingState.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    const ttSection = document.getElementById('timetable-section');
    const ttList = document.getElementById('timetable-list');
    ttSection.classList.remove('hidden');
    
    // If we are loading an existing plan, show the timetable immediately
    if (plan.timetable && plan.timetable.length > 0) {
        renderTimetable(plan.timetable);
        document.getElementById('generate-timetable-btn').innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Generate Timetable`;
    } else {
        ttList.innerHTML = '<p class="text-center text-gray-400 py-4">Click "Generate Daily Schedule" to build your routine.</p>';
    }

    // (Simplified Warnings/Content Logic)
    let warningsHtml = '';
    if (plan.categoryMismatch) warningsHtml += `<div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl mb-4 animate-fade-in"><p class="text-blue-800 text-sm">${plan.categoryMismatch}</p></div>`;
    if (plan.warning) warningsHtml += `<div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8 animate-fade-in"><p class="text-amber-800 text-sm">${plan.warning}</p></div>`;

    resultContainer.innerHTML = `
        ${warningsHtml}
        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fade-in">
            <h2 class="text-3xl font-bold text-gray-800 mb-2">${plan.title}</h2>
            <p class="text-gray-600 leading-relaxed">${plan.description}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 space-y-4 relative ml-8 border-l-2 border-dashed border-indigo-200 pl-8">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa-solid fa-map text-indigo-500"></i> Strategic Milestones</h3>
                ${plan.phases.map((p, i) => `<div class="milestone-card shadow-sm"><div class="milestone-number">${i + 1}</div><div class="flex justify-between font-bold"><span>${p.name}</span><span class="text-indigo-500">${p.date}</span></div><p class="text-gray-500 text-sm mt-2">${p.desc}</p></div>`).join('')}
            </div>
            <div class="space-y-6">
                <div class="habits-sidebar shadow-lg"><h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Habits</h3><ul class="space-y-2 text-sm">${plan.habits.map(h => `<li>• ${h}</li>`).join('')}</ul></div>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- TIMETABLE CORE & AUTO-SAVE ---

// Initialize Drag and Drop
const ttListEl = document.getElementById('timetable-list');
Sortable.create(ttListEl, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'bg-indigo-50',
    onEnd: () => saveTimetableState() // Save after dragging
});

// Trigger Generation
document.getElementById('generate-timetable-btn').addEventListener('click', () => {
    if (!currentPlanData || !currentPlanData.timetable) return;
    renderTimetable(currentPlanData.timetable);
    document.getElementById('generate-timetable-btn').innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Generate Timetable`;
    saveTimetableState(); // Save the newly generated timetable
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
    row.className = "timetable-row group flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all";

    row.innerHTML = `
        <div class="drag-handle cursor-grab text-gray-300 hover:text-indigo-500 px-1"><i class="fa-solid fa-grip-lines"></i></div>
        <input type="checkbox" class="w-5 h-5 accent-indigo-600 cursor-pointer">
        <input type="text" class="time-input w-24 bg-transparent border-none font-mono text-sm text-indigo-600" value="${time}">
        <input type="text" class="task-input flex-1 bg-transparent border-none text-gray-700" value="${task}">
        <button class="remove-row-btn text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i class="fa-solid fa-trash-can"></i></button>
    `;

    // Save on changes
    row.querySelector('.time-input').addEventListener('blur', () => {
        resortRows();
        saveTimetableState();
    });
    row.querySelector('.task-input').addEventListener('blur', () => saveTimetableState());
    
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        row.querySelector('.task-input').classList.toggle('task-done', checkbox.checked);
        saveTimetableState();
    });

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
        row.remove();
        saveTimetableState();
    });

    timetableList.appendChild(row);
}

// Function to collect current UI rows and save to Firestore
async function saveTimetableState() {
    if (!currentDocId) return;

    const list = document.getElementById('timetable-list');
    const rows = Array.from(list.querySelectorAll('.timetable-row'));
    
    const updatedTimetable = rows.map(r => ({
        time: r.querySelector('.time-input').value,
        task: r.querySelector('.task-input').value,
        // Optional: you could save the "checked" state here too if you add it to the schema
    }));

    try {
        const planRef = doc(db, "plans", currentDocId);
        // We update only the timetable part of the plan object
        await updateDoc(planRef, {
            "plan.timetable": updatedTimetable
        });
        console.log("Timetable saved automatically.");
    } catch (err) {
        console.error("Save error:", err);
    }
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
        task: r.querySelector('.task-input').value
    }));

    rowData.sort((a, b) => compareTimes(a.time, b.time));
    list.innerHTML = '';
    rowData.forEach(d => createTimetableRow(d.time, d.task));
}

document.getElementById('add-slot-btn').addEventListener('click', () => {
    createTimetableRow("12:00 PM", "New Activity");
    resortRows();
    saveTimetableState();
});