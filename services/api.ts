import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile, UserPreferences, ChatMessage, LinkClickRecord } from '../types';

const FAKE_LATENCY = 300; // ms

// --- Constants ---
const MASTER_USER_ID = 'deio-master-user-01'; // Fixo para consistência
const DEIO_DASHBOARDS_KEY = 'deio-dashboards';
const DEIO_CHAT_MESSAGES_KEY = 'deio-chat-messages';
const DEIO_LINK_CLICKS_KEY = 'deio-link-clicks';

// This constant will be updated by the AI assistant when the user publishes changes.
const DEFAULT_PUBLIC_APPS: ApplicationLink[] = [
  {
    "id": "9391a81d-161c-4930-9c89-ffd95a081990",
    "name": "COMAF - New",
    "url": "http://192.168.0.20/sgc/public/",
    "description": "Sistema de Gerenciamento da COMAF - INTRANET NEW",
    "ownerId": "default"
  },
  {
    "id": "ae066eb5-1436-4a3f-ad86-11d284965e34",
    "name": "COMAF - Old",
    "url": "http://192.168.0.4/sgc/login.php",
    "description": "Sistema de Gerenciamento da COMAF - INTRANET OLD",
    "ownerId": "default"
  },
  {
    "id": "3562910e-9d1f-4798-a248-f7988e0070d8",
    "name": "COMAF - INTRANET",
    "url": "http://intranet.comaf.com",
    "description": "Acesso ao INTRANET",
    "ownerId": "default"
  },
  {
    "id": "86805f41-6ea4-46eb-9469-52aa0a34ee12",
    "name": "COMAF - Site",
    "url": "https://comaf.ind.br",
    "description": "Acesso ao site da COMAF Indústria Aeronáutica.",
    "ownerId": "default"
  },
  {
    "id": "5fdae6a9-989c-47a1-9e76-478a71e4fd89",
    "name": "COMAF - WebMail",
    "url": "https://webmail-seguro.com.br/comaf.ind.br",
    "description": "Acesso ao servidor de e-mails da COMAF.",
    "ownerId": "default"
  },
  {
    "id": "379ed945-0e7c-4892-8d63-2a5f078bb85d",
    "name": "COMAF - I-elitec",
    "url": "https://www.i-elitech.com/user/login",
    "description": "Site para consultar a temperatura do inflamável.",
    "ownerId": "default"
  },
  {
    "id": "f9b00c4a-731c-425e-903d-b98f205b6aa5",
    "name": "Google",
    "url": "https://www.google.com",
    "description": "Site de busca.",
    "ownerId": "default"
  },
  {
    "id": "bf42430d-ad98-4892-a661-2f60153f570e",
    "name": "Danfe - Consultar",
    "url": "https://meudanfe.com.br",
    "description": "Consulta Grátis de NF-e",
    "ownerId": "default"
  },
  {
    "id": "3563e4d1-017d-44fc-9cec-14de28bfe002",
    "name": "PartBase",
    "url": "https://www.partsbase.com",
    "description": "Consultar Part Nunber",
    "ownerId": "default"
  },
  {
    "id": "e9821a72-6a4a-4d2a-8d6b-b4a5d8e9c0f1",
    "name": "NSN Now",
    "url": "https://www.nsn-now.com/Indexing/PublicSearch.aspx",
    "description": "Consultar Part Nunber",
    "ownerId": "default"
  },
  {
    "id": "f82b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "StokeSaas",
    "url": "https://stokesaas.deioinfo.com.br",
    "description": "Sistema de Estoque",
    "ownerId": "default"
  }
];

// This constant will be updated by the AI assistant when users sync their backgrounds.
const USER_PREFERENCE_OVERRIDES: Record<string, Partial<UserPreferences>> = {
  // Example:
  // "user-id-123": { "customBackgroundUrl": "/uploads/backgrounds/user-id-123.jpg" }
};

// Helper to simulate async operations
const fakeAsync = <T>(data: T): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), FAKE_LATENCY));

