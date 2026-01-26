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

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.text();
        
        // Parse the data to extract meaningful analysis
        if (userMessage.includes('EXECUTION FAILURE') || userMessage.includes('DEADLINE MISSED') || userMessage.includes('MANUAL FAILURE')) {
            return analyzeExecutionData(userMessage);
        }
        
        return data || analyzeExecutionData(userMessage);
    } catch (error) {
        console.error('API Error:', error);
        return analyzeExecutionData(userMessage);
    }
}

function analyzeExecutionData(message) {
    // Extract data from the message
    const executionMatch = message.match(/Execution Rate: ([\d.]+)%/);
    const executionRate = executionMatch ? parseFloat(executionMatch[1]) : 0;
    
    const planMatch = message.match(/Plan: (.+?)\\n/);
    const planName = planMatch ? planMatch[1] : 'Unknown Plan';
    
    const recentDaysMatch = message.match(/Recent \d+ days: (.+?)\\n/);
    const recentDays = recentDaysMatch ? recentDaysMatch[1] : '';
    
    // Count missed vs completed days
    const missedCount = (recentDays.match(/missed/g) || []).length;
    const completedCount = (recentDays.match(/completed/g) || []).length;
    const notStartedCount = (recentDays.match(/not-started/g) || []).length;
    
    // Determine primary failure cause based on data
    let primaryCause, evidence, conclusion, corrections;
    
    if (executionRate < 30) {
        primaryCause = "Overplanning";
        evidence = `Execution rate at ${executionRate}% indicates plan exceeded available capacity. ${missedCount} missed days out of recent tracking period.`;
        conclusion = "The plan failed because it assumed energy and time you didn't have.";
        corrections = [
            "Reduce daily workload by 60%",
            "Focus on 2 core tasks maximum per day", 
            "Add 3-hour buffer time daily"
        ];
    } else if (missedCount > completedCount) {
        primaryCause = "Inconsistency";
        evidence = `${missedCount} missed days vs ${completedCount} completed days shows irregular execution pattern. Execution rate: ${executionRate}%.`;
        conclusion = "This goal didn't fail due to discipline; it failed due to inconsistent daily execution.";
        corrections = [
            "Reduce daily workload by 40%",
            "Move core tasks to same time slot daily",
            "Set up accountability check every 2 days"
        ];
    } else if (notStartedCount > 3) {
        primaryCause = "Priority inversion";
        evidence = `${notStartedCount} not-started days suggests other activities took priority. Low engagement with planned tasks.`;
        conclusion = "You are attempting too many goals simultaneously.";
        corrections = [
            "Pause all secondary goals for 21 days",
            "Focus on single highest-impact task",
            "Block distracting activities during work hours"
        ];
    } else {
        primaryCause = "Underestimation";
        evidence = `Tasks took longer than planned. ${executionRate}% completion rate suggests time estimates were optimistic.`;
        conclusion = "The plan failed because task complexity was underestimated.";
        corrections = [
            "Double all time estimates",
            "Break large tasks into 25-minute chunks",
            "Add 50% buffer time to each task"
        ];
    }
    
    return `**GOAL AUTOPSY ANALYSIS**\n\n**Primary Cause:** ${primaryCause}\n\n**Evidence:**\n${evidence}\n\n**Conclusion:** ${conclusion}\n\n**Required Corrections:**\n1. ${corrections[0]}\n2. ${corrections[1]}\n3. ${corrections[2]}\n\n**Next Steps:** Implement these corrections before attempting to restart this goal. The revised strategy is designed to raise execution probability to ~75%.`;
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