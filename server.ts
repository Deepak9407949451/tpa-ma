import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: ['text/plain', 'application/json', 'text/*'], limit: '10mb' }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let genAIInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Gemini API calls will fail.");
    }
    genAIInstance = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIInstance;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

const DEFAULT_CONFIG = {
  // 1. Dashboard Claims & Import/Export URLs (Live Dashboard)
  syncApiUrl: "https://script.google.com/macros/s/AKfycbzjgJGCVtceinpTwI2jVMjLKoMokTR2Vu_V224GwnSftBiozRxnQqwMF08SWerRy9qL/exec",
  spreadsheetSharingLink: "https://docs.google.com/spreadsheets/d/1l_TC7-xxIKC9BX10m2N4y6NS3a2hfsJRfpDC8TONBaM/edit?gid=0#gid=0",
  outputDirectory: "./PatientFolders",

  // 2. Metadata (TPA & Insurance 2-Headers) Separate URLs (Policy, Insurance & TPA Metadata)
  metadataSyncApiUrl: "https://script.google.com/macros/s/AKfycbzjgJGCVtceinpTwI2jVMjLKoMokTR2Vu_V224GwnSftBiozRxnQqwMF08SWerRy9qL/exec",
  metadataSpreadsheetSharingLink: "https://docs.google.com/spreadsheets/d/1ka0u9rFh0nMLIVp8wdziBxIRyl17ZfkzllF5ALR29x0/edit?gid=0#gid=0",

  // 3. Dedicated Spreadsheet Sharing Links for 1st Column (Col A) and 2nd Column (Col B)
  colASpreadsheetLink: "https://docs.google.com/spreadsheets/d/1ka0u9rFh0nMLIVp8wdziBxIRyl17ZfkzllF5ALR29x0/edit?gid=0#gid=0",
  colBSpreadsheetLink: "https://docs.google.com/spreadsheets/d/1ka0u9rFh0nMLIVp8wdziBxIRyl17ZfkzllF5ALR29x0/edit?gid=0#gid=0",

  // 4. Persistent Notepad Text & Reference Note Link (Retained Permanently before and after publish)
  notepadNote: "https://docs.google.com/spreadsheets/d/1l_TC7-xxIKC9BX10m2N4y6NS3a2hfsJRfpDC8TONBaM/edit?gid=0#gid=0"
};

function readConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error("Error reading config file:", err);
    return DEFAULT_CONFIG;
  }
}

