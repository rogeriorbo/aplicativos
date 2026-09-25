import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile, ChatMessage, LinkClickRecord, UserPreferences, Ticket, TicketComment, TicketAttachment } from '../../types';

// Ensure data folder exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'deio.sqlite');
const db = new DatabaseSync(DB_PATH);

// WAL mode for fast concurrent reads and writes
db.exec('PRAGMA journal_mode = WAL;');

// Password hashing utilities using scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  // If stored with salt:hash format
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
    } catch {
      return false;
    }
  }
  // Fallback for legacy plain-text during migration
  return password === storedHash;
}

// Initial default public apps
const DEFAULT_PUBLIC_APPS: ApplicationLink[] = [
  {
    id: "9391a81d-161c-4930-9c89-ffd95a081990",
    name: "COMAF - New",
    url: "http://192.168.0.20/sgc/public/",
    description: "Sistema de Gerenciamento da COMAF - INTRANET NEW",
    ownerId: "default"
  },
  {
    id: "ae066eb5-1436-4a3f-ad86-11d284965e34",
    name: "COMAF - Old",
    url: "http://192.168.0.4/sgc/login.php",
    description: "Sistema de Gerenciamento da COMAF - INTRANET OLD",
    ownerId: "default"
  },
  {
    id: "3562910e-9d1f-4798-a248-f7988e0070d8",
    name: "COMAF - INTRANET",
    url: "http://intranet.comaf.com",
    description: "Acesso ao INTRANET",
    ownerId: "default"
  },
  {
    id: "86805f41-6ea4-46eb-9469-52aa0a34ee12",
    name: "COMAF - Site",
    url: "https://comaf.ind.br",
    description: "Acesso ao site da COMAF Indústria Aeronáutica.",
    ownerId: "default"
  },
  {
    id: "5fdae6a9-989c-47a1-9e76-478a71e4fd89",
    name: "COMAF - WebMail",
    url: "https://webmail-seguro.com.br/comaf.ind.br",
    description: "Acesso ao servidor de e-mails da COMAF.",
    ownerId: "default"
  },
  {
    id: "379ed945-0e7c-4892-8d63-2a5f078bb85d",
    name: "COMAF - I-elitec",
    url: "https://www.i-elitech.com/user/login",
    description: "Site para consultar a temperatura do inflamável.",
    ownerId: "default"
  },
  {
    id: "f9b00c4a-731c-425e-903d-b98f205b6aa5",
    name: "Google",
    url: "https://www.google.com",
    description: "Site de busca.",
    ownerId: "default"
  },
  {
    id: "bf42430d-ad98-4892-a661-2f60153f570e",
    name: "Danfe - Consultar",
    url: "https://meudanfe.com.br",
    description: "Consulta Grátis de NF-e",
    ownerId: "default"
  },
  {
    id: "3563e4d1-017d-44fc-9cec-14de28bfe002",
    name: "PartBase",
    url: "https://www.partsbase.com",
    description: "Consultar Part Nunber",
    ownerId: "default"
  },
  {
    id: "e9821a72-6a4a-4d2a-8d6b-b4a5d8e9c0f1",
    name: "NSN Now",
    url: "https://www.nsn-now.com/Indexing/PublicSearch.aspx",
    description: "Consultar Part Nunber",
    ownerId: "default"
  },
  {
    id: "f82b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    name: "StokeSaas",
    url: "https://stokesaas.deioinfo.com.br",
    description: "Sistema de Estoque",
    ownerId: "default"
  }
];

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      preferences TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      owner_id TEXT NOT NULL,
      type TEXT DEFAULT 'app',
      category TEXT,
      is_pinned INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_nickname TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      recipient_id TEXT,
      attachment TEXT,
      reactions TEXT DEFAULT '{}',
      reply_to TEXT,
      is_edited INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS link_clicks (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      app_name TEXT NOT NULL,
      url TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      user_id TEXT,
      user_nickname TEXT,
      owner_id TEXT,
      device_type TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      department TEXT NOT NULL DEFAULT 'Geral',
      creator_id TEXT NOT NULL,
      creator_nickname TEXT NOT NULL,
      creator_email TEXT NOT NULL,
      assigned_to_id TEXT,
      assigned_to_nickname TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      closed_at INTEGER,
      attachments TEXT DEFAULT '[]',
      satisfaction_rating INTEGER,
      satisfaction_feedback TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_nickname TEXT NOT NULL,
      user_role TEXT NOT NULL DEFAULT 'admin',
      message TEXT NOT NULL,
      is_internal_note INTEGER DEFAULT 0,
      attachments TEXT DEFAULT '[]',
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ticket_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📁',
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ticket_priorities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      level TEXT NOT NULL,
      color TEXT DEFAULT 'sky',
      sort_order INTEGER DEFAULT 0
    );
  `);

  // Seed default ticket departments if empty
  const countDepStmt = db.prepare('SELECT COUNT(*) as count FROM ticket_departments');
  if ((countDepStmt.get() as { count: number }).count === 0) {
    const insertDep = db.prepare('INSERT INTO ticket_departments (id, name, sort_order) VALUES (?, ?, ?)');
    const defaultDeps = [
      'Geral',
      'Administrativo / RH',
      'Financeiro / Fiscal',
      'Operações / Produção',
      'Logística / Estoque',
      'Vendas / Comercial',
      'Diretoria',
      'TI / Suporte'
    ];
    defaultDeps.forEach((dep, idx) => {
      insertDep.run(`dep-${idx + 1}`, dep, idx + 1);
    });
  }

  // Seed default ticket categories if empty
  const countCatStmt = db.prepare('SELECT COUNT(*) as count FROM ticket_categories');
  if ((countCatStmt.get() as { count: number }).count === 0) {
    const insertCat = db.prepare('INSERT INTO ticket_categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)');
    const defaultCats = [
      { id: 'cat-software', name: 'Software / Sistemas', icon: '⚙️' },
      { id: 'cat-hardware', name: 'Hardware / Equipamento', icon: '💻' },
      { id: 'cat-network', name: 'Rede / Internet', icon: '🌐' },
      { id: 'cat-access', name: 'Acesso / E-mail / Senha', icon: '🔑' },
      { id: 'cat-printer', name: 'Impressora / Periféricos', icon: '🖨️' },
      { id: 'cat-other', name: 'Outros Assuntos', icon: '📁' },
    ];
    defaultCats.forEach((c, idx) => {
      insertCat.run(c.id, c.name, c.icon, idx + 1);
    });
  }

  // Seed default ticket priorities if empty
  const countPrioStmt = db.prepare('SELECT COUNT(*) as count FROM ticket_priorities');
  if ((countPrioStmt.get() as { count: number }).count === 0) {
    const insertPrio = db.prepare('INSERT INTO ticket_priorities (id, name, level, color, sort_order) VALUES (?, ?, ?, ?, ?)');
    const defaultPrios = [
      { id: 'prio-low', name: 'Baixa', level: 'low', color: 'emerald' },
      { id: 'prio-medium', name: 'Média (Padrão)', level: 'medium', color: 'sky' },
      { id: 'prio-high', name: 'Alta', level: 'high', color: 'amber' },
      { id: 'prio-urgent', name: 'Crítica / Urgente', level: 'urgent', color: 'rose' },
    ];
    defaultPrios.forEach((p, idx) => {
      insertPrio.run(p.id, p.name, p.level, p.color, idx + 1);
    });
  }

  // Seed master admin if not exists
  const countUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = (countUsersStmt.get() as { count: number }).count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, nickname, role, preferences, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const masterPasswordHash = hashPassword('Deio@2409');
    insertUser.run(
      'deio-master-user-01',
      'deiorbo@gmail.com',
      masterPasswordHash,
      'Master Admin',
      'master',
      JSON.stringify({ defaultAdminProfileId: 'default' }),
      Date.now()
    );
  }

  // Seed default apps if empty
  const countAppsStmt = db.prepare('SELECT COUNT(*) as count FROM apps');
  const appCount = (countAppsStmt.get() as { count: number }).count;
  if (appCount === 0) {
    const insertApp = db.prepare(`
      INSERT INTO apps (id, name, url, description, icon_url, owner_id, type, category, is_pinned, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    DEFAULT_PUBLIC_APPS.forEach((app, idx) => {
      insertApp.run(
        app.id,
        app.name,
        app.url,
        app.description || '',
        app.iconUrl || '',
        app.ownerId || 'default',
        app.type || 'app',
        app.category || '',
        app.isPinned ? 1 : 0,
        idx
      );
    });
  }

  // Seed default public dashboard ID
  const getSetting = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  const existingPubId = getSetting.get('public_dashboard_id');
  if (!existingPubId) {
    const insertSetting = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)');
    insertSetting.run('public_dashboard_id', 'default');
  }

  // Seed default tickets menu visibility (enabled by default)
  const existingTicketsMenuSetting = getSetting.get('tickets_menu_enabled');
  if (!existingTicketsMenuSetting) {
    const insertSetting = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)');
    insertSetting.run('tickets_menu_enabled', '1');
  }

  // Seed sample tickets if empty
  const countTicketsStmt = db.prepare('SELECT COUNT(*) as count FROM tickets');
  const ticketCount = (countTicketsStmt.get() as { count: number }).count;
  if (ticketCount === 0) {
    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        id, ticket_number, title, description, category, priority, status, department,
        creator_id, creator_nickname, creator_email, assigned_to_id, assigned_to_nickname,
        created_at, updated_at, closed_at, attachments, satisfaction_rating, satisfaction_feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTicket.run(
      'ticket-seed-01',
      1001,
      'Lentidão ao carregar relatórios no COMAF New',
      'Desde ontem à tarde os relatórios de estoque e movimentações estão demorando mais de 2 minutos para abrir no sistema COMAF New.',
      'software',
      'high',
      'in_progress',
      'Operações',
      'deio-master-user-01',
      'Master Admin',
      'deiorbo@gmail.com',
      'deio-master-user-01',
      'Equipe TI Déio',
      Date.now() - 7200000,
      Date.now() - 1800000,
      null,
      '[]',
      null,
      null
    );

    insertTicket.run(
      'ticket-seed-02',
      1002,
      'Configuração de impressora de etiquetas no setor de expedição',
      'Necessitamos instalar os drivers da impressora Zebra de etiquetas na máquina nova do setor de logística.',
      'printer',
      'medium',
      'open',
      'Logística',
      'deio-master-user-01',
      'Master Admin',
      'deiorbo@gmail.com',
      null,
      null,
      Date.now() - 3600000,
      Date.now() - 3600000,
      null,
      '[]',
      null,
      null
    );

    const insertComment = db.prepare(`
      INSERT INTO ticket_comments (
        id, ticket_id, user_id, user_nickname, user_role, message, is_internal_note, attachments, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertComment.run(
      'comment-seed-01',
      'ticket-seed-01',
      'deio-master-user-01',
      'Equipe TI Déio',
      'master',
      'Chamado assumido pela equipe técnica. Estamos reiniciando o serviço de cache da aplicação e verificando os logs do servidor.',
      0,
      '[]',
      Date.now() - 3600000
    );

    insertComment.run(
      'comment-seed-02',
      'ticket-seed-01',
      'deio-master-user-01',
      'Master Admin',
      'master',
      'Excelente, fico no aguardo da normalização!',
      0,
      '[]',
      Date.now() - 1800000
    );
  }
}

// User repository functions
export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT id, email, password_hash, nickname, role, preferences FROM users ORDER BY created_at ASC');
  const rows = stmt.all() as Array<{
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    role: string;
    preferences: string;
  }>;

  return rows.map(r => ({
    id: r.id,
    email: r.email,
    password: '', // never expose password or hash to client
    nickname: r.nickname,
    role: r.role as 'master' | 'admin',
    preferences: r.preferences ? JSON.parse(r.preferences) : {},
  }));
}

export function getUserById(id: string): (User & { password_hash: string }) | null {
  const stmt = db.prepare('SELECT id, email, password_hash, nickname, role, preferences FROM users WHERE id = ?');
  const r = stmt.get(id) as {
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    role: string;
    preferences: string;
  } | undefined;

  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    password: '',
    password_hash: r.password_hash,
    nickname: r.nickname,
    role: r.role as 'master' | 'admin',
    preferences: r.preferences ? JSON.parse(r.preferences) : {},
  };
}

export function getUserByEmail(email: string): (User & { password_hash: string }) | null {
  const stmt = db.prepare('SELECT id, email, password_hash, nickname, role, preferences FROM users WHERE LOWER(email) = LOWER(?)');
  const r = stmt.get(email) as {
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    role: string;
    preferences: string;
  } | undefined;

  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    password: '',
    password_hash: r.password_hash,
    nickname: r.nickname,
    role: r.role as 'master' | 'admin',
    preferences: r.preferences ? JSON.parse(r.preferences) : {},
  };
}

export function createUser(email: string, password: string, nickname: string, role: 'master' | 'admin' = 'admin'): User {
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const preferences: UserPreferences = { defaultAdminProfileId: 'default' };
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, nickname, role, preferences, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, email, passwordHash, nickname, role, JSON.stringify(preferences), Date.now());

  return {
    id,
    email,
    password: '',
    nickname,
    role,
    preferences,
  };
}

export function updateUser(id: string, data: UserUpdatePayload): User | null {
  const existing = getUserById(id);
  if (!existing) return null;

  const newEmail = data.email || existing.email;
  const newNickname = data.nickname || existing.nickname;
  const newRole = data.role !== undefined ? data.role : existing.role;
  let newPasswordHash = existing.password_hash;
  if (data.password && data.password.trim()) {
    newPasswordHash = hashPassword(data.password.trim());
  }

  const mergedPreferences = {
    ...(existing.preferences || {}),
    ...(data.preferences || {}),
  };

  const stmt = db.prepare(`
    UPDATE users
    SET email = ?, password_hash = ?, nickname = ?, role = ?, preferences = ?
    WHERE id = ?
  `);
  stmt.run(newEmail, newPasswordHash, newNickname, newRole, JSON.stringify(mergedPreferences), id);

  return {
    id,
    email: newEmail,
    password: '',
    nickname: newNickname,
    role: newRole as 'master' | 'admin',
    preferences: mergedPreferences,
  };
}

export function deleteUser(id: string): boolean {
  const existing = getUserById(id);
  if (!existing || existing.role === 'master') return false;

  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);

  // Also delete personal apps owned by this user
  const deleteApps = db.prepare('DELETE FROM apps WHERE owner_id = ?');
  deleteApps.run(id);

  return true;
}

// Applications repository functions
export function getAllApps(): ApplicationLink[] {
  const stmt = db.prepare('SELECT id, name, url, description, icon_url, owner_id, type, category, is_pinned, sort_order FROM apps ORDER BY sort_order ASC, name ASC');
  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    url: string;
    description: string | null;
    icon_url: string | null;
    owner_id: string;
    type: string | null;
    category: string | null;
    is_pinned: number;
    sort_order: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    url: r.url,
    description: r.description || undefined,
    iconUrl: r.icon_url || undefined,
    ownerId: r.owner_id,
    type: (r.type as 'app' | 'youtube_video') || 'app',
    category: r.category || undefined,
    isPinned: Boolean(r.is_pinned),
  }));
}

export function saveAllApps(apps: ApplicationLink[]): ApplicationLink[] {
  // Use a transaction to replace apps cleanly
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM apps;');
    const insertStmt = db.prepare(`
      INSERT INTO apps (id, name, url, description, icon_url, owner_id, type, category, is_pinned, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    apps.forEach((app, idx) => {
      insertStmt.run(
        app.id,
        app.name,
        app.url,
        app.description || '',
        app.iconUrl || '',
        app.ownerId || 'default',
        app.type || 'app',
        app.category || '',
        app.isPinned ? 1 : 0,
        idx
      );
    });

    db.exec('COMMIT;');
    return apps;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Dashboard profiles
export function getDashboards(): DashboardProfile[] {
  const stmt = db.prepare('SELECT id, name FROM dashboards ORDER BY created_at ASC');
  const rows = stmt.all() as Array<{ id: string; name: string }>;
  return rows.map(r => ({ id: r.id, name: r.name }));
}

export function addDashboard(name: string): DashboardProfile {
  const id = `dashboard-${crypto.randomUUID()}`;
  const stmt = db.prepare('INSERT INTO dashboards (id, name, created_at) VALUES (?, ?, ?)');
  stmt.run(id, name, Date.now());
  return { id, name };
}

export function deleteDashboard(profileId: string): boolean {
  if (profileId === 'default') return false;
  const stmt = db.prepare('DELETE FROM dashboards WHERE id = ?');
  stmt.run(profileId);
  // Remove associated apps
  const deleteApps = db.prepare('DELETE FROM apps WHERE owner_id = ?');
  deleteApps.run(profileId);
  return true;
}

// Chat messages
export function getChatMessages(): ChatMessage[] {
  const stmt = db.prepare(`
    SELECT id, user_id, user_nickname, message, timestamp, recipient_id, attachment, reactions, reply_to, is_edited
    FROM chat_messages
    ORDER BY timestamp ASC
    LIMIT 200
  `);
  const rows = stmt.all() as Array<{
    id: string;
    user_id: string;
    user_nickname: string;
    message: string;
    timestamp: number;
    recipient_id: string | null;
    attachment: string | null;
    reactions: string | null;
    reply_to: string | null;
    is_edited: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    userNickname: r.user_nickname,
    message: r.message,
    timestamp: r.timestamp,
    recipientId: r.recipient_id || undefined,
    attachment: r.attachment ? JSON.parse(r.attachment) : undefined,
    reactions: r.reactions ? JSON.parse(r.reactions) : undefined,
    replyTo: r.reply_to ? JSON.parse(r.reply_to) : undefined,
    isEdited: Boolean(r.is_edited),
  }));
}

export function saveChatMessage(message: ChatMessage): void {
  const stmt = db.prepare(`
    INSERT INTO chat_messages (id, user_id, user_nickname, message, timestamp, recipient_id, attachment, reactions, reply_to, is_edited)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    message.id,
    message.userId,
    message.userNickname,
    message.message,
    message.timestamp,
    message.recipientId || null,
    message.attachment ? JSON.stringify(message.attachment) : null,
    message.reactions ? JSON.stringify(message.reactions) : '{}',
    message.replyTo ? JSON.stringify(message.replyTo) : null,
    message.isEdited ? 1 : 0
  );

  // Keep only last 300 messages to prevent excessive growth
  db.exec(`
    DELETE FROM chat_messages
    WHERE id NOT IN (
      SELECT id FROM chat_messages ORDER BY timestamp DESC LIMIT 300
    )
  `);
}

export function updateChatMessage(message: ChatMessage): void {
  const stmt = db.prepare(`
    UPDATE chat_messages
    SET message = ?, timestamp = ?, reactions = ?, is_edited = ?
    WHERE id = ?
  `);
  stmt.run(
    message.message,
    message.timestamp,
    message.reactions ? JSON.stringify(message.reactions) : '{}',
    message.isEdited ? 1 : 0,
    message.id
  );
}

export function deleteChatMessage(id: string): void {
  const stmt = db.prepare('DELETE FROM chat_messages WHERE id = ?');
  stmt.run(id);
}

// Click analytics
export function recordLinkClick(record: LinkClickRecord): void {
  const stmt = db.prepare(`
    INSERT INTO link_clicks (id, app_id, app_name, url, timestamp, user_id, user_nickname, owner_id, device_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.appId,
    record.appName,
    record.url,
    record.timestamp,
    record.userId || null,
    record.userNickname || null,
    record.ownerId || 'default',
    record.deviceType || 'desktop'
  );

  // Keep only last 5000 records
  db.exec(`
    DELETE FROM link_clicks
    WHERE id NOT IN (
      SELECT id FROM link_clicks ORDER BY timestamp DESC LIMIT 5000
    )
  `);
}

export function getLinkClicks(): LinkClickRecord[] {
  const stmt = db.prepare(`
    SELECT id, app_id, app_name, url, timestamp, user_id, user_nickname, owner_id, device_type
    FROM link_clicks
    ORDER BY timestamp DESC
    LIMIT 3000
  `);
  const rows = stmt.all() as Array<{
    id: string;
    app_id: string;
    app_name: string;
    url: string;
    timestamp: number;
    user_id: string | null;
    user_nickname: string | null;
    owner_id: string | null;
    device_type: string | null;
  }>;

  return rows.map(r => ({
    id: r.id,
    appId: r.app_id,
    appName: r.app_name,
    url: r.url,
    timestamp: r.timestamp,
    userId: r.user_id || undefined,
    userNickname: r.user_nickname || undefined,
    ownerId: r.owner_id || 'default',
    deviceType: (r.device_type as 'desktop' | 'mobile' | 'tablet') || 'desktop',
  }));
}

export function clearLinkClicks(): void {
  db.exec('DELETE FROM link_clicks;');
}

// System settings
export function getPublicDashboardId(): string {
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  const res = stmt.get('public_dashboard_id') as { value: string } | undefined;
  return res ? res.value : 'default';
}

export function setPublicDashboardId(id: string): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
  stmt.run('public_dashboard_id', id);
}

export function isTicketsMenuEnabled(): boolean {
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  const res = stmt.get('tickets_menu_enabled') as { value: string } | undefined;
  if (!res) return true;
  return res.value === '1' || res.value === 'true';
}

export function setTicketsMenuEnabled(enabled: boolean): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
  stmt.run('tickets_menu_enabled', enabled ? '1' : '0');
}

