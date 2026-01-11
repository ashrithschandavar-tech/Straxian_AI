import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- AUTH & SIDEBAR SYNC ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => window.location.href = "profile.html"; // ADD THIS LINE
        sidebar.classList.remove('hidden');
        loadHistory(user.uid);
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => window.location.href = "login.html"; // ADD THIS LINE
        sidebar.classList.add('hidden');
    }
});

// --- RESET APP FUNCTION ---
function resetUI() {
    document.getElementById('user-aim').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('difficulty').selectedIndex = 0;
    
    resultContainer.classList.add('hidden');
    loadingState.classList.add('hidden');
    inputCard.classList.remove('hidden');
    headerSection.classList.remove('hidden');
    window.scrollTo(0, 0);
}

logoHome.addEventListener('click', resetUI);
newPlanBtn.addEventListener('click', resetUI);

// --- FIREBASE HISTORY LOGIC ---
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
      "habits": ["Habit 1", "Habit 2", "Habit 3", "Habit 4", "Habit 5"],
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

        // 1. Render UI
        renderUI(plan, difficulty);

        // 2. Save to Firestore
        await addDoc(collection(db, "plans"), {
            userId: user.uid,
            title: aim,
            plan: plan,
            difficulty: difficulty,
            createdAt: new Date()
        });

    } catch (error) {
        console.error('Generation error:', error);
        alert('Error: ' + error.message);
        inputCard.classList.remove('hidden');
        headerSection.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }
});

function renderUI(plan, difficulty) {
    loadingState.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    let warningsHtml = '';
    
    if (plan.categoryMismatch) {
        warningsHtml += `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-2xl mb-4 animate-fade-in">
                <div class="flex items-start gap-4">
                    <div class="text-blue-600 mt-1"><i class="fa-solid fa-circle-info text-xl"></i></div>
                    <div>
                        <h4 class="font-bold text-blue-900 text-lg">Category Insight</h4>
                        <p class="text-blue-800 mt-1 leading-relaxed text-sm">${plan.categoryMismatch}</p>
                    </div>
                </div>
            </div>`;
    }

    if (plan.warning) {
        warningsHtml += `
            <div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl mb-8 animate-fade-in">
                <div class="flex items-start gap-4">
                    <div class="text-amber-600 mt-1"><i class="fa-solid fa-triangle-exclamation text-xl"></i></div>
                    <div>
                        <h4 class="font-bold text-amber-900 text-lg">Ambitious Timeline Detected</h4>
                        <p class="text-amber-800 mt-1 leading-relaxed text-sm">${plan.warning}</p>
                    </div>
                </div>
            </div>`;
    }

    resultContainer.innerHTML = `
        ${warningsHtml}
        <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-fade-in">
            <div class="flex justify-between items-start mb-4">
                <h2 class="text-3xl font-bold text-gray-800">${plan.title}</h2>
                <div class="flex gap-2">
                    <span class="px-3 py-1 ${plan.warning ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'} text-xs font-bold rounded-full tracking-wide">
                        ${plan.warning ? 'AMBITIOUS' : 'REALISTIC'}
                    </span>
                    <span class="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-bold rounded-full tracking-wide">${difficulty.toUpperCase()}</span>
                </div>
            </div>
            <p class="text-gray-600 leading-relaxed max-w-2xl">${plan.description}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-2 space-y-4 relative ml-4 md:ml-8 border-l-2 border-dashed border-indigo-200 pl-8">
                <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa-solid fa-map text-indigo-500"></i> Strategic Milestones</h3>
                ${plan.phases.map((p, i) => `
                    <div class="milestone-card shadow-sm animate-fade-in" style="animation-delay: ${i * 0.1}s">
                        <div class="milestone-number">${i + 1}</div>
                        <div class="flex justify-between font-bold text-gray-800">
                            <span>${p.name}</span>
                            <span class="text-indigo-500 text-sm">${p.date}</span>
                        </div>
                        <p class="text-gray-500 text-sm mt-2 leading-relaxed">${p.desc}</p>
                    </div>
                `).join('')}
            </div>
            <div class="space-y-6">
                <div class="habits-sidebar shadow-lg">
                    <h3 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa-solid fa-bolt text-yellow-400"></i> Daily Habits</h3>
                    <ul class="space-y-4 text-sm opacity-90">
                        ${plan.habits.map(h => `<li class="flex gap-2"><span>•</span> ${h}</li>`).join('')}
                    </ul>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 class="font-bold text-gray-800 mb-4">Common Hurdles</h3>
                    <div class="space-y-4">
                        ${plan.hurdles.map(h => `
                            <div>
                                <p class="font-bold text-sm text-gray-700">"${h.issue}"</p>
                                <p class="text-xs text-gray-500 mt-1">Solution: ${h.sol}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-12 pb-20">
             <h3 class="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-600"><i class="fa-solid fa-book-open"></i> Curated Resources</h3>
             <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                ${plan.resources.map(r => `
                    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">${r.type} • ${r.price}</span>
                        <h4 class="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">${r.name}</h4>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${r.desc}</p>
                    </div>
                `).join('')}
             </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}