// src/App.js
import React, { useState } from 'react';

function App() {
  const [apiKey, setApiKey] = useState(sessionStorage.getItem('krutrimApiKey') || '');
  const [model, setModel] = useState('DeepSeek-R1');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);

  const handleApiKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    sessionStorage.setItem('krutrimApiKey', newKey);
  };

  const handleSend = async () => {
    if (!message.trim() || !apiKey.trim()) {
      alert("API key and message are required.");
      return;
    }

    const userMessage = { role: "user", content: message };
    setResponses(prev => [...prev, userMessage]);

    try {
      const response = await fetch('https://chatwithdeepseek.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            userMessage,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data:')) {
            const jsonData = trimmedLine.substring(5).trim();
            if (jsonData === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonData);
              const deltaContent = parsed.choices?.[0]?.delta?.content || '';

              if (deltaContent) {
                botResponse += deltaContent;

                // Real-time streaming response update
                setResponses((prev) => {
                  const updated = [...prev];
                  if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                    updated[updated.length - 1].content = botResponse;
                  } else {
                    updated.push({ role: "assistant", content: botResponse });
                  }
                  return updated;
                });
              }
            } catch (err) {
              console.error('Streaming JSON Parse Error:', err, chunk);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming Error:", error.message);
      setResponses((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    }

    setMessage('');
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-900 text-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold text-center mb-4">Krutrim DeepSeek Chat</h1>

      <div className="mb-4">
        <label className="block text-sm mb-1">API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Enter your API key"
          className="w-full p-2 border rounded text-black mb-1"
        />
        <p className="text-xs text-gray-400">Your key is <span className="font-semibold">never stored</span> and <span className="font-semibold">never leaves your browser</span>. It is <span className="font-semibold">only kept during this session</span>.</p>
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