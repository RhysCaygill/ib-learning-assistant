// Vercel Serverless Function for IB Learning Assistant
// This handles Hugging Face API calls server-side to avoid CORS issues

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Call Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 503) {
        return res.status(503).json({ error: 'AI model is loading, please wait 20 seconds and try again' });
      }
      throw new Error(errorText || 'API request failed');
    }

    const data = await response.json();
    let assistantMessage = '';

    if (Array.isArray(data) && data[0]?.generated_text) {
      assistantMessage = data[0].generated_text.trim();
    } else if (data.generated_text) {
      assistantMessage = data.generated_text.trim();
    } else {
      throw new Error('Unexpected response format from AI');
    }

    res.status(200).json({ message: assistantMessage });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
