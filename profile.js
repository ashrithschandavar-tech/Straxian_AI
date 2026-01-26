import { auth, db } from './firebase.js';
import { 
  onAuthStateChanged, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
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
  if (securityToggle) {
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
  }

  // Auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (nameEl) nameEl.textContent = user.displayName || "Straxian User";
    if (emailEl) emailEl.textContent = user.email;
    if (picEl) picEl.src = user.photoURL || "https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff";
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth).then(() => {
        window.location.href = "app.html";
      });
    });
  }

  // Update password
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async () => {
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;

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
  }

  function showPasswordMessage(message, type) {
    if (passwordMessage) {
      passwordMessage.textContent = message;
      passwordMessage.className = `text-center text-sm mt-2 ${
        type === 'success' 
          ? 'text-green-600 font-semibold' 
          : 'text-red-600 font-semibold'
      }`;
    }
  }

  // Generic toggle function for all sections
  function createToggle(toggleId, contentId, arrowId) {
    const toggle = document.getElementById(toggleId);
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    
    if (!toggle || !content || !arrow) return;
    
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
  createToggle('securityToggle', 'securityContent', 'dropdownArrow');
  createToggle('notificationsToggle', 'notificationsContent', 'notificationsArrow');
  createToggle('preferencesToggle', 'preferencesContent', 'preferencesArrow');
  createToggle('dataToggle', 'dataContent', 'dataArrow');
  createToggle('dangerToggle', 'dangerContent', 'dangerArrow');

  // Theme selector
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
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
  }

  // Save buttons
  const saveNotifBtn = document.getElementById('saveNotifBtn');
  if (saveNotifBtn) {
    saveNotifBtn.addEventListener('click', () => {
      const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
      const emailNotif = document.getElementById('emailNotif');
      const pushNotif = document.getElementById('pushNotif');
      const reminderNotif = document.getElementById('reminderNotif');
      const achievementNotif = document.getElementById('achievementNotif');
      
      if (emailNotif) prefs.emailNotif = emailNotif.checked;
      if (pushNotif) prefs.pushNotif = pushNotif.checked;
      if (reminderNotif) prefs.reminderNotif = reminderNotif.checked;
      if (achievementNotif) prefs.achievementNotif = achievementNotif.checked;
      
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
      
      const msg = document.getElementById('notifMessage');
      if (msg) {
        msg.textContent = 'Preferences saved successfully!';
        msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
        setTimeout(() => msg.textContent = '', 3000);
      }
    });
  }

  const savePreferencesBtn = document.getElementById('savePreferencesBtn');
  if (savePreferencesBtn) {
    savePreferencesBtn.addEventListener('click', () => {
      const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
      const themeSelect = document.getElementById('themeSelect');
      const languageSelect = document.getElementById('languageSelect');
      const timezoneSelect = document.getElementById('timezoneSelect');
      
      if (themeSelect) prefs.theme = themeSelect.value;
      if (languageSelect) prefs.language = languageSelect.value;
      if (timezoneSelect) prefs.timezone = timezoneSelect.value;
      
      localStorage.setItem('userPreferences', JSON.stringify(prefs));
      
      const msg = document.getElementById('preferencesMessage');
      if (msg) {
        msg.textContent = 'Preferences saved successfully!';
        msg.className = 'text-center text-sm mt-2 text-green-600 font-semibold';
        setTimeout(() => msg.textContent = '', 3000);
      }
    });
  }

  // Download functionality
  const downloadPlansBtn = document.getElementById('downloadPlansBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  
  if (downloadPlansBtn) {
    downloadPlansBtn.addEventListener('click', async () => {
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
          const content = generateTextFile(plansToDownload);
          downloadFile(content, `straxian-plans-${timestamp}.rtf`, 'application/rtf');
        }
        
        showMessage('dataMessage', `${plansToDownload.length} plan(s) downloaded successfully!`, 'success');
      } catch (error) {
        showMessage('dataMessage', 'Error generating download: ' + error.message, 'error');
      }
    });
  }

  if (downloadAllBtn) {
    downloadAllBtn.addEventListener('click', async () => {
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
  }

  // Delete Account
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      const confirmed = confirm('⚠️ This will permanently delete your account and all data. This action cannot be undone. Type "DELETE" in the prompt to confirm.');
      
      if (confirmed) {
        const userInput = prompt('Type "DELETE" to confirm account deletion:');
        
        if (userInput === 'DELETE') {
          const msg = document.getElementById('dangerMessage');
          if (msg) {
            msg.textContent = 'Deleting account...';
            msg.className = 'text-center text-sm mt-2 text-orange-600 font-semibold';
          }
          
          setTimeout(() => {
            auth.currentUser.delete().then(() => {
              alert('Your account has been permanently deleted.');
              window.location.href = 'index.html';
            }).catch((error) => {
              if (msg) {
                msg.textContent = 'Error deleting account: ' + error.message;
                msg.className = 'text-center text-sm mt-2 text-red-600 font-semibold';
              }
            });
          }, 1000);
        } else {
          const msg = document.getElementById('dangerMessage');
          if (msg) {
            msg.textContent = 'Deletion cancelled. Type "DELETE" to confirm.';
            msg.className = 'text-center text-sm mt-2 text-red-600 font-semibold';
          }
        }
      }
    });
  }
});

