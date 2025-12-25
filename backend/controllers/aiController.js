const axios = require('axios');

const askQuestion = async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ 
                success: false,
                error: 'Question is required' 
            });
        }

        console.log('📝 Question:', question.substring(0, 50) + '...');

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: question }],
                temperature: 0.7,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const answer = response.data.choices[0].message.content;
        console.log('✅ Answer generated!');

        res.json({ 
            success: true,
            answer: answer
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get answer'
        });
    }
};

const analyzeImage = async (req, res) => {
    try {
        res.json({
            success: true,
            message: '📷 Image analysis coming soon!'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Failed to analyze image'
        });
    }
};

module.exports = { askQuestion, analyzeImage };
