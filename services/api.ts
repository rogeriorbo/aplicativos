import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile, ChatMessage, LinkClickRecord, Ticket, TicketComment, TicketAttachment, TicketConfigOptions, TicketDepartmentOption, TicketCategoryOption, TicketPriorityOption } from '../types';

const getStoredSessionUser = (): User | null => {
  try {
    const raw = sessionStorage.getItem('deio-currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const user = getStoredSessionUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.id) {
    headers['x-user-id'] = user.id;
  }
  if (user?.role) {
    headers['x-user-role'] = user.role;
  }
  return headers;
};

// Helper to ensure all application links have unique IDs and resolve known duplicates & dead iconUrls
export const ensureUniqueAppIds = (apps: ApplicationLink[]): { apps: ApplicationLink[], hasChanges: boolean } => {
  const seenIds = new Set<string>();
  let hasChanges = false;
  const uniqueApps = apps.map((app, index) => {
    let currentId = app.id;
    let iconUrl = app.iconUrl;

    // Purge dead hanging server URLs
    if (iconUrl && iconUrl.includes('aplicativos.deioinfo.com.br')) {
      iconUrl = undefined;
      hasChanges = true;
    }

    if (!currentId || seenIds.has(currentId)) {
      hasChanges = true;
      if (app.name === 'NSN Now') {
        currentId = 'e9821a72-6a4a-4d2a-8d6b-b4a5d8e9c0f1';
      } else if (app.name === 'StokeSaas') {
        currentId = 'f82b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
      } else if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        currentId = crypto.randomUUID();
      } else {
        currentId = `app-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;
      }

      while (seenIds.has(currentId)) {
        currentId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `app-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;
      }
      return { ...app, id: currentId, iconUrl };
    }
    seenIds.add(currentId);
    return iconUrl !== app.iconUrl ? { ...app, iconUrl } : app;
  });
  return { apps: uniqueApps, hasChanges };
};

