import React, { useState, useEffect, useCallback } from 'react';
import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile, ChatMessage } from './types';
import { PublicView } from './components/PublicView';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { AboutView } from './components/AboutView';
import { TicketsView } from './components/TicketsView';
import { ChatPanel } from './components/ChatPanel';
import { QuickTasksWidget } from './components/QuickTasksWidget';
import { LogoIcon, LogoutIcon, SunIcon, MoonIcon, ChatIcon, TicketIcon } from './components/icons';
import { api } from './services/api';
import { ConfirmationModal } from './components/ConfirmationModal';
import {
  getFastFaviconUrl,
  getGoogleFaviconUrl,
  getDomainFromUrl,
  isLocalOrIntranetUrl,
  clearFaviconCache,
} from './services/favicon';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [apps, setApps] = useState<ApplicationLink[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardProfiles, setDashboardProfiles] = useState<DashboardProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'public' | 'admin' | 'auth' | 'about' | 'tickets'>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [publicDashboardId, setPublicDashboardId] = useState<string>('default');
  const [theme, setTheme] = useState<Theme>('dark');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [ticketsMenuEnabled, setTicketsMenuEnabled] = useState(true);

  // Theme Initializer
  useEffect(() => {
    const savedTheme = localStorage.getItem('deio-theme') as Theme | null;
    const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Custom Background Manager (Day and Night support)
  useEffect(() => {
    const prefs = currentUser?.preferences;
    let bgUrl: string | undefined;

    if (theme === 'dark') {
      bgUrl = prefs?.customBackgroundNightUrl || prefs?.customBackgroundUrl;
    } else {
      bgUrl = prefs?.customBackgroundDayUrl || prefs?.customBackgroundUrl;
    }

    if (bgUrl) {
      document.body.style.backgroundImage = `url(${bgUrl})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    }
  }, [currentUser, theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('deio-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setUnreadCount(0);
  };

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessionUser, allUsers, allApps, pubId, dashboards, messages, allTickets, menuEnabled] = await Promise.all([
        api.getSession(),
        api.getUsers(),
        api.getApps(),
        api.getPublicDashboardId(),
        api.getDashboardProfiles(),
        api.getChatMessages(),
        api.getTickets(true),
        api.getTicketsMenuEnabled(),
      ]);
      setCurrentUser(sessionUser);
      setUsers(allUsers);
      setApps(allApps);
      setPublicDashboardId(pubId);
      setDashboardProfiles(dashboards);
      setChatMessages(messages);
      setTicketsMenuEnabled(menuEnabled);
      const activeTickets = allTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
      setOpenTicketsCount(activeTickets.length);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!currentUser) return;

    const intervalId = setInterval(async () => {
      try {
        const [messages, currentTickets, menuEnabled] = await Promise.all([
          api.getChatMessages(),
          api.getTickets(true),
          api.getTicketsMenuEnabled(),
        ]);
        setTicketsMenuEnabled(menuEnabled);
        setChatMessages(prevMessages => {
          if (messages.length > prevMessages.length) {
            if (!isChatOpen) {
              setUnreadCount(prev => prev + (messages.length - prevMessages.length));
            }
            return messages;
          }
          if (JSON.stringify(prevMessages) !== JSON.stringify(messages)) {
            return messages;
          }
          return prevMessages;
        });

        const activeTickets = currentTickets.filter(t => t.status === 'open' || t.status === 'in_progress');
        setOpenTicketsCount(activeTickets.length);
      } catch (error) {
        console.error("Failed to poll for chat/tickets:", error);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [currentUser, isChatOpen]);


  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    const user = await api.login(email, password);
    if (user) {
      await loadInitialData(); // Reload all data after login
      setView('public');
      return true;
    }
    return false;
  };

  const handleRegister = async (email: string, password: string, nickname: string): Promise<boolean> => {
    const result = await api.addUser(email, password, nickname);
    if (result.success && result.user) {
      await loadInitialData(); // Reload all data
      setView('public');
      return true;
    }
    return false;
  };
  
  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsChatOpen(false); // Close chat on logout
    setView('public');
    setIsLogoutConfirmOpen(false);
  };

  const handleToggleTicketsMenu = async (enabled: boolean) => {
    setTicketsMenuEnabled(enabled);
    await api.setTicketsMenuEnabled(enabled);
  };

  const handleAddUser = async (email: string, password: string, nickname: string): Promise<boolean> => {
    const result = await api.addUser(email, password, nickname);
    if (result.success && result.user) {
        setUsers(prev => [...prev, result.user!]);
        return true;
    }
    return false;
  };

  const handleUpdateUser = async (id: string, data: UserUpdatePayload): Promise<User | null> => {
    const updatedUser = await api.updateUser(id, data);
    if (updatedUser) {
        setUsers(prevUsers => prevUsers.map(u => u.id === id ? updatedUser : u));
        if (currentUser?.id === id) {
            setCurrentUser(updatedUser);
        }
    }
    return updatedUser;
  };

  const handleDeleteUser = async (id: string) => {
    if (currentUser?.role === 'master' && currentUser.id !== id) {
        const success = await api.deleteUser(id);
        if (success) {
            setUsers(prev => prev.filter(u => u.id !== id));
        }
    }
  };

  const handleSaveAllApps = async (updatedApps: ApplicationLink[]) => {
    const newAppList = await api.saveAllApps(updatedApps);
    setApps(newAppList);
  };

  const handleUpdateSingleApp = async (updatedApp: ApplicationLink) => {
    const updatedList = apps.map(app => app.id === updatedApp.id ? updatedApp : app);
    await handleSaveAllApps(updatedList);
  };

  const handleAddAppFromPublic = async (newAppData: any, targetOwnerId?: string) => {
    const owner = targetOwnerId || (currentUser ? currentUser.id : publicDashboardId || 'default');
    const newApp: ApplicationLink = {
      id: crypto.randomUUID(),
      name: newAppData.name,
      url: newAppData.url,
      description: newAppData.description,
      iconUrl: newAppData.iconUrl || getFastFaviconUrl(newAppData.url, newAppData.name),
      category: newAppData.category || 'Geral',
      isPinned: !!newAppData.isPinned,
      type: newAppData.type || 'app',
      ownerId: owner,
    };
    const updatedApps = [...apps, newApp];
    await handleSaveAllApps(updatedApps);
  };

  const handleEditAppFromPublic = async (updatedApp: ApplicationLink) => {
    await handleUpdateSingleApp(updatedApp);
  };

  const handleDeleteAppFromPublic = async (appId: string) => {
    const updatedApps = apps.filter(a => a.id !== appId);
    await handleSaveAllApps(updatedApps);
  };

  const handleRefreshOriginalFavicons = async () => {
    clearFaviconCache();
    const updatedApps = apps.map(app => {
      if (app.url && !isLocalOrIntranetUrl(app.url)) {
        const domain = getDomainFromUrl(app.url);
        if (domain) {
          return {
            ...app,
            iconUrl: getGoogleFaviconUrl(domain, 128)
          };
        }
      }
      return app;
    });
    await handleSaveAllApps(updatedApps);
  };
  
  const handleSetPublicDashboard = async (id: string) => {
    await api.setPublicDashboardId(id);
    setPublicDashboardId(id);
  };

  const handleAddDashboardProfile = async (name: string): Promise<void> => {
    const newProfile = await api.addDashboardProfile(name);
    if (newProfile) {
        setDashboardProfiles(prev => [...prev, newProfile]);
    }
  };

  const handleDeleteDashboardProfile = async (profileId: string): Promise<void> => {
    const success = await api.deleteDashboardProfile(profileId);
    if (success) {
      setDashboardProfiles(prev => prev.filter(p => p.id !== profileId));
      setApps(prev => prev.filter(app => app.ownerId !== profileId));
    }
  };

  const handleCloneDashboard = async (sourceProfileId: string, newDashboardName: string): Promise<DashboardProfile | null> => {
    const result = await api.cloneDashboard(sourceProfileId, newDashboardName);
    if (result) {
        setDashboardProfiles(prev => [...prev, result.newProfile]);
        setApps(prev => [...prev, ...result.newApps]);
        return result.newProfile;
    }
    return null;
  };

  const handleSendMessage = useCallback(async (
    message: string, 
    attachment?: { name: string; type: string; dataUrl: string },
    recipientId?: string,
    replyTo?: { messageId: string; userNickname: string; message: string; }
  ) => {
    if (!currentUser) return;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      message,
      timestamp: Date.now(),
      ...(recipientId && { recipientId }),
      ...(attachment && { attachment }),
      ...(replyTo && { replyTo }),
    };
    setChatMessages(prev => [...prev, newMessage]);
    await api.saveChatMessage(newMessage);
  }, [currentUser]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== messageId));
    await api.deleteChatMessage(messageId);
  }, []);
  
  const handleEditMessage = useCallback(async (messageId: string, newMessage: string) => {
    let updatedMsg: ChatMessage | undefined;
    setChatMessages(prev =>
      prev.map(m => {
        if (m.id === messageId) {
          updatedMsg = { ...m, message: newMessage, isEdited: true, timestamp: Date.now() };
          return updatedMsg;
        }
        return m;
      })
    );
    if (updatedMsg) {
      await api.updateChatMessage(updatedMsg);
    }
  }, []);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    let targetMessage: ChatMessage | undefined;
    setChatMessages(prev =>
      prev.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          const existingReactors = reactions[emoji] || [];
          
          if (existingReactors.includes(currentUser.id)) {
            // User is removing their reaction
            reactions[emoji] = existingReactors.filter(uid => uid !== currentUser.id);
            if (reactions[emoji].length === 0) {
              delete reactions[emoji];
            }
          } else {
            // User is adding a reaction
            reactions[emoji] = [...existingReactors, currentUser.id];
          }
          targetMessage = { ...m, reactions };
          return targetMessage;
        }
        return m;
      })
    );

    if (targetMessage) {
      await api.updateChatMessage(targetMessage);
    }
  }, [currentUser]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-grow flex justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent"></div>
        </div>
      );
    }

    switch (view) {
      case 'about':
        return <AboutView />;
      case 'tickets':
        if (!ticketsMenuEnabled && currentUser?.role !== 'master') {
          return (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-card-background border border-border-color p-8 rounded-xl max-w-md shadow-xl">
                <h2 className="text-xl font-bold text-text-primary mb-2">Central de Chamados Indisponível</h2>
                <p className="text-text-secondary text-sm mb-6">
                  O menu de Chamados de TI está desativado no momento pela administração.
                </p>
                <button
                  onClick={() => setView('public')}
                  className="px-4 py-2 bg-accent text-white rounded-md text-sm font-semibold hover:bg-indigo-600 transition-colors"
                >
                  Voltar para o Início
                </button>
              </div>
            </div>
          );
        }
        return <TicketsView currentUser={currentUser} onOpenLogin={() => setView('auth')} />;
      case 'auth':
        return <Auth onLogin={handleLogin} onRegister={handleRegister} />;
      case 'admin':
        if (currentUser) {
          return (
            <AdminPanel
              apps={apps}
              onSaveAllApps={handleSaveAllApps}
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              publicDashboardId={publicDashboardId}
              onSetPublicDashboard={handleSetPublicDashboard}
              dashboardProfiles={dashboardProfiles}
              onAddDashboardProfile={handleAddDashboardProfile}
              onDeleteDashboardProfile={handleDeleteDashboardProfile}
              onCloneDashboard={handleCloneDashboard}
              ticketsMenuEnabled={ticketsMenuEnabled}
              onToggleTicketsMenu={handleToggleTicketsMenu}
            />
          );
        }
        const publicAppsFallback = apps.filter(app => app.ownerId === publicDashboardId);
        return (
          <PublicView
            apps={publicAppsFallback}
            currentUser={currentUser}
            onUpdateApp={handleUpdateSingleApp}
            onAddApp={(app) => handleAddAppFromPublic(app, publicDashboardId)}
            onEditApp={handleEditAppFromPublic}
            onDeleteApp={handleDeleteAppFromPublic}
            onRefreshOriginalFavicons={handleRefreshOriginalFavicons}
            onOpenLogin={() => setView('auth')}
          />
        );

      case 'public':
      default:
        // The dashboard to display on the Home screen ("Início")
        // If a user is logged in, show their preferred dashboard or personal workspace
        let targetDashboardId = publicDashboardId || 'default';
        if (currentUser) {
          const userDefault = currentUser.preferences?.defaultAdminProfileId;
          const userHasPersonalApps = apps.some(a => a.ownerId === currentUser.id);
          if (userDefault && userDefault !== 'default') {
            targetDashboardId = userDefault;
          } else if (currentUser.role !== 'master' && userHasPersonalApps) {
            targetDashboardId = currentUser.id;
          }
        }
        let homeApps = apps.filter(app => app.ownerId === targetDashboardId);

        // Fallback: if the target dashboard has 0 apps (e.g. newly created empty profile),
        // fallback to 'default' public apps so Início is never broken or empty.
        if (homeApps.length === 0 && targetDashboardId !== 'default') {
          const fallbackApps = apps.filter(app => app.ownerId === 'default');
          if (fallbackApps.length > 0) {
            homeApps = fallbackApps;
          }
        }

        // Ultimate fallback if state is still populating: show all available apps
        if (homeApps.length === 0 && apps.length > 0) {
          homeApps = apps;
        }

        return (
          <PublicView
            apps={homeApps}
            currentUser={currentUser}
            onUpdateApp={handleUpdateSingleApp}
            onAddApp={(app) => handleAddAppFromPublic(app, targetDashboardId)}
            onEditApp={handleEditAppFromPublic}
            onDeleteApp={handleDeleteAppFromPublic}
            onRefreshOriginalFavicons={handleRefreshOriginalFavicons}
            onOpenLogin={() => setView('auth')}
          />
        );
    }
  };


  return (
    <div className="h-screen bg-transparent text-text-primary antialiased flex flex-col">
      <header className="bg-card-background backdrop-blur-sm border-b border-border-color/50 shadow-sm sticky top-0 z-30">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 sm:h-14">
            <div className="flex items-center cursor-pointer" onClick={() => setView('public')}>
              <LogoIcon className="w-7 h-7 mr-2.5 self-center" />
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-text-primary to-accent text-transparent bg-clip-text leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">Déio Informática</span>
                <p className="text-[10px] text-text-secondary leading-none hidden sm:block">O mundo em suas mãos.</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <button onClick={() => setView('public')} className={`px-3 py-1 rounded-full text-xs font-medium ${view === 'public' && !isLoading ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-secondary hover:text-text-primary'} transition-all`}>
                Início
              </button>
              {ticketsMenuEnabled && (
                <button 
                  onClick={() => setView('tickets')} 
                  className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${view === 'tickets' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-secondary hover:text-text-primary'} transition-all`}
                  title="Central de Chamados e Suporte TI"
                >
                  <TicketIcon className="w-3.5 h-3.5" />
                  <span>Chamados TI</span>
                  {openTicketsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                      {openTicketsCount}
                    </span>
                  )}
                </button>
              )}
              {currentUser ? (
                <>
                  <button onClick={() => setView('admin')} className={`px-3 py-1 rounded-full text-xs font-medium ${view === 'admin' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-secondary hover:text-text-primary'} transition-all`}>
                    Admin
                  </button>
                  <button onClick={handleLogout} className="p-1.5 rounded-full text-text-secondary hover:bg-secondary hover:text-text-primary transition-all" title="Sair">
                    <LogoutIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => setView('auth')} className={`px-3 py-1 rounded-full text-xs font-medium ${view === 'auth' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-secondary hover:text-text-primary'} transition-all`}>
                  Login / Registro
                </button>
              )}
               <button onClick={toggleTheme} className="p-1.5 rounded-full text-text-secondary hover:bg-secondary hover:text-text-primary transition-all" title={`Mudar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}>
                {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>
      </header>
      <main className="flex-grow overflow-y-auto">
        {renderContent()}
      </main>
      <footer className="bg-card-background backdrop-blur-sm border-t border-border-color/50 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-text-secondary text-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-y-2 gap-x-4">
                <p>&copy; {new Date().getFullYear()} Déio Informática. Todos os direitos reservados.</p>
                <nav className="flex items-center gap-x-4">
                    <button onClick={() => setView('public')} className="hover:text-text-primary hover:underline transition-colors">Início</button>
                    {ticketsMenuEnabled && (
                      <>
                        <span className="text-text-secondary/50" aria-hidden="true">&bull;</span>
                        <button onClick={() => setView('tickets')} className="hover:text-text-primary hover:underline transition-colors">Chamados TI</button>
                      </>
                    )}
                    <span className="text-text-secondary/50" aria-hidden="true">&bull;</span>
                    <button onClick={() => setView('about')} className="hover:text-text-primary hover:underline transition-colors">Sobre</button>
                </nav>
            </div>
        </div>
      </footer>
      <QuickTasksWidget />
      <ConfirmationModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
        title="Confirmar Saída"
        message="Você tem certeza que deseja sair da sua conta?"
        confirmButtonText="Sair"
        confirmButtonVariant="danger"
      />
      {currentUser && !isChatOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-6 right-6 bg-accent text-white rounded-full shadow-lg p-4 z-40 hover:bg-indigo-600 transform hover:scale-110 transition-all duration-200"
          aria-label="Abrir Chat"
        >
          <ChatIcon className="w-8 h-8" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white ring-2 ring-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
      {currentUser && isChatOpen && (
        <ChatPanel 
          currentUser={currentUser} 
          messages={chatMessages}
          allUsers={users}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onReactToMessage={handleReactToMessage}
          onClose={() => setIsChatOpen(false)}
        />
       )}
    </div>
  );
};

export default App;