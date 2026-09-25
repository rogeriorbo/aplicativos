import React, { useState, useEffect, useCallback } from 'react';
import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile, ChatMessage } from './types';
import { PublicView } from './components/PublicView';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { AboutView } from './components/AboutView';
import { ChatPanel } from './components/ChatPanel';
import { QuickTasksWidget } from './components/QuickTasksWidget';
import { LogoIcon, LogoutIcon, SunIcon, MoonIcon, ChatIcon } from './components/icons';
import { api } from './services/api';
import { ConfirmationModal } from './components/ConfirmationModal';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [apps, setApps] = useState<ApplicationLink[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dashboardProfiles, setDashboardProfiles] = useState<DashboardProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'public' | 'admin' | 'auth' | 'about'>('public');
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [publicDashboardId, setPublicDashboardId] = useState<string>('default');
  const [theme, setTheme] = useState<Theme>('dark');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Custom Background Manager
  useEffect(() => {
    const customBgUrl = currentUser?.preferences?.customBackgroundUrl;
    if (customBgUrl) {
      document.body.style.backgroundImage = `url(${customBgUrl})`;
    } else {
      document.body.style.backgroundImage = ''; 
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
      const [sessionUser, allUsers, allApps, pubId, dashboards, messages] = await Promise.all([
        api.getSession(),
        api.getUsers(),
        api.getApps(),
        api.getPublicDashboardId(),
        api.getDashboardProfiles(),
        api.getChatMessages(),
      ]);
      setCurrentUser(sessionUser);
      setUsers(allUsers);
      setApps(allApps);
      setPublicDashboardId(pubId);
      setDashboardProfiles(dashboards);
      setChatMessages(messages);
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
        const messages = await api.getChatMessages();
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
      } catch (error) {
        console.error("Failed to poll for chat messages:", error);
      }
    }, 3000);

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

  const saveMessages = useCallback(async (newMessages: ChatMessage[]) => {
    setChatMessages(newMessages);
    await api.saveChatMessages(newMessages);
  }, []);

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
    await saveMessages([...chatMessages, newMessage]);
  }, [currentUser, chatMessages, saveMessages]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const updatedMessages = chatMessages.filter(m => m.id !== messageId);
    await saveMessages(updatedMessages);
  }, [chatMessages, saveMessages]);
  
  const handleEditMessage = useCallback(async (messageId: string, newMessage: string) => {
    const updatedMessages = chatMessages.map(m =>
      m.id === messageId ? { ...m, message: newMessage, isEdited: true, timestamp: Date.now() } : m
    );
    await saveMessages(updatedMessages);
  }, [chatMessages, saveMessages]);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    const updatedMessages = chatMessages.map(m => {
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
            return { ...m, reactions };
        }
        return m;
    });
    await saveMessages(updatedMessages);
  }, [chatMessages, currentUser, saveMessages]);

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
            />
          );
        }
        const publicAppsFallback = apps.filter(app => app.ownerId === publicDashboardId);
        return <PublicView apps={publicAppsFallback} currentUser={currentUser} onUpdateApp={handleUpdateSingleApp} />;

      case 'public':
      default:
        // The dashboard to display on the Home screen ("Início")
        // is determined by publicDashboardId (configured via Admin panel).
        const targetDashboardId = publicDashboardId || 'default';
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

        return <PublicView apps={homeApps} currentUser={currentUser} onUpdateApp={handleUpdateSingleApp} />;
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