export const api = {
  // --- User & Auth Functions ---
  async login(email: string, password: string): Promise<User | null> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      if (data.success && data.user) {
        sessionStorage.setItem('deio-currentUser', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (err) {
      console.error('Login network error:', err);
      return null;
    }
  },

  async getSession(): Promise<User | null> {
    const cachedUser = getStoredSessionUser();
    if (!cachedUser) return null;

    try {
      const res = await fetch('/api/auth/session', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          sessionStorage.setItem('deio-currentUser', JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch {
      // Return cached user if network temporarily down
    }
    return cachedUser;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore
    } finally {
      sessionStorage.removeItem('deio-currentUser');
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
    return [];
  },

  async addUser(email: string, password: string, nickname: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao adicionar usuário' };
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  },

  async updateUser(id: string, data: UserUpdatePayload): Promise<User | null> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        const current = getStoredSessionUser();
        if (current && current.id === id) {
          sessionStorage.setItem('deio-currentUser', JSON.stringify(updated));
        }
        return updated;
      }
    } catch (err) {
      console.error('Error updating user:', err);
    }
    return null;
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting user:', err);
      return false;
    }
  },

  // --- Dashboard Config Functions ---
  async getPublicDashboardId(): Promise<string> {
    try {
      const res = await fetch('/api/config/public-dashboard');
      if (res.ok) {
        const data = await res.json();
        return data.publicDashboardId || 'default';
      }
    } catch {
      // Ignore
    }
    return 'default';
  },

  async setPublicDashboardId(id: string): Promise<void> {
    try {
      await fetch('/api/config/public-dashboard', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Error setting public dashboard ID:', err);
    }
  },

  async getTicketsMenuEnabled(): Promise<boolean> {
    try {
      const res = await fetch('/api/config/tickets-menu');
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.ticketsMenuEnabled);
      }
    } catch (err) {
      console.error('Error getting tickets menu enabled state:', err);
    }
    return true;
  },

  async setTicketsMenuEnabled(enabled: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/config/tickets-menu', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.ticketsMenuEnabled);
      }
    } catch (err) {
      console.error('Error setting tickets menu enabled state:', err);
    }
    return enabled;
  },

  // --- Dashboard Profile Functions ---
  async getDashboardProfiles(): Promise<DashboardProfile[]> {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error getting dashboard profiles:', err);
    }
    return [];
  },

  async addDashboardProfile(name: string): Promise<DashboardProfile | null> {
    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error adding dashboard profile:', err);
    }
    return null;
  },

  async deleteDashboardProfile(profileId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/dashboards/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting dashboard profile:', err);
      return false;
    }
  },

  async cloneDashboard(sourceProfileId: string, newDashboardName: string): Promise<{ newProfile: DashboardProfile; newApps: ApplicationLink[] } | null> {
    try {
      const res = await fetch('/api/dashboards/clone', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sourceProfileId, newDashboardName }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error cloning dashboard:', err);
    }
    return null;
  },

  // --- AppLink Functions ---
  async getApps(): Promise<ApplicationLink[]> {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const apps = await res.json();
        const { apps: sanitized } = ensureUniqueAppIds(apps);
        return sanitized;
      }
    } catch (err) {
      console.error('Error getting apps from server:', err);
    }
    return [];
  },

  async saveAllApps(allApps: ApplicationLink[]): Promise<ApplicationLink[]> {
    const { apps: sanitizedApps } = ensureUniqueAppIds(allApps);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(sanitizedApps),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error saving apps to server:', err);
    }
    return sanitizedApps;
  },

  // --- Chat Functions ---
  async getChatMessages(): Promise<ChatMessage[]> {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
    return [];
  },

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    // If the latest message needs saving
    const latest = messages[messages.length - 1];
    if (latest) {
      await this.saveChatMessage(latest);
    }
  },

  async saveChatMessage(message: ChatMessage): Promise<ChatMessage | null> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(message),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error saving chat message:', err);
    }
    return null;
  },

  async updateChatMessage(message: ChatMessage): Promise<void> {
    try {
      await fetch(`/api/chat/${encodeURIComponent(message.id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(message),
      });
    } catch (err) {
      console.error('Error updating chat message:', err);
    }
  },

  async deleteChatMessage(messageId: string): Promise<void> {
    try {
      await fetch(`/api/chat/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error('Error deleting chat message:', err);
    }
  },

  // --- Link Click Analytics Functions ---
  async recordLinkClick(
    appId: string,
    appName: string,
    url: string,
    ownerId: string = 'default',
    user?: { id: string; nickname: string } | null
  ): Promise<LinkClickRecord> {
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
    const isTablet = typeof navigator !== 'undefined' && /Tablet|iPad/i.test(navigator.userAgent);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    const newRecord: LinkClickRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `click-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      appId,
      appName,
      url,
      ownerId,
      timestamp: Date.now(),
      userId: user?.id,
      userNickname: user?.nickname || 'Visitante',
      deviceType,
    };

    try {
      fetch('/api/analytics/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      }).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('deio-link-clicked', { detail: newRecord }));
      }
    } catch (e) {
      console.error('Failed to record click:', e);
    }

    return newRecord;
  },

  async getLinkClickRecords(): Promise<LinkClickRecord[]> {
    try {
      const res = await fetch('/api/analytics', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error getting link click records:', err);
    }
    return [];
  },

  async clearLinkClickRecords(): Promise<void> {
    try {
      await fetch('/api/analytics', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('deio-link-clicked', { detail: null }));
      }
    } catch (err) {
      console.error('Error clearing click records:', err);
    }
  },

  // --- IT Tickets & Support API ---
  async getTickets(all: boolean = false): Promise<Ticket[]> {
    try {
      const res = await fetch(`/api/tickets${all ? '?all=true' : ''}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
    return [];
  },

  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
    }
    return null;
  },

  async createTicket(data: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
    department?: string;
    attachments?: TicketAttachment[];
  }): Promise<Ticket | null> {
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
    }
    return null;
  },

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | null> {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error updating ticket:', err);
    }
    return null;
  },

  async deleteTicket(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting ticket:', err);
      return false;
    }
  },

  async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching ticket comments:', err);
    }
    return [];
  },

  async addTicketComment(
    ticketId: string,
    message: string,
    attachments?: TicketAttachment[],
    isInternalNote?: boolean
  ): Promise<TicketComment | null> {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, attachments, isInternalNote }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error adding ticket comment:', err);
    }
    return null;
  },

  async deleteTicketComment(ticketId: string, commentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting ticket comment:', err);
      return false;
    }
  },

  // --- Ticket Configuration (Departments, Categories, Priorities) ---
  async getTicketConfig(): Promise<TicketConfigOptions> {
    try {
      const res = await fetch('/api/ticket-config');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error fetching ticket config:', err);
    }
    return { departments: [], categories: [], priorities: [] };
  },

  async addTicketDepartment(name: string): Promise<TicketDepartmentOption | null> {
    try {
      const res = await fetch('/api/ticket-config/departments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error adding ticket department:', err);
    }
    return null;
  },

  async updateTicketDepartment(id: string, name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/departments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating ticket department:', err);
      return false;
    }
  },

  async deleteTicketDepartment(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/departments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting ticket department:', err);
      return false;
    }
  },

  async addTicketCategory(name: string, icon: string = '📁'): Promise<TicketCategoryOption | null> {
    try {
      const res = await fetch('/api/ticket-config/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, icon }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error adding ticket category:', err);
    }
    return null;
  },

  async updateTicketCategory(id: string, name: string, icon: string = '📁'): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/categories/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, icon }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating ticket category:', err);
      return false;
    }
  },

  async deleteTicketCategory(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting ticket category:', err);
      return false;
    }
  },

  async addTicketPriority(name: string, color: string = 'sky'): Promise<TicketPriorityOption | null> {
    try {
      const res = await fetch('/api/ticket-config/priorities', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error adding ticket priority:', err);
    }
    return null;
  },

  async updateTicketPriority(id: string, name: string, color: string = 'sky'): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/priorities/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, color }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error updating ticket priority:', err);
      return false;
    }
  },

  async deleteTicketPriority(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ticket-config/priorities/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting ticket priority:', err);
      return false;
    }
  },
};