// Load saved preferences
function loadPreferences() {
  const prefs = JSON.parse(localStorage.getItem('userPreferences')) || {};
  
  const emailNotif = document.getElementById('emailNotif');
  const pushNotif = document.getElementById('pushNotif');
  const reminderNotif = document.getElementById('reminderNotif');
  const achievementNotif = document.getElementById('achievementNotif');
  const themeSelect = document.getElementById('themeSelect');
  const languageSelect = document.getElementById('languageSelect');
  const timezoneSelect = document.getElementById('timezoneSelect');
  
  if (emailNotif) emailNotif.checked = prefs.emailNotif !== false;
  if (pushNotif) pushNotif.checked = prefs.pushNotif !== false;
  if (reminderNotif) reminderNotif.checked = prefs.reminderNotif !== false;
  if (achievementNotif) achievementNotif.checked = prefs.achievementNotif !== false;
  if (themeSelect) themeSelect.value = prefs.theme || 'Light Mode';
  if (languageSelect) languageSelect.value = prefs.language || 'English';
  if (timezoneSelect) timezoneSelect.value = prefs.timezone || 'UTC';
  
  // Apply dark mode if saved
  if (localStorage.getItem('darkMode') === 'true' || prefs.theme === 'Dark Mode') {
    applyDarkMode();
  }
}

// Dark Mode functions
function applyDarkMode() {
  localStorage.setItem('darkMode', 'true');
  document.documentElement.classList.add('dark');
  document.body.classList.add('bg-gray-900', 'text-white');
  document.body.classList.remove('bg-gray-50');
}

function removeDarkMode() {
  localStorage.setItem('darkMode', 'false');
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('bg-gray-900', 'text-white');
  document.body.classList.add('bg-gray-50');
}

// Load plans from Firebase
let allPlansData = new Map();

