import { auth } from './firebase.js';
import { 
  onAuthStateChanged, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Track which dropdown is currently open
let currentOpenDropdown = null;

// Generic toggle function for all sections
function createToggle(toggleId, contentId, arrowId) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  const arrow = document.getElementById(arrowId);
  let isOpen = false;

  toggle.addEventListener('click', () => {
    // If this dropdown is already open, just close it
    if (isOpen) {
      isOpen = false;
      content.style.maxHeight = '0px';
      content.style.opacity = '0';
      arrow.style.transform = 'rotate(-90deg)';
      currentOpenDropdown = null;
      return;
    }
    
    // Close the currently open dropdown (if any)
    if (currentOpenDropdown && currentOpenDropdown !== toggleId) {
      const prevContent = document.getElementById(currentOpenDropdown.contentId);
      const prevArrow = document.getElementById(currentOpenDropdown.arrowId);
      prevContent.style.maxHeight = '0px';
      prevContent.style.opacity = '0';
      prevArrow.style.transform = 'rotate(-90deg)';
    }
    
    // Open this dropdown
    isOpen = true;
    content.style.maxHeight = '1000px';
    content.style.opacity = '1';
    arrow.style.transform = 'rotate(0deg)';
    currentOpenDropdown = { contentId, arrowId };
  });
}

// Create toggles for all sections
createToggle('securityToggle', 'securityContent', 'dropdownArrow');
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
  if (localStorage.getItem('darkMode') === 'true' || prefs.theme === 'Dark Mode') {
    applyDarkMode();
  }
}

loadPreferences();

// Dark Mode Implementation
function applyDarkMode() {
  localStorage.setItem('darkMode', 'true');
  document.documentElement.classList.add('dark');
  document.body.classList.add('bg-gray-900', 'text-white');
  document.body.classList.remove('bg-gray-50');
  
  // Update all white cards to dark
  document.querySelectorAll('.bg-white').forEach(el => {
    if (!el.classList.contains('dark-mode-processed')) {
      el.classList.remove('bg-white');
      el.classList.add('bg-gray-800');
      el.classList.add('dark-mode-processed');
    }
  });
  
  // Update text colors
  document.querySelectorAll('.text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500').forEach(el => {
    if (!el.classList.contains('dark-mode-processed')) {
      el.classList.remove('text-gray-800', 'text-gray-700', 'text-gray-600', 'text-gray-500');
      el.classList.add('text-gray-100');
      el.classList.add('dark-mode-processed');
    }
  });
  
  // Update nav
  const nav = document.querySelector('nav');
  if (nav && !nav.classList.contains('dark-mode-processed')) {
    nav.classList.remove('bg-white', 'shadow-sm');
    nav.classList.add('bg-gray-800', 'border-gray-700', 'dark-mode-processed');
  }
  
  // Update inputs and selects
  document.querySelectorAll('input, select').forEach(el => {
    if (!el.classList.contains('dark-mode-processed')) {
      el.classList.add('bg-gray-700', 'text-white', 'border-gray-600');
      el.classList.remove('bg-white', 'border-gray-200');
      el.classList.add('dark-mode-processed');
    }
  });
  
  // Update buttons
  document.querySelectorAll('button').forEach(el => {
    if (!el.classList.contains('dark-mode-processed') && !el.classList.contains('bg-red-600') && !el.classList.contains('bg-green-600') && !el.classList.contains('bg-blue-600') && !el.classList.contains('bg-orange-600') && !el.classList.contains('bg-purple-600') && !el.classList.contains('bg-indigo-600')) {
      el.classList.add('dark-mode-processed');
    }
  });
  
  applyDarkModeCSS();
}

