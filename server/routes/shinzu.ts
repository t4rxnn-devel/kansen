// Express API route for Shinzu Cybernetic Neuro-Core AI Copilot
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { predictSiliconArchitecture } from '../../src/utils/kansenEngine';

const router = express.Router();

// Lazy initialization of Gemini Client
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

router.post('/query', async (req, res) => {
  try {
    const { prompt, activeModule, userCode } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Query prompt cannot be empty.' });
    }

    const client = getGeminiClient();
    if (client) {
      try {
        const systemInstruction = `You are "SHINZU // QUANTUM SILICON CORE", an advanced, air-gapped machine learning module in Kansen CONSOLE (a defense-grade 3nm silicon EDA/Fab simulation console).
Your persona shifts smoothly between a supportive student guide and an authoritative principal silicon scientist.
Help the user analyze their Verilog code, cleanroom parameters, and layout choices. Keep responses technical, precise, and concise.`;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Active Module: ${activeModule || 'Unset'}\nActive Verilog: \n${userCode || ''}\n\nUser Query: ${prompt}`,
          config: {
            systemInstruction
          }
        });

        if (response.text) {
          return res.json({
            response: response.text,
            source: 'GEMINI_CLOUD_API'
          });
        }
      } catch (err: any) {
        // Fallback to local prediction if API call fails
      }
    }

    // Default: local prediction fallback (Kansen Local Neuro-Core)
    const localResp = predictSiliconArchitecture(prompt, { activeModule, userCode });
    return res.json({
      response: localResp,
      source: 'LOCAL_KANSEN_NEURO_CORE'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Shinzu AI engine crash.', message: err.message });
  }
});

export default router;
