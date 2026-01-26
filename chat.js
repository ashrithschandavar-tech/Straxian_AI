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

let currentUserId = null;
let currentPlanData = null;

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
        if (trigger) {
            localStorage.removeItem('autopsy_trigger');
            handleAutopsyTrigger(trigger);
        }
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
    }
});

function handleAutopsyTrigger(trigger) {
    let message;
    switch (trigger) {
        case 'low_execution':
            message = "My execution has been below 60% for 3 consecutive days. Please perform a goal autopsy.";
            break;
        case 'missed_deadline':
            message = "I missed my deadline. Please analyze what went wrong.";
            break;
        case 'manual_stuck':
            message = "I'm stuck with my current goal. I need an execution failure analysis.";
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
    const prompt = `You are Straxian AI's Goal Autopsy system. You are an execution auditor, not a therapist.

User message: "${userMessage}"

You must follow this exact process:

1. If missing data, ask for ONLY factual inputs in one compact message:
   - Planned tasks (last 7 days)
   - Tasks actually completed  
   - Time allocated vs time spent
   - User's stated constraints

2. Classify failure into exactly ONE primary cause:
   - Overplanning
   - Underestimation
   - Inconsistency
   - Context overload
   - Distraction leakage
   - Priority inversion
   - Constraint violation

3. Provide evidence-based diagnosis:
   Primary cause: [cause]
   Evidence:
   - [specific data point]
   - [specific data point]

4. Give one brutally honest conclusion sentence.

5. Propose exactly 3 corrections from:
   - Reduce daily workload (by %)
   - Remove or pause one goal
   - Change time blocks
   - Reorder task priority
   - Increase buffer time
   - Convert outcome goals → process goals

NO motivational quotes. NO "you can do it". Be direct and factual.`;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error('Network error');
    const result = await response.json();
    
    // Handle different possible response formats
    return result.response || result.text || result.content || result.message || 'I need more specific information about your failed tasks and time allocation to perform the autopsy.';
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

async function loadChatHistory() {
    if (!currentUserId) return;

    const q = query(
        collection(db, "chat_sessions"),
        where("userId", "==", currentUserId),
        orderBy("timestamp", "asc")
    );

    onSnapshot(q, (snapshot) => {
        // Clear existing messages except the initial AI greeting
        const messages = chatMessages.children;
        for (let i = messages.length - 1; i > 0; i--) {
            messages[i].remove();
        }

        // Add chat history
        snapshot.forEach((doc) => {
            const data = doc.data();
            addMessageToChat(data.userMessage, 'user');
            addMessageToChat(data.aiResponse, 'ai');
        });
    });
}