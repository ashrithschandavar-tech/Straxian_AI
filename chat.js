import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authBtn = document.getElementById('authBtn');
const backBtn = document.getElementById('back-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

const stuckBtn = document.getElementById('stuck-btn');
const missedDeadlineBtn = document.getElementById('missed-deadline-btn');
const planSelection = document.getElementById('plan-selection');
const planList = document.getElementById('plan-list');

let currentUserId = null;
let currentPlanData = null;
let selectedPlanData = null;

// Auth state
onAuthStateChanged(auth, (user) => {
    authBtn.classList.remove('hidden');
    if (user) {
        authBtn.textContent = "Profile";
        authBtn.onclick = () => { window.location.href = "profile.html"; };
        currentUserId = user.uid;
        loadChatHistory();
        
        // Check for autopsy trigger context
        const trigger = localStorage.getItem('autopsy_trigger');
        const planData = localStorage.getItem('current_plan_data');
        
        if (trigger && planData) {
            localStorage.removeItem('autopsy_trigger');
            localStorage.removeItem('current_plan_data');
            selectedPlanData = JSON.parse(planData);
            handleAutopsyTrigger(trigger);
        } else {
            // Show plan selection for manual chat
            loadUserPlans();
        }
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
    }
});

function handleAutopsyTrigger(trigger) {
    if (!selectedPlanData) return;
    
    const plan = selectedPlanData.plan;
    const progress = selectedPlanData.progress || {};
    
    // Calculate execution data
    const totalDays = Object.keys(progress).length;
    const completedDays = Object.values(progress).filter(status => status === 'completed').length;
    const executionRate = totalDays > 0 ? (completedDays / totalDays * 100).toFixed(1) : 0;
    
    // Get recent progress
    const recentDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const status = progress[dateStr] || 'not-started';
        recentDays.push(`${dateStr}: ${status}`);
    }
    
    let message;
    switch (trigger) {
        case 'low_execution':
            message = `EXECUTION FAILURE DETECTED\n\nPlan: ${plan.title}\nExecution Rate: ${executionRate}%\nRecent 7 days: ${recentDays.join(', ')}\nPhases: ${plan.phases?.map(p => `${p.name} (${p.date})`).join(', ')}\n\nPerform autopsy analysis.`;
            break;
        case 'missed_deadline':
            message = `DEADLINE MISSED\n\nPlan: ${plan.title}\nMissed phases: ${plan.phases?.map(p => `${p.name} (${p.date})`).join(', ')}\nExecution Rate: ${executionRate}%\nRecent progress: ${recentDays.slice(0,3).join(', ')}\n\nPerform autopsy analysis.`;
            break;
        case 'manual_stuck':
            message = `MANUAL FAILURE ANALYSIS REQUEST\n\nPlan: ${plan.title}\nCurrent execution: ${executionRate}%\nRecent 7 days: ${recentDays.join(', ')}\nTimetable tasks: ${plan.timetable?.length || 0}\n\nPerform autopsy analysis.`;
            break;
        default:
            return;
    }
    
    // Auto-trigger the autopsy
    setTimeout(() => {
        chatInput.value = message;
        sendMessage();
    }, 1000);
}

// Navigation
backBtn.addEventListener('click', () => {
    window.location.href = 'app.html';
});

// Chat functionality
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

// Trigger buttons
stuckBtn.addEventListener('click', () => {
    triggerAutopsy("I'm stuck with my current goal. I need an execution failure analysis.");
});

missedDeadlineBtn.addEventListener('click', () => {
    triggerAutopsy("I missed my deadline. Please perform a goal autopsy.");
});

function triggerAutopsy(message) {
    chatInput.value = message;
    sendMessage();
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !currentUserId) return;

    // Add user message
    addMessageToChat(message, 'user');
    chatInput.value = '';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        // Get AI response
        const aiResponse = await getAIResponse(message);
        
        // Remove typing indicator and add AI response
        removeTypingIndicator(typingId);
        addMessageToChat(aiResponse, 'ai');

        // Save conversation to Firebase
        await saveChatMessage(message, aiResponse);
    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'ai');
    } finally {
        sendBtn.disabled = false;
    }
}

function addMessageToChat(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}`;
    
    const avatar = sender === 'user' 
        ? '<div class="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">U</div>'
        : '<div class="bg-red-100 text-red-600 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">AI</div>';
    
    const bgColor = sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800';
    const roundedClass = sender === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm';
    
    messageDiv.innerHTML = `
        ${avatar}
        <div class="${bgColor} rounded-2xl ${roundedClass} p-4 max-w-md">
            <p class="whitespace-pre-wrap">${message}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    const typingId = 'typing-' + Date.now();
    typingDiv.id = typingId;
    typingDiv.className = 'flex items-start gap-3';
    
    typingDiv.innerHTML = `
        <div class="bg-red-100 text-red-600 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">
            AI
        </div>
        <div class="bg-gray-100 rounded-2xl rounded-tl-sm p-4 max-w-md">
            <div class="flex gap-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingDiv = document.getElementById(typingId);
    if (typingDiv) typingDiv.remove();
}

async function getAIResponse(userMessage) {
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: userMessage
            })
        });

        if (!response.ok) throw new Error('Failed to get response');
        const result = await response.json();
        return result || "I'm here to help analyze your goal execution.";
    } catch (error) {
        console.error('API Error:', error);
        return "I'm here to help analyze your goal execution.";
    }
}

async function saveChatMessage(userMessage, aiResponse) {
    if (!currentUserId) return;

    try {
        await addDoc(collection(db, "chat_sessions"), {
            userId: currentUserId,
            userMessage,
            aiResponse,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

async function loadUserPlans() {
    if (!currentUserId) return;
    
    const q = query(
        collection(db, "plans"),
        where("userId", "==", currentUserId),
        orderBy("createdAt", "desc")
    );
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            planSelection.classList.add('hidden');
            return;
        }
        
        planList.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();
            const planBtn = document.createElement('button');
            planBtn.className = 'w-full text-left p-3 bg-white rounded-lg border hover:bg-blue-50 transition';
            planBtn.innerHTML = `
                <div class="font-semibold text-gray-800">${data.title}</div>
                <div class="text-sm text-gray-500">${new Date(data.createdAt.toDate()).toLocaleDateString()}</div>
            `;
            
            planBtn.addEventListener('click', () => {
                selectedPlanData = {
                    plan: data.plan,
                    docId: doc.id,
                    progress: JSON.parse(localStorage.getItem(`progress_${doc.id}`)) || {}
                };
                planSelection.classList.add('hidden');
                addMessageToChat(`Selected plan: ${data.title}. What would you like me to analyze?`, 'ai');
            });
            
            planList.appendChild(planBtn);
        });
        
        planSelection.classList.remove('hidden');
    });
}

async function loadChatHistory() {
    // Simplified - no persistent chat history for autopsy sessions
    return;
}