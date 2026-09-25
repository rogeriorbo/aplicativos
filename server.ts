import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDb,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  getAllApps,
  saveAllApps,
  getDashboards,
  addDashboard,
  deleteDashboard,
  getChatMessages,
  saveChatMessage,
  updateChatMessage,
  deleteChatMessage,
  recordLinkClick,
  getLinkClicks,
  clearLinkClicks,
  getPublicDashboardId,
  setPublicDashboardId,
  isTicketsMenuEnabled,
  setTicketsMenuEnabled,
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketComments,
  addTicketComment,
  deleteTicketComment,
  getTicketConfig,
  addTicketDepartment,
  updateTicketDepartment,
  deleteTicketDepartment,
  addTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
  addTicketPriority,
  updateTicketPriority,
  deleteTicketPriority,
} from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Initialize SQLite database
initDb();

const app = express();

// Enable CORS and JSON parser with large payload limit for custom background images
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to authenticate request
function getRequester(req: express.Request) {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) return null;
  return getUserById(userId);
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Email ou senha inválidos.' });
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Email ou senha inválidos.' });
  }

  // Do not expose password hash to client
  const { password_hash, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
});

app.get('/api/auth/session', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.json({ user: null });
  }
  const { password_hash, ...safeUser } = requester;
  return res.json({ user: safeUser });
});

app.post('/api/auth/logout', (_req, res) => {
  return res.json({ success: true });
});

// ==========================================
// USER MANAGEMENT (MASTER ADMIN ONLY)
// ==========================================
app.get('/api/users', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Master Admin pode visualizar a lista de usuários.' });
  }
  const users = getAllUsers();
  return res.json(users);
});

app.post('/api/users', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Master Admin pode adicionar novos usuários.' });
  }

  const { email, password, nickname } = req.body;
  if (!email || !password || !nickname) {
    return res.status(400).json({ error: 'Email, senha e apelido são obrigatórios.' });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Usuário com este email já existe.' });
  }

  const newUser = createUser(email, password, nickname, 'admin');
  return res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const targetId = req.params.id;
  const requester = getRequester(req);

  // Allow user to edit their own profile (nickname, background image), or Master to edit anyone
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const isSelf = requester.id === targetId;
  const isMaster = requester.role === 'master';

  if (!isSelf && !isMaster) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o próprio usuário ou o Master Admin podem alterar estes dados.' });
  }

  const updateData = req.body;
  // If non-master user, prevent role escalation
  if (!isMaster && updateData.role) {
    delete updateData.role;
  }

  const updated = updateUser(targetId, updateData);
  if (!updated) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  return res.json(updated);
});

app.delete('/api/users/:id', (req, res) => {
  const targetId = req.params.id;
  const requester = getRequester(req);

  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Master Admin pode excluir usuários.' });
  }

  if (requester.id === targetId) {
    return res.status(400).json({ error: 'O Master Admin não pode excluir a própria conta.' });
  }

  const success = deleteUser(targetId);
  if (!success) {
    return res.status(404).json({ error: 'Usuário não encontrado ou não pôde ser excluído.' });
  }

  return res.json({ success: true });
});

// ==========================================
// APPLICATIONS / SHORTCUTS (WORKSPACES)
// ==========================================
app.get('/api/apps', (_req, res) => {
  const apps = getAllApps();
  return res.json(apps);
});

app.post('/api/apps', (req, res) => {
  const apps = req.body;
  if (!Array.isArray(apps)) {
    return res.status(400).json({ error: 'Lista de aplicativos inválida.' });
  }

  try {
    const saved = saveAllApps(apps);
    return res.json(saved);
  } catch (error) {
    console.error('Error saving apps to SQLite:', error);
    return res.status(500).json({ error: 'Falha ao salvar aplicativos no banco de dados.' });
  }
});

// ==========================================
// DASHBOARD PROFILES
// ==========================================
app.get('/api/dashboards', (_req, res) => {
  const dashboards = getDashboards();
  return res.json(dashboards);
});

app.post('/api/dashboards', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas o Master Admin pode criar novos dashboards.' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do dashboard é obrigatório.' });
  }

  const profile = addDashboard(name.trim());
  return res.json(profile);
});

app.delete('/api/dashboards/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas o Master Admin pode excluir dashboards.' });
  }

  const success = deleteDashboard(req.params.id);
  return res.json({ success });
});

app.post('/api/dashboards/clone', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas o Master Admin pode clonar dashboards.' });
  }

  const { sourceProfileId, newDashboardName } = req.body;
  if (!sourceProfileId || !newDashboardName) {
    return res.status(400).json({ error: 'Parâmetros de clonagem inválidos.' });
  }

  const newProfile = addDashboard(newDashboardName.trim());
  const allApps = getAllApps();
  const sourceApps = allApps.filter(app => app.ownerId === sourceProfileId);
  const clonedApps = sourceApps.map(app => ({
    ...app,
    id: crypto.randomUUID(),
    ownerId: newProfile.id,
  }));

  saveAllApps([...allApps, ...clonedApps]);
  return res.json({ newProfile, newApps: clonedApps });
});