// ==========================================
// TICKETS REPOSITORY FUNCTIONS
// ==========================================

export function getAllTickets(userId?: string, isMaster?: boolean): Ticket[] {
  let query = `
    SELECT t.*, 
           (SELECT COUNT(*) FROM ticket_comments c WHERE c.ticket_id = t.id) as comments_count
    FROM tickets t
  `;
  const params: any[] = [];

  // If not master, can view their own tickets or all if requested
  if (!isMaster && userId) {
    query += ' WHERE t.creator_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY t.updated_at DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Array<{
    id: string;
    ticket_number: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    department: string;
    creator_id: string;
    creator_nickname: string;
    creator_email: string;
    assigned_to_id: string | null;
    assigned_to_nickname: string | null;
    created_at: number;
    updated_at: number;
    closed_at: number | null;
    attachments: string;
    satisfaction_rating: number | null;
    satisfaction_feedback: string | null;
    comments_count: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    ticketNumber: r.ticket_number,
    title: r.title,
    description: r.description,
    category: (r.category as any) || 'other',
    priority: (r.priority as any) || 'medium',
    status: (r.status as any) || 'open',
    department: r.department || 'Geral',
    creatorId: r.creator_id,
    creatorNickname: r.creator_nickname,
    creatorEmail: r.creator_email,
    assignedToId: r.assigned_to_id || undefined,
    assignedToNickname: r.assigned_to_nickname || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at || undefined,
    attachments: r.attachments ? JSON.parse(r.attachments) : [],
    commentsCount: r.comments_count,
    satisfactionRating: r.satisfaction_rating ?? undefined,
    satisfactionFeedback: r.satisfaction_feedback || undefined,
  }));
}

