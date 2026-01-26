import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authBtn = document.getElementById('authBtn');
const backBtn = document.getElementById('back-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

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
    } else {
        authBtn.textContent = "Login / Sign Up";
        authBtn.onclick = () => { window.location.href = "login.html"; };
    }
});

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
        : '<div class="bg-indigo-100 text-indigo-600 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">AI</div>';
    
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
        <div class="bg-indigo-100 text-indigo-600 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">
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
    const prompt = `You are an expert AI coach specializing in post-mortem analysis and strategy revision. A user is discussing their challenges, missed deadlines, or failed goals.

User message: "${userMessage}"

Provide a helpful response that:
1. If they mention specific failures or missed deadlines, analyze what went wrong
2. Offer constructive feedback without being harsh
3. Suggest concrete improvements or revised strategies
4. Ask follow-up questions to better understand their situation
5. Be empathetic but actionable

Keep responses conversational, supportive, and under 200 words.`;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) throw new Error('Failed to get AI response');
    const result = await response.json();
    return result.response || result.text || 'I understand your situation. Could you tell me more about what specific challenges you faced?';
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