function updateCodeSourceFiles(cfg: Record<string, any>) {
  try {
    const insuranceDataPath = path.join(process.cwd(), "src", "constants", "insuranceData.ts");
    if (fs.existsSync(insuranceDataPath)) {
      let content = fs.readFileSync(insuranceDataPath, "utf8");
      let changed = false;

      // Update Dashboard Claims URLs if changed
      if (cfg.syncApiUrl && typeof cfg.syncApiUrl === 'string' && cfg.syncApiUrl.trim()) {
        const cleanUrl = cfg.syncApiUrl.trim();
        content = content.replace(
          /export const DASHBOARD_CLAIMS_SYNC_URL\s*=\s*["'][^"']+["'];/,
          `export const DASHBOARD_CLAIMS_SYNC_URL = "${cleanUrl}";`
        );
        changed = true;
      }
      if (cfg.spreadsheetSharingLink && typeof cfg.spreadsheetSharingLink === 'string' && cfg.spreadsheetSharingLink.trim()) {
        const cleanLink = cfg.spreadsheetSharingLink.trim();
        content = content.replace(
          /export const DASHBOARD_CLAIMS_SPREADSHEET_URL\s*=\s*["'][^"']+["'];/,
          `export const DASHBOARD_CLAIMS_SPREADSHEET_URL = "${cleanLink}";`
        );
        changed = true;
      }

      // Update Metadata Separate URLs if changed
      if (cfg.metadataSyncApiUrl && typeof cfg.metadataSyncApiUrl === 'string' && cfg.metadataSyncApiUrl.trim()) {
        const cleanMetaUrl = cfg.metadataSyncApiUrl.trim();
        content = content.replace(
          /export const METADATA_SYNC_URL\s*=\s*["'][^"']+["'];/,
          `export const METADATA_SYNC_URL = "${cleanMetaUrl}";`
        );
        changed = true;
      }
      if (cfg.metadataSpreadsheetSharingLink && typeof cfg.metadataSpreadsheetSharingLink === 'string' && cfg.metadataSpreadsheetSharingLink.trim()) {
        const cleanMetaLink = cfg.metadataSpreadsheetSharingLink.trim();
        content = content.replace(
          /export const METADATA_SPREADSHEET_URL\s*=\s*["'][^"']+["'];/,
          `export const METADATA_SPREADSHEET_URL = "${cleanMetaLink}";`
        );
        changed = true;
      }

      // Update Column A & Column B dedicated Spreadsheet URLs if changed
      if (cfg.colASpreadsheetLink && typeof cfg.colASpreadsheetLink === 'string' && cfg.colASpreadsheetLink.trim()) {
        const cleanColALink = cfg.colASpreadsheetLink.trim();
        content = content.replace(
          /export const COL_A_SPREADSHEET_URL\s*=\s*["'][^"']+["'];/,
          `export const COL_A_SPREADSHEET_URL = "${cleanColALink}";`
        );
        changed = true;
      }
      if (cfg.colBSpreadsheetLink && typeof cfg.colBSpreadsheetLink === 'string' && cfg.colBSpreadsheetLink.trim()) {
        const cleanColBLink = cfg.colBSpreadsheetLink.trim();
        content = content.replace(
          /export const COL_B_SPREADSHEET_URL\s*=\s*["'][^"']+["'];/,
          `export const COL_B_SPREADSHEET_URL = "${cleanColBLink}";`
        );
        changed = true;
      }

      // Update Notepad Reference Note if changed
      if (typeof cfg.notepadNote === 'string') {
        const cleanNote = cfg.notepadNote.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        if (content.includes('export const NOTEPAD_REFERENCE_NOTE =')) {
          content = content.replace(
            /export const NOTEPAD_REFERENCE_NOTE\s*=\s*["'][^"']*["'];/,
            `export const NOTEPAD_REFERENCE_NOTE = "${cleanNote}";`
          );
        } else {
          content += `\nexport const NOTEPAD_REFERENCE_NOTE = "${cleanNote}";\n`;
        }
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(insuranceDataPath, content, "utf8");
        console.log("✓ Updated URL & Notepad constants in src/constants/insuranceData.ts permanently");
      }
    }

    // Also persist directly into server.ts DEFAULT_CONFIG so when published code never changes/reverts
    const serverTsPath = path.join(process.cwd(), "server.ts");
    if (fs.existsSync(serverTsPath)) {
      let serverContent = fs.readFileSync(serverTsPath, "utf8");
      let serverChanged = false;
      const cleanLink = (cfg.spreadsheetSharingLink || cfg.dashboardSpreadsheetSharingLink || '').trim();
      const cleanUrl = (cfg.syncApiUrl || cfg.dashboardSyncApiUrl || '').trim();
      if (cleanLink) {
        serverContent = serverContent.replace(
          /(spreadsheetSharingLink:\s*["'])[^"']+(["'])/,
          `$1${cleanLink}$2`
        );
        serverChanged = true;
      }
      if (cleanUrl) {
        serverContent = serverContent.replace(
          /(syncApiUrl:\s*["'])[^"']+(["'])/,
          `$1${cleanUrl}$2`
        );
        serverChanged = true;
      }
      if (typeof cfg.notepadNote === 'string') {
        const cleanNote = cfg.notepadNote.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        if (serverContent.includes('notepadNote:')) {
          serverContent = serverContent.replace(
            /(notepadNote:\s*["'])[^"']*(["'])/,
            `$1${cleanNote}$2`
          );
          serverChanged = true;
        }
      }
      if (serverChanged) {
        fs.writeFileSync(serverTsPath, serverContent, "utf8");
        console.log("✓ Updated server.ts DEFAULT_CONFIG permanently");
      }
    }

    // Also persist into src/App.tsx fallback
    const appTsxPath = path.join(process.cwd(), "src", "App.tsx");
    if (fs.existsSync(appTsxPath)) {
      let appContent = fs.readFileSync(appTsxPath, "utf8");
      const cleanLink = (cfg.spreadsheetSharingLink || cfg.dashboardSpreadsheetSharingLink || '').trim();
      if (cleanLink && appContent.includes('1zdbnr7iGQ4xbKRNOVFrae_g31Gk7_ws085vRZD1-6eo')) {
        appContent = appContent.replace(/https:\/\/docs\.google\.com\/spreadsheets\/d\/1zdbnr7iGQ4xbKRNOVFrae_g31Gk7_ws085vRZD1-6eo\/edit\?gid=0#gid=0/g, cleanLink);
        fs.writeFileSync(appTsxPath, appContent, "utf8");
        console.log("✓ Updated src/App.tsx fallback spreadsheet link permanently");
      }
    }
  } catch (err) {
    console.warn("Could not write directly to source code files:", err);
  }
}

function writeConfig(newConfig: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readConfig();
    const updated = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf8");

    // Also persist permanently into the actual TypeScript source code files!
    updateCodeSourceFiles(updated);

    return updated;
  } catch (err) {
    console.error("Error writing config file:", err);
    return readConfig();
  }
}