export function getTicketById(id: string): Ticket | null {
  const stmt = db.prepare(`
    SELECT t.*, 
           (SELECT COUNT(*) FROM ticket_comments c WHERE c.ticket_id = t.id) as comments_count
    FROM tickets t 
    WHERE t.id = ?
  `);
  const r = stmt.get(id) as any;
  if (!r) return null;

  return {
    id: r.id,
    ticketNumber: r.ticket_number,
    title: r.title,
    description: r.description,
    category: (r.category as any) || 'other',
    priority: (r.priority as any) || 'medium',
    status: (r.status as any) || 'open',
    department: r.department || 'Geral',
    creatorId: r.creator_id,
    creatorNickname: r.creator_nickname,
    creatorEmail: r.creator_email,
    assignedToId: r.assigned_to_id || undefined,
    assignedToNickname: r.assigned_to_nickname || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at || undefined,
    attachments: r.attachments ? JSON.parse(r.attachments) : [],
    commentsCount: r.comments_count,
    satisfactionRating: r.satisfaction_rating ?? undefined,
    satisfactionFeedback: r.satisfaction_feedback || undefined,
  };
}

export function createTicket(data: {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  department?: string;
  creatorId: string;
  creatorNickname: string;
  creatorEmail: string;
  attachments?: TicketAttachment[];
}): Ticket {
  // Determine next ticket number
  const maxNumStmt = db.prepare('SELECT MAX(ticket_number) as max_num FROM tickets');
  const res = maxNumStmt.get() as { max_num: number | null };
  const nextNum = res && res.max_num ? res.max_num + 1 : 1001;

  const id = crypto.randomUUID();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO tickets (
      id, ticket_number, title, description, category, priority, status, department,
      creator_id, creator_nickname, creator_email, assigned_to_id, assigned_to_nickname,
      created_at, updated_at, closed_at, attachments, satisfaction_rating, satisfaction_feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    nextNum,
    data.title,
    data.description,
    data.category || 'other',
    data.priority || 'medium',
    'open',
    data.department || 'Geral',
    data.creatorId,
    data.creatorNickname,
    data.creatorEmail,
    null,
    null,
    now,
    now,
    null,
    JSON.stringify(data.attachments || []),
    null,
    null
  );

  return {
    id,
    ticketNumber: nextNum,
    title: data.title,
    description: data.description,
    category: (data.category as any) || 'other',
    priority: (data.priority as any) || 'medium',
    status: 'open',
    department: data.department || 'Geral',
    creatorId: data.creatorId,
    creatorNickname: data.creatorNickname,
    creatorEmail: data.creatorEmail,
    createdAt: now,
    updatedAt: now,
    attachments: data.attachments || [],
    commentsCount: 0,
  };
}