// Helper for deep merging preferences
const mergePreferences = (target: any, source: any) => {
    const output = { ...target };
    if (source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = mergePreferences(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
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

// --- Data Initialization ---
const initializeData = () => {
    const savedUsers = localStorage.getItem('deio-users');
    if (!savedUsers || JSON.parse(savedUsers).length === 0) {
      const masterUser: User = {
        id: MASTER_USER_ID, // Usando o ID fixo
        email: 'deiorbo@gmail.com',
        password: 'Deio@2409',
        nickname: 'Master Admin',
        role: 'master',
        preferences: {},
      };
      localStorage.setItem('deio-users', JSON.stringify([masterUser]));
      localStorage.setItem('deio-apps', JSON.stringify(DEFAULT_PUBLIC_APPS));
      localStorage.setItem('deio-publicDashboardId', 'default');
    } else {
        // Migration logic for existing users
        const users: User[] = JSON.parse(savedUsers);
        let needsUpdate = false;
        users.forEach(user => {
            if (!user.nickname) {
                user.nickname = user.email.split('@')[0];
                needsUpdate = true;
            }
        });
        
        const masterUser = users.find((u: User) => u.email === 'deiorbo@gmail.com');
        if (masterUser && masterUser.id !== MASTER_USER_ID) {
            console.log("Migrating master user ID for consistency.");
            const oldId = masterUser.id;
            masterUser.id = MASTER_USER_ID;

            // Update apps ownerId
            const appsJson = localStorage.getItem('deio-apps');
            if (appsJson) {
                let apps = JSON.parse(appsJson);
                apps.forEach((app: ApplicationLink) => {
                    if (app.ownerId === oldId) {
                        app.ownerId = MASTER_USER_ID;
                    }
                });
                localStorage.setItem('deio-apps', JSON.stringify(apps));
            }
            needsUpdate = true;
        }

        if (needsUpdate) {
            localStorage.setItem('deio-users', JSON.stringify(users));
        }
    }

    // Always sanitize stored apps for duplicate IDs (e.g. 3563e4d1-017d-44fc-9cec-14de28bfe002)
    const appsJson = localStorage.getItem('deio-apps');
    if (appsJson) {
      try {
        const parsed = JSON.parse(appsJson);
        if (Array.isArray(parsed)) {
          const { apps: sanitizedApps, hasChanges } = ensureUniqueAppIds(parsed);
          if (hasChanges) {
            localStorage.setItem('deio-apps', JSON.stringify(sanitizedApps));
          }
        }
      } catch (err) {
        console.error("Failed to parse deio-apps in initializeData:", err);
      }
    }

    // Ensure clicks storage is strictly real data only (purge any simulated records)
    const clicksJson = localStorage.getItem(DEIO_LINK_CLICKS_KEY);
    if (!clicksJson) {
      localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify([]));
    } else {
      try {
        const parsed = JSON.parse(clicksJson);
        if (Array.isArray(parsed)) {
          const realOnly = parsed.filter((r: any) => !r.id || !/^click-\d+-/.test(r.id));
          if (realOnly.length !== parsed.length) {
            localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify(realOnly));
          }
        } else {
          localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify([]));
        }
      } catch {
        localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify([]));
      }
    }
};
initializeData();