function removeDarkMode() {
  localStorage.setItem('darkMode', 'false');
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('bg-gray-900', 'text-white');
  document.body.classList.add('bg-gray-50');
  
  document.querySelectorAll('.dark-mode-processed').forEach(el => {
    el.classList.remove('dark-mode-processed');
  });
  
  document.querySelectorAll('.bg-gray-800').forEach(el => {
    el.classList.remove('bg-gray-800');
    el.classList.add('bg-white');
  });
  
  document.querySelectorAll('.text-gray-100').forEach(el => {
    el.classList.remove('text-gray-100');
    el.classList.add('text-gray-800');
  });
  
  const nav = document.querySelector('nav');
  if (nav) {
    nav.classList.remove('bg-gray-800', 'border-gray-700');
    nav.classList.add('bg-white', 'shadow-sm');
  }
  
  document.querySelectorAll('input, select').forEach(el => {
    el.classList.remove('bg-gray-700', 'text-white', 'border-gray-600');
    el.classList.add('bg-white', 'border-gray-200');
  });
  
  // Remove dark mode CSS
  const darkCss = document.getElementById('dark-mode-styles');
  if (darkCss) darkCss.remove();
}

function applyDarkModeCSS() {
  if (!document.getElementById('dark-mode-styles')) {
    const style = document.createElement('style');
    style.id = 'dark-mode-styles';
    style.textContent = `
      :root.dark {
        color-scheme: dark;
      }
      :root.dark input:focus, :root.dark select:focus {
        border-color: #4f46e5;
      }
      :root.dark button[class*="bg-indigo"], :root.dark button[class*="bg-red"], :root.dark button[class*="bg-blue"], :root.dark button[class*="bg-green"], :root.dark button[class*="bg-orange"], :root.dark button[class*="bg-purple"] {
        filter: brightness(0.9);
      }
      :root.dark .border-gray-200 {
        border-color: #374151;
      }
      :root.dark .shadow-xl {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}

// Theme selector change
document.getElementById('themeSelect').addEventListener('change', (e) => {
  const theme = e.target.value;
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  prefs.theme = theme;
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
  
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
// Removed - not implemented yet

// Load plans from Firebase and display them
let allPlansData = new Map(); // Store full plan data

function loadPlansForDownload() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      document.getElementById('noPlansMessage').classList.remove('hidden');
      return;
    }

    const q = query(collection(db, "plans"), where("userId", "==", user.uid));
    onSnapshot(q, (snapshot) => {
      const plansCheckboxes = document.getElementById('plansCheckboxes');
      const selectContainer = document.getElementById('plansSelectContainer');
      const noPlansMessage = document.getElementById('noPlansMessage');
      
      if (snapshot.empty) {
        selectContainer.classList.add('hidden');
        noPlansMessage.classList.remove('hidden');
        return;
      }
      
      selectContainer.classList.remove('hidden');
      noPlansMessage.classList.add('hidden');
      plansCheckboxes.innerHTML = '';
      allPlansData.clear();
      
      snapshot.forEach((docSnap, index) => {
        const planData = docSnap.data();
        const planTitle = planData.title || 'Plan ' + (index + 1);
        const createdDate = planData.createdAt ? new Date(planData.createdAt.toDate()).toLocaleDateString() : 'Unknown';
        
        // Store full plan data
        allPlansData.set(docSnap.id, {
          id: docSnap.id,
          title: planTitle,
          plan: planData.plan,
          difficulty: planData.difficulty,
          createdAt: createdDate
        });
        
        const checkbox = document.createElement('label');
        checkbox.className = 'flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded';
        checkbox.innerHTML = `
          <input type="checkbox" data-plan="${docSnap.id}" class="plan-checkbox w-4 h-4 text-orange-600 rounded">
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-700">${planTitle}</span>
            <div class="text-xs text-gray-500">Created: ${createdDate}</div>
          </div>
        `;
        plansCheckboxes.appendChild(checkbox);
      });
      
      // Add "Select All" option
      const selectAllLabel = document.createElement('label');
      selectAllLabel.className = 'flex items-center gap-2 cursor-pointer font-semibold mt-3 pt-2 border-t border-gray-300';
      selectAllLabel.innerHTML = `
        <input id="selectAllPlans" type="checkbox" class="w-4 h-4 text-orange-600 rounded">
        <span class="text-sm text-gray-700">Select All Plans (${allPlansData.size})</span>
      `;
      plansCheckboxes.appendChild(selectAllLabel);
      
      document.getElementById('selectAllPlans').addEventListener('change', (e) => {
        document.querySelectorAll('.plan-checkbox').forEach(checkbox => {
          checkbox.checked = e.target.checked;
        });
      });
    });
  });
}

loadPlansForDownload();

// Download functionality
function generatePDF(plansToDownload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('STRAXIAN AI - STRATEGY PLANS', 20, 20);
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
  
  let yPosition = 50;
  
  plansToDownload.forEach((planData, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Plan title
    doc.setFontSize(16);
    doc.text(`${index + 1}. ${planData.title}`, 20, yPosition);
    yPosition += 10;
    
    // Plan details
    doc.setFontSize(10);
    doc.text(`Created: ${planData.createdAt} | Difficulty: ${planData.difficulty || 'N/A'}`, 20, yPosition);
    yPosition += 15;
    
    if (planData.plan) {
      // Description
      if (planData.plan.description) {
        doc.text('Description:', 20, yPosition);
        yPosition += 5;
        const descLines = doc.splitTextToSize(planData.plan.description, 170);
        doc.text(descLines, 25, yPosition);
        yPosition += descLines.length * 5 + 5;
      }
      
      // Phases
      if (planData.plan.phases && planData.plan.phases.length > 0) {
        doc.text('Strategic Milestones:', 20, yPosition);
        yPosition += 5;
        planData.plan.phases.forEach((phase, i) => {
          doc.text(`${i + 1}. ${phase.name} (${phase.date})`, 25, yPosition);
          yPosition += 5;
          if (phase.desc) {
            const phaseLines = doc.splitTextToSize(phase.desc, 160);
            doc.text(phaseLines, 30, yPosition);
            yPosition += phaseLines.length * 4 + 3;
          }
        });
        yPosition += 5;
      }
      
      // Habits
      if (planData.plan.habits && planData.plan.habits.length > 0) {
        doc.text('Daily Habits:', 20, yPosition);
        yPosition += 5;
        planData.plan.habits.forEach(habit => {
          doc.text(`• ${habit}`, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }
    }
    
    yPosition += 10;
  });
  
  return doc;
}

function generateTextFile(plansToDownload) {
  let content = 'STRAXIAN AI - YOUR STRATEGY PLANS\n';
  content += '='.repeat(50) + '\n\n';
  content += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  plansToDownload.forEach((planData, index) => {
    content += `PLAN ${index + 1}: ${planData.title}\n`;
    content += '-'.repeat(50) + '\n';
    content += `Created: ${planData.createdAt}\n`;
    content += `Difficulty: ${planData.difficulty || 'N/A'}\n\n`;
    
    if (planData.plan) {
      if (planData.plan.description) {
        content += `DESCRIPTION:\n${planData.plan.description}\n\n`;
      }
      
      if (planData.plan.phases && planData.plan.phases.length > 0) {
        content += 'STRATEGIC MILESTONES:\n';
        planData.plan.phases.forEach((phase, i) => {
          content += `${i + 1}. ${phase.name} (${phase.date})\n`;
          if (phase.desc) content += `   ${phase.desc}\n`;
        });
        content += '\n';
      }
      
      if (planData.plan.habits && planData.plan.habits.length > 0) {
        content += 'DAILY HABITS:\n';
        planData.plan.habits.forEach(habit => {
          content += `• ${habit}\n`;
        });
        content += '\n';
      }
      
      if (planData.plan.hurdles && planData.plan.hurdles.length > 0) {
        content += 'COMMON HURDLES & SOLUTIONS:\n';
        planData.plan.hurdles.forEach(hurdle => {
          content += `Problem: ${hurdle.issue}\n`;
          content += `Solution: ${hurdle.sol}\n\n`;
        });
      }
    }
    
    content += '\n' + '='.repeat(50) + '\n\n';
  });
  
  return content;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Download Selected Plans
document.getElementById('downloadPlansBtn').addEventListener('click', async () => {
  const selectedCheckboxes = document.querySelectorAll('.plan-checkbox:checked');
  const format = document.getElementById('downloadFormat').value;
  
  if (selectedCheckboxes.length === 0) {
    showMessage('dataMessage', 'Please select at least one plan to download!', 'error');
    return;
  }
  
  showMessage('dataMessage', 'Generating download...', 'info');
  
  const plansToDownload = [];
  selectedCheckboxes.forEach(checkbox => {
    const planId = checkbox.getAttribute('data-plan');
    const planData = allPlansData.get(planId);
    if (planData) plansToDownload.push(planData);
  });
  
  try {
    const timestamp = new Date().getTime();
    
    if (format === 'pdf') {
      const pdf = generatePDF(plansToDownload);
      pdf.save(`straxian-plans-${timestamp}.pdf`);
    } else if (format === 'txt') {
      const content = generateTextFile(plansToDownload);
      downloadFile(content, `straxian-plans-${timestamp}.txt`, 'text/plain');
    } else if (format === 'json') {
      const jsonData = JSON.stringify(plansToDownload, null, 2);
      downloadFile(jsonData, `straxian-plans-${timestamp}.json`, 'application/json');
    } else if (format === 'docx') {
      // For now, download as rich text that can be opened in Word
      const content = generateTextFile(plansToDownload);
      downloadFile(content, `straxian-plans-${timestamp}.rtf`, 'application/rtf');
    }
    
    showMessage('dataMessage', `${plansToDownload.length} plan(s) downloaded successfully!`, 'success');
  } catch (error) {
    showMessage('dataMessage', 'Error generating download: ' + error.message, 'error');
  }
});

// Download All Plans
document.getElementById('downloadAllBtn').addEventListener('click', async () => {
  const format = document.getElementById('downloadFormat').value;
  
  if (allPlansData.size === 0) {
    showMessage('dataMessage', 'No plans available to download!', 'error');
    return;
  }
  
  showMessage('dataMessage', 'Generating download...', 'info');
  
  const plansToDownload = Array.from(allPlansData.values());
  
  try {
    const timestamp = new Date().getTime();
    
    if (format === 'pdf') {
      const pdf = generatePDF(plansToDownload);
      pdf.save(`straxian-all-plans-${timestamp}.pdf`);
    } else if (format === 'txt') {
      const content = generateTextFile(plansToDownload);
      downloadFile(content, `straxian-all-plans-${timestamp}.txt`, 'text/plain');
    } else if (format === 'json') {
      const jsonData = JSON.stringify(plansToDownload, null, 2);
      downloadFile(jsonData, `straxian-all-plans-${timestamp}.json`, 'application/json');
    } else if (format === 'docx') {
      const content = generateTextFile(plansToDownload);
      downloadFile(content, `straxian-all-plans-${timestamp}.rtf`, 'application/rtf');
    }
    
    showMessage('dataMessage', `All ${plansToDownload.length} plan(s) downloaded successfully!`, 'success');
  } catch (error) {
    showMessage('dataMessage', 'Error generating download: ' + error.message, 'error');
  }
});

function showMessage(elementId, message, type) {
  const msg = document.getElementById(elementId);
  msg.textContent = message;
  const colorClass = type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-600';
  msg.className = `text-center text-sm mt-2 ${colorClass} font-semibold`;
  
  if (type === 'success') {
    setTimeout(() => msg.textContent = '', 3000);
  }
}

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
