document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const ideaInput = document.getElementById('ideaInput');
    const chatContainer = document.getElementById('chatContainer');
    const sendBtn = document.getElementById('sendBtn');
    const sampleBtn = document.getElementById('sampleBtn');

    // Try Sample Idea feature
    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            ideaInput.value = "Pet grooming service in tier 2 cities";
            ideaInput.style.height = 'auto';
            ideaInput.style.height = (ideaInput.scrollHeight) + 'px';
            sendBtn.disabled = false;
            // Optionally auto-trigger analysis
            // chatForm.dispatchEvent(new Event('submit'));
        });
    }

    // Auto-resize textarea
    ideaInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') {
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idea = ideaInput.value.trim();
        if (!idea) return;

        // Reset input
        ideaInput.value = '';
        ideaInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Add user message
        appendUserMessage(idea);
        
        // Show loading
        const loadingId = appendLoadingIndicator();
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idea })
            });

            const data = await response.json();
            
            // Remove loading
            document.getElementById(loadingId).remove();

            if (!response.ok) {
                appendErrorMessage(data.error || 'An error occurred during analysis.');
                return;
            }

            // Render structured response
            appendAnalysisCards(data);

        } catch (error) {
            document.getElementById(loadingId).remove();
            appendErrorMessage('Failed to connect to the server. Please ensure the backend is running.');
            console.error('Error:', error);
        }
    });

    // Allow Enter to send (Shift+Enter for new line)
    ideaInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                chatForm.dispatchEvent(new Event('submit'));
            }
        }
    });

    function appendUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-user"></i>
            </div>
            <div class="message-content">
                ${escapeHTML(text).replace(/\n/g, '<br>')}
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    function appendLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.id = id;
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-robot"></i>
            </div>
            <div class="message-content" style="background: transparent; border: none;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
        return id;
    }

    function appendErrorMessage(errorMsg) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message error-message';
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-warning-circle" style="color: var(--score-low)"></i>
            </div>
            <div class="message-content">
                <p>${escapeHTML(errorMsg)}</p>
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    function appendAnalysisCards(data) {
        // Determine score class based on score_tag
        let scoreClass = 'score-low';
        if (data.score_tag === 'High Potential') scoreClass = 'score-high';
        else if (data.score_tag === 'Moderate') scoreClass = 'score-medium';

        // Format score value to extract just the number if needed, though we just display it
        const scoreDisplay = data.score || '?';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        
        let html = `
            <div class="message-avatar">
                <i class="ph-fill ph-robot"></i>
            </div>
            <div class="analysis-grid">
        `;

        // Score Card (Full width)
        html += `
            <div class="analysis-card score-card stagger-card ${scoreClass}">
                <div class="score-info">
                    <div class="card-header">
                        <i class="ph-bold ph-chart-line-up card-icon"></i>
                        Overall Viability
                    </div>
                    <div class="score-tags">
                        <div class="score-tag">${data.score_tag || 'Evaluated'}</div>
                        ${data.confidence ? `<div class="confidence-tag"><i class="ph-bold ph-target"></i> ${data.confidence} Confidence</div>` : ''}
                    </div>
                </div>
                <div class="score-value">${escapeHTML(String(scoreDisplay))}</div>
            </div>
        `;

        // Market Demand Card
        html += `
            <div class="analysis-card stagger-card">
                <div class="card-header">
                    <i class="ph-bold ph-users-three card-icon"></i>
                    Market Demand
                </div>
                <div class="card-body">${escapeHTML(data.market_demand || 'N/A')}</div>
            </div>
        `;

        // Competition Card
        html += `
            <div class="analysis-card stagger-card">
                <div class="card-header">
                    <i class="ph-bold ph-sword card-icon"></i>
                    Competition
                </div>
                <div class="card-body">${escapeHTML(data.competition || 'N/A')}</div>
            </div>
        `;

        // Monetization Card
        html += `
            <div class="analysis-card stagger-card">
                <div class="card-header">
                    <i class="ph-bold ph-currency-dollar card-icon"></i>
                    Monetization
                </div>
                <div class="card-body">${escapeHTML(data.monetization || 'N/A')}</div>
            </div>
        `;

        // Scalability Card
        html += `
            <div class="analysis-card stagger-card">
                <div class="card-header">
                    <i class="ph-bold ph-trend-up card-icon"></i>
                    Scalability
                </div>
                <div class="card-body">${escapeHTML(data.scalability || 'N/A')}</div>
            </div>
        `;

        // Suggestion Card (Full width)
        html += `
            <div class="analysis-card suggestion-card stagger-card">
                <div class="card-header">
                    <i class="ph-bold ph-lightbulb card-icon"></i>
                    Strategic Suggestion
                </div>
                <div class="card-body"><strong>${escapeHTML(data.suggestion || 'N/A')}</strong></div>
            </div>
        `;

        html += `</div>`; // Close analysis-grid
        messageDiv.innerHTML = html;
        chatContainer.appendChild(messageDiv);
        
        // Trigger staggered animation
        const cards = messageDiv.querySelectorAll('.stagger-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('show');
                scrollToBottom();
            }, index * 200 + 100); // 200ms delay between each card, 100ms initial offset
        });
        
        scrollToBottom();
    }

    function scrollToBottom() {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
