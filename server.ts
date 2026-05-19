import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CHATBOTS_FILE = path.join(DATA_DIR, "chatbots.json");

// Helper to manage JSON data
async function readData(filePath: string, defaultValue: any = []) {
  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }
  return defaultValue;
}

async function writeData(filePath: string, data: any) {
  await fs.writeJson(filePath, data, { spaces: 2 });
}

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

async function initData() {
  await fs.ensureDir(DATA_DIR);
  
  // Init users
  const users = await readData(USERS_FILE);
  if (users.length === 0) {
    const hashedPassword = await bcrypt.hash("demo123", 10);
    const demoUser = {
      id: "user_" + uuidv4().substr(0, 8),
      email: "demo@example.com",
      password: hashedPassword,
      name: "Demo User"
    };
    await writeData(USERS_FILE, [demoUser]);
    console.log("Demo user created: demo@example.com / demo123");
  }

  // Init chatbots if not exists
  if (!(await fs.pathExists(CHATBOTS_FILE))) {
    await writeData(CHATBOTS_FILE, []);
  }
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- Public API (no auth) ---
app.get("/api/public/knowledge/:chatbotId", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const filePath = path.join(DATA_DIR, `${chatbotId}.json`);
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json(data);
    } else {
      res.status(404).json({ error: "Knowledge data not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read knowledge data" });
  }
});

// --- Auth Routes ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const users = await readData(USERS_FILE);
    
    if (users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: "user_" + uuidv4().substr(0, 8),
      email,
      password: hashedPassword,
      name
    };
    
    users.push(newUser);
    await writeData(USERS_FILE, users);

    const token = jwt.sign({ userId: newUser.id, email, name }, JWT_SECRET);
    res.json({ token, user: { id: newUser.id, email, name } });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await readData(USERS_FILE);
    const user = users.find((u: any) => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = jwt.sign({ userId: user.id, email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- Chatbot Routes ---
app.get("/api/chatbots", authenticate, async (req: any, res) => {
  try {
    const chatbots = await readData(CHATBOTS_FILE);
    const userChatbots = chatbots
      .filter((c: any) => c.userId === req.user.userId)
      .map((c: any) => ({
        _id: c.id,
        name: c.name,
        createdAt: c.createdAt
      }));
    res.json(userChatbots);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chatbots" });
  }
});

app.post("/api/chatbots", authenticate, async (req: any, res) => {
  try {
    const { name } = req.body;
    const chatbots = await readData(CHATBOTS_FILE);
    
    const newChatbot = {
      id: "bot_" + uuidv4(),
      userId: req.user.userId,
      name,
      createdAt: new Date().toISOString()
    };
    
    chatbots.push(newChatbot);
    await writeData(CHATBOTS_FILE, chatbots);
    
    res.json({
      _id: newChatbot.id,
      name: newChatbot.name,
      createdAt: newChatbot.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create chatbot" });
  }
});

app.delete("/api/chatbots/:id", authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/chatbots/${id}] Request by user ${req.user.userId}`);

    const chatbots = await readData(CHATBOTS_FILE);
    const index = chatbots.findIndex((c: any) => c.id === id && c.userId === req.user.userId);

    if (index === -1) {
      console.log(`[DELETE] Chatbot ${id} not found for user ${req.user.userId}`);
      console.log(`[DELETE] Available ids:`, chatbots.filter((c: any) => c.userId === req.user.userId).map((c: any) => c.id));
      return res.status(404).json({ error: "Chatbot not found" });
    }

    chatbots.splice(index, 1);
    await writeData(CHATBOTS_FILE, chatbots);

    const knowledgePath = path.join(DATA_DIR, `${id}.json`);
    if (await fs.pathExists(knowledgePath)) {
      await fs.remove(knowledgePath);
      console.log(`[DELETE] Deleted knowledge file for ${id}`);
    }

    console.log(`[DELETE] Successfully deleted chatbot ${id}`);
    return res.json({ success: true });
  } catch (error) {
    console.error(`[DELETE] Error deleting chatbot:`, error);
    return res.status(500).json({ error: "Failed to delete chatbot" });
  }
});

// --- Knowledge Routes ---
app.get("/api/knowledge", authenticate, async (req: any, res) => {
  try {
    const { chatbotId } = req.query;
    if (!chatbotId) return res.status(400).json({ error: "chatbotId is required" });

    const filePath = path.join(DATA_DIR, `${chatbotId}.json`);
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      res.json(data);
    } else {
      res.json({
        chatbotId: chatbotId,
        userId: req.user.userId,
        about: "",
        products: [],
        policy: "",
        contact: { mobile: "", email: "", address: "", website: "" },
        faqs: []
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to read knowledge data" });
  }
});

app.post("/api/knowledge", authenticate, async (req: any, res) => {
  try {
    const data = req.body;
    const chatbotId = data.chatbotId;
    if (!chatbotId) return res.status(400).json({ error: "chatbotId is required" });

    const filePath = path.join(DATA_DIR, `${chatbotId}.json`);
    await fs.writeJson(filePath, data, { spaces: 2 });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to save knowledge data" });
  }
});

// ── Model serving with browser cache ──────────────────────────────────────
// Serve model files from local cache with proper headers so browser HTTP cache stores them
app.get('/models/*', async (req: any, res) => {
  try {
    const modelPath = req.params[0]; // e.g., "onnx-community/Qwen3-0.5B/onnx/model.onnx"
    const localPath = path.join(process.cwd(), 'models', modelPath);
    
    // Check if file exists locally
    if (await fs.pathExists(localPath)) {
      // Set cache headers so browser keeps file on disk for ~30 days
      res.set('Cache-Control', 'public, max-age=2592000, immutable');
      res.set('Content-Type', 'application/octet-stream');
      res.sendFile(localPath);
      return;
    }
    
    // If not cached locally, stream from HuggingFace Hub
    // This provides automatic download + browser HTTP cache
    console.log('[models] Cache miss, streaming from HF:', modelPath);
    const hfUrl = `https://huggingface.co/${modelPath}/resolve/main`;
    
    const response = await fetch(hfUrl);
    if (!response.ok) {
      return res.status(404).json({ error: 'Model file not found' });
    }
    
    // Ensure local cache dir exists
    const localDir = path.dirname(localPath);
    await fs.ensureDir(localDir);
    
    // Stream to browser (browser HTTP cache will store it)
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    
    // Also save to local disk in background (don't wait for completion)
    const fileStream = fs.createWriteStream(localPath);
    response.body?.pipe(fileStream);
    
    // Stream to browser immediately
    response.body?.pipe(res);
  } catch (error) {
    console.error('[models] Error:', error);
    res.status(500).json({ error: 'Failed to fetch model' });
  }
});

// Static files & SPA fallback (only in production — Vite dev middleware handles this locally)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), 'dist');
  
  // Service Worker should not be cached to allow updates
  app.get('/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Content-Type', 'application/javascript');
    res.sendFile(path.join(distPath, 'sw.js'));
  });
  
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Local dev: start the server ──
// Vercel uses the exported app directly; local `tsx server.ts` calls app.listen()
if (process.env.VERCEL !== '1') {
  async function startLocal() {
    await initData();

    // In dev mode, apply Vite middleware (serves React app + public/ files)
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startLocal();
} else {
  // On Vercel, init data on cold start
  initData().catch(console.error);
}

export default app;
