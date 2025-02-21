const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.post('/api/proxy', async (req, res) => {
  console.log("Received request at /api/proxy");  // Debugging line
  const { apiKey, model, message, stream } = req.body;

  // Initialize session messages if not already present
  if (!req.session.messages) {
    req.session.messages = [];
  }

  // Add the new user message to the session messages
  req.session.messages.push({
    role: 'user',
    content: message
  });

  // Add a prompt to fashion the response for mobile devices
  req.session.messages.unshift({
    role: 'system',
    content: 'You are a helpful assistant. Please provide concise and mobile-friendly responses. Limit your chain of thought to 80 words. Limit your overall response to 200 words.',
  });

  try {
    const response = await axios({
      method: 'post',
      url: 'https://cloud.olakrutrim.com/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: { 
        model, 
        messages: req.session.messages, 
        stream
      },
      responseType: stream ? 'stream' : 'json',
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.end();
      });

      response.data.on('error', (err) => {
        console.error('Stream Error:', err);
        res.end(`data: [ERROR] ${err.message}\n\n`);
      });
    } else {
      // Add the assistant's response to the session messages
      req.session.messages.push({
        role: 'assistant',
        content: response.data.choices[0].message.content
      });

      res.json(response.data);
    }
  } catch (error) {
    console.error('Proxy Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT} and accessible publicly`);
});