// API endpoint to fetch stored configuration
app.get("/api/config", (req, res) => {
  const config = readConfig();
  res.json(config);
});

// API endpoint to download the self-contained single-file HTML app
app.get("/api/download-single-html", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "hospital_claims_single_file.html");
  if (fs.existsSync(filePath)) {
    res.download(filePath, "Hospital_Claims_Management_SingleFile.html");
  } else {
    res.status(404).send("File not found");
  }
});

// Route to directly open the standalone single-file HTML app in browser
app.get("/standalone", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "hospital_claims_single_file.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// API endpoint to update stored configuration permanently
app.post("/api/config", (req, res) => {
  const body = req.body || {};
  const patch: Record<string, any> = {};

  // 1. Dashboard claims sync URL fields
  if (typeof body.syncApiUrl === 'string') patch.syncApiUrl = body.syncApiUrl;
  if (typeof body.spreadsheetSharingLink === 'string') patch.spreadsheetSharingLink = body.spreadsheetSharingLink;
  if (typeof body.dashboardSyncApiUrl === 'string') patch.syncApiUrl = body.dashboardSyncApiUrl;
  if (typeof body.dashboardSpreadsheetSharingLink === 'string') patch.spreadsheetSharingLink = body.dashboardSpreadsheetSharingLink;
  if (typeof body.outputDirectory === 'string') patch.outputDirectory = body.outputDirectory;

  // 2. Separate Policy, Insurance & TPA Metadata Sync URL fields
  if (typeof body.metadataSyncApiUrl === 'string') patch.metadataSyncApiUrl = body.metadataSyncApiUrl;
  if (typeof body.metadataSpreadsheetSharingLink === 'string') patch.metadataSpreadsheetSharingLink = body.metadataSpreadsheetSharingLink;

  // 3. Persistent Notepad Note & Link Reference
  if (typeof body.notepadNote === 'string') patch.notepadNote = body.notepadNote;

  const updated = writeConfig(patch);
  res.json({ status: "ok", config: updated });
});

// Dedicated endpoint to permanently save separate Metadata Sync URLs
app.post("/api/save-metadata-sync-url", (req, res) => {
  const body = req.body || {};
  const patch: Record<string, any> = {};
  if (typeof body.metadataSyncApiUrl === 'string' && body.metadataSyncApiUrl.trim()) {
    patch.metadataSyncApiUrl = body.metadataSyncApiUrl.trim();
  } else if (typeof body.syncApiUrl === 'string' && body.syncApiUrl.trim()) {
    patch.metadataSyncApiUrl = body.syncApiUrl.trim();
  }

  if (typeof body.metadataSpreadsheetSharingLink === 'string' && body.metadataSpreadsheetSharingLink.trim()) {
    patch.metadataSpreadsheetSharingLink = body.metadataSpreadsheetSharingLink.trim();
  } else if (typeof body.spreadsheetSharingLink === 'string' && body.spreadsheetSharingLink.trim()) {
    patch.metadataSpreadsheetSharingLink = body.spreadsheetSharingLink.trim();
  }

  const updated = writeConfig(patch);
  res.json({ status: "ok", message: "Metadata URLs saved permanently in separate location!", config: updated });
});

// Dedicated endpoint to permanently save separate Dashboard Sync URLs
app.post("/api/save-dashboard-sync-url", (req, res) => {
  const body = req.body || {};
  const patch: Record<string, any> = {};
  const syncVal = (body.dashboardSyncApiUrl || body.syncApiUrl || '').trim();
  if (syncVal) {
    patch.syncApiUrl = syncVal;
    patch.dashboardSyncApiUrl = syncVal;
  }
  const sheetVal = (body.dashboardSpreadsheetSharingLink || body.spreadsheetSharingLink || '').trim();
  if (sheetVal) {
    patch.spreadsheetSharingLink = sheetVal;
    patch.dashboardSpreadsheetSharingLink = sheetVal;
  }

  const updated = writeConfig(patch);
  res.json({ status: "ok", message: "Dashboard URLs saved permanently in separate location!", config: updated });
});

// Dedicated endpoint to permanently save Column A and Column B individual Spreadsheet Sharing Links
app.post("/api/save-column-spreadsheet-links", (req, res) => {
  const body = req.body || {};
  const patch: Record<string, any> = {};
  if (typeof body.colASpreadsheetLink === 'string' && body.colASpreadsheetLink.trim()) {
    patch.colASpreadsheetLink = body.colASpreadsheetLink.trim();
  }
  if (typeof body.colBSpreadsheetLink === 'string' && body.colBSpreadsheetLink.trim()) {
    patch.colBSpreadsheetLink = body.colBSpreadsheetLink.trim();
  }
  const updated = writeConfig(patch);
  res.json({ status: "ok", message: "Column A & Column B spreadsheet links saved permanently!", config: updated });
});

// Dedicated endpoint to permanently save Google Sheet / Web App URL
app.post("/api/save-sync-url", (req, res) => {
  const body = req.body || {};
  const url = (body.url || body.syncApiUrl || body.spreadsheetSharingLink || '').trim();
  if (!url) {
    return res.status(400).json({ error: "missing_url", message: "Please provide a valid URL." });
  }

  const patch: Record<string, any> = {
    syncApiUrl: url,
    spreadsheetSharingLink: url
  };
  const updated = writeConfig(patch);
  res.json({ status: "ok", message: "Google Sheet URL saved permanently!", config: updated });
});

// Dedicated endpoint to permanently save Notepad Text Note & Reference Links
app.post("/api/save-notepad-note", (req, res) => {
  const body = req.body || {};
  const note = typeof body.notepadNote === 'string' 
    ? body.notepadNote 
    : (typeof body.note === 'string' ? body.note : '');

  const patch: Record<string, any> = {
    notepadNote: note
  };
  const updated = writeConfig(patch);
  res.json({ status: "ok", message: "Notepad text saved permanently in code and persistent config!", config: updated });
});

// Google Sheet & Web App CORS Proxy Endpoint
app.all("/api/sheet-proxy", async (req, res) => {
  let targetUrl = ((req.query.url as string) || "").trim();
  if (!targetUrl) {
    return res.status(400).json({ error: "missing_url", message: "Please provide a valid Google Sheet or Web App URL." });
  }
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    if (targetUrl.includes("docs.google.com/spreadsheets")) {
      const idMatch = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        const sheetId = idMatch[1];
        let sheetTab = ((req.query.sheet as string) || '').trim();
        let gid = ((req.query.gid as string) || '').trim();

        // Extract gid from URL if present (#gid=... or ?gid=...)
        const urlGidMatch = targetUrl.match(/[?&#]gid=([0-9]+)/);
        if (!gid && urlGidMatch && urlGidMatch[1]) {
          gid = urlGidMatch[1];
        }

        // If requesting Col B or 2nd column specifically and no explicit gid is passed, target Sheet 2
        const isColB = req.query.col === 'B' || req.query.col === '2' || req.query.action === 'getColB' || sheetTab === 'Sheet2' || sheetTab === 'Sheet 2';
        if (isColB && !gid) {
          sheetTab = sheetTab || 'Sheet2';
        }

        let csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        if (gid) {
          csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
        } else if (sheetTab) {
          csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTab)}`;
        }

        let sheetResp = await fetch(csvExportUrl, { redirect: "follow" });
        let csvText = await sheetResp.text();

        // Fallback for Col B if sheetTab was Sheet2 and returned HTML or empty, try known sheet2 gid
        if (isColB && (csvText.startsWith("<!DOCTYPE") || csvText.startsWith("<html") || !csvText.trim())) {
          const fallbackGidUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=885256640`;
          try {
            const fbResp = await fetch(fallbackGidUrl, { redirect: "follow" });
            const fbText = await fbResp.text();
            if (fbText && !fbText.startsWith("<!DOCTYPE") && !fbText.startsWith("<html")) {
              csvText = fbText;
            }
          } catch {}
        }

        const trimmedCsv = csvText.trim();
        if (trimmedCsv.startsWith("<!DOCTYPE") || trimmedCsv.startsWith("<html")) {
          return res.status(403).json({
            error: "private_sheet",
            isHtml: true,
            message: "The Google Sheet requires sign-in. Please ensure General Access is set to 'Anyone with the link can view'."
          });
        }
        return res.json({ format: "csv", data: csvText });
      }
    }

    // If it's a GET request, forward action and col/column query parameters to targetUrl
    if (req.method.toUpperCase() === "GET") {
      const extraParams = new URLSearchParams();
      if (req.query.action && !targetUrl.includes("action=")) {
        extraParams.append("action", req.query.action as string);
      }
      if (req.query.col && !targetUrl.includes("col=")) {
        extraParams.append("col", req.query.col as string);
      }
      if (req.query.column && !targetUrl.includes("column=")) {
        extraParams.append("column", req.query.column as string);
      }
      const extraStr = extraParams.toString();
      if (extraStr) {
        targetUrl = targetUrl + (targetUrl.includes("?") ? "&" : "?") + extraStr;
      }
    }

    const method = req.method.toUpperCase() === "POST" ? "POST" : "GET";
    const fetchOptions: RequestInit = {
      method,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    };

    if (method === "POST") {
      const bodyContent = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      fetchOptions.body = bodyContent;
      fetchOptions.headers = {
        ...fetchOptions.headers,
        "Content-Type": "text/plain;charset=utf-8"
      };
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();
    const trimmed = text.trim();

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return res.status(response.status).json(JSON.parse(text));
      } catch {}
    }

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return res.status(response.status).json(JSON.parse(trimmed));
      } catch {}
    }

    // If Google returned an HTML web page (e.g. sign-in prompt, permissions check, or HTML error)
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || contentType.includes("text/html")) {
      let specificMessage = "Google returned an HTML web page instead of JSON. The Google Apps Script Web App may require sign-in permissions (must be deployed with 'Anyone' access) or the spreadsheet is private.";
      let reason = "html_response";
      if (trimmed.includes("找不到以下指令碼函式：doGet") || trimmed.includes("Script function not found: doGet")) {
        specificMessage = "Google Apps Script error: Function 'doGet' not found in script. Please add doGet(e) to Code.gs in your Google Sheet's Apps Script editor.";
        reason = "missing_doget";
      } else if (trimmed.includes("找不到以下指令碼函式：doPost") || trimmed.includes("Script function not found: doPost")) {
        specificMessage = "Google Apps Script error: Function 'doPost' not found in script. Please add doPost(e) to Code.gs in your Google Sheet's Apps Script editor.";
        reason = "missing_dopost";
      }
      return res.status(502).json({
        error: reason,
        isHtml: true,
        message: specificMessage,
        preview: trimmed.slice(0, 200)
      });
    }

    return res.status(response.status).json({ format: "text", data: text });
  } catch (error: any) {
    return res.status(502).json({
      error: "proxy_failed",
      message: `Failed to connect to Google service: ${error.message}`
    });
  }
});

