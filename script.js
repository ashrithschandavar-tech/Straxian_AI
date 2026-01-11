import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const authBtn = document.getElementById('authBtn');
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebarBtn");

if (authBtn) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      authBtn.textContent = "Profile";
      sidebar.classList.remove("hidden");
    } else {
      authBtn.textContent = "Login / Sign Up";
      sidebar.classList.add("hidden");
    }

    authBtn.classList.remove("hidden");
  });

  authBtn.addEventListener('click', () => {
    const user = auth.currentUser;

    if (user) {
      window.location.href = "profile.html";
    } else {
      window.location.href = "login.html";
    }
  });
}

// Sidebar toggle
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
  });
}

// ---------------- EXISTING CODE BELOW (UNCHANGED) ----------------

const generateBtn = document.getElementById('generate-btn');
const inputCard = document.getElementById('input-card');
const loadingState = document.getElementById('loading-state');
const resultContainer = document.getElementById('result-container');
const headerSection = document.getElementById('header-section');
const logoHome = document.querySelector('nav .flex.items-center.gap-2');

if (logoHome) {
  logoHome.style.cursor = 'pointer';
  logoHome.addEventListener('click', () => {
    document.getElementById('user-aim').value = '';
    document.getElementById('due-date').value = '';
    document.getElementById('category').selectedIndex = 0;
    document.getElementById('difficulty').selectedIndex = 0;

    resultContainer.classList.add('hidden');
    loadingState.classList.add('hidden');
    inputCard.classList.remove('hidden');
    headerSection.classList.remove('hidden');
    window.scrollTo(0, 0);
  });
}

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
Goal: "${aim}". Target Date: ${dueDate}. Difficulty: ${difficulty}. Category: ${category}.`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate plan');
    }

    const plan = await response.json();
    renderUI(plan, difficulty);

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

  // Your existing render logic remains unchanged
}
