const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/proxy', async (req, res) => {
  console.log("Received request at /api/proxy");
  const { apiKey, model, messages, stream } = req.body;

  try {
    const response = await axios.post(
      'https://cloud.olakrutrim.com/v1/chat/completions',
      { model, messages, stream },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: stream ? 'stream' : 'json',
      }
    );

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.on('data', (chunk) => res.write(chunk));
      response.data.on('end', () => res.end());
      response.data.on('error', (err) => res.end(`data: [ERROR] ${err.message}\n\n`));
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('Proxy Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message,
    });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
