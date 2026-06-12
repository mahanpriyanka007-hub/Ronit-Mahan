/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing loaders with 10mb limit for base64 image uploads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // API endpoint for scanning receipt slips
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image base64 data provided" });
      }

      // Check for Gemini API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY environment variable is not configured on the server. Please configure it in Settings > Secrets."
        });
      }

      // Strip generic base64 prefix if present
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      // Initialize the Gemini SDK
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: cleanBase64,
        },
      };

      const promptPart = {
        text: "You are the head of the validation team at PREM DAIRY. Analyze the provided photograph representing a milk collection/delivery ticket, handwritten slip, or testing instrument result. Extract standard dairy milk metrics: supplier customer name, collection date, shift period ('morning' or 'evening'), quantity weight in Liters or Kilograms, FAT percentage, and SNF percentage. Provide an analytical verification note as a dynamic friendly greeting explaining how much FAT and SNF was read and the quality.",
      };

      // Call modern Gemini SDK server-side
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: {
                type: Type.STRING,
                description: "Name of the supplier farmer highlighted on the slip, e.g., 'Ramesh Kumar'. If not visible or obscure, return empty string."
              },
              date: {
                type: Type.STRING,
                description: "Date found on the slip formatted as YYYY-MM-DD. Convert dates like 12/06/2026 or 11 Jun 2026. If year can't be decoded, default to 2026."
              },
              shift: {
                type: Type.STRING,
                description: "Shift of milk collection, must be exactly either 'morning' or 'evening'."
              },
              weight: {
                type: Type.NUMBER,
                description: "Refined float value representing the total milk weight/volume quantity (L/Kg) processed."
              },
              fat: {
                type: Type.NUMBER,
                description: "Float value representing the FAT level percentage (must be between 1.0 and 15.0)."
              },
              snf: {
                type: Type.NUMBER,
                description: "Float value representing the SNF level percentage (must be between 4.0 and 15.0)."
              },
              explanation: {
                type: Type.STRING,
                description: "Official verification statement from Dairy Board explaining the extracted values, e.g., 'Validated Ramesh Yadav's buffalo morning shipment with 7.2% FAT & 9.0% SNF. Quality is standard.'"
              }
            },
            required: ["customerName", "date", "shift", "weight", "fat", "snf", "explanation"]
          }
        }
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("Empty text reply generated from verification model.");
      }

      const extractedJSON = JSON.parse(extractedText.trim());
      return res.json(extractedJSON);

    } catch (err: any) {
      console.error("Express Gemini scanning route failure:", err);
      return res.status(500).json({
        error: "AI Scanner verification query failed",
        details: err?.message || String(err),
      });
    }
  });

  // Serve static assets in production, or hook hot middleware in local dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Prem Dairy Server] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
