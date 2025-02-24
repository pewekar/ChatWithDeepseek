const express = require('express');
const axios = require('axios');
const cors = require('cors');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.post('/api/proxy', async (req, res) => {
  console.log("Received request at /api/proxy");  // Logging only the endpoint hit

  const { apiKey, model, messages, stream } = req.body;

  // Validate API Key
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return res.status(400).json({ error: "Missing or invalid API key." });
  }

  // Trim API Key to prevent accidental spaces
  const cleanApiKey = apiKey.trim();

  // Initialize session messages if not already present
  if (!req.session.messages) {
    req.session.messages = [];
  }

  // Add the new user message to the session messages
  req.session.messages.push({ role: 'user', content: messages[messages.length - 1].content });

  // Add a system message with an optimized instruction prompt
  req.session.messages.unshift({
    role: 'system',
    content: 'You are a precise and professional assistant. Provide accurate, concise answers directly addressing the core question. Include background information only if explicitly requested. Focus on delivering clear, actionable responses without explaining your thought process, using filler phrases, or apologizing. Maintain a tone of professional brevity and helpfulness.',
  });

  try {
    const response = await axios({
      method: 'post',
      url: 'https://cloud.olakrutrim.com/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json',
      },
      data: { model, messages: req.session.messages, stream },
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
      // Add assistant response to session history
      if (response.data.choices?.[0]?.message?.content) {
        req.session.messages.push({
          role: 'assistant',
          content: response.data.choices[0].message.content,
        });
      }
      res.json(response.data);
    }
  } catch (error) {
    console.error('Proxy Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "An error occurred while processing your request.",
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT} and accessible publicly`);
});