// ==========================================
// CHAT MESSAGES
// ==========================================
app.get('/api/chat', (_req, res) => {
  const messages = getChatMessages();
  return res.json(messages);
});

app.post('/api/chat', (req, res) => {
  const { id, userId, userNickname, message, timestamp, recipientId, attachment, reactions, replyTo } = req.body;
  if (!message && !attachment) {
    return res.status(400).json({ error: 'Mensagem ou anexo é obrigatório.' });
  }

  const newMsg = {
    id: id || crypto.randomUUID(),
    userId,
    userNickname,
    message: message || '',
    timestamp: timestamp || Date.now(),
    recipientId,
    attachment,
    reactions: reactions || {},
    replyTo,
    isEdited: false,
  };

  saveChatMessage(newMsg);
  return res.json(newMsg);
});

app.put('/api/chat/:id', (req, res) => {
  const msg = req.body;
  if (!msg || !msg.id) {
    return res.status(400).json({ error: 'Mensagem inválida.' });
  }
  updateChatMessage(msg);
  return res.json(msg);
});

app.delete('/api/chat/:id', (req, res) => {
  deleteChatMessage(req.params.id);
  return res.json({ success: true });
});

// ==========================================
// IT TICKETS & SUPPORT (CHAMADOS DE TI)
// ==========================================
app.get('/api/tickets', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Faça login para visualizar chamados.' });
  }

  const isMaster = requester.role === 'master';
  // If master, view all. If user, view their tickets unless all=true is passed
  const viewAll = req.query.all === 'true' || isMaster;
  const tickets = getAllTickets(viewAll ? undefined : requester.id, viewAll);
  return res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Faça login para abrir um chamado.' });
  }

  const { title, description, category, priority, department, attachments } = req.body;
  if (!title || !title.trim() || !description || !description.trim()) {
    return res.status(400).json({ error: 'Título e descrição do chamado são obrigatórios.' });
  }

  const newTicket = createTicket({
    title: title.trim(),
    description: description.trim(),
    category,
    priority,
    department: department?.trim() || 'Geral',
    creatorId: requester.id,
    creatorNickname: requester.nickname,
    creatorEmail: requester.email,
    attachments: attachments || [],
  });

  return res.json(newTicket);
});

app.get('/api/tickets/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Chamado não encontrado.' });
  }

  // Non-master users can only view their own tickets
  if (requester.role !== 'master' && ticket.creatorId !== requester.id) {
    return res.status(403).json({ error: 'Acesso negado a este chamado.' });
  }

  return res.json(ticket);
});

app.put('/api/tickets/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Chamado não encontrado.' });
  }

  const isMaster = requester.role === 'master';
  const isCreator = ticket.creatorId === requester.id;

  if (!isMaster && !isCreator) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const updates = req.body;
  // If not master, restrict allowed updates (e.g. can only close/reopen or submit satisfaction)
  if (!isMaster) {
    const allowed = ['status', 'satisfactionRating', 'satisfactionFeedback'];
    for (const key of Object.keys(updates)) {
      if (!allowed.includes(key)) {
        delete (updates as any)[key];
      }
    }
  }

  const updatedTicket = updateTicket(req.params.id, updates);
  return res.json(updatedTicket);
});

app.delete('/api/tickets/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas o Master Admin pode excluir chamados.' });
  }

  const success = deleteTicket(req.params.id);
  return res.json({ success });
});

app.get('/api/tickets/:id/comments', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Chamado não encontrado.' });
  }

  if (requester.role !== 'master' && ticket.creatorId !== requester.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  let comments = getTicketComments(req.params.id);
  // Hide internal notes from non-master users
  if (requester.role !== 'master') {
    comments = comments.filter(c => !c.isInternalNote);
  }

  return res.json(comments);
});

app.post('/api/tickets/:id/comments', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const ticket = getTicketById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Chamado não encontrado.' });
  }

  const isMaster = requester.role === 'master';
  if (!isMaster && ticket.creatorId !== requester.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { message, isInternalNote, attachments } = req.body;
  if (!message && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Mensagem ou anexo é obrigatório.' });
  }

  const newComment = addTicketComment({
    ticketId: req.params.id,
    userId: requester.id,
    userNickname: requester.nickname,
    userRole: requester.role,
    message: message || '',
    isInternalNote: isMaster ? !!isInternalNote : false,
    attachments: attachments || [],
  });

  // If ticket was 'waiting_user' and requester is the user, change status back to 'in_progress'
  if (ticket.status === 'waiting_user' && ticket.creatorId === requester.id) {
    updateTicket(ticket.id, { status: 'in_progress' });
  }

  return res.json(newComment);
});

app.delete('/api/tickets/:id/comments/:commentId', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  if (requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas a equipe de TI / Master Admin pode remover mensagens de chamado.' });
  }

  const success = deleteTicketComment(req.params.commentId);
  return res.json({ success });
});

