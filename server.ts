import express from 'express';
import { createServer as createViteServer } from 'vite';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/generate-floorplan', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `You are an expert architect. Generate a floor plan layout based on this prompt: "${prompt}".
Use coordinates in generic units (1 unit = 1 inch or 1 cm roughly). Ensure items don't overlap too much.
Return the layout as a list of items using the provided schema. Place the outer walls to form the rooms.
Remember to place doors to connect rooms and windows on the outer walls.
Ensure rooms have a floor-surface or room-square item under them.
For walls, use assetId 'wall-segment', rooms 'room-square' or 'floor-surface', doors 'door-single', windows 'window-standard', and furniture as appropriate (sofa-3-seater, bed-queen, table-dining, chair-dining, tv-stand, toilet, sink).
Return ONLY the items.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            description: "List of items forming a floor plan.",
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "A unique string ID for the item, e.g., 'item-123'" },
                assetId: { type: Type.STRING, description: "Must be one of: 'wall-segment', 'room-square', 'floor-surface', 'door-single', 'window-standard', 'sofa-3-seater', 'bed-queen', 'table-dining', 'chair-dining', 'tv-stand', 'toilet', 'sink'" },
                name: { type: Type.STRING, description: "A human-readable name like 'Master Bedroom'" },
                category: { type: Type.STRING, description: "Category string, e.g. 'Structure', 'Furniture'" },
                x: { type: Type.NUMBER, description: "Center X position" },
                y: { type: Type.NUMBER, description: "Center y position" },
                width: { type: Type.NUMBER, description: "Width of the item" },
                height: { type: Type.NUMBER, description: "Depth/Height of the item (in 2D space)" },
                rotation: { type: Type.NUMBER, description: "Rotation in degrees" },
                color: { type: Type.STRING, description: "Hex color code" },
                jointType: { type: Type.STRING, description: "Optional joint type, e.g., 'squared', 'rounded'" }
              },
              required: ["id", "assetId", "name", "category", "x", "y", "width", "height", "rotation", "color"],
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        res.json({ items: data });
      } else {
        res.status(500).json({ error: 'Failed to generate response' });
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
