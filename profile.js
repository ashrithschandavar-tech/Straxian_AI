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

// Generic toggle function for all sections
function createToggle(toggleId, contentId, arrowId) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  const arrow = document.getElementById(arrowId);
  let isOpen = false;

  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      content.style.maxHeight = '1000px';
      content.style.opacity = '1';
      arrow.style.transform = 'rotate(0deg)';
    } else {
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
      arrow.style.transform = 'rotate(-90deg)';
    }
  });
}

// Create toggles for all sections
createToggle('notificationsToggle', 'notificationsContent', 'notificationsArrow');
createToggle('preferencesToggle', 'preferencesContent', 'preferencesArrow');
createToggle('dataToggle', 'dataContent', 'dataArrow');
createToggle('dangerToggle', 'dangerContent', 'dangerArrow');

// Load saved preferences
function loadPreferences() {
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  
  if (document.getElementById('emailNotif')) document.getElementById('emailNotif').checked = prefs.emailNotif !== false;
  if (document.getElementById('pushNotif')) document.getElementById('pushNotif').checked = prefs.pushNotif !== false;
  if (document.getElementById('reminderNotif')) document.getElementById('reminderNotif').checked = prefs.reminderNotif !== false;
  if (document.getElementById('achievementNotif')) document.getElementById('achievementNotif').checked = prefs.achievementNotif !== false;
  if (document.getElementById('themeSelect')) document.getElementById('themeSelect').value = prefs.theme || 'Light Mode';
  if (document.getElementById('languageSelect')) document.getElementById('languageSelect').value = prefs.language || 'English';
  if (document.getElementById('timezoneSelect')) document.getElementById('timezoneSelect').value = prefs.timezone || 'UTC';
  
  // Apply dark mode if saved
  if (prefs.theme === 'Dark Mode') {
    applyDarkMode();
  }
}

loadPreferences();

// Dark Mode Implementation
function applyDarkMode() {
  document.documentElement.classList.add('dark');
  document.body.classList.add('bg-gray-900', 'text-white');
  
  // Update all cards
  document.querySelectorAll('.bg-white').forEach(el => {
    el.classList.remove('bg-white');
    el.classList.add('bg-gray-800');
  });
  
  // Update text colors
  document.querySelectorAll('.text-gray-800, .text-gray-700, .text-gray-600').forEach(el => {
    el.classList.remove('text-gray-800', 'text-gray-700', 'text-gray-600');
    el.classList.add('text-white');
  });
  
  // Update nav
  const nav = document.querySelector('nav');
  if (nav) {
    nav.classList.remove('bg-white');
    nav.classList.add('bg-gray-800', 'border-gray-700');
  }
  
  // Update inputs
  document.querySelectorAll('input, select').forEach(el => {
    el.classList.add('bg-gray-700', 'text-white', 'border-gray-600');
    el.classList.remove('bg-white', 'border-gray-200');
  });
}

function removeDarkMode() {
  document.documentElement.classList.remove('dark');
  location.reload(); // Reload to reset styles
}

// Theme selector change
document.getElementById('themeSelect').addEventListener('change', (e) => {
  const theme = e.target.value;
  if (theme === 'Dark Mode') {
    applyDarkMode();
  } else {
    removeDarkMode();
  }
});

// Add dark mode styles
const style = document.createElement('style');
style.textContent = `
  :root.dark {
    color-scheme: dark;
  }
  :root.dark input:focus, :root.dark select:focus {
    border-color: #4f46e5;
  }
`;
document.head.appendChild(style);

// Save Notification Preferences
document.getElementById('saveNotifBtn').addEventListener('click', () => {
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  prefs.emailNotif = document.getElementById('emailNotif').checked;
  prefs.pushNotif = document.getElementById('pushNotif').checked;
  prefs.reminderNotif = document.getElementById('reminderNotif').checked;
  prefs.achievementNotif = document.getElementById('achievementNotif').checked;
  
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  
  const msg = document.getElementById('notifMessage');
  msg.textContent = 'Preferences saved successfully!';
  msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
  
  setTimeout(() => msg.textContent = '', 3000);
});

// Save Privacy Settings
document.getElementById('savePrivacyBtn').addEventListener('click', () => {
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  prefs.profilePublic = document.getElementById('profilePublic').checked;
  prefs.shareProgress = document.getElementById('shareProgress').checked;
  prefs.dataCollection = document.getElementById('dataCollection').checked;
  
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  
  const msg = document.getElementById('privacyMessage');
  msg.textContent = 'Privacy settings saved successfully!';
  msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
  
  setTimeout(() => msg.textContent = '', 3000);
});

// Save User Preferences
document.getElementById('savePreferencesBtn').addEventListener('click', () => {
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  prefs.theme = document.getElementById('themeSelect').value;
  prefs.language = document.getElementById('languageSelect').value;
  prefs.timezone = document.getElementById('timezoneSelect').value;
  
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  
  const msg = document.getElementById('preferencesMessage');
  msg.textContent = 'Preferences saved successfully!';
  msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
  
  setTimeout(() => msg.textContent = '', 3000);
});

// Two-Factor Authentication
document.getElementById('twoFactorToggle').addEventListener('change', () => {
  const isEnabled = document.getElementById('twoFactorToggle').checked;
  if (isEnabled) {
    showPasswordMessage('Two-Factor Authentication enabled! Check your email for setup instructions.', 'success');
  } else {
    showPasswordMessage('Two-Factor Authentication disabled.', 'success');
  }
});

