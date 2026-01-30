// AI Assistant Chatbot for Sidebar
class AIAssistant {
    constructor() {
        this.isOpen = false;
        this.chatHistory = [];
        this.init();
    }

    init() {
        this.createAssistantButton();
        this.createAssistantModal();
        this.setupEventListeners();
    }

    createAssistantButton() {
        const assistantBtn = document.createElement('button');
        assistantBtn.id = 'ai-assistant-btn';
        assistantBtn.className = 'w-full flex items-center gap-3 p-3 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all group';
        assistantBtn.innerHTML = `
            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <i class="fa-solid fa-robot text-white text-sm"></i>
            </div>
            <span class="font-medium">AI Assistant</span>
            <div class="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        `;

        // Add to sidebar in both app and notes
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const historySection = sidebar.querySelector('#history-list').parentElement;
            historySection.parentElement.insertBefore(assistantBtn, historySection);
        }
    }

    createAssistantModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-assistant-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col mx-4">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-gray-200">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <i class="fa-solid fa-robot text-white"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">AI Assistant</h3>
                            <p class="text-sm text-gray-500">Generate, summarize, rewrite & search</p>
                        </div>
                    </div>
                    <button id="close-assistant" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <i class="fa-solid fa-times text-gray-500"></i>
                    </button>
                </div>

                <!-- Quick Actions -->
                <div class="p-4 border-b border-gray-100">
                    <div class="flex gap-2 flex-wrap">
                        <button class="quick-action px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors" data-action="generate">
                            <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Generate
                        </button>
                        <button class="quick-action px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors" data-action="summarize">
                            <i class="fa-solid fa-compress mr-1"></i>Summarize
                        </button>
                        <button class="quick-action px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200 transition-colors" data-action="rewrite">
                            <i class="fa-solid fa-pen mr-1"></i>Rewrite
                        </button>
                        <button class="quick-action px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors" data-action="search">
                            <i class="fa-solid fa-search mr-1"></i>Search Chats
                        </button>
                    </div>
                </div>

                <!-- Chat Area -->
                <div class="flex-1 flex flex-col overflow-hidden">
                    <div id="assistant-chat" class="flex-1 overflow-y-auto p-4 space-y-4">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fa-solid fa-robot text-white text-sm"></i>
                            </div>
                            <div class="bg-gray-100 rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                                <p class="text-gray-800">Hi! I'm your AI Assistant. I can help you:</p>
                                <ul class="mt-2 text-sm text-gray-600 space-y-1">
                                    <li>• Generate content and ideas</li>
                                    <li>• Summarize your plans and progress</li>
                                    <li>• Rewrite and improve text</li>
                                    <li>• Search through your workspace</li>
                                </ul>
                                <p class="mt-2 text-sm text-amber-600">
                                    <i class="fa-solid fa-info-circle mr-1"></i>
                                    I can't edit your plans directly - please go to the specific chat for changes.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="p-4 border-t border-gray-200">
                        <div class="flex gap-3">
                            <textarea id="assistant-input" 
                                placeholder="Ask me anything about your plans, or request content generation..." 
                                class="flex-1 resize-none border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                rows="2"></textarea>
                            <button id="send-assistant-message" 
                                class="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
                                <i class="fa-solid fa-paper-plane"></i>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupEventListeners() {
        // Open assistant
        document.getElementById('ai-assistant-btn').addEventListener('click', () => {
            this.openAssistant();
        });

        // Close assistant
        document.getElementById('close-assistant').addEventListener('click', () => {
            this.closeAssistant();
        });

        // Close on backdrop click
        document.getElementById('ai-assistant-modal').addEventListener('click', (e) => {
            if (e.target.id === 'ai-assistant-modal') {
                this.closeAssistant();
            }
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Send message
        document.getElementById('send-assistant-message').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter to send
        document.getElementById('assistant-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    openAssistant() {
        document.getElementById('ai-assistant-modal').classList.remove('hidden');
        this.isOpen = true;
        document.getElementById('assistant-input').focus();
    }

    closeAssistant() {
        document.getElementById('ai-assistant-modal').classList.add('hidden');
        this.isOpen = false;
    }

    handleQuickAction(action) {
        const input = document.getElementById('assistant-input');
        const prompts = {
            generate: "Generate content for: ",
            summarize: "Summarize my progress and plans: ",
            rewrite: "Rewrite this text to be better: ",
            search: "Search my chats for: "
        };
        input.value = prompts[action];
        input.focus();
    }

    async sendMessage() {
        const input = document.getElementById('assistant-input');
        const message = input.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';

        // Check if user is asking to edit/change something
        if (this.isEditRequest(message)) {
            this.addMessage("I can't edit or change your plans directly. Please go to the specific chat where you want to make changes. I can only help with generating content, summarizing, rewriting text, and searching through your workspace.", 'assistant');
            return;
        }

        // Show typing indicator
        this.showTyping();

        try {
            // Get user's chat data for context
            const chatContext = await this.getUserChatContext();
            
            const prompt = `You are an AI assistant that helps with content generation, summarization, rewriting, and searching. You have access to the user's chat history and plans.

User's Chat Context:
${chatContext}

User Request: "${message}"

Provide a helpful response. If the user asks to edit, modify, or change anything, politely redirect them to go to the specific chat for changes.`;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error('Failed to get response');
            const result = await response.json();

            this.hideTyping();
            this.addMessage(result.response || result.text || "I'm here to help! What would you like me to do?", 'assistant');

        } catch (error) {
            this.hideTyping();
            this.addMessage("Sorry, I encountered an error. Please try again.", 'assistant');
        }
    }

    isEditRequest(message) {
        const editKeywords = ['edit', 'change', 'modify', 'update', 'delete', 'remove', 'add to', 'adjust', 'fix'];
        return editKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }

    async getUserChatContext() {
        // Get user's plans from localStorage or Firebase
        try {
            if (window.currentUserId) {
                // This would normally fetch from Firebase, but for now return basic context
                return "User has access to their saved plans and timetables.";
            }
            return "No user context available.";
        } catch (error) {
            return "Error accessing user context.";
        }
    }

    addMessage(content, sender) {
        const chatArea = document.getElementById('assistant-chat');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start gap-3';

        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="flex-1"></div>
                <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-4 max-w-[80%]">
                    <p>${content}</p>
                </div>
                <div class="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-user text-gray-600 text-sm"></i>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-white text-sm"></i>
                </div>
                <div class="bg-gray-100 rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                    <p class="text-gray-800">${content}</p>
                </div>
            `;
        }

        chatArea.appendChild(messageDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    showTyping() {
        const chatArea = document.getElementById('assistant-chat');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start gap-3';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fa-solid fa-robot text-white text-sm"></i>
            </div>
            <div class="bg-gray-100 rounded-2xl rounded-tl-sm p-4">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
            </div>
        `;
        chatArea.appendChild(typingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    hideTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

// Initialize AI Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIAssistant();
});