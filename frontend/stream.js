// stream.js - Backend API Integration

const API_URL = 'http://localhost:5000/api';
let streamAbortController = null;

async function streamAnswer(question, messageId, uploadedImage) {
    console.log('✅ streamAnswer called!');
    
    if (question.toLowerCase().trim() === 'check api') {
        const result = '✅ Backend API Connected!';
        if (typeof updateMessage === 'function') {
            updateMessage(messageId, result);
        }
        if (typeof onStreamComplete === 'function') {
            onStreamComplete(messageId);
        }
        return result;
    }
    
    streamAbortController = new AbortController();
    
    if (typeof onStreamStart === 'function') {
        onStreamStart();
    }

    try {
        console.log('📤 Sending to backend:', question.substring(0, 30));
        
        const response = await fetch(`${API_URL}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
            signal: streamAbortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }

        const fullText = data.answer;
        console.log('📥 Answer received!');
        
        // Typing effect
        const words = fullText.split(' ');
        let displayText = '';
        
        for (let i = 0; i < words.length; i++) {
            displayText += (i > 0 ? ' ' : '') + words[i];
            
            if (typeof updateMessage === 'function') {
                updateMessage(messageId, displayText);
            }
            
            if (i % 3 === 0) {
                await new Promise(r => setTimeout(r, 30));
            }
        }
        
        streamAbortController = null;
        
        if (typeof onStreamComplete === 'function') {
            onStreamComplete(messageId);
        }
        
        return fullText;
        
    } catch (error) {
        console.error('❌ Stream error:', error);
        streamAbortController = null;
        
        if (typeof onStreamComplete === 'function') {
            onStreamComplete(messageId);
        }
        
        throw error;
    }
}

function stopStreaming() {
    if (streamAbortController) {
        streamAbortController.abort();
        streamAbortController = null;
    }
}

function isStreamingActive() {
    return streamAbortController !== null;
}

console.log('✅ stream.js loaded successfully!');
