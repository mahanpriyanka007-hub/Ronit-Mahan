var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use(import_express.default.urlencoded({ limit: "10mb", extended: true }));
  app.post("/api/scan-receipt", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image base64 data provided" });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY environment variable is not configured on the server. Please configure it in Settings > Secrets."
        });
      }
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: cleanBase64
        }
      };
      const promptPart = {
        text: "You are the head of the validation team at PREM DAIRY. Analyze the provided photograph representing a milk collection/delivery ticket, handwritten slip, or testing instrument result. Extract standard dairy milk metrics: supplier customer name, collection date, shift period ('morning' or 'evening'), quantity weight in Liters or Kilograms, FAT percentage, and SNF percentage. Provide an analytical verification note as a dynamic friendly greeting explaining how much FAT and SNF was read and the quality."
      };
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              customerName: {
                type: import_genai.Type.STRING,
                description: "Name of the supplier farmer highlighted on the slip, e.g., 'Ramesh Kumar'. If not visible or obscure, return empty string."
              },
              date: {
                type: import_genai.Type.STRING,
                description: "Date found on the slip formatted as YYYY-MM-DD. Convert dates like 12/06/2026 or 11 Jun 2026. If year can't be decoded, default to 2026."
              },
              shift: {
                type: import_genai.Type.STRING,
                description: "Shift of milk collection, must be exactly either 'morning' or 'evening'."
              },
              weight: {
                type: import_genai.Type.NUMBER,
                description: "Refined float value representing the total milk weight/volume quantity (L/Kg) processed."
              },
              fat: {
                type: import_genai.Type.NUMBER,
                description: "Float value representing the FAT level percentage (must be between 1.0 and 15.0)."
              },
              snf: {
                type: import_genai.Type.NUMBER,
                description: "Float value representing the SNF level percentage (must be between 4.0 and 15.0)."
              },
              explanation: {
                type: import_genai.Type.STRING,
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
    } catch (err) {
      console.error("Express Gemini scanning route failure:", err);
      return res.status(500).json({
        error: "AI Scanner verification query failed",
        details: err?.message || String(err)
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Prem Dairy Server] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