function loadPlansForDownload() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      const noPlansMessage = document.getElementById('noPlansMessage');
      const plansSelectContainer = document.getElementById('plansSelectContainer');
      if (noPlansMessage) noPlansMessage.classList.remove('hidden');
      if (plansSelectContainer) plansSelectContainer.classList.add('hidden');
      return;
    }

    console.log('Loading plans for user:', user.uid);
    const q = query(collection(db, "plans"), where("userId", "==", user.uid));
    onSnapshot(q, (snapshot) => {
      console.log('Plans snapshot received, size:', snapshot.size);
      
      const plansCheckboxes = document.getElementById('plansCheckboxes');
      const selectContainer = document.getElementById('plansSelectContainer');
      const noPlansMessage = document.getElementById('noPlansMessage');
      
      if (snapshot.empty) {
        console.log('No plans found');
        if (selectContainer) selectContainer.classList.add('hidden');
        if (noPlansMessage) noPlansMessage.classList.remove('hidden');
        return;
      }
      
      console.log('Found', snapshot.size, 'plans');
      if (selectContainer) selectContainer.classList.remove('hidden');
      if (noPlansMessage) noPlansMessage.classList.add('hidden');
      if (plansCheckboxes) plansCheckboxes.innerHTML = '';
      allPlansData.clear();
      
      snapshot.forEach((docSnap, index) => {
        const planData = docSnap.data();
        console.log('Processing plan:', docSnap.id, planData.title);
        
        const planTitle = planData.title || 'Plan ' + (index + 1);
        const createdDate = planData.createdAt ? new Date(planData.createdAt.toDate()).toLocaleDateString() : 'Unknown';
        
        allPlansData.set(docSnap.id, {
          id: docSnap.id,
          title: planTitle,
          plan: planData.plan,
          difficulty: planData.difficulty,
          createdAt: createdDate
        });
        
        if (plansCheckboxes) {
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
        }
      });
      
      if (plansCheckboxes) {
        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'flex items-center gap-2 cursor-pointer font-semibold mt-3 pt-2 border-t border-gray-300';
        selectAllLabel.innerHTML = `
          <input id="selectAllPlans" type="checkbox" class="w-4 h-4 text-orange-600 rounded">
          <span class="text-sm text-gray-700">Select All Plans (${allPlansData.size})</span>
        `;
        plansCheckboxes.appendChild(selectAllLabel);
        
        const selectAllPlans = document.getElementById('selectAllPlans');
        if (selectAllPlans) {
          selectAllPlans.addEventListener('change', (e) => {
            document.querySelectorAll('.plan-checkbox').forEach(checkbox => {
              checkbox.checked = e.target.checked;
            });
          });
        }
      }
      
      console.log('Plans loaded successfully, total:', allPlansData.size);
    }, (error) => {
      console.error('Error loading plans:', error);
      const noPlansMessage = document.getElementById('noPlansMessage');
      if (noPlansMessage) {
        noPlansMessage.innerHTML = '<p>Error loading plans. Please refresh the page.</p>';
        noPlansMessage.classList.remove('hidden');
      }
    });
  });
}

