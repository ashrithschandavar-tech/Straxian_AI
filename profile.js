import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const picEl = document.getElementById('profilePic');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  nameEl.textContent = user.displayName || "No name";
  emailEl.textContent = user.email;
  picEl.src = user.photoURL || "https://via.placeholder.com/80";
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});
