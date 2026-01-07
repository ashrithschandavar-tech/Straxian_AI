// api/generate.js - Serverless backend on Vercel (hides your key)

const MODELS_TO_TRY = [
  'gemini-2.5-flash',      // Best stable fast model (January 2026)
  'gemini-3-flash-preview', // Newer preview if available
  'gemini-2.5-pro'         // Fallback for better quality
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    console.error('GEMINI_API_KEY missing in Vercel env!');
    return res.status(500).json({ error: 'Server error - missing key' });
  }

  let success = false;
  let plan = null;

  for (const model of MODELS_TO_TRY) {
    if (success) break;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error(`Error with ${model}:`, data.error);
        if (data.error.code === 429) continue; // Quota → try next
        throw new Error(data.error.message);
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      plan = JSON.parse(cleanJson);
      success = true;
    } catch (error) {
      console.error(`Failed with ${model}:`, error.message);
    }
  }

  if (!success) {
    return res.status(500).json({ error: 'Failed to generate plan. Try again later.' });
  }

  res.status(200).json(plan);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};