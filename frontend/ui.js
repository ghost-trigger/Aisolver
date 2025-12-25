// ui.js - Handles UI updates and message rendering

function addMessage(role, text, imageSrc = null, isTyping = false) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        console.error('Messages container not found');
        return null;
    }
    
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.id = messageId;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    let messageHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
    `;
    
    if (imageSrc) {
        messageHTML += `<img src="${imageSrc}" style="max-width: 200px; border-radius: 8px; margin-bottom: 12px;">`;
    }
    
    if (isTyping) {
        messageHTML += `<div class="message-text"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    } else {
        messageHTML += `<div class="message-text">${text || ''}</div>`;
    }
    
    messageHTML += `</div>`;
    
    messageDiv.innerHTML = messageHTML;
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to new message
    setTimeout(() => {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    
    return messageId;
}

function updateMessage(messageId, text) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) {
        console.error('Message not found:', messageId);
        return;
    }
    
    const textDiv = messageDiv.querySelector('.message-text');
    if (!textDiv) {
        console.error('Text div not found');
        return;
    }
    
    // Process markdown formatting
    let processedText = text
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // Code blocks (```code```) - do first
        .replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
            return '<pre><code>' + code.trim() + '</code></pre>';
        })
        
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // Headings
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        
        // Bold (**text**)
        .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
        
        // Italic (*text*)
        .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
        
        // Blockquote
        .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
        
        // Horizontal rule
        .replace(/^---$/gm, '<hr>')
        
        // Lists - unordered
        .replace(/^[\-\*] (.*)$/gm, '<li>$1</li>')
        
        // Lists - ordered
        .replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
        
        // Wrap lists
        .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, function(match) {
            return '<ul>' + match + '</ul>';
        })
        
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Wrap in paragraph if needed
    if (!processedText.match(/^<[a-z]/i)) {
        processedText = '<p>' + processedText + '</p>';
    }
    
    // Clean up
    processedText = processedText
        .replace(/<p><\/p>/g, '')
        .replace(/<p>(<[uo]l>)/g, '$1')
        .replace(/(<\/[uo]l>)<\/p>/g, '$1');
    
    textDiv.innerHTML = processedText;
    
    // Render MathJax if available
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([textDiv]).catch((err) => {
            console.log('MathJax error:', err);
        });
    }
}

function addActionButtons(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const messageContent = messageDiv.querySelector('.message-content');
    if (!messageContent) return;
    
    // Check if action buttons already exist
    if (messageContent.querySelector('.answer-actions')) return;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'answer-actions';
    actionsDiv.innerHTML = `
        <button class="answer-action-btn" onclick="copyAnswer('${messageId}')" title="Copy answer">
            <span class="answer-action-icon">📋</span>
            <span>Copy</span>
        </button>
        <button class="answer-action-btn" onclick="shareAnswer('${messageId}')" title="Share answer">
            <span class="answer-action-icon">🔗</span>
            <span>Share</span>
        </button>
        <button class="answer-action-btn" onclick="regenerateAnswer('${messageId}')" title="Regenerate answer">
            <span class="answer-action-icon">🔄</span>
            <span>Regenerate</span>
        </button>
        <button class="answer-action-btn" id="like-${messageId}" onclick="likeAnswer('${messageId}')" title="Like answer">
            <span class="answer-action-icon">👍</span>
        </button>
        <button class="answer-action-btn" id="dislike-${messageId}" onclick="dislikeAnswer('${messageId}')" title="Dislike answer">
            <span class="answer-action-icon">👎</span>
        </button>
    `;
    
    messageContent.appendChild(actionsDiv);
}

// Answer Action Functions
window.copyAnswer = function(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const textDiv = messageDiv.querySelector('.message-text');
    if (!textDiv) return;
    
    const text = textDiv.innerText || textDiv.textContent;
    
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(messageDiv, true);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showCopyFeedback(messageDiv, false);
        }
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(messageDiv, true);
    }).catch(err => {
        console.error('Copy failed:', err);
        showCopyFeedback(messageDiv, false);
    });
};

function showCopyFeedback(messageDiv, success) {
    const btn = messageDiv.querySelector('.answer-action-btn');
    if (!btn) return;
    
    const originalHTML = btn.innerHTML;
    
    if (success) {
        btn.innerHTML = '<span class="answer-action-icon">✅</span><span>Copied!</span>';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<span class="answer-action-icon">❌</span><span>Failed</span>';
    }
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('active');
    }, 2000);
}

window.shareAnswer = function(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const textDiv = messageDiv.querySelector('.message-text');
    if (!textDiv) return;
    
    const text = textDiv.innerText || textDiv.textContent;
    
    if (navigator.share) {
        navigator.share({
            title: 'Question AI Answer',
            text: text
        }).catch(err => {
            console.log('Share cancelled or failed:', err);
            // Fallback to copy
            window.copyAnswer(messageId);
        });
    } else {
        // Fallback - copy to clipboard
        window.copyAnswer(messageId);
    }
};

window.regenerateAnswer = function(messageId) {
    // Get the last user question
    const messages = document.querySelectorAll('.user-message');
    if (messages.length === 0) return;
    
    const lastUserMessage = messages[messages.length - 1];
    const textDiv = lastUserMessage.querySelector('.message-text');
    if (!textDiv) return;
    
    const questionText = textDiv.innerText || textDiv.textContent;
    
    // Remove current AI answer
    const aiMessage = document.getElementById(messageId);
    if (aiMessage) {
        aiMessage.remove();
    }
    
    // Trigger regeneration
    if (typeof window.regenerateLastAnswer === 'function') {
        window.regenerateLastAnswer(questionText);
    }
};

window.likeAnswer = function(messageId) {
    const likeBtn = document.getElementById(`like-${messageId}`);
    const dislikeBtn = document.getElementById(`dislike-${messageId}`);
    
    if (!likeBtn || !dislikeBtn) return;
    
    if (likeBtn.classList.contains('active')) {
        likeBtn.classList.remove('active');
    } else {
        likeBtn.classList.add('active');
        dislikeBtn.classList.remove('active');
    }
};

window.dislikeAnswer = function(messageId) {
    const likeBtn = document.getElementById(`like-${messageId}`);
    const dislikeBtn = document.getElementById(`dislike-${messageId}`);
    
    if (!likeBtn || !dislikeBtn) return;
    
    if (dislikeBtn.classList.contains('active')) {
        dislikeBtn.classList.remove('active');
    } else {
        dislikeBtn.classList.add('active');
        likeBtn.classList.remove('active');
    }
};

function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'block';
    }
}

function hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
}

function showTypingIndicator(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;
    
    const textDiv = messageDiv.querySelector('.message-text');
    if (!textDiv) return;
    
    textDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
}