// Models to try in order of preference for high throughput & reliability
const VISION_OCR_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-3.7-flash",
  "gemini-flash-latest"
];

// Helper for delay in retry
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini AI Multimodal OCR Endpoint for Hospital Admission Slips & Health Insurance Cards (Supports Single and Multiple Images)
app.post("/api/scan-admission-slip", async (req, res) => {
  try {
    const { image, images, files, mimeType = "image/jpeg", targetMode = "all" } = req.body || {};
    
    // Collect all raw input items
    const rawItems: Array<{ image: string; mimeType?: string }> = [];

    if (Array.isArray(images) && images.length > 0) {
      for (const item of images) {
        if (typeof item === "string") {
          rawItems.push({ image: item, mimeType: "image/jpeg" });
        } else if (item && item.image) {
          rawItems.push({ image: item.image, mimeType: item.mimeType || "image/jpeg" });
        }
      }
    } else if (Array.isArray(files) && files.length > 0) {
      for (const item of files) {
        const data = item.image || item.data || item.dataUrl;
        if (data) {
          rawItems.push({ image: data, mimeType: item.mimeType || item.mime || "image/jpeg" });
        }
      }
    } else if (image) {
      rawItems.push({ image, mimeType });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: "Missing image/pdf data in request body" });
    }

    // Limit maximum batch size to 8 images for performance
    const selectedItems = rawItems.slice(0, 8);

    // Build multimodal inlineData parts for all images
    const contentParts: any[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      let base64Data = item.image;
      let actualMime = item.mimeType || "image/jpeg";

      if (item.image.startsWith("data:")) {
        const match = item.image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          actualMime = match[1];
          base64Data = match[2];
        }
      }

      base64Data = (base64Data || "").replace(/\s+/g, "");

      if (actualMime === "image/jpg" || actualMime === "image/pjpeg") {
        actualMime = "image/jpeg";
      } else if (!actualMime || (!actualMime.startsWith("image/") && actualMime !== "application/pdf")) {
        actualMime = "image/jpeg";
      }

      if (base64Data) {
        contentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: actualMime,
          },
        });
      }
    }

    if (contentParts.length === 0) {
      return res.status(400).json({ error: "No valid image data could be extracted" });
    }

    const ai = getGeminiClient();

    const isMultiple = contentParts.length > 1;

    const systemInstruction = `You are an expert OCR and health insurance metadata specialist for an Indian hospital claims management system.
You analyze ${isMultiple ? `a set of ${contentParts.length} combined images/documents` : "images and PDFs"} of:
1. Hospital Admission Slips / Emergency Intake Stickers / IPD cards.
2. Health Insurance E-Cards / Physical TPA Cards / Corporate Mediclaim Cards / Policy Schedules (Front & Back).
3. Discharge Summaries / Hospital Estimate Letters / ID Cards.

${isMultiple ? "MULTIPLE DOCUMENTS AGGREGATION DIRECTIVE:\n- The user has uploaded MULTIPLE related images for the same claim (e.g. Admission Slip + Insurance Card Front/Back + Sticker).\n- Correlate, cross-verify, and combine the best information from ALL images into a single unified record.\n- If Image A has Admission details (IPD, UHID, DOA, Doctor) and Image B has Insurance details (TPA, Insurer, Policy No, Member ID, Emp ID), merge BOTH into the final JSON output.\n- Cross-check patient name across documents to ensure highest accuracy." : ""}

Follow these strict domain rules:

DOCUMENT CLASSIFICATION (documentType):
- Determine if the document is primarily "admission_slip", "insurance_card", or "combined".

ADMISSION SLIP EXTRACTION RULES:
- patientName: Full name in UPPERCASE. Strip all prefixes (MR, MRS, MS, MASTER, MISS, DR, BABY, BABY OF, B/O, SMT, SHRI, KUMAR, KUMARI). Example: "MASTER KARTIK AGRAWAL" -> "KARTIK AGRAWAL".
- ipdNo: The Inpatient / Admission Number. In Indian hospital slips, this can be labelled as:
  * "IPD No", "IPD NO.", "IPD :", "IPD Number", "IPD"
  * "IP No", "IP NO.", "IP NO :", "I.P. NO.", "IP Number", "IP#", "IP"
  * "IPID", "IP ID", "IP / ID No", "IPID No", "IP-ID"
  * "Adm No", "Admission No", "Admn No", "Adm No.", "Admission #", "Admn #"
  * "Inpatient No", "In-Patient No", "Indoor No", "Indoor Reg No", "Reg No (IPD)"
  * "IP/2024/...", "IP/24/..." or numbers in parentheses like "(16338)"
  Extract ONLY the raw number or code (e.g. "16338" or "IP/2024/16338"), stripping all label prefixes ("IP NO:", "IPD NO:", "IPID:", "Adm No:") and parentheses. NEVER leave ipdNo blank if an IP or admission number exists on the document.
- uhid: Hospital UHID / Patient Reg ID (often starts with EM or digits/alphanumeric, e.g. "EM260820021" or "100234"). Strip parentheses.
- doa: Date of Admission / Registration Date / Intake Date. In Indian hospitals, this is labelled as:
  * "DOA", "D.O.A.", "Date of Admission", "Admission Date", "Adm Date", "Adm Dt", "Admn Date", "Date of Adm"
  * "Date & Time of Admission", "Date & Time of Adm", "Admission Date/Time"
  * "Entry Date", "Reg Date", "Admitted On", "Admission Dt"
  * Or simply a "Date:" / "Date & Time:" timestamp printed at the top near patient name/IPD/UHID.
  Format strictly as "YYYY-MM-DD" (e.g. "2024-08-26"). Convert any DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-Mon-YYYY (e.g. "26-AUG-2024", "26/08/2024 18:59:58") to "YYYY-MM-DD". Omit the time portion.
- dod: Date of Discharge as YYYY-MM-DD if present.
- doctorName: Treating consultant / Doctor in charge (e.g., "DR. SUSHIL KUMAR").
- ageGender: e.g. "7Y 8M 28D / MALE".
- diagnosis: Ward or diagnosis (e.g. "EMERGENCY | 04").
- surgeryName: Name of surgery / procedure if mentioned.
- mobileNumber: Mobile / phone number if visible.

INSURANCE CARD EXTRACTION RULES:
- insuranceCompany: Look at the TOP of the card or primary header for the insurance company underwriter (e.g. "NIVA BUPA HEALTH INSURANCE", "STAR HEALTH AND ALLIED INSURANCE", "CARE HEALTH INSURANCE", "HDFC ERGO", "THE NEW INDIA ASSURANCE", "ICICI LOMBARD", "BAJAJ ALLIANZ", "ORIENTAL INSURANCE", "NATIONAL INSURANCE", "UNITED INDIA", "TATA AIG", "SBI GENERAL", etc.).
- tpaName: Look specifically for the label "TPA" or TPA logo/name on the card (this could be at the top or bottom of the card, e.g. "MEDIASSIST TPA", "VIDAL HEALTH TPA", "PARAMOUNT TPA", "HERITAGE TPA", "MD INDIA TPA", "RAKSHA TPA", "FHPL", "HEALTH INDIA TPA", "GENINS TPA", "VIPUL TPA"). If the insurer handles claims in-house without an external TPA (like Star Health, Niva Bupa, Care Health), set tpaName accordingly.
- policyNumber: The exact Policy Number / Master Policy Number printed on the card.
- empID: The Employee ID / Corporate ID / Staff ID / Proposer ID visible on the card (if corporate policy).
- insuranceID (Member ID / Card No):
  - Note: On cards with multiple identification numbers, identify the Policy Number and the Employee ID; the third distinct number present is the Member ID / Card No.
  - If a primary cardholder / member is present, put their Member ID in insuranceID.
- members (Family Floater / Multi-Member List):
  - If multiple family members or covered beneficiaries are printed on the card (e.g., Self, Spouse, Child 1, Child 2 with individual member IDs), list each member in the 'members' array with their name (cleaned of prefixes), memberId, relation, age/gender, and DOB if present.
- insuranceLimit: Sum Insured or Floater limit if visible on the card (e.g., "₹ 5,00,000").
- validFrom & validUpto: Validity dates in YYYY-MM-DD if printed on the card.

Target mode requested: "${targetMode}".
Return clean, verified JSON strictly matching the schema.`;

    const requestConfig = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: {
            type: Type.STRING,
            description: "'admission_slip', 'insurance_card', 'combined' or 'unknown'",
          },
          patientName: {
            type: Type.STRING,
            description: "Clean patient or insured member name without prefixes",
          },
          ipdNo: {
            type: Type.STRING,
            description: "IPD or IP or IPID or Admission Number without label or parentheses (e.g. 16338, IP/2024/123)",
          },
          uhid: {
            type: Type.STRING,
            description: "UHID Number starting with EM or digits (e.g. EM260820021, 100234)",
          },
          doa: {
            type: Type.STRING,
            description: "Date of Admission formatted strictly as YYYY-MM-DD (e.g. 2024-08-26)",
          },
          dod: {
            type: Type.STRING,
            description: "Date of Discharge as YYYY-MM-DD if present",
          },
          tpaName: {
            type: Type.STRING,
            description: "TPA name identified by TPA label on card (top or bottom)",
          },
          insuranceCompany: {
            type: Type.STRING,
            description: "Insurance company printed at the top of the card",
          },
          policyNumber: {
            type: Type.STRING,
            description: "Policy Number printed on card",
          },
          empID: {
            type: Type.STRING,
            description: "Employee ID / Corporate ID / Staff ID",
          },
          insuranceID: {
            type: Type.STRING,
            description: "Member ID / Card No / Beneficiary ID",
          },
          claimNo: {
            type: Type.STRING,
            description: "Claim number if visible",
          },
          insuranceLimit: {
            type: Type.STRING,
            description: "Sum Insured or Policy limit if visible",
          },
          validFrom: {
            type: Type.STRING,
            description: "Policy start date as YYYY-MM-DD",
          },
          validUpto: {
            type: Type.STRING,
            description: "Policy expiry date as YYYY-MM-DD",
          },
          doctorName: {
            type: Type.STRING,
            description: "Treating doctor name",
          },
          ageGender: {
            type: Type.STRING,
            description: "Age and gender string",
          },
          diagnosis: {
            type: Type.STRING,
            description: "Diagnosis or emergency ward details",
          },
          surgeryName: {
            type: Type.STRING,
            description: "Surgery or procedure name if visible",
          },
          mobileNumber: {
            type: Type.STRING,
            description: "Mobile number if visible",
          },
          discoveredNumbers: {
            type: Type.ARRAY,
            description: "All distinct numbers, IDs, codes, dates, phone numbers, and amounts found across the documents with their context label",
            items: {
              type: Type.OBJECT,
              properties: {
                value: { type: Type.STRING, description: "The raw number or alphanumeric code" },
                label: { type: Type.STRING, description: "Inferred label (e.g. IPD No, UHID, Policy No, Card ID, Mobile, Sum Insured, Bed No, Date)" },
                context: { type: Type.STRING, description: "Surrounding line or text snippet" },
              },
              required: ["value", "label"],
            },
          },
          allTextLines: {
            type: Type.ARRAY,
            description: "All key readable text lines extracted from the documents",
            items: { type: Type.STRING },
          },
          members: {
            type: Type.ARRAY,
            description: "List of covered members/beneficiaries on card with their individual Member IDs",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Member name" },
                memberId: { type: Type.STRING, description: "Member ID / Card No" },
                relation: { type: Type.STRING, description: "Relation (e.g. SELF, SPOUSE, CHILD, MOTHER, FATHER)" },
                ageGender: { type: Type.STRING, description: "Age or Gender" },
                dob: { type: Type.STRING, description: "DOB if visible" },
              },
              required: ["name", "memberId"],
            },
          },
          rawExtractedText: {
            type: Type.STRING,
            description: "All raw visible text lines",
          },
        },
      },
    };

    // Add prompt instructions at the end of the parts array
    let targetModeInstruction = "";
    if (targetMode === "admission") {
      targetModeInstruction = "ADMISSION MODE PRIORITY: Focus heavily on capturing EVERY detail and number from the Hospital Admission Slip / IPD Card / Emergency Intake Form. Ensure IPD/IP No, UHID, Patient Name, Admission Date (DOA), Doctor, Ward/Bed, Age/Gender, Diagnosis, Surgery, and Phone number are thoroughly extracted along with all numbers.";
    } else if (targetMode === "insurance") {
      targetModeInstruction = "INSURANCE CARD MODE PRIORITY: Focus heavily on capturing EVERY detail and number from the Health Insurance E-Card / TPA Physical Card (Front & Back). Ensure Insurance Company (from header), TPA Name, Policy Number, Member ID / Card No, Employee ID, Claim Number, Sum Insured Limit, Validity Dates, and ALL covered family members with their individual IDs are thoroughly extracted.";
    } else {
      targetModeInstruction = "ALL / AUTO CONSOLIDATION PRIORITY: Cross-analyze ALL attached documents together. Extract both Admission slip details and Insurance Card / TPA metadata, and capture all visible numbers, IDs, and text.";
    }

    const userPromptPart = {
      text: `${targetModeInstruction}
Scan ${isMultiple ? `these ${contentParts.length} combined documents` : "this document"}. Extract all patient, admission, and insurance/TPA metadata, plus list all numbers and all text lines clearly. Return verified JSON.`,
    };

    const finalParts = [...contentParts, userPromptPart];

    let lastError: any = null;
    let parsedData: any = null;

    // Iterate through fallback models with retry logic
    for (const modelName of VISION_OCR_MODELS) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`[OCR Scan] Attempting scan with model: ${modelName} (${contentParts.length} document(s), attempt ${attempts}/${maxAttempts})...`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: finalParts,
              },
            ],
            config: requestConfig,
          });

          let outputText = response.text || "{}";
          // Strip potential markdown code blocks
          if (outputText.includes("```json")) {
            outputText = outputText.replace(/```json\s*([\s\S]*?)\s*```/g, "$1");
          } else if (outputText.includes("```")) {
            outputText = outputText.replace(/```\s*([\s\S]*?)\s*```/g, "$1");
          }

          try {
            parsedData = JSON.parse(outputText.trim());
          } catch (parseErr) {
            console.error("Failed to parse JSON response, attempting regex fallback:", parseErr, outputText);
            const jsonMatch = outputText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not parse JSON from model response");
            }
          }

          console.log(`[OCR Scan] Success with model: ${modelName}`);
          break; // Exit while loop on success
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isQuotaExhausted = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded");
          const isUnavailableOrBusy = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded") || errMsg.includes("404") || errMsg.includes("NOT_FOUND");

          console.warn(`[OCR Scan] Model ${modelName} status: ${errMsg.slice(0, 150)}...`);

          // If quota exhausted, unavailable, or model not found, immediately fail over to next model
          if (isQuotaExhausted || isUnavailableOrBusy) {
            break;
          }

          if (attempts < maxAttempts) {
            await sleep(300);
            continue;
          }
          break;
        }
      }

      if (parsedData) {
        break; // Exit models loop on success
      }
    }

    if (!parsedData) {
      throw lastError || new Error("All vision OCR models failed to process the document.");
    }

    res.json({
      status: "success",
      data: parsedData,
      scannedCount: contentParts.length,
    });
  } catch (err: any) {
    console.error("Error processing scan with Gemini:", err);
    let friendlyMessage = err?.message || "Failed to scan and parse document";
    
    // Parse nested Google API error JSON if present in message
    try {
      if (typeof friendlyMessage === "string" && friendlyMessage.includes("{")) {
        const jsonMatch = friendlyMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) {
            friendlyMessage = parsed.error.message;
          }
        }
      }
    } catch {
      // keep original
    }

    if (friendlyMessage.includes("RESOURCE_EXHAUSTED") || friendlyMessage.includes("429") || friendlyMessage.includes("Quota exceeded")) {
      const retryMatch = friendlyMessage.match(/retry in ([\d\.]+)s/i) || friendlyMessage.match(/retryDelay":"(\d+s)"/i);
      const retryWait = retryMatch ? ` Please retry in ${retryMatch[1]}.` : " Please retry in a few seconds.";
      friendlyMessage = `Gemini API rate limit / daily quota reached.${retryWait} You can also fill the form fields manually.`;
    }

    res.status(500).json({
      error: friendlyMessage,
    });
  }
});

async function startServer() {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