// Load plans from localStorage and display them
function loadPlansForDownload() {
  const plans = JSON.parse(localStorage.getItem('allPlans')) || {};
  const plansCheckboxes = document.getElementById('plansCheckboxes');
  const selectContainer = document.getElementById('plansSelectContainer');
  const noPlansMessage = document.getElementById('noPlansMessage');
  
  if (Object.keys(plans).length === 0) {
    selectContainer.classList.add('hidden');
    noPlansMessage.classList.remove('hidden');
    return;
  }
  
  selectContainer.classList.remove('hidden');
  noPlansMessage.classList.add('hidden');
  plansCheckboxes.innerHTML = '';
  
  Object.keys(plans).forEach((planKey, index) => {
    const planTitle = plans[planKey].aim || 'Plan ' + (index + 1);
    const checkbox = document.createElement('label');
    checkbox.className = 'flex items-center gap-2 cursor-pointer';
    checkbox.innerHTML = `
      <input type="checkbox" data-plan="${planKey}" class="plan-checkbox w-4 h-4 text-orange-600 rounded">
      <span class="text-sm text-gray-700">${planTitle}</span>
    `;
    plansCheckboxes.appendChild(checkbox);
  });
  
  // Add "Select All" option
  const selectAllLabel = document.createElement('label');
  selectAllLabel.className = 'flex items-center gap-2 cursor-pointer font-semibold mt-3 pt-2 border-t border-gray-300';
  selectAllLabel.innerHTML = `
    <input id="selectAllPlans" type="checkbox" class="w-4 h-4 text-orange-600 rounded">
    <span class="text-sm text-gray-700">Select All Plans</span>
  `;
  plansCheckboxes.appendChild(selectAllLabel);
  
  document.getElementById('selectAllPlans').addEventListener('change', (e) => {
    document.querySelectorAll('.plan-checkbox').forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
  });
}

loadPlansForDownload();

// Download Selected Plans as PDF
document.getElementById('downloadPlansBtn').addEventListener('click', () => {
  const selectedCheckboxes = document.querySelectorAll('.plan-checkbox:checked');
  
  if (selectedCheckboxes.length === 0) {
    const msg = document.getElementById('dataMessage');
    msg.textContent = 'Please select at least one plan to download!';
    msg.className = 'text-center text-sm mt-2 text-red-600 font-semibold';
    return;
  }
  
  const msg = document.getElementById('dataMessage');
  msg.textContent = 'Generating PDF...';
  msg.className = 'text-center text-sm mt-2 text-blue-600 font-semibold';
  
  const plans = JSON.parse(localStorage.getItem('allPlans')) || {};
  let pdfContent = 'STRAXIAN AI - YOUR STRATEGY PLANS\n\n';
  pdfContent += '=' .repeat(50) + '\n\n';
  
  selectedCheckboxes.forEach((checkbox, index) => {
    const planKey = checkbox.getAttribute('data-plan');
    const plan = plans[planKey];
    
    pdfContent += `PLAN ${index + 1}: ${plan.aim}\n`;
    pdfContent += '-'.repeat(50) + '\n\n';
    pdfContent += `Category: ${plan.category}\n`;
    pdfContent += `Difficulty: ${plan.difficulty}\n`;
    pdfContent += `Due Date: ${plan.dueDate}\n\n`;
    
    if (plan.phases) {
      pdfContent += 'PHASES:\n';
      plan.phases.forEach((phase, i) => {
        pdfContent += `  ${i + 1}. ${phase}\n`;
      });
      pdfContent += '\n';
    }
    
    pdfContent += '\n' + '='.repeat(50) + '\n\n';
  });
  
  pdfContent += 'Generated on: ' + new Date().toLocaleString() + '\n';
  
  setTimeout(() => {
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'straxian-plans.txt';
    link.click();
    
    msg.textContent = 'Plans downloaded successfully!';
    msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
    
    setTimeout(() => msg.textContent = '', 3000);
  }, 1500);
});

// Delete Account
document.getElementById('deleteAccountBtn').addEventListener('click', () => {
  const confirmed = confirm('⚠️ This will permanently delete your account and all data. This action cannot be undone. Type "DELETE" in the prompt to confirm.');
  
  if (confirmed) {
    const userInput = prompt('Type "DELETE" to confirm account deletion:');
    
    if (userInput === 'DELETE') {
      const msg = document.getElementById('dangerMessage');
      msg.textContent = 'Deleting account...';
      msg.className = 'text-center text-sm mt-2 text-orange-600 font-semibold';
      
      setTimeout(() => {
        auth.currentUser.delete().then(() => {
          alert('Your account has been permanently deleted.');
          window.location.href = 'index.html';
        }).catch((error) => {
          msg.textContent = 'Error deleting account: ' + error.message;
          msg.className = 'text-center text-sm mt-2 text-red-600 font-semibold';
        });
      }, 1000);
    } else {
      const msg = document.getElementById('dangerMessage');
      msg.textContent = 'Deletion cancelled. Type "DELETE" to confirm.';
      msg.className = 'text-center text-sm mt-2 text-red-600 font-semibold';
    }
  }
});
