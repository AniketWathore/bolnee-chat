import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import Database from "better-sqlite3";

export interface DbUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface DbChatbot {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  avatar?: string;
  accentColor?: string;
  theme?: string;
  greeting?: string;
  defaultMessage?: string;
  fallbackMessage?: string;
}

const dataDir = path.join(process.cwd(), "data");
fs.ensureDirSync(dataDir);
const db = new Database(path.join(dataDir, "bolnee.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chatbots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS knowledge (
    chatbot_id TEXT PRIMARY KEY REFERENCES chatbots(id) ON DELETE CASCADE,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    locator TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    error TEXT,
    content_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    source_id TEXT REFERENCES sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    embedding TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

for (const statement of [
  "ALTER TABLE chatbots ADD COLUMN avatar TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chatbots ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai-compatible'",
  "ALTER TABLE chatbots ADD COLUMN model TEXT NOT NULL DEFAULT 'gpt-4o-mini'",
  "ALTER TABLE chatbots ADD COLUMN api_key TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chatbots ADD COLUMN base_url TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chatbots ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#111111'",
  "ALTER TABLE chatbots ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'",
  "ALTER TABLE chatbots ADD COLUMN greeting TEXT NOT NULL DEFAULT 'Hi! How can I help?'",
  "ALTER TABLE chatbots ADD COLUMN default_message TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE chatbots ADD COLUMN fallback_message TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE messages ADD COLUMN ip TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE messages ADD COLUMN user_identifier TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE messages ADD COLUMN model TEXT NOT NULL DEFAULT ''",
]) {
  try { db.exec(statement); } catch { /* Column already exists. */ }
}

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || "development-secret-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptApiKey(plain: string): string {
  if (!plain) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptApiKey(stored: string): string {
  if (!stored) return "";
  // legacy plaintext support: if not in encrypted format, return as-is
  if (!stored.includes(":")) return stored;
  try {
    const [ivHex, tagHex, encHex] = stored.split(":");
    if (!ivHex || !tagHex || !encHex) return stored;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

export function findUserByEmail(email: string): DbUser | undefined {
  return db.prepare("SELECT id, email, password, name FROM users WHERE email = ?").get(email) as DbUser | undefined;
}

export function insertUser(user: DbUser): void {
  db.prepare("INSERT INTO users (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.email, user.password, user.name, new Date().toISOString());
}

export function listChatbots(userId: string): DbChatbot[] {
  return db.prepare("SELECT id, user_id as userId, name, avatar, accent_color as accentColor, theme, greeting, default_message as defaultMessage, fallback_message as fallbackMessage, created_at as createdAt FROM chatbots WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as DbChatbot[];
}

export function updateChatbotSettings(id: string, userId: string, settings: { avatar?: string; provider?: string; model?: string; apiKey?: string; baseUrl?: string; accentColor?: string; theme?: string; greeting?: string; defaultMessage?: string; fallbackMessage?: string; name?: string }): boolean {
  const encryptedKey = settings.apiKey !== undefined ? (settings.apiKey ? encryptApiKey(settings.apiKey) : "") : null;
  const result = db.prepare(`UPDATE chatbots SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), provider = COALESCE(?, provider), model = COALESCE(?, model), api_key = COALESCE(?, api_key), base_url = COALESCE(?, base_url), accent_color = COALESCE(?, accent_color), theme = COALESCE(?, theme), greeting = COALESCE(?, greeting), default_message = COALESCE(?, default_message), fallback_message = COALESCE(?, fallback_message) WHERE id = ? AND user_id = ?`)
    .run(settings.name ?? null, settings.avatar ?? null, settings.provider ?? null, settings.model ?? null, encryptedKey ?? null, settings.baseUrl ?? null, settings.accentColor ?? null, settings.theme ?? null, settings.greeting ?? null, settings.defaultMessage ?? null, settings.fallbackMessage ?? null, id, userId);
  return result.changes > 0;
}

export function getChatbotAppearance(id: string): { name: string; avatar: string; accentColor: string; theme: string; greeting: string; defaultMessage: string; fallbackMessage: string } | undefined {
  return db.prepare("SELECT name, avatar, accent_color as accentColor, theme, greeting, default_message as defaultMessage, fallback_message as fallbackMessage FROM chatbots WHERE id = ?").get(id) as { name: string; avatar: string; accentColor: string; theme: string; greeting: string; defaultMessage: string; fallbackMessage: string } | undefined;
}

export function getChatbotSettings(id: string): { provider: string; model: string; apiKey: string; baseUrl: string } | undefined {
  const row = db.prepare("SELECT provider, model, api_key as apiKey, base_url as baseUrl FROM chatbots WHERE id = ?").get(id) as { provider: string; model: string; apiKey: string; baseUrl: string } | undefined;
  if (!row) return undefined;
  return { provider: row.provider, model: row.model, apiKey: decryptApiKey(row.apiKey), baseUrl: row.baseUrl || "" };
}

export function getChatbotSettingsRaw(id: string): { provider: string; model: string; baseUrl: string } | undefined {
  return db.prepare("SELECT provider, model, base_url as baseUrl FROM chatbots WHERE id = ?").get(id) as { provider: string; model: string; baseUrl: string } | undefined;
}

export function findChatbot(id: string, userId?: string): DbChatbot | undefined {
  const query = userId
    ? "SELECT id, user_id as userId, name, avatar, accent_color as accentColor, theme, greeting, default_message as defaultMessage, fallback_message as fallbackMessage, created_at as createdAt FROM chatbots WHERE id = ? AND user_id = ?"
    : "SELECT id, user_id as userId, name, avatar, accent_color as accentColor, theme, greeting, default_message as defaultMessage, fallback_message as fallbackMessage, created_at as createdAt FROM chatbots WHERE id = ?";
  return (userId ? db.prepare(query).get(id, userId) : db.prepare(query).get(id)) as DbChatbot | undefined;
}

export function insertChatbot(bot: DbChatbot): void {
  // Store avatar if provided via DbChatbot extension
  const avatar = (bot as { avatar?: string }).avatar || "";
  db.prepare("INSERT INTO chatbots (id, user_id, name, avatar, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(bot.id, bot.userId, bot.name, avatar, bot.createdAt);
}

export function removeChatbot(id: string, userId: string): boolean {
  return db.prepare("DELETE FROM chatbots WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export function getKnowledge(chatbotId: string, fallback: unknown): unknown {
  const row = db.prepare("SELECT payload FROM knowledge WHERE chatbot_id = ?").get(chatbotId) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : fallback;
}

export function saveKnowledge(chatbotId: string, payload: unknown): void {
  db.prepare(`INSERT INTO knowledge (chatbot_id, payload, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(chatbot_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`)
    .run(chatbotId, JSON.stringify(payload), new Date().toISOString());
}

export function createSource(source: { id: string; chatbotId: string; type: string; locator: string }): void {
  const now = new Date().toISOString();
  db.prepare("INSERT INTO sources (id, chatbot_id, type, locator, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(source.id, source.chatbotId, source.type, source.locator, now, now);
}

export function updateSource(id: string, status: string, error?: string): void {
  db.prepare("UPDATE sources SET status = ?, error = ?, updated_at = ? WHERE id = ?")
    .run(status, error || null, new Date().toISOString(), id);
}

export function replaceChunks(chatbotId: string, sourceId: string, chunks: Array<{ id: string; content: string; metadata?: unknown }>): void {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM chunks WHERE source_id = ?").run(sourceId);
    const insert = db.prepare("INSERT INTO chunks (id, chatbot_id, source_id, content, metadata) VALUES (?, ?, ?, ?, ?)");
    for (const chunk of chunks) insert.run(chunk.id, chatbotId, sourceId, chunk.content, JSON.stringify(chunk.metadata || {}));
  });
  transaction();
}

export function listChunks(chatbotId: string): Array<{ content: string; metadata: string }> {
  return db.prepare("SELECT content, metadata FROM chunks WHERE chatbot_id = ?").all(chatbotId) as Array<{ content: string; metadata: string }>;
}

export function insertMessage(chatbotId: string, role: string, content: string, meta: { ip?: string; userIdentifier?: string; model?: string } = {}): void {
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare("INSERT INTO messages (id, chatbot_id, role, content, ip, user_identifier, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, chatbotId, role, content, meta.ip || "", meta.userIdentifier || "", meta.model || "", new Date().toISOString());
}

export function listMessages(chatbotId: string, limit = 200): Array<{ id: string; role: string; content: string; ip: string; userIdentifier: string; model: string; createdAt: string }> {
  return db.prepare("SELECT id, role, content, ip, user_identifier as userIdentifier, model, created_at as createdAt FROM messages WHERE chatbot_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(chatbotId, limit) as Array<{ id: string; role: string; content: string; ip: string; userIdentifier: string; model: string; createdAt: string }>;
}

export function getChatStats(chatbotId: string): { total: number; users: number } {
  const total = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE chatbot_id = ? AND role = 'user'").get(chatbotId) as { c: number }).c;
  const users = (db.prepare("SELECT COUNT(DISTINCT user_identifier) as c FROM messages WHERE chatbot_id = ? AND user_identifier != '' AND user_identifier != 'system'").get(chatbotId) as { c: number }).c;
  return { total, users };
}

export function getGlobalStats(): { totalMessages: number; activeSessions: number } {
  const totalMessages = (db.prepare("SELECT COUNT(*) as c FROM messages WHERE role = 'user'").get() as { c: number }).c;
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const activeSessions = (db.prepare("SELECT COUNT(DISTINCT user_identifier) as c FROM messages WHERE created_at > ? AND user_identifier != '' AND user_identifier != 'system' AND role = 'user'").get(since) as { c: number }).c;
  return { totalMessages, activeSessions };
}

export function listSources(chatbotId: string): Array<Record<string, unknown>> {
  return db.prepare("SELECT id, type, locator, status, error, content_hash as contentHash, created_at as createdAt, updated_at as updatedAt FROM sources WHERE chatbot_id = ? ORDER BY created_at DESC")
    .all(chatbotId) as Array<Record<string, unknown>>;
}

export function deleteSource(sourceId: string, chatbotId: string): boolean {
  const del = db.prepare("DELETE FROM sources WHERE id = ? AND chatbot_id = ?").run(sourceId, chatbotId);
  if (del.changes) {
    db.prepare("DELETE FROM chunks WHERE source_id = ?").run(sourceId);
  }
  return del.changes > 0;
}