// --- API Functions ---
export const api = {
  // --- User Functions ---
  async getUsers(): Promise<User[]> {
    const usersJson = localStorage.getItem('deio-users') || '[]';
    let users: User[] = JSON.parse(usersJson);
    // Apply server-side preference overrides
    users = users.map(u => ({
        ...u,
        preferences: mergePreferences(u.preferences || {}, USER_PREFERENCE_OVERRIDES[u.id] || {}),
    }));
    return fakeAsync(users);
  },

  async login(email: string, password: string): Promise<User | null> {
    const users = await this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const userWithPrefs = {
        ...user,
        preferences: mergePreferences(user.preferences || {}, USER_PREFERENCE_OVERRIDES[user.id] || {}),
      };
      sessionStorage.setItem('deio-currentUser', JSON.stringify(userWithPrefs));
      return fakeAsync(userWithPrefs);
    }
    return fakeAsync(null);
  },
  
  async getSession(): Promise<User | null> {
      const userJson = sessionStorage.getItem('deio-currentUser');
      if (!userJson) return fakeAsync(null);
      let user: User = JSON.parse(userJson);
      // Apply server-side preference overrides
      user.preferences = mergePreferences(user.preferences || {}, USER_PREFERENCE_OVERRIDES[user.id] || {});
      return fakeAsync(user);
  },

  async logout(): Promise<void> {
    sessionStorage.removeItem('deio-currentUser');
    return fakeAsync(undefined);
  },

  async addUser(email: string, password: string, nickname: string): Promise<{ success: boolean; user?: User; error?: string }> {
      const users = await this.getUsers();
      if (users.some(u => u.email === email)) {
          return fakeAsync({ success: false, error: 'User already exists' });
      }
      const newUser: User = { 
        id: crypto.randomUUID(), 
        email, 
        password, 
        nickname,
        role: 'admin', 
        preferences: { defaultAdminProfileId: 'default' } 
      };
      const updatedUsers = [...users, newUser];
      localStorage.setItem('deio-users', JSON.stringify(updatedUsers));
      return fakeAsync({ success: true, user: newUser });
  },

  async updateUser(id: string, data: UserUpdatePayload): Promise<User | null> {
      const usersJson = localStorage.getItem('deio-users') || '[]';
      const users: User[] = JSON.parse(usersJson);
      const userIndex = users.findIndex(u => u.id === id);
      if (userIndex === -1) {
          return fakeAsync(null);
      }
      
      if (data.email && users.some(u => u.email === data.email && u.id !== id)) {
          console.error("Update failed: email already in use.");
          return fakeAsync(null);
      }

      const originalUser = users[userIndex];
      const { preferences, ...restOfData } = data;
      
      const updatedUser = { 
        ...originalUser, 
        ...restOfData,
        preferences: mergePreferences(originalUser.preferences, preferences),
      };

      users[userIndex] = updatedUser;
      localStorage.setItem('deio-users', JSON.stringify(users));

      const sessionUserJson = sessionStorage.getItem('deio-currentUser');
      if (sessionUserJson) {
        let sessionUser = JSON.parse(sessionUserJson);
        if(sessionUser.id === id) {
           sessionUser = {
              ...sessionUser, 
              ...restOfData,
              preferences: mergePreferences(sessionUser.preferences, preferences),
           }
           sessionStorage.setItem('deio-currentUser', JSON.stringify(sessionUser));
        }
      }
      
      // Return the user with server overrides applied
      const finalUser = {
          ...updatedUser,
          preferences: mergePreferences(updatedUser.preferences, USER_PREFERENCE_OVERRIDES[id] || {}),
      };
      
      return fakeAsync(finalUser);
  },

  async deleteUser(id: string): Promise<boolean> {
      let users = await this.getUsers();
      const userToDelete = users.find(u => u.id === id);
      if (!userToDelete || userToDelete.role === 'master') {
          return fakeAsync(false);
      }
      users = users.filter(u => u.id !== id);
      localStorage.setItem('deio-users', JSON.stringify(users));
      return fakeAsync(true);
  },
  
  // --- Dashboard Config Functions ---
  async getPublicDashboardId(): Promise<string> {
    const id = localStorage.getItem('deio-publicDashboardId');
    return fakeAsync(id || 'default');
  },

  async setPublicDashboardId(id: string): Promise<void> {
    localStorage.setItem('deio-publicDashboardId', id);
    return fakeAsync(undefined);
  },

  // --- Dashboard Profile Functions ---
  async getDashboardProfiles(): Promise<DashboardProfile[]> {
    const profilesJson = localStorage.getItem(DEIO_DASHBOARDS_KEY) || '[]';
    return fakeAsync(JSON.parse(profilesJson));
  },

  async addDashboardProfile(name: string): Promise<DashboardProfile> {
    const profiles = await this.getDashboardProfiles();
    const newProfile: DashboardProfile = {
      id: `dashboard-${crypto.randomUUID()}`,
      name,
    };
    const updatedProfiles = [...profiles, newProfile];
    localStorage.setItem(DEIO_DASHBOARDS_KEY, JSON.stringify(updatedProfiles));
    return fakeAsync(newProfile);
  },

  async deleteDashboardProfile(profileId: string): Promise<boolean> {
    const users = await this.getUsers();
    // Prevent deleting essential profiles
    if (profileId === 'default' || users.some(u => u.id === profileId)) {
        console.error("Cannot delete default or user-owned dashboard profiles.");
        return fakeAsync(false);
    }
    
    let profiles = await this.getDashboardProfiles();
    if (!profiles.some(p => p.id === profileId)) {
        console.error("Dashboard profile not found.");
        return fakeAsync(false);
    }
    
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    localStorage.setItem(DEIO_DASHBOARDS_KEY, JSON.stringify(updatedProfiles));

    // Also delete all apps associated with this profile
    let allApps = await this.getApps();
    const updatedApps = allApps.filter(app => app.ownerId !== profileId);
    localStorage.setItem('deio-apps', JSON.stringify(updatedApps));
    
    return fakeAsync(true);
  },
  
  async cloneDashboard(sourceProfileId: string, newDashboardName: string): Promise<{ newProfile: DashboardProfile; newApps: ApplicationLink[] } | null> {
    const profiles = await this.getDashboardProfiles();
    const allUsers = await this.getUsers();

    if (profiles.some(p => p.name === newDashboardName) || allUsers.some(u => u.email === newDashboardName)) {
        console.error("Dashboard with this name already exists or conflicts with a user email.");
        return fakeAsync(null);
    }

    const newProfile: DashboardProfile = {
        id: `dashboard-${crypto.randomUUID()}`,
        name: newDashboardName,
    };
    const updatedProfiles = [...profiles, newProfile];
    localStorage.setItem(DEIO_DASHBOARDS_KEY, JSON.stringify(updatedProfiles));

    const allApps = await this.getApps();
    const appsToClone = allApps.filter(app => app.ownerId === sourceProfileId);
    
    const newApps = appsToClone.map(app => ({
        ...app,
        id: crypto.randomUUID(),
        ownerId: newProfile.id
    }));

    const updatedAppsList = [...allApps, ...newApps];
    localStorage.setItem('deio-apps', JSON.stringify(updatedAppsList));

    return fakeAsync({ newProfile, newApps });
  },

  // --- AppLink Functions ---
  async getApps(): Promise<ApplicationLink[]> {
      const appsJson = localStorage.getItem('deio-apps');
      if (!appsJson) {
        return fakeAsync(DEFAULT_PUBLIC_APPS);
      }
      try {
        const parsed = JSON.parse(appsJson);
        if (Array.isArray(parsed)) {
          const { apps: sanitizedApps, hasChanges } = ensureUniqueAppIds(parsed);
          if (hasChanges) {
            localStorage.setItem('deio-apps', JSON.stringify(sanitizedApps));
          }
          return fakeAsync(sanitizedApps);
        }
        return fakeAsync(DEFAULT_PUBLIC_APPS);
      } catch (error) {
        console.error("Error reading apps:", error);
        return fakeAsync(DEFAULT_PUBLIC_APPS);
      }
  },

  async saveAllApps(allApps: ApplicationLink[]): Promise<ApplicationLink[]> {
    const { apps: sanitizedApps } = ensureUniqueAppIds(allApps);
    localStorage.setItem('deio-apps', JSON.stringify(sanitizedApps));
    return fakeAsync(sanitizedApps);
  },

  // --- Chat Functions ---
  async getChatMessages(): Promise<ChatMessage[]> {
    const messagesJson = localStorage.getItem(DEIO_CHAT_MESSAGES_KEY) || '[]';
    // Let's keep only the last 50 messages to prevent storage from getting too big
    const messages: ChatMessage[] = JSON.parse(messagesJson);
    if (messages.length > 50) {
      return fakeAsync(messages.slice(messages.length - 50));
    }
    return fakeAsync(messages);
  },

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    // Keep only the last 50 messages
    const messagesToSave = messages.length > 50 ? messages.slice(messages.length - 50) : messages;
    localStorage.setItem(DEIO_CHAT_MESSAGES_KEY, JSON.stringify(messagesToSave));
    return fakeAsync(undefined);
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
      const existingJson = localStorage.getItem(DEIO_LINK_CLICKS_KEY) || '[]';
      let records: LinkClickRecord[] = JSON.parse(existingJson);
      if (!Array.isArray(records)) records = [];
      records.push(newRecord);
      if (records.length > 3000) {
        records = records.slice(records.length - 3000);
      }
      localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify(records));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('deio-link-clicked', { detail: newRecord }));
      }
    } catch (e) {
      console.error('Failed to save click record', e);
    }

    return fakeAsync(newRecord);
  },

  async getLinkClickRecords(): Promise<LinkClickRecord[]> {
    const recordsJson = localStorage.getItem(DEIO_LINK_CLICKS_KEY);
    if (!recordsJson) {
      localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify([]));
      return fakeAsync([]);
    }
    try {
      const records = JSON.parse(recordsJson);
      return fakeAsync(Array.isArray(records) ? records : []);
    } catch (e) {
      console.error('Error parsing click records', e);
      return fakeAsync([]);
    }
  },


  async clearLinkClickRecords(): Promise<void> {
    localStorage.setItem(DEIO_LINK_CLICKS_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deio-link-clicked', { detail: null }));
    }
    return fakeAsync(undefined);
  },
};

