// src/App.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('DeepSeek-R1');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);

  const handleSend = async () => {
    if (!message.trim() || !apiKey.trim()) {
      alert("API key and message are required.");
      return;
    }

    const userMessage = { role: "user", content: message };
    setResponses(prev => [...prev, userMessage]);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/proxy',
        {
          apiKey,
          model: model.trim(),
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            userMessage
          ],
          stream: true
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (res.data && res.data.choices && res.data.choices.length > 0) {
        const botMessage = res.data.choices[0].message;
        const content = botMessage.content || "(No content received)";
        setResponses(prev => [...prev, { role: botMessage.role, content }]);
      } else {
        setResponses(prev => [...prev, { role: "assistant", content: "No response from DeepSeek." }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response && error.response.data
        ? `Error: ${error.response.status} - ${error.response.data.error || JSON.stringify(error.response.data)}`
        : `Network Error: ${error.message || 'No message available'}`;
      setResponses(prev => [...prev, { role: "assistant", content: errorMessage }]);
    }
    setMessage('');
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-900 text-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold text-center mb-4">Krutrim DeepSeek Chat</h1>

      <div className="mb-4">
        <label className="block text-sm">API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="w-full p-2 border rounded text-black"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm">Select Model:</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full p-2 border rounded text-black"
        >
          <option value="DeepSeek-R1">DeepSeek-R1</option>
          <option value="DeepSeek-R1-Llama-70B">DeepSeek-R1-Llama-70B</option>
          <option value="DeepSeek-R1-Llama-8B">DeepSeek-R1-Llama-8B</option>
          <option value="DeepSeek-R1-Qwen-14B">DeepSeek-R1-Qwen-14B</option>
          <option value="DeepSeek-R1-Qwen-32B">DeepSeek-R1-Qwen-32B</option>
        </select>
      </div>

      <div className="space-y-2">
        {responses.map((msg, index) => (
          <div key={index} className={`p-2 ${msg.role === "user" ? "bg-blue-700" : "bg-gray-700"} rounded`}>
            <strong>{msg.role === "user" ? "You" : "DeepSeek"}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="w-full p-2 border rounded mt-4 text-black"
      />
      <button onClick={handleSend} className="w-full bg-purple-500 text-white p-2 rounded mt-2">Send Message</button>
    </div>
  );
}

export default App;
