import { auth } from './firebase.js';
import { 
  onAuthStateChanged, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const picEl = document.getElementById('profilePic');
const logoutBtn = document.getElementById('logoutBtn');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const updatePasswordBtn = document.getElementById('updatePasswordBtn');
const passwordMessage = document.getElementById('passwordMessage');
const securityToggle = document.getElementById('securityToggle');
const securityContent = document.getElementById('securityContent');
const dropdownArrow = document.getElementById('dropdownArrow');

// Security Settings Toggle
let isSecurityOpen = false;
securityToggle.addEventListener('click', () => {
  isSecurityOpen = !isSecurityOpen;
  if (isSecurityOpen) {
    securityContent.style.maxHeight = '500px';
    securityContent.style.opacity = '1';
    dropdownArrow.style.transform = 'rotate(0deg)';
  } else {
    securityContent.style.maxHeight = '0px';
    securityContent.style.opacity = '0';
    dropdownArrow.style.transform = 'rotate(-90deg)';
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  nameEl.textContent = user.displayName || "Straxian User";
  emailEl.textContent = user.email;
  picEl.src = user.photoURL || "https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff";
});

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = "app.html";
  });
});

updatePasswordBtn.addEventListener('click', async () => {
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validation
  if (!newPassword || !confirmPassword) {
    showPasswordMessage('Please fill in all fields', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showPasswordMessage('Passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showPasswordMessage('Password must be at least 6 characters long', 'error');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    showPasswordMessage('User not found. Please log in again.', 'error');
    return;
  }

  try {
    updatePasswordBtn.disabled = true;
    updatePasswordBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-2"></i>Updating...';

    await updatePassword(user, newPassword);

    showPasswordMessage('Password updated successfully!', 'success');
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';

    setTimeout(() => {
      updatePasswordBtn.disabled = false;
      updatePasswordBtn.innerHTML = 'Update Password';
    }, 2000);
  } catch (error) {
    let errorMsg = 'Failed to update password';
    
    if (error.code === 'auth/requires-recent-login') {
      errorMsg = 'Please log out and log back in to update your password for security reasons.';
    } else if (error.code === 'auth/weak-password') {
      errorMsg = 'Password is too weak. Please use a stronger password.';
    }

    showPasswordMessage(errorMsg, 'error');
    updatePasswordBtn.disabled = false;
    updatePasswordBtn.innerHTML = 'Update Password';
  }
});

function showPasswordMessage(message, type) {
  passwordMessage.textContent = message;
  passwordMessage.className = `text-center text-sm mt-2 ${
    type === 'success' 
      ? 'text-green-600 font-semibold' 
      : 'text-red-600 font-semibold'
  }`;
}
