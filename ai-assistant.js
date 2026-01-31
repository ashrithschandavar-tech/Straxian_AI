// AI Assistant Chatbot for Sidebar
class AIAssistant {
    constructor() {
        this.isOpen = false;
        this.chatHistory = [];
        this.init();
    }

    init() {
        // Wait for DOM to be ready and sidebar to exist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.setup(), 100);
            });
        } else {
            setTimeout(() => this.setup(), 100);
        }
    }

    setup() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.log('Sidebar not found, AI Assistant not initialized');
            return;
        }
        this.createAssistantButton();
        this.createAssistantModal();
        this.setupEventListeners();
    }

    createAssistantButton() {
        // Check if button already exists
        if (document.getElementById('ai-assistant-btn')) return;
        
        const assistantBtn = document.createElement('button');
        assistantBtn.id = 'ai-assistant-btn';
        assistantBtn.className = 'w-full flex items-center gap-3 p-4 text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-700 rounded-xl transition-all duration-300 group transform hover:scale-105 hover:shadow-lg border border-transparent hover:border-purple-200';
        assistantBtn.innerHTML = `
            <div class="relative">
                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <i class="fa-solid fa-robot text-white group-hover:animate-pulse"></i>
                </div>
                <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse group-hover:animate-bounce"></div>
            </div>
            <div class="flex-1">
                <span class="font-semibold text-sm block">AI Assistant</span>
                <span class="text-xs text-gray-500 group-hover:text-purple-500 transition-colors">Always ready to help</span>
            </div>
            <div class="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <i class="fa-solid fa-arrow-right text-purple-500"></i>
            </div>
        `;

        // Add to sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const historySection = sidebar.querySelector('#history-list');
            if (historySection && historySection.parentElement) {
                historySection.parentElement.insertBefore(assistantBtn, historySection);
            }
        }
    }

    createAssistantModal() {
        const modal = document.createElement('div');
        modal.id = 'ai-assistant-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col mx-4 overflow-hidden border border-gray-200 transform transition-all duration-300 scale-95 opacity-0" id="modal-content">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <i class="fa-solid fa-robot text-white text-lg"></i>
                            </div>
                            <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">AI Assistant</h3>
                            <p class="text-sm text-gray-600 flex items-center gap-2">
                                <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Generate, summarize, rewrite & search
                            </p>
                        </div>
                    </div>
                    <button id="close-assistant" class="p-3 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-110 hover:rotate-90 group">
                        <i class="fa-solid fa-times text-gray-500 group-hover:text-gray-700 text-lg"></i>
                    </button>
                </div>

                <!-- Quick Actions -->
                <div class="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div class="flex gap-3 flex-wrap justify-center">
                        <button class="quick-action group px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2" data-action="generate">
                            <i class="fa-solid fa-wand-magic-sparkles group-hover:animate-spin"></i>Generate
                        </button>
                        <button class="quick-action group px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-700 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2" data-action="summarize">
                            <i class="fa-solid fa-compress group-hover:animate-pulse"></i>Summarize
                        </button>
                        <button class="quick-action group px-4 py-3 bg-gradient-to-r from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 text-orange-700 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2" data-action="rewrite">
                            <i class="fa-solid fa-pen group-hover:animate-bounce"></i>Rewrite
                        </button>
                        <button class="quick-action group px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2" data-action="search">
                            <i class="fa-solid fa-search group-hover:animate-ping"></i>Search Chats
                        </button>
                    </div>
                </div>

                <!-- Chat Area -->
                <div class="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-white to-purple-50">
                    <div id="assistant-chat" class="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100">
                        <div class="flex items-start gap-4 animate-fade-in">
                            <div class="w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <i class="fa-solid fa-robot text-white"></i>
                            </div>
                            <div class="bg-white rounded-3xl rounded-tl-lg p-6 max-w-[85%] shadow-lg border border-gray-100 relative">
                                <div class="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                                <p class="text-gray-800 leading-relaxed">Hi! I'm your AI Assistant. I can help you:</p>
                                <ul class="mt-4 text-sm text-gray-600 space-y-2">
                                    <li class="flex items-center gap-3"><span class="w-2 h-2 bg-blue-400 rounded-full"></span>Generate content and ideas</li>
                                    <li class="flex items-center gap-3"><span class="w-2 h-2 bg-green-400 rounded-full"></span>Summarize your plans and progress</li>
                                    <li class="flex items-center gap-3"><span class="w-2 h-2 bg-orange-400 rounded-full"></span>Rewrite and improve text</li>
                                    <li class="flex items-center gap-3"><span class="w-2 h-2 bg-purple-400 rounded-full"></span>Search through your workspace</li>
                                </ul>
                                <div class="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
                                    <p class="text-sm text-amber-700 flex items-center gap-2">
                                        <i class="fa-solid fa-info-circle text-amber-500"></i>
                                        I can't edit your plans directly - please go to the specific chat for changes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="p-6 border-t border-gray-200 bg-white">
                        <div class="flex gap-4 items-end">
                            <div class="flex-1 relative">
                                <textarea id="assistant-input" 
                                    placeholder="Ask me anything about your plans, or request content generation..." 
                                    class="w-full resize-none border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 rounded-2xl p-4 pr-12 transition-all duration-300 bg-gray-50 focus:bg-white shadow-inner"
                                    rows="2"></textarea>
                                <div class="absolute right-3 bottom-3 text-xs text-gray-400 flex items-center gap-1">
                                    <i class="fa-solid fa-keyboard text-xs"></i>
                                    <span>Enter to send</span>
                                </div>
                            </div>
                            <button id="send-assistant-message" 
                                class="px-8 py-4 bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:from-purple-600 hover:via-indigo-700 hover:to-blue-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center gap-3 font-semibold group">
                                <i class="fa-solid fa-paper-plane group-hover:animate-bounce"></i>
                                <span>Send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupEventListeners() {
        // Check if elements exist before adding listeners
        const assistantBtn = document.getElementById('ai-assistant-btn');
        const closeBtn = document.getElementById('close-assistant');
        const modal = document.getElementById('ai-assistant-modal');
        const sendBtn = document.getElementById('send-assistant-message');
        const input = document.getElementById('assistant-input');
        
        if (!assistantBtn || !closeBtn || !modal || !sendBtn || !input) {
            console.log('AI Assistant elements not found');
            return;
        }

        // Open assistant
        assistantBtn.addEventListener('click', () => {
            this.openAssistant();
        });

        // Close assistant
        closeBtn.addEventListener('click', () => {
            this.closeAssistant();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
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
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter to send
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    openAssistant() {
        const modal = document.getElementById('ai-assistant-modal');
        const modalContent = document.getElementById('modal-content');
        
        modal.classList.remove('hidden');
        
        // Animate modal entrance
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        this.isOpen = true;
        document.getElementById('assistant-input').focus();
    }

    closeAssistant() {
        const modal = document.getElementById('ai-assistant-modal');
        const modalContent = document.getElementById('modal-content');
        
        // Animate modal exit
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
        
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

Provide a helpful response. If the user asks to edit, modify, or change anything, politely redirect them to go to the specific chat for changes. Keep responses concise and helpful.`;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error('Failed to get response');
            const result = await response.json();

            this.hideTyping();
            
            // Handle different response formats
            let responseText = "I'm here to help! What would you like me to do?";
            if (typeof result === 'string') {
                responseText = result;
            } else if (result.response) {
                responseText = result.response;
            } else if (result.text) {
                responseText = result.text;
            } else if (result.title || result.description) {
                // Handle plan-like responses
                responseText = `${result.title || 'Generated Content'}\n\n${result.description || 'Content generated successfully.'}`;
            }
            
            this.addMessage(responseText, 'assistant');

        } catch (error) {
            console.error('AI Assistant error:', error);
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
        messageDiv.className = 'flex items-start gap-4 animate-fade-in opacity-0';

        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="flex-1"></div>
                <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-3xl rounded-tr-lg p-4 max-w-[85%] shadow-lg relative">
                    <div class="absolute -right-2 top-4 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-600 border-r border-t transform rotate-45"></div>
                    <p class="leading-relaxed">${content}</p>
                </div>
                <div class="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i class="fa-solid fa-user text-white"></i>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <i class="fa-solid fa-robot text-white"></i>
                </div>
                <div class="bg-white rounded-3xl rounded-tl-lg p-4 max-w-[85%] shadow-lg border border-gray-100 relative">
                    <div class="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                    <p class="text-gray-800 leading-relaxed">${content}</p>
                </div>
            `;
        }

        chatArea.appendChild(messageDiv);
        
        // Animate message appearance
        setTimeout(() => {
            messageDiv.classList.remove('opacity-0');
            messageDiv.classList.add('opacity-100');
        }, 10);
        
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    showTyping() {
        const chatArea = document.getElementById('assistant-chat');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start gap-4 animate-fade-in';
        typingDiv.innerHTML = `
            <div class="w-10 h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <i class="fa-solid fa-robot text-white"></i>
            </div>
            <div class="bg-white rounded-3xl rounded-tl-lg p-6 shadow-lg border border-gray-100 relative">
                <div class="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
                <div class="flex items-center gap-2">
                    <span class="text-gray-500 text-sm mr-2">AI is thinking</span>
                    <div class="flex gap-1">
                        <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            new AIAssistant();
        }, 500);
    });
} else {
    setTimeout(() => {
        new AIAssistant();
    }, 500);
}