// PDF and file generation functions
function generatePDF(plansToDownload) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
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
    
    doc.setFontSize(16);
    doc.text(`${index + 1}. ${planData.title}`, 20, yPosition);
    yPosition += 10;
    
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
        if (yPosition > 220) { doc.addPage(); yPosition = 20; }
        doc.text('Strategic Milestones:', 20, yPosition);
        yPosition += 5;
        planData.plan.phases.forEach((phase, i) => {
          if (yPosition > 270) { doc.addPage(); yPosition = 20; }
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
        if (yPosition > 220) { doc.addPage(); yPosition = 20; }
        doc.text('Daily Habits:', 20, yPosition);
        yPosition += 5;
        planData.plan.habits.forEach(habit => {
          if (yPosition > 270) { doc.addPage(); yPosition = 20; }
          doc.text(`• ${habit}`, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }
      
      // Timetable
      if (planData.plan.timetable && planData.plan.timetable.length > 0) {
        if (yPosition > 180) { doc.addPage(); yPosition = 20; }
        doc.setFontSize(12);
        doc.text('Daily Timetable:', 20, yPosition);
        yPosition += 10;
        
        const sortedTimetable = [...planData.plan.timetable].sort((a, b) => {
          const parseTime = (t) => {
            const [time, modifier] = t.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            return parseInt(hours, 10) * 60 + parseInt(minutes || 0, 10);
          };
          return parseTime(a.time) - parseTime(b.time);
        });
        
        // Table headers
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Time', 25, yPosition);
        doc.text('Activity', 70, yPosition);
        yPosition += 5;
        
        // Table line under headers
        doc.line(25, yPosition, 180, yPosition);
        yPosition += 5;
        
        // Table content
        doc.setFont(undefined, 'normal');
        sortedTimetable.forEach(slot => {
          if (yPosition > 270) { 
            doc.addPage(); 
            yPosition = 20;
            // Repeat headers on new page
            doc.setFont(undefined, 'bold');
            doc.text('Time', 25, yPosition);
            doc.text('Activity', 70, yPosition);
            yPosition += 5;
            doc.line(25, yPosition, 180, yPosition);
            yPosition += 5;
            doc.setFont(undefined, 'normal');
          }
          
          doc.text(slot.time, 25, yPosition);
          const taskLines = doc.splitTextToSize(slot.task, 110);
          doc.text(taskLines, 70, yPosition);
          yPosition += Math.max(5, taskLines.length * 4);
          
          // Light separator line
          doc.setDrawColor(200, 200, 200);
          doc.line(25, yPosition, 180, yPosition);
          doc.setDrawColor(0, 0, 0);
          yPosition += 2;
        });
        yPosition += 8;
      }
      
      // Hurdles & Solutions
      if (planData.plan.hurdles && planData.plan.hurdles.length > 0) {
        if (yPosition > 200) { doc.addPage(); yPosition = 20; }
        doc.text('Common Hurdles & Solutions:', 20, yPosition);
        yPosition += 5;
        planData.plan.hurdles.forEach(hurdle => {
          if (yPosition > 250) { doc.addPage(); yPosition = 20; }
          doc.text(`Problem: ${hurdle.issue}`, 25, yPosition);
          yPosition += 5;
          const solLines = doc.splitTextToSize(`Solution: ${hurdle.sol}`, 160);
          doc.text(solLines, 25, yPosition);
          yPosition += solLines.length * 4 + 5;
        });
        yPosition += 5;
      }
      
      // Resources
      if (planData.plan.resources && planData.plan.resources.length > 0) {
        if (yPosition > 200) { doc.addPage(); yPosition = 20; }
        doc.text('Curated Resources:', 20, yPosition);
        yPosition += 5;
        planData.plan.resources.forEach(resource => {
          if (yPosition > 250) { doc.addPage(); yPosition = 20; }
          doc.text(`${resource.type} - ${resource.name} (${resource.price})`, 25, yPosition);
          yPosition += 5;
          if (resource.desc) {
            const resLines = doc.splitTextToSize(resource.desc, 160);
            doc.text(resLines, 30, yPosition);
            yPosition += resLines.length * 4 + 3;
          }
        });
        yPosition += 5;
      }
      
      // Warnings
      if (planData.plan.warning) {
        if (yPosition > 240) { doc.addPage(); yPosition = 20; }
        doc.text('Timeline Warning:', 20, yPosition);
        yPosition += 5;
        const warnLines = doc.splitTextToSize(planData.plan.warning, 170);
        doc.text(warnLines, 25, yPosition);
        yPosition += warnLines.length * 4 + 5;
      }
      
      if (planData.plan.categoryMismatch) {
        if (yPosition > 240) { doc.addPage(); yPosition = 20; }
        doc.text('Category Insight:', 20, yPosition);
        yPosition += 5;
        const catLines = doc.splitTextToSize(planData.plan.categoryMismatch, 170);
        doc.text(catLines, 25, yPosition);
        yPosition += catLines.length * 4 + 5;
      }
    }
    
    yPosition += 15;
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
      
      if (planData.plan.timetable && planData.plan.timetable.length > 0) {
        content += 'DAILY TIMETABLE:\n';
        const sortedTimetable = [...planData.plan.timetable].sort((a, b) => {
          const parseTime = (t) => {
            const [time, modifier] = t.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            return parseInt(hours, 10) * 60 + parseInt(minutes || 0, 10);
          };
          return parseTime(a.time) - parseTime(b.time);
        });
        
        sortedTimetable.forEach(slot => {
          content += `${slot.time} - ${slot.task}\n`;
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
      
      if (planData.plan.resources && planData.plan.resources.length > 0) {
        content += 'CURATED RESOURCES:\n';
        planData.plan.resources.forEach(resource => {
          content += `${resource.type} - ${resource.name} (${resource.price})\n`;
          if (resource.desc) content += `   ${resource.desc}\n`;
        });
        content += '\n';
      }
      
      if (planData.plan.warning) {
        content += `TIMELINE WARNING:\n${planData.plan.warning}\n\n`;
      }
      
      if (planData.plan.categoryMismatch) {
        content += `CATEGORY INSIGHT:\n${planData.plan.categoryMismatch}\n\n`;
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

function showMessage(elementId, message, type) {
  const msg = document.getElementById(elementId);
  if (msg) {
    msg.textContent = message;
    const colorClass = type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-600';
    msg.className = `text-center text-sm mt-2 ${colorClass} font-semibold`;
    
    if (type === 'success') {
      setTimeout(() => msg.textContent = '', 3000);
    }
  }
}

// Initialize everything
loadPreferences();
loadPlansForDownload();