export function updateTicket(id: string, updates: Partial<Ticket>): Ticket | null {
  const current = getTicketById(id);
  if (!current) return null;

  const now = Date.now();
  let closedAt = current.closedAt;
  if (updates.status === 'closed' || updates.status === 'resolved') {
    if (!closedAt) closedAt = now;
  } else if (updates.status) {
    closedAt = undefined;
  }

  const updated: Ticket = {
    ...current,
    ...updates,
    closedAt,
    updatedAt: now,
  };

  const stmt = db.prepare(`
    UPDATE tickets SET
      title = ?,
      description = ?,
      category = ?,
      priority = ?,
      status = ?,
      department = ?,
      assigned_to_id = ?,
      assigned_to_nickname = ?,
      updated_at = ?,
      closed_at = ?,
      satisfaction_rating = ?,
      satisfaction_feedback = ?
    WHERE id = ?
  `);

  stmt.run(
    updated.title,
    updated.description,
    updated.category,
    updated.priority,
    updated.status,
    updated.department,
    updated.assignedToId || null,
    updated.assignedToNickname || null,
    now,
    updated.closedAt || null,
    updated.satisfactionRating ?? null,
    updated.satisfactionFeedback || null,
    id
  );

  return updated;
}

export function deleteTicket(id: string): boolean {
  // Delete comments first
  db.prepare('DELETE FROM ticket_comments WHERE ticket_id = ?').run(id);
  // Delete ticket
  const stmt = db.prepare('DELETE FROM tickets WHERE id = ?');
  const res = stmt.run(id);
  return res.changes > 0;
}

