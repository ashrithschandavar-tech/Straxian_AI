// api/generate.js - Serverless backend on Vercel (hides your key)

import { Client } from '@notionhq/client';

const MODELS_TO_TRY = [
  'gemini-1.5-flash',      // Best stable fast model
  'gemini-1.5-pro',        // Better quality fallback
  'gemini-1.5-flash-8b',   // If you want even faster/cheaper
];

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { prompt, userId } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (!process.env.NOTION_TOKEN || !process.env.NOTION_PARENT_PAGE_ID) {
    console.error('Notion environment variables missing');
    // We continue anyway - Notion is optional enhancement
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
        if (data.error.code === 429) continue; // Rate limit → try next model
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

  // ────────────────────────────────────────────────
  // Notion integration - create timetable database
  // ────────────────────────────────────────────────
  let notionDatabaseId = null;

  try {
    if (process.env.NOTION_TOKEN && process.env.NOTION_PARENT_PAGE_ID) {
      // Create a new database for this user
      const dbResponse = await notion.databases.create({
        parent: { page_id: PARENT_PAGE_ID },
        title: [{ type: 'text', text: { content: `Timetable - ${userId.slice(0, 8)}` } }],
        properties: {
          Task: { title: {} },
          Date: { date: {} },
          Description: { rich_text: {} },
          Status: {
            select: {
              options: [
                { name: 'To Do', color: 'gray' },
                { name: 'In Progress', color: 'blue' },
                { name: 'Done', color: 'green' },
              ]
            }
          },
        },
      });

      notionDatabaseId = dbResponse.id;

      // Add entries from the generated plan phases
      if (plan.phases && Array.isArray(plan.phases)) {
        for (const phase of plan.phases) {
          await notion.pages.create({
            parent: { database_id: notionDatabaseId },
            properties: {
              Task: {
                title: [{ text: { content: phase.name || 'Unnamed Phase' } }],
              },
              Date: phase.date
                ? { date: { start: phase.date } }
                : null,
              Description: {
                rich_text: [{ text: { content: phase.desc || '' } }],
              },
              Status: { select: { name: 'To Do' } },
            },
          });
        }
      }

      console.log(`Created Notion database for user ${userId.slice(0,8)}: ${notionDatabaseId}`);
    }
  } catch (notionError) {
    console.error('Notion integration failed:', notionError.message);
    // Do NOT fail the whole request - Notion is secondary
  }

  // Return the plan (and optionally the Notion DB ID if you want to store it later)
  res.status(200).json({
    ...plan,
    // You can remove this line if you don't need it in the frontend yet
    notionDatabaseId: notionDatabaseId || null,
  });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};