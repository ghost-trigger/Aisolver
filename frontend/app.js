// app.js - Main application logic and event handlers

let uploadedImage = null;
let isStreaming = false;
let currentUserQuestion = '';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Get all elements
    const els = {
        menuBtn: document.getElementById('menuBtn'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('overlay'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        modal: document.getElementById('comingSoonModal'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        questionInput: document.getElementById('questionInput'),
        sendBtn: document.getElementById('sendBtn'),
        stopBtn: document.getElementById('stopBtn'),
        imageBtn: document.getElementById('imageBtn'),
        imageInput: document.getElementById('imageInput'),
        messagesContainer: document.getElementById('messagesContainer'),
        welcomeScreen: document.getElementById('welcomeScreen')
    };

    // Check if all elements exist
    if (!els.menuBtn || !els.questionInput || !els.sendBtn) {
        console.error('Required elements not found!');
        return;
    }

    // Sidebar controls
    els.menuBtn.onclick = () => {
        els.sidebar.classList.add('open');
        els.overlay.classList.add('active');
    };

    els.closeSidebarBtn.onclick = closeSidebar;
    els.overlay.onclick = closeSidebar;
    els.modalCloseBtn.onclick = () => els.modal.classList.remove('active');

    function closeSidebar() {
        els.sidebar.classList.remove('open');
        els.overlay.classList.remove('active');
    }

    // Menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.onclick = () => {
            const action = item.dataset.action;
            const text = item.querySelector('.menu-item-text').textContent;
            showComingSoon(text);
        };
    });

    function showComingSoon(feature) {
        document.getElementById('modalTitle').textContent = feature;
        els.modal.classList.add('active');
        closeSidebar();
    }

    // Textarea auto-resize
    els.questionInput.oninput = function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    };

    // Send on Enter (without Shift)
    els.questionInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Button events
    els.sendBtn.onclick = sendMessage;
    els.stopBtn.onclick = handleStopStreaming;
    els.imageBtn.onclick = () => els.imageInput.click();
    els.imageInput.onchange = handleImageUpload;

    function handleImageUpload() {
        const file = els.imageInput.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size should be less than 10MB');
            els.imageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = {
                data: e.target.result.split(',')[1],
                mimeType: file.type,
                preview: e.target.result
            };
            
            const previewContainer = document.getElementById('imagePreviewContainer');
            previewContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${e.target.result}" class="image-preview-small" alt="Preview">
                    <button onclick="removeImage()" style="background: #ff4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px;">×</button>
                </div>
            `;
            previewContainer.style.display = 'block';
        };
        
        reader.onerror = function() {
            alert('Failed to read image file');
            els.imageInput.value = '';
        };
        
        reader.readAsDataURL(file);
    }

    window.removeImage = function() {
        uploadedImage = null;
        els.imageInput.value = '';
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (previewContainer) {
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        }
    };

    function handleStopStreaming() {
        if (typeof stopStreaming === 'function') {
            stopStreaming();
        }
        setUIState('idle');
    }

    function setUIState(state) {
        if (state === 'streaming') {
            isStreaming = true;
            els.sendBtn.style.display = 'none';
            els.stopBtn.style.display = 'flex';
            els.sendBtn.disabled = true;
            els.questionInput.disabled = true;
        } else if (state === 'idle') {
            isStreaming = false;
            els.sendBtn.style.display = 'flex';
            els.stopBtn.style.display = 'none';
            els.sendBtn.disabled = false;
            els.questionInput.disabled = false;
        }
    }

    // Make stream callbacks global
    window.onStreamStart = function() {
        console.log('Stream started');
    };

    window.onStreamComplete = function(messageId) {
        setUIState('idle');
        if (typeof addActionButtons === 'function') {
            addActionButtons(messageId);
        }
    };

    async function sendMessage() {
        const question = els.questionInput.value.trim();
        
        if (!question && !uploadedImage) {
            els.questionInput.focus();
            return;
        }
        
        if (isStreaming) {
            console.log('Already streaming, please wait...');
            return;
        }

        // Store current question for regeneration
        currentUserQuestion = question;

        // Hide welcome screen
        if (typeof hideWelcomeScreen === 'function') {
            hideWelcomeScreen();
        }

        // Set UI to streaming state
        setUIState('streaming');

        // Add user message
        let aiMessageId;
        try {
            addMessage('user', question, uploadedImage?.preview);
            
            // Clear input
            els.questionInput.value = '';
            els.questionInput.style.height = 'auto';
            
            const previewContainer = document.getElementById('imagePreviewContainer');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }

            // Add AI message with typing indicator
            aiMessageId = addMessage('ai', '', null, true);
            
            if (!aiMessageId) {
                throw new Error('Failed to create AI message');
            }

            // Stream the answer
            if (typeof streamAnswer === 'function') {
                await streamAnswer(question, aiMessageId, uploadedImage);
            } else {
                throw new Error('streamAnswer function not found');
            }
            
            // Clear uploaded image after successful send
            uploadedImage = null;
            els.imageInput.value = '';
            
            // Scroll to the AI message answer
            const aiMessage = document.getElementById(aiMessageId);
            if (aiMessage) {
                setTimeout(() => {
                    aiMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
            
        } catch (error) {
            console.error('Send message error:', error);
            
            if (aiMessageId) {
                if (error.name !== 'AbortError') {
                    if (typeof updateMessage === 'function') {
                        updateMessage(aiMessageId, '❌ Sorry, something went wrong. Please try again.\n\n**Error:** ' + error.message);
                    }
                    if (typeof window.onStreamComplete === 'function') {
                        window.onStreamComplete(aiMessageId);
                    }
                } else {
                    // Stream was aborted by user
                    const messageDiv = document.getElementById(aiMessageId);
                    if (messageDiv) {
                        const currentText = messageDiv.querySelector('.message-text')?.innerText || '';
                        if (!currentText || currentText.includes('typing')) {
                            if (typeof updateMessage === 'function') {
                                updateMessage(aiMessageId, '⏹️ Answer generation stopped.');
                            }
                        }
                    }
                    if (typeof window.onStreamComplete === 'function') {
                        window.onStreamComplete(aiMessageId);
                    }
                }
            } else {
                // If message wasn't created, just reset UI
                setUIState('idle');
                alert('Failed to send message. Please try again.');
            }
        }
    }

    // Regenerate answer function (called from ui.js)
    window.regenerateLastAnswer = async function(questionText) {
        if (isStreaming) {
            console.log('Already streaming...');
            return;
        }
        
        setUIState('streaming');
        
        const aiMessageId = addMessage('ai', '', null, true);
        
        if (!aiMessageId) {
            setUIState('idle');
            return;
        }
        
        try {
            if (typeof streamAnswer === 'function') {
                await streamAnswer(questionText, aiMessageId, null);
            } else {
                throw new Error('streamAnswer function not found');
            }
            
            const aiMessage = document.getElementById(aiMessageId);
            if (aiMessage) {
                setTimeout(() => {
                    aiMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        } catch (error) {
            console.error('Regenerate error:', error);
            
            if (error.name !== 'AbortError') {
                if (typeof updateMessage === 'function') {
                    updateMessage(aiMessageId, '❌ Sorry, something went wrong. Please try again.\n\n**Error:** ' + error.message);
                }
                if (typeof window.onStreamComplete === 'function') {
                    window.onStreamComplete(aiMessageId);
                }
            } else {
                if (typeof updateMessage === 'function') {
                    updateMessage(aiMessageId, '⏹️ Answer generation stopped.');
                }
                if (typeof window.onStreamComplete === 'function') {
                    window.onStreamComplete(aiMessageId);
                }
            }
        }
    };

    console.log('✅ Question AI - Ready! 🎓');
}