export function getTicketComments(ticketId: string): TicketComment[] {
  const stmt = db.prepare(`
    SELECT * FROM ticket_comments 
    WHERE ticket_id = ? 
    ORDER BY timestamp ASC
  `);
  const rows = stmt.all(ticketId) as Array<{
    id: string;
    ticket_id: string;
    user_id: string;
    user_nickname: string;
    user_role: string;
    message: string;
    is_internal_note: number;
    attachments: string;
    timestamp: number;
  }>;

  return rows.map(r => ({
    id: r.id,
    ticketId: r.ticket_id,
    userId: r.user_id,
    userNickname: r.user_nickname,
    userRole: (r.user_role as any) || 'admin',
    message: r.message,
    isInternalNote: r.is_internal_note === 1,
    attachments: r.attachments ? JSON.parse(r.attachments) : [],
    timestamp: r.timestamp,
  }));
}

export function addTicketComment(comment: {
  ticketId: string;
  userId: string;
  userNickname: string;
  userRole?: string;
  message: string;
  isInternalNote?: boolean;
  attachments?: TicketAttachment[];
}): TicketComment {
  const id = crypto.randomUUID();
  const timestamp = Date.now();

  const stmt = db.prepare(`
    INSERT INTO ticket_comments (
      id, ticket_id, user_id, user_nickname, user_role, message, is_internal_note, attachments, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    comment.ticketId,
    comment.userId,
    comment.userNickname,
    comment.userRole || 'admin',
    comment.message,
    comment.isInternalNote ? 1 : 0,
    JSON.stringify(comment.attachments || []),
    timestamp
  );

  // Touch ticket's updated_at
  db.prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(timestamp, comment.ticketId);

  return {
    id,
    ticketId: comment.ticketId,
    userId: comment.userId,
    userNickname: comment.userNickname,
    userRole: (comment.userRole as any) || 'admin',
    message: comment.message,
    isInternalNote: comment.isInternalNote,
    attachments: comment.attachments || [],
    timestamp,
  };
}

export function deleteTicketComment(commentId: string): boolean {
  const stmt = db.prepare('DELETE FROM ticket_comments WHERE id = ?');
  const res = stmt.run(commentId);
  return res.changes > 0;
}

// ==========================================
// TICKET CONFIGURATION OPTIONS (DEPARTMENTS, CATEGORIES, PRIORITIES)
// ==========================================

export function getTicketConfig(): {
  departments: Array<{ id: string; name: string; sortOrder: number }>;
  categories: Array<{ id: string; name: string; icon: string; sortOrder: number }>;
  priorities: Array<{ id: string; name: string; level: string; color: string; sortOrder: number }>;
} {
  const depStmt = db.prepare('SELECT id, name, sort_order as sortOrder FROM ticket_departments ORDER BY sort_order ASC, name ASC');
  const catStmt = db.prepare('SELECT id, name, icon, sort_order as sortOrder FROM ticket_categories ORDER BY sort_order ASC, name ASC');
  const prioStmt = db.prepare('SELECT id, name, level, color, sort_order as sortOrder FROM ticket_priorities ORDER BY sort_order ASC, id ASC');

  return {
    departments: depStmt.all() as any[],
    categories: catStmt.all() as any[],
    priorities: prioStmt.all() as any[],
  };
}

export function addTicketDepartment(name: string): { id: string; name: string; sortOrder: number } {
  const trimmed = name.trim();
  const id = `dep-${crypto.randomUUID()}`;
  const maxOrderStmt = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as nextOrder FROM ticket_departments');
  const nextOrder = (maxOrderStmt.get() as any).nextOrder || 1;
  const insert = db.prepare('INSERT INTO ticket_departments (id, name, sort_order) VALUES (?, ?, ?)');
  insert.run(id, trimmed, nextOrder);
  return { id, name: trimmed, sortOrder: nextOrder };
}

export function updateTicketDepartment(id: string, name: string): boolean {
  const trimmed = name.trim();
  const update = db.prepare('UPDATE ticket_departments SET name = ? WHERE id = ?');
  const res = update.run(trimmed, id);
  return res.changes > 0;
}

export function deleteTicketDepartment(id: string): boolean {
  const del = db.prepare('DELETE FROM ticket_departments WHERE id = ?');
  const res = del.run(id);
  return res.changes > 0;
}

export function addTicketCategory(name: string, icon: string = '📁'): { id: string; name: string; icon: string; sortOrder: number } {
  const trimmedName = name.trim();
  const trimmedIcon = icon.trim() || '📁';
  const id = `cat-${crypto.randomUUID()}`;
  const maxOrderStmt = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as nextOrder FROM ticket_categories');
  const nextOrder = (maxOrderStmt.get() as any).nextOrder || 1;
  const insert = db.prepare('INSERT INTO ticket_categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)');
  insert.run(id, trimmedName, trimmedIcon, nextOrder);
  return { id, name: trimmedName, icon: trimmedIcon, sortOrder: nextOrder };
}

export function updateTicketCategory(id: string, name: string, icon: string = '📁'): boolean {
  const trimmedName = name.trim();
  const trimmedIcon = icon.trim() || '📁';
  const update = db.prepare('UPDATE ticket_categories SET name = ?, icon = ? WHERE id = ?');
  const res = update.run(trimmedName, trimmedIcon, id);
  return res.changes > 0;
}

export function deleteTicketCategory(id: string): boolean {
  const del = db.prepare('DELETE FROM ticket_categories WHERE id = ?');
  const res = del.run(id);
  return res.changes > 0;
}

export function addTicketPriority(name: string, color: string = 'sky'): { id: string; name: string; level: string; color: string; sortOrder: number } {
  const trimmedName = name.trim();
  const trimmedColor = color.trim() || 'sky';
  const id = `prio-${crypto.randomUUID()}`;
  const maxOrderStmt = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as nextOrder FROM ticket_priorities');
  const nextOrder = (maxOrderStmt.get() as any).nextOrder || 1;
  const insert = db.prepare('INSERT INTO ticket_priorities (id, name, level, color, sort_order) VALUES (?, ?, ?, ?, ?)');
  insert.run(id, trimmedName, id, trimmedColor, nextOrder);
  return { id, name: trimmedName, level: id, color: trimmedColor, sortOrder: nextOrder };
}

export function updateTicketPriority(id: string, name: string, color: string = 'sky'): boolean {
  const trimmedName = name.trim();
  const trimmedColor = color.trim() || 'sky';
  const update = db.prepare('UPDATE ticket_priorities SET name = ?, color = ? WHERE id = ?');
  const res = update.run(trimmedName, trimmedColor, id);
  return res.changes > 0;
}

export function deleteTicketPriority(id: string): boolean {
  const del = db.prepare('DELETE FROM ticket_priorities WHERE id = ?');
  const res = del.run(id);
  return res.changes > 0;
}