// ==========================================
// TICKET CONFIGURATION (DEPARTMENTS, CATEGORIES, PRIORITIES)
// ==========================================
app.get('/api/ticket-config', (_req, res) => {
  const config = getTicketConfig();
  return res.json(config);
});

// Departments CRUD
app.post('/api/ticket-config/departments', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do setor/departamento é obrigatório.' });
  }
  try {
    const item = addTicketDepartment(name.trim());
    return res.json(item);
  } catch (err: any) {
    return res.status(400).json({ error: 'Setor com este nome já existe ou erro ao cadastrar.' });
  }
});

app.put('/api/ticket-config/departments/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do setor/departamento é obrigatório.' });
  }
  const success = updateTicketDepartment(req.params.id, name.trim());
  return res.json({ success });
});

app.delete('/api/ticket-config/departments/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const success = deleteTicketDepartment(req.params.id);
  return res.json({ success });
});

// Categories CRUD
app.post('/api/ticket-config/categories', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
  }
  try {
    const item = addTicketCategory(name.trim(), icon || '📁');
    return res.json(item);
  } catch (err: any) {
    return res.status(400).json({ error: 'Categoria com este nome já existe ou erro ao cadastrar.' });
  }
});

app.put('/api/ticket-config/categories/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
  }
  const success = updateTicketCategory(req.params.id, name.trim(), icon || '📁');
  return res.json({ success });
});

app.delete('/api/ticket-config/categories/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const success = deleteTicketCategory(req.params.id);
  return res.json({ success });
});

// Priorities CRUD
app.post('/api/ticket-config/priorities', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da urgência é obrigatório.' });
  }
  try {
    const item = addTicketPriority(name.trim(), color || 'sky');
    return res.json(item);
  } catch (err: any) {
    return res.status(400).json({ error: 'Urgência com este nome já existe ou erro ao cadastrar.' });
  }
});

app.put('/api/ticket-config/priorities/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da urgência é obrigatório.' });
  }
  const success = updateTicketPriority(req.params.id, name.trim(), color || 'sky');
  return res.json({ success });
});

app.delete('/api/ticket-config/priorities/:id', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  const success = deleteTicketPriority(req.params.id);
  return res.json({ success });
});

// ==========================================
// LINK CLICK ANALYTICS (MASTER ONLY FOR SENSITIVE STATS)
// ==========================================
app.get('/api/analytics', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Master Admin pode acessar estatísticas.' });
  }

  const records = getLinkClicks();
  return res.json(records);
});

app.post('/api/analytics/click', (req, res) => {
  const clickData = req.body;
  if (!clickData || !clickData.appId) {
    return res.status(400).json({ error: 'Dados de clique inválidos.' });
  }

  const record = {
    id: clickData.id || crypto.randomUUID(),
    appId: clickData.appId,
    appName: clickData.appName || '',
    url: clickData.url || '',
    timestamp: clickData.timestamp || Date.now(),
    userId: clickData.userId,
    userNickname: clickData.userNickname || 'Visitante',
    ownerId: clickData.ownerId || 'default',
    deviceType: clickData.deviceType || 'desktop',
  };

  recordLinkClick(record);
  return res.json(record);
});

app.delete('/api/analytics', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Master Admin pode limpar o histórico de estatísticas.' });
  }

  clearLinkClicks();
  return res.json({ success: true });
});

// ==========================================
// SYSTEM CONFIG
// ==========================================
app.get('/api/config/public-dashboard', (_req, res) => {
  const id = getPublicDashboardId();
  return res.json({ publicDashboardId: id });
});

app.post('/api/config/public-dashboard', (req, res) => {
  const requester = getRequester(req);
  if (!requester || requester.role !== 'master') {
    return res.status(403).json({ error: 'Apenas o Master Admin pode definir o dashboard público.' });
  }

  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID do dashboard é obrigatório.' });
  }

  setPublicDashboardId(id);
  return res.json({ success: true, publicDashboardId: id });
});

app.get('/api/config/tickets-menu', (_req, res) => {
  const enabled = isTicketsMenuEnabled();
  return res.json({ ticketsMenuEnabled: enabled });
});

app.post('/api/config/tickets-menu', (req, res) => {
  const requester = getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Faça login para alterar as configurações.' });
  }

  // Master or Admin can toggle the tickets menu
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'O parâmetro enabled deve ser um booleano.' });
  }

  setTicketsMenuEnabled(enabled);
  return res.json({ success: true, ticketsMenuEnabled: enabled });
});

// ==========================================
// VITE DEV MIDDLEWARE / STATIC FILES IN PROD
// ==========================================
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Déio Informática] Servidor iniciado na porta ${PORT} (${isProduction ? 'Produção' : 'Desenvolvimento'})`);
    console.log(`[Déio Informática] Banco de dados SQLite persistente ativo em ./data/deio.sqlite`);
  });
}

startServer();
