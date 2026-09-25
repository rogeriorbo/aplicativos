import React, { useState, useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import type { ApplicationLink, User, UserUpdatePayload, DashboardProfile } from '../types';
import { AppFormModal } from './AppFormModal';
import { UserFormModal } from './UserFormModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PublishDataModal } from './PublishDataModal';
import { SyncBgModal } from './SyncBgModal';
import { EditIcon, DeleteIcon, PlusIcon, ImageIcon, DragHandleIcon, UserIcon, EyeOffIcon, EyeIcon, SpinnerIcon, CogIcon, SearchIcon, CloudUploadIcon, ChartBarIcon, StarIcon, SunIcon, MoonIcon, TicketIcon, SparklesIcon } from './icons';
import { ClickAnalyticsView } from './ClickAnalyticsView';
import { AppFavicon } from './AppFavicon';
import { TicketsView } from './TicketsView';
import {
  getGoogleFaviconUrl,
  getDomainFromUrl,
  isLocalOrIntranetUrl,
  clearFaviconCache,
} from '../services/favicon';

interface AdminPanelProps {
  apps: ApplicationLink[];
  onSaveAllApps: (apps: ApplicationLink[]) => Promise<void>;
  users: User[];
  currentUser: User;
  onAddUser: (email: string, password: string, nickname: string) => Promise<boolean>;
  onUpdateUser: (id: string, data: UserUpdatePayload) => Promise<User | null>;
  onDeleteUser: (id: string) => Promise<void>;
  publicDashboardId: string;
  onSetPublicDashboard: (id: string) => Promise<void>;
  dashboardProfiles: DashboardProfile[];
  onAddDashboardProfile: (name: string) => Promise<void>;
  onDeleteDashboardProfile: (profileId: string) => Promise<void>;
  onCloneDashboard: (sourceProfileId: string, newDashboardName: string) => Promise<DashboardProfile | null>;
  ticketsMenuEnabled?: boolean;
  onToggleTicketsMenu?: (enabled: boolean) => Promise<void>;
}

type PendingUserAction = { type: 'deleteUser'; id: string; userEmail: string; userNickname: string } | null;

interface AppsManagerProps {
  allApps: ApplicationLink[];
  onSaveAllApps: (apps: ApplicationLink[]) => Promise<void>;
  activeProfileId: string;
  currentUser: User;
  isReadOnly: boolean;
}

const AppsManager: React.FC<AppsManagerProps> = ({ allApps, onSaveAllApps, activeProfileId, currentUser, isReadOnly }) => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [currentAppToEdit, setCurrentAppToEdit] = useState<ApplicationLink | null>(null);
  const [appToDelete, setAppToDelete] = useState<ApplicationLink | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const displayedApps = useMemo(() => {
    const profileApps = allApps.filter(app => app.ownerId === activeProfileId);
    if (!searchTerm.trim()) {
        return profileApps;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return profileApps.filter(app =>
        app.name.toLowerCase().includes(lowercasedFilter) ||
        (app.description && app.description.toLowerCase().includes(lowercasedFilter))
    );
  }, [allApps, activeProfileId, searchTerm]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const prevBoundingBoxes = useRef<Record<string, DOMRect>>({});

  useLayoutEffect(() => {
    const newBoundingBoxes: Record<string, DOMRect> = {};
    displayedApps.forEach(app => {
        const el = rowRefs.current[app.id];
        if (el) newBoundingBoxes[app.id] = el.getBoundingClientRect();
    });

    if (Object.keys(prevBoundingBoxes.current).length > 0) {
      displayedApps.forEach(app => {
        const newBox = newBoundingBoxes[app.id];
        const prevBox = prevBoundingBoxes.current[app.id];
        const el = rowRefs.current[app.id];
        if (prevBox && newBox && el) {
          const deltaY = prevBox.top - newBox.top;
          if (Math.abs(deltaY) > 1) {
            requestAnimationFrame(() => {
              el.style.transform = `translateY(${deltaY}px)`;
              el.style.transition = 'transform 0s';
              requestAnimationFrame(() => {
                el.style.transform = '';
                el.style.transition = 'transform 300ms ease-in-out';
                el.addEventListener('transitionend', () => el.style.transition = '', { once: true });
              });
            });
          }
        }
      });
    }
    prevBoundingBoxes.current = newBoundingBoxes;
    const appIds = new Set(displayedApps.map(app => app.id));
    Object.keys(rowRefs.current).forEach(id => {
        if (!appIds.has(id)) {
            delete rowRefs.current[id];
            delete prevBoundingBoxes.current[id];
        }
    });
  }, [displayedApps]);

  const handleOpenAddModal = () => {
    if (isReadOnly) return;
    setCurrentAppToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (app: ApplicationLink) => {
    if (isReadOnly) return;
    setCurrentAppToEdit(app);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteConfirm = (app: ApplicationLink) => {
    if (isReadOnly) return;
    setAppToDelete(app);
  };

  const handleSaveAppFromModal = async (appFromForm: Omit<ApplicationLink, 'ownerId'> & { ownerId?: string }) => {
    let newFullAppList: ApplicationLink[];
    if (currentAppToEdit) {
        newFullAppList = allApps.map(app => app.id === appFromForm.id ? { ...app, ...appFromForm } as ApplicationLink : app);
    } else {
        const newApp: ApplicationLink = { ...appFromForm, ownerId: activeProfileId } as ApplicationLink;
        newFullAppList = [...allApps, newApp];
    }
    await onSaveAllApps(newFullAppList);
  };

  const [isRefreshingFavicons, setIsRefreshingFavicons] = useState(false);
  const [faviconSuccess, setFaviconSuccess] = useState(false);

  const handleRefreshFavicons = async () => {
    if (isReadOnly) return;
    setIsRefreshingFavicons(true);
    clearFaviconCache();
    const updatedApps = allApps.map(app => {
      if (app.ownerId === activeProfileId && app.url && !isLocalOrIntranetUrl(app.url)) {
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
    await onSaveAllApps(updatedApps);
    setIsRefreshingFavicons(false);
    setFaviconSuccess(true);
    setTimeout(() => setFaviconSuccess(false), 3000);
  };

  const handleDeleteApp = () => {
    if (!appToDelete || isReadOnly) return;
    const newFullAppList = allApps.filter(app => app.id !== appToDelete.id);
    onSaveAllApps(newFullAppList);
    setAppToDelete(null);
  };

  const handleDragStart = (index: number) => {
    if (!isReadOnly) setDraggedIndex(index);
  };
  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (!isReadOnly && index !== draggedIndex) setDragOverIndex(index);
  };
  const handleDrop = () => {
    if (isReadOnly || draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) return;
    const reorderedAppsForProfile = [...displayedApps];
    const [draggedItem] = reorderedAppsForProfile.splice(draggedIndex, 1);
    reorderedAppsForProfile.splice(dragOverIndex, 0, draggedItem);
    
    const otherProfilesApps = allApps.filter(app => app.ownerId !== activeProfileId);
    const newFullAppList = [...otherProfilesApps, ...reorderedAppsForProfile];
    onSaveAllApps(newFullAppList);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-text-primary">Conteúdo do Dashboard</h2>
           {isReadOnly && <span className="text-sm font-medium bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full mt-1 inline-block">Modo Somente Leitura</span>}
        </div>
         <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-text-secondary" />
            </div>
            <input
                type="text"
                name="search-apps"
                id="search-apps"
                className="block w-full md:w-80 pl-10 pr-3 py-2 border border-input-border rounded-md leading-5 bg-input-background text-text-primary placeholder-text-secondary focus:outline-none focus:placeholder-text-secondary focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition-colors"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
       <div className="flex items-center justify-end gap-3 mb-4 flex-wrap">
         {faviconSuccess && (
           <span className="text-xs text-emerald-400 font-medium animate-fade-in">
             ✓ Favicons originais atualizados com sucesso!
           </span>
         )}
         {!isReadOnly && (
           <>
             <button
               onClick={handleRefreshFavicons}
               disabled={isRefreshingFavicons}
               className="inline-flex items-center px-3.5 py-2 border border-slate-700 rounded-md text-sm font-medium text-text-primary bg-secondary hover:bg-slate-700 focus:outline-none transition-colors shadow-sm disabled:opacity-50"
               title="Buscar e atualizar favicons originais de todos os apps deste perfil pelo Google S2 HD"
             >
               {isRefreshingFavicons ? (
                 <SpinnerIcon className="w-4 h-4 mr-2 animate-spin text-accent" />
               ) : (
                 <SparklesIcon className="w-4 h-4 mr-2 text-accent" />
               )}
               Atualizar Favicons Originais
             </button>
             <button onClick={handleOpenAddModal} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent transition-colors">
               <PlusIcon className="w-5 h-5 mr-2" /> Adicionar App
             </button>
           </>
         )}
      </div>
      <div className="bg-card-background border border-border-color shadow-xl rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-border-color">
          <thead className="bg-secondary">
            <tr>
              <th className="w-12 px-4 py-4"><span className="sr-only">Arrastar</span></th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Ícone</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Categoria</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Link</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Descrição</th>
              <th className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="bg-card-background divide-y divide-border-color" onDragLeave={() => setDragOverIndex(null)}>
            {displayedApps.length > 0 ? displayedApps.map((app, index) => {
              return (
              <tr key={app.id ? `${app.id}-${index}` : `app-${index}`} ref={el => { if (app.id) rowRefs.current[app.id] = el; }} draggable={!isReadOnly} onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={handleDrop} onDragEnd={handleDragEnd}
                className={`relative ${!isReadOnly && 'hover:bg-background/50'} ${draggedIndex === index ? 'opacity-50 bg-background/50' : ''} ${dragOverIndex === index ? 'border-t-2 border-accent' : ''}`}>
                <td className={`px-4 py-4 text-text-secondary/50 ${!isReadOnly ? 'cursor-move hover:text-text-secondary' : 'cursor-not-allowed'}`}><DragHandleIcon /></td>
                <td className="px-6 py-4">
                  <div className="w-10 h-10 rounded-lg bg-background/50 border border-border-color/60 flex items-center justify-center overflow-hidden">
                    <AppFavicon
                      url={app.url}
                      name={app.name}
                      iconUrl={app.iconUrl}
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary align-middle">
                  <div className="flex items-center gap-1.5">
                    {app.isPinned && <StarIcon className="w-4 h-4 text-amber-400" filled />}
                    <span>{app.name}</span>
                    {app.type === 'youtube_video' && (
                      <span className="ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300">
                          YouTube
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-text-secondary align-middle">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-accent font-medium border border-slate-700">
                    {app.category || 'Geral'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent align-middle"><a href={app.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{app.url}</a></td>
                <td className="px-6 py-4 whitespace-normal text-sm text-text-secondary max-w-sm truncate align-middle">{app.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4 align-middle">
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleOpenEditModal(app)} className="text-indigo-400 hover:text-indigo-300 transition-colors" title="Editar"><EditIcon /></button>
                      <button onClick={() => handleOpenDeleteConfirm(app)} className="text-rose-400 hover:text-rose-300 transition-colors" title="Excluir"><DeleteIcon /></button>
                    </>
                  )}
                </td>
              </tr>);
            }) : (
              <tr>
                <td colSpan={7} className="text-center py-16 text-text-secondary">
                  {allApps.filter(app => app.ownerId === activeProfileId).length > 0
                      ? `Nenhum aplicativo encontrado para "${searchTerm}".`
                      : 'Nenhum aplicativo cadastrado neste dashboard.'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AppFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setCurrentAppToEdit(null);
        }}
        onSave={handleSaveAppFromModal}
        appToEdit={currentAppToEdit}
        currentUser={currentUser}
      />
      <ConfirmationModal 
        isOpen={!!appToDelete} 
        onClose={() => setAppToDelete(null)} 
        onConfirm={handleDeleteApp} 
        title="⚠️ Aviso: Confirmar Exclusão" 
        message={`Atenção: Tem certeza de que deseja excluir permanentemente o aplicativo "${appToDelete?.name}"? Esta ação removerá o atalho do dashboard e do banco de dados.`}
        confirmButtonText="Sim, Excluir App"
        confirmButtonVariant="danger"
      />
    </>
  );
};

const UsersManager: React.FC<Pick<AdminPanelProps, 'users' | 'currentUser' | 'onAddUser' | 'onUpdateUser' | 'onDeleteUser'>> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingUserAction>(null);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const handleAddUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email || !password || !nickname) {
            setError('Email, senha e apelido são obrigatórios.');
            return;
        }
        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        const added = await onAddUser(email, password, nickname);
        if (added) {
            setSuccess(`Usuário ${nickname} (${email}) adicionado com sucesso!`);
            setEmail('');
            setPassword('');
            setNickname('');
        } else {
            setError(`Usuário com o email ${email} já existe.`);
        }
    };

    const handleOpenEditModal = (user: User) => {
        setUserToEdit(user);
        setIsUserFormOpen(true);
    };

    const handleSaveUser = async (data: UserUpdatePayload) => {
        if (!userToEdit) return;
        
        const updatedUser = await onUpdateUser(userToEdit.id, data);
        if (updatedUser) {
            setIsUserFormOpen(false);
            setUserToEdit(null);
        } else {
            return Promise.reject("Failed to update user");
        }
    };

    const handleOpenDeleteConfirm = (user: User) => {
        setPendingAction({ type: 'deleteUser', id: user.id, userEmail: user.email, userNickname: user.nickname });
    };

    const handleConfirmAction = async () => {
        if (pendingAction?.type === 'deleteUser') {
            await onDeleteUser(pendingAction.id);
        }
        setPendingAction(null);
    };

    const getConfirmationModalProps = () => {
        if (pendingAction?.type === 'deleteUser') {
            return {
                title: "⚠️ Atenção: Confirmar Exclusão de Usuário",
                message: `ATENÇÃO: Esta ação é definitiva e irreversível! Você tem certeza de que deseja excluir permanentemente o usuário "${pendingAction.userNickname}" (${pendingAction.userEmail})?\n\nTodos os atalhos vinculados a esta conta, suas permissões e preferências serão removidos do banco de dados SQLite da sua VPS. Esta ação não poderá ser desfeita.`,
                confirmButtonText: "Sim, Excluir Usuário",
                confirmButtonVariant: 'danger' as const,
            };
        }
        return null;
    };
    const confirmationModalProps = getConfirmationModalProps();

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">Adicionar Novo Usuário</h2>
                    <div className="bg-card-background border border-border-color p-6 rounded-lg">
                        <form onSubmit={handleAddUserSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="new-nickname" className="block text-sm font-medium text-text-secondary mb-2">Apelido / Nome</label>
                                <input id="new-nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" required />
                            </div>
                            <div>
                                <label htmlFor="new-email" className="block text-sm font-medium text-text-secondary mb-2">Email</label>
                                <input id="new-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" required />
                            </div>
                            <div className="relative">
                                <label htmlFor="new-password"  className="block text-sm font-medium text-text-secondary mb-2">Senha</label>
                                <input id="new-password" type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-4 pr-11 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" required />
                                <button 
                                  type="button" 
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setIsPasswordVisible(!isPasswordVisible)} 
                                  className="absolute inset-y-0 right-0 top-7 pr-3 z-20 flex items-center text-text-secondary hover:text-accent transition-colors"
                                  aria-label={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                                  title={isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}
                                >
                                  <span className="sr-only">{isPasswordVisible ? "Ocultar senha" : "Ver senha (espiar)"}</span>
                                  {isPasswordVisible ? <EyeOffIcon className="w-5 h-5 text-accent" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                            {success && <p className="text-sm text-green-400 transition-opacity duration-300">{success}</p>}
                            <button type="submit" className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent">
                                <PlusIcon className="w-5 h-5 mr-2" /> Adicionar Usuário
                            </button>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-text-primary">Lista de Usuários</h2>
                        <span className="text-xs text-text-secondary bg-secondary px-3 py-1 rounded-full border border-border-color">
                            Total: <strong className="text-text-primary">{users.length}</strong> usuário(s)
                        </span>
                    </div>
                    <div className="bg-card-background border border-border-color shadow-lg rounded-lg overflow-hidden">
                        <ul className="divide-y divide-border-color">
                            {users.map(user => {
                                const isSelf = currentUser.id === user.id;
                                return (
                                    <li key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-background/50 transition-colors">
                                        <div className="flex items-center">
                                            <div className="p-2.5 rounded-full bg-secondary text-text-secondary mr-3.5 border border-border-color/60">
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-text-primary">{user.nickname}</p>
                                                    {isSelf && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                                                            Você
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-secondary">{user.email}</p>
                                                <div className="mt-1">
                                                    <span className={`px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full ${user.role === 'master' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}`}>
                                                        {user.role === 'master' ? 'Master Admin' : 'Usuário Padrão'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 self-end sm:self-center">
                                            <button 
                                                onClick={() => handleOpenEditModal(user)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all shadow-sm"
                                                title={`Editar dados do usuário ${user.nickname}`}
                                            >
                                                <EditIcon className="w-3.5 h-3.5" />
                                                <span>{isSelf ? 'Editar Meus Dados' : 'Editar'}</span>
                                            </button>

                                            {!isSelf ? (
                                                <button 
                                                    onClick={() => handleOpenDeleteConfirm(user)} 
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all shadow-sm"
                                                    title={`Excluir permanentemente ${user.nickname}`}
                                                >
                                                    <DeleteIcon className="w-3.5 h-3.5" />
                                                    <span>Excluir</span>
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-text-secondary/60 italic px-2 py-1 bg-secondary/50 rounded border border-border-color/40" title="A conta Master Admin principal não pode ser excluída">
                                                    Conta Principal
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
            {confirmationModalProps && <ConfirmationModal isOpen={!!pendingAction} onClose={() => setPendingAction(null)} onConfirm={handleConfirmAction} {...confirmationModalProps} />}
            <UserFormModal 
                isOpen={isUserFormOpen}
                onClose={() => setIsUserFormOpen(false)}
                onSave={handleSaveUser}
                userToEdit={userToEdit}
                allUsers={users}
            />
        </>
    );
};

const SettingsPanel: React.FC<Pick<AdminPanelProps, 'currentUser' | 'ticketsMenuEnabled' | 'onToggleTicketsMenu'>> = ({
    currentUser,
    ticketsMenuEnabled = true,
    onToggleTicketsMenu,
}) => {
    const [isTogglingTickets, setIsTogglingTickets] = useState(false);
    const [ticketsFeedback, setTicketsFeedback] = useState<string | null>(null);

    if (currentUser.role !== 'master') {
        return (
            <div className="p-8 text-center text-text-secondary">
                Acesso restrito ao Master Admin.
            </div>
        );
    }

    const handleTicketsToggle = async (enabled: boolean) => {
        if (!onToggleTicketsMenu || isTogglingTickets) return;
        setIsTogglingTickets(true);
        try {
            await onToggleTicketsMenu(enabled);
            setTicketsFeedback(enabled ? 'Menu de Chamados TI ativado com sucesso!' : 'Menu de Chamados TI desativado do cabeçalho e rodapé.');
            setTimeout(() => setTicketsFeedback(null), 3500);
        } catch (error) {
            console.error('Failed to toggle tickets menu:', error);
        } finally {
            setIsTogglingTickets(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-card-background p-6 rounded-lg border border-border-color shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border-color/60 gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center">
                            <TicketIcon className="w-5 h-5 mr-2 text-accent" />
                            Menu de Chamados de TI (Suporte Técnico)
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Ative ou desative o botão e menu "Chamados TI" no cabeçalho e rodapé para todos os usuários do portal.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => handleTicketsToggle(!ticketsMenuEnabled)}
                            disabled={isTogglingTickets || !onToggleTicketsMenu}
                            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                                ticketsMenuEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                            }`}
                            role="switch"
                            aria-checked={ticketsMenuEnabled}
                            title={ticketsMenuEnabled ? 'Clique para desativar o menu' : 'Clique para ativar o menu'}
                        >
                            <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    ticketsMenuEnabled ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/50 border border-border-color/70">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-lg ${ticketsMenuEnabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'}`}>
                            <TicketIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                Status do Menu:
                                {ticketsMenuEnabled ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                                        Ativado (Visível no Portal)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
                                        Desativado (Oculto no Portal)
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-secondary mt-1">
                                {ticketsMenuEnabled
                                    ? 'O atalho para a Central de Chamados de TI está ativo no cabeçalho e rodapé para todos os usuários do portal.'
                                    : 'O atalho está oculto no cabeçalho e rodapé. Usuários normais não verão a opção. Você (Master Admin) tem privilégio exclusivo de reativá-lo a qualquer momento.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleTicketsToggle(!ticketsMenuEnabled)}
                        disabled={isTogglingTickets || !onToggleTicketsMenu}
                        className={`px-4 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap shadow-sm ${
                            ticketsMenuEnabled
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        {isTogglingTickets ? 'Atualizando...' : ticketsMenuEnabled ? 'Desativar Menu' : 'Ativar Menu'}
                    </button>
                </div>

                {ticketsFeedback && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fade-in flex items-center">
                        ✓ {ticketsFeedback}
                    </div>
                )}
            </div>
        </div>
    );
};

const CustomizationPanel: React.FC<Pick<AdminPanelProps, 'currentUser' | 'onUpdateUser'>> = ({ 
    currentUser, 
    onUpdateUser,
}) => {
    const [pendingDayBg, setPendingDayBg] = useState<string | null>(null);
    const [pendingNightBg, setPendingNightBg] = useState<string | null>(null);
    const [isSavingBg, setIsSavingBg] = useState(false);
    const [bgSaveSuccess, setBgSaveSuccess] = useState(false);

    const [nickname, setNickname] = useState(currentUser.nickname);
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [nicknameSuccess, setNicknameSuccess] = useState(false);

    const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = (MAX_WIDTH / width) * height;
                    width = MAX_WIDTH;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    callback(event.target?.result as string);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                callback(dataUrl);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleDayFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processImageFile(file, (dataUrl) => {
            setPendingDayBg(dataUrl);
        });
    };

    const handleNightFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processImageFile(file, (dataUrl) => {
            setPendingNightBg(dataUrl);
        });
    };

    const currentDayBg = pendingDayBg !== null 
        ? pendingDayBg 
        : (currentUser.preferences?.customBackgroundDayUrl || currentUser.preferences?.customBackgroundUrl);

    const currentNightBg = pendingNightBg !== null 
        ? pendingNightBg 
        : (currentUser.preferences?.customBackgroundNightUrl || currentUser.preferences?.customBackgroundUrl);

    const hasPendingBgChanges = pendingDayBg !== null || pendingNightBg !== null;

    const handleSaveBackgrounds = async () => {
        setIsSavingBg(true);
        try {
            const updatedPrefs = {
                ...currentUser.preferences,
                ...(pendingDayBg !== null && { customBackgroundDayUrl: pendingDayBg || undefined }),
                ...(pendingNightBg !== null && { customBackgroundNightUrl: pendingNightBg || undefined }),
            };
            await onUpdateUser(currentUser.id, { preferences: updatedPrefs });
            setPendingDayBg(null);
            setPendingNightBg(null);
            setBgSaveSuccess(true);
            setTimeout(() => setBgSaveSuccess(false), 3500);
        } finally {
            setIsSavingBg(false);
        }
    };

    const handleRemoveDayBg = async () => {
        setIsSavingBg(true);
        try {
            const updatedPrefs = {
                ...currentUser.preferences,
                customBackgroundDayUrl: undefined,
            };
            await onUpdateUser(currentUser.id, { preferences: updatedPrefs });
            setPendingDayBg(null);
        } finally {
            setIsSavingBg(false);
        }
    };

    const handleRemoveNightBg = async () => {
        setIsSavingBg(true);
        try {
            const updatedPrefs = {
                ...currentUser.preferences,
                customBackgroundNightUrl: undefined,
            };
            await onUpdateUser(currentUser.id, { preferences: updatedPrefs });
            setPendingNightBg(null);
        } finally {
            setIsSavingBg(false);
        }
    };

    const handleSaveNickname = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim() || nickname === currentUser.nickname) return;
        setIsSavingNickname(true);
        try {
            await onUpdateUser(currentUser.id, { nickname });
            setNicknameSuccess(true);
            setTimeout(() => setNicknameSuccess(false), 3000);
        } finally {
            setIsSavingNickname(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Nickname and Profile Settings */}
            <div className="bg-card-background p-6 rounded-lg border border-border-color shadow-sm">
                <h2 className="text-xl font-bold text-text-primary mb-2 flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-accent" />
                    Configurações de Perfil
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                    Altere seu nome de exibição no sistema e no chat corporativo.
                </p>
                <form onSubmit={handleSaveNickname} className="max-w-md space-y-4">
                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-text-secondary mb-2">Apelido / Nome de Exibição</label>
                        <input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                            placeholder="Ex: Déio Master"
                            required
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={isSavingNickname || nickname === currentUser.nickname || !nickname.trim()}
                            className="px-5 py-2 rounded-md text-sm font-semibold text-white bg-accent hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors shadow-sm"
                        >
                            {isSavingNickname && <SpinnerIcon className="w-4 h-4 mr-2" />}
                            Salvar Apelido
                        </button>
                        {nicknameSuccess && (
                            <span className="text-sm text-emerald-400 font-medium animate-fade-in">
                                ✓ Apelido atualizado com sucesso!
                            </span>
                        )}
                    </div>
                </form>
            </div>



            {/* Day and Night Theme Custom Backgrounds */}
            <div className="bg-card-background p-6 rounded-lg border border-border-color shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-border-color/60 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center">
                            <ImageIcon className="w-5 h-5 mr-2 text-accent" />
                            Personalização de Fundo: Tema Dia e Noite
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Defina imagens independentes para o modo claro (Dia) e modo escuro (Noite). Salvas diretamente no banco de dados da sua VPS.
                        </p>
                    </div>

                    {hasPendingBgChanges && (
                        <button
                            onClick={handleSaveBackgrounds}
                            disabled={isSavingBg}
                            className="px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center transition-all shadow-md self-start sm:self-auto"
                        >
                            {isSavingBg ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                            {isSavingBg ? 'Salvando no Banco...' : 'Salvar Alterações de Fundo'}
                        </button>
                    )}
                </div>

                {bgSaveSuccess && (
                    <div className="mb-6 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center">
                        ✓ Imagens de Tema Dia e Noite salvas no banco de dados! Elas serão sincronizadas onde você fizer login.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* TEMA DIA (MODO CLARO) */}
                    <div className="border border-border-color/80 rounded-xl p-5 bg-background/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        <SunIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-text-primary">Tema Dia (Modo Claro)</h3>
                                        <p className="text-xs text-text-secondary">Exibido quando o modo claro está ativo</p>
                                    </div>
                                </div>
                                {currentDayBg ? (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                                        Padrão
                                    </span>
                                )}
                            </div>

                            {/* Preview Window */}
                            <div className="w-full h-44 rounded-lg bg-slate-900/60 overflow-hidden border border-border-color relative shadow-inner mb-4 flex items-center justify-center group">
                                {currentDayBg ? (
                                    <img
                                        src={currentDayBg}
                                        alt="Fundo Modo Dia"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-text-secondary/60 p-4 text-center">
                                        <SunIcon className="w-10 h-10 mb-2 opacity-40 text-amber-400" />
                                        <p className="text-xs">Nenhum fundo personalizado definido para o Tema Dia.</p>
                                    </div>
                                )}
                                {pendingDayBg && (
                                    <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow">
                                        Não salvo
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <label htmlFor="day-bg-upload" className="cursor-pointer px-4 py-2 rounded-md text-xs font-semibold text-white bg-accent hover:bg-indigo-600 transition-colors inline-flex items-center shadow-sm">
                                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                {currentDayBg ? 'Alterar Imagem do Dia' : 'Escolher Imagem do Dia'}
                                <input id="day-bg-upload" type="file" className="sr-only" accept="image/*" onChange={handleDayFileChange} />
                            </label>

                            {currentDayBg && (
                                <button
                                    onClick={handleRemoveDayBg}
                                    disabled={isSavingBg}
                                    className="px-3 py-2 rounded-md text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                    </div>

                    {/* TEMA NOITE (MODO ESCURO) */}
                    <div className="border border-border-color/80 rounded-xl p-5 bg-background/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                        <MoonIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-text-primary">Tema Noite (Modo Escuro)</h3>
                                        <p className="text-xs text-text-secondary">Exibido quando o modo escuro está ativo</p>
                                    </div>
                                </div>
                                {currentNightBg ? (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Ativo
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                                        Padrão
                                    </span>
                                )}
                            </div>

                            {/* Preview Window */}
                            <div className="w-full h-44 rounded-lg bg-slate-900/60 overflow-hidden border border-border-color relative shadow-inner mb-4 flex items-center justify-center group">
                                {currentNightBg ? (
                                    <img
                                        src={currentNightBg}
                                        alt="Fundo Modo Noite"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-text-secondary/60 p-4 text-center">
                                        <MoonIcon className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
                                        <p className="text-xs">Nenhum fundo personalizado definido para o Tema Noite.</p>
                                    </div>
                                )}
                                {pendingNightBg && (
                                    <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded shadow">
                                        Não salvo
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <label htmlFor="night-bg-upload" className="cursor-pointer px-4 py-2 rounded-md text-xs font-semibold text-white bg-accent hover:bg-indigo-600 transition-colors inline-flex items-center shadow-sm">
                                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                                {currentNightBg ? 'Alterar Imagem da Noite' : 'Escolher Imagem da Noite'}
                                <input id="night-bg-upload" type="file" className="sr-only" accept="image/*" onChange={handleNightFileChange} />
                            </label>

                            {currentNightBg && (
                                <button
                                    onClick={handleRemoveNightBg}
                                    disabled={isSavingBg}
                                    className="px-3 py-2 rounded-md text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {hasPendingBgChanges && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveBackgrounds}
                            disabled={isSavingBg}
                            className="px-6 py-2.5 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center transition-colors shadow-md"
                        >
                            {isSavingBg && <SpinnerIcon className="w-4 h-4 mr-2" />}
                            Salvar Ambos os Fundos no Banco de Dados
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { currentUser, apps, onSaveAllApps, users, publicDashboardId, onSetPublicDashboard, onUpdateUser, dashboardProfiles, onAddDashboardProfile, onDeleteDashboardProfile, onCloneDashboard } = props;
    const [activeTab, setActiveTab] = useState<'apps' | 'tickets' | 'analytics' | 'users' | 'customization'>('apps');
    
    const defaultInitialProfile = currentUser.role === 'master' ? 'default' : currentUser.id;
    const [activeProfileId, setActiveProfileId] = useState<string>(currentUser.preferences?.defaultAdminProfileId || defaultInitialProfile);
    
    const [isSavingDefault, setIsSavingDefault] = useState(false);
    const [justSavedDefault, setJustSavedDefault] = useState(false);
    
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    
    const [isNewDashboardModalOpen, setIsNewDashboardModalOpen] = useState(false);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [dashboardCreationError, setDashboardCreationError] = useState('');

    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [cloneDashboardName, setCloneDashboardName] = useState('');
    const [cloneSourceId, setCloneSourceId] = useState(activeProfileId);
    const [cloneError, setCloneError] = useState('');
    
    const [isDeleteDashboardModalOpen, setIsDeleteDashboardModalOpen] = useState(false);
    const [dashboardToDelete, setDashboardToDelete] = useState<DashboardProfile | null>(null);
    const [selectedDashboardForDeletion, setSelectedDashboardForDeletion] = useState<string>('');
    
    useEffect(() => {
        const allProfileIds = ['default', ...users.map(u => u.id), ...dashboardProfiles.map(p => p.id)];
        if (!allProfileIds.includes(activeProfileId)) {
            setActiveProfileId(currentUser.id);
        }
    }, [dashboardProfiles, users, activeProfileId, currentUser.id]);

    // Role security guard: Only Master Admin can access Analytics and Users
    useEffect(() => {
        if (currentUser.role !== 'master' && (activeTab === 'analytics' || activeTab === 'users')) {
            setActiveTab('apps');
        }
    }, [currentUser.role, activeTab]);

    const isReadOnly = currentUser.role === 'admin' && activeProfileId === 'default';

    const handleSetDefaultProfile = async () => {
        setIsSavingDefault(true);
        try {
            await onUpdateUser(currentUser.id, {
                preferences: { ...currentUser.preferences, defaultAdminProfileId: activeProfileId }
            });
            if (currentUser.role === 'master') {
                await onSetPublicDashboard(activeProfileId);
            }
            setJustSavedDefault(true);
            setTimeout(() => setJustSavedDefault(false), 3000);
        } catch (error) {
            console.error("Failed to set default profile", error);
        } finally {
            setIsSavingDefault(false);
        }
    };

    const handleCreateDashboard = async () => {
        if (!newDashboardName.trim()) {
            setDashboardCreationError('O nome do dashboard não pode ser vazio.');
            return;
        }
        setDashboardCreationError('');
        await onAddDashboardProfile(newDashboardName);
        setNewDashboardName('');
        setIsNewDashboardModalOpen(false);
    };

    const handleConfirmClone = async () => {
        if (!cloneDashboardName.trim()) {
            setCloneError('O nome do dashboard não pode ser vazio.');
            return;
        }
        const existingNames = [...dashboardProfiles.map(p => p.name), ...users.map(u => u.email)];
        if (existingNames.includes(cloneDashboardName)) {
            setCloneError('Um dashboard com este nome já existe ou conflita com um usuário.');
            return;
        }

        setCloneError('');
        const newProfile = await onCloneDashboard(cloneSourceId, cloneDashboardName);
        if (newProfile) {
            setActiveProfileId(newProfile.id);
            setIsCloneModalOpen(false);
        } else {
            setCloneError('Falha ao clonar o dashboard. O nome pode já estar em uso.');
        }
    };

    const handleOpenDeleteDashboardModal = () => {
        if (dashboardProfiles.length > 0) {
            setSelectedDashboardForDeletion(dashboardProfiles[0].id);
        } else {
            setSelectedDashboardForDeletion('');
        }
        setIsDeleteDashboardModalOpen(true);
    };

    const handleInitiateDelete = () => {
        if (!selectedDashboardForDeletion) return;
        const profile = dashboardProfiles.find(p => p.id === selectedDashboardForDeletion);
        if (profile) {
            setDashboardToDelete(profile);
            setIsDeleteDashboardModalOpen(false);
        }
    };

    const handleConfirmDeleteDashboard = async () => {
        if (!dashboardToDelete) return;
        await onDeleteDashboardProfile(dashboardToDelete.id);
        setDashboardToDelete(null);
    };

    const profileSelectorOptions = () => {
      if (currentUser.role === 'master') {
        const userOptions = users.map(user => (
              <option key={user.id} value={user.id}>
                {user.id === currentUser.id ? `Meu Dashboard (${user.nickname})` : user.nickname}
              </option>
            ));
        const customDashboardOptions = dashboardProfiles.map(profile => (
          <option key={profile.id} value={profile.id}>
            {`Dashboard: ${profile.name}`}
          </option>
        ));

        return (
          <>
            <option value="default">Dashboard Público Padrão</option>
            {customDashboardOptions.length > 0 && <optgroup label="Dashboards Personalizados">{customDashboardOptions}</optgroup>}
            <optgroup label="Dashboards de Usuários">{userOptions}</optgroup>
          </>
        );
      }
      
      // For 'admin' role
      const publicOptionText = "Dashboard Público (Somente Leitura)";
      return (
        <>
          <option value={currentUser.id}>Meu Dashboard</option>
          <option value="default">{publicOptionText}</option>
        </>
      );
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'apps':
                const currentDefault = currentUser.preferences?.defaultAdminProfileId || defaultInitialProfile;
                const hasAppsInActiveProfile = apps.some(app => app.ownerId === activeProfileId);
                const isOwnProfileSelected = activeProfileId === currentUser.id;
                const canSetAsDefault = !(isOwnProfileSelected && !hasAppsInActiveProfile);
                const isCurrentDefault = currentUser.role === 'master' 
                    ? activeProfileId === publicDashboardId 
                    : activeProfileId === currentDefault;

                return (
                     <div className="space-y-8">
                        <div className="bg-card-background p-6 rounded-lg border border-border-color">
                            <h3 className="text-xl font-bold text-text-primary mb-4">Gerenciar Dashboards</h3>
                            <div className="mb-6">
                                <label htmlFor="profile-selector" className="block text-sm font-medium text-text-secondary mb-2 leading-relaxed">
                                    Selecione um dashboard para editar seu conteúdo:
                                </label>
                                <div className="flex flex-wrap items-center gap-4">
                                    <select 
                                        id="profile-selector" 
                                        value={activeProfileId} 
                                        onChange={e => setActiveProfileId(e.target.value)}
                                        className="w-full md:w-auto flex-grow px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                    >
                                        {profileSelectorOptions()}
                                    </select>
                                    {currentUser.role === 'master' && (
                                      <>
                                        <button
                                            onClick={() => {
                                                setNewDashboardName('');
                                                setDashboardCreationError('');
                                                setIsNewDashboardModalOpen(true);
                                            }}
                                            className="px-4 py-2 rounded-md text-sm font-semibold text-text-primary bg-secondary hover:bg-background/50 border border-border-color transition-colors flex items-center whitespace-nowrap"
                                        >
                                            <PlusIcon className="w-4 h-4 mr-2" />
                                            Criar Novo Dashboard
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCloneDashboardName('');
                                                setCloneSourceId(activeProfileId);
                                                setCloneError('');
                                                setIsCloneModalOpen(true);
                                            }}
                                            className="px-4 py-2 rounded-md text-sm font-semibold text-text-primary bg-secondary hover:bg-background/50 border border-border-color transition-colors flex items-center whitespace-nowrap"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            Clonar Dashboard
                                        </button>
                                         <button
                                            onClick={handleOpenDeleteDashboardModal}
                                            disabled={dashboardProfiles.length === 0}
                                            className="px-4 py-2 rounded-md text-sm font-semibold text-text-primary bg-rose-500/80 hover:bg-rose-600 border border-rose-500/50 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap"
                                            title={dashboardProfiles.length === 0 ? "Nenhum dashboard personalizado para excluir" : "Excluir um dashboard personalizado"}
                                          >
                                            <DeleteIcon className="w-4 h-4 mr-2" />
                                            Excluir Dashboard
                                        </button>
                                      </>
                                    )}
                                     <button
                                        onClick={handleSetDefaultProfile}
                                        disabled={isSavingDefault || !canSetAsDefault}
                                        className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition-all flex items-center whitespace-nowrap shadow-sm ${
                                            justSavedDefault || isCurrentDefault
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-accent/80 hover:bg-accent disabled:bg-slate-500 disabled:cursor-not-allowed'
                                        }`}
                                        title={!canSetAsDefault ? "Adicione pelo menos um aplicativo para definir como padrão." : "Definir este dashboard como padrão do sistema e tela inicial."}
                                    >
                                        {isSavingDefault ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                                        {isSavingDefault 
                                            ? 'Salvando...' 
                                            : justSavedDefault 
                                            ? '✓ Definido como Padrão!' 
                                            : isCurrentDefault 
                                            ? '✓ Padrão Atual' 
                                            : 'Definir como Padrão'}
                                    </button>
                                    {isCurrentDefault && (
                                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            Atualmente ativo no Início
                                        </span>
                                    )}
                                    {currentUser.role === 'master' && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsPublishModalOpen(true)}
                                                disabled={activeProfileId !== 'default'}
                                                className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap min-w-[170px] justify-center"
                                                title={activeProfileId !== 'default' ? "Selecione o Dashboard Público Padrão para publicar" : "Publicar as alterações para todos os visitantes"}
                                            >
                                                <CloudUploadIcon className="w-5 h-5 mr-2" /> Publicar no Site
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <AppsManager
                                allApps={apps}
                                onSaveAllApps={onSaveAllApps}
                                activeProfileId={activeProfileId}
                                currentUser={currentUser}
                                isReadOnly={isReadOnly}
                            />
                        </div>
                    </div>
                );
            case 'analytics':
                if (currentUser.role !== 'master') return null;
                return (
                    <ClickAnalyticsView
                        apps={apps}
                        dashboardProfiles={dashboardProfiles}
                        currentUser={currentUser}
                    />
                );
            case 'users':
                 if (currentUser.role === 'master') return <UsersManager {...props} />;
                 return null;
            case 'customization':
                 return <CustomizationPanel {...props} />;
            case 'settings':
                 if (currentUser.role !== 'master') return null;
                 return <SettingsPanel currentUser={currentUser} ticketsMenuEnabled={props.ticketsMenuEnabled} onToggleTicketsMenu={props.onToggleTicketsMenu} />;
            case 'tickets':
                 return (
                     <div className="space-y-4">
                         {props.ticketsMenuEnabled === false && (
                             <div className="p-4 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                                 <div className="flex items-center gap-2.5">
                                     <span className="text-lg">ℹ️</span>
                                     <span>O menu <strong>Chamados TI</strong> está atualmente <strong>desativado</strong> no cabeçalho do portal. Você tem acesso administrativo exclusivo através desta aba.</span>
                                 </div>
                                 {props.onToggleTicketsMenu && (
                                     <button
                                         onClick={() => props.onToggleTicketsMenu!(true)}
                                         className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs whitespace-nowrap transition-colors shadow-sm flex items-center gap-1.5"
                                     >
                                         <TicketIcon className="w-3.5 h-3.5" />
                                         Ativar Menu no Cabeçalho
                                     </button>
                                 )}
                             </div>
                         )}
                         <TicketsView currentUser={currentUser} />
                     </div>
                 );
            default:
                 return null;
        }
    };


    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-3xl font-bold text-text-primary mb-4">Painel de Administração</h1>
            <p className="text-text-secondary mb-8">Bem-vindo, <span className="font-semibold text-accent">{currentUser.nickname}</span> {currentUser.role === 'master' ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ml-2">Master Admin</span> : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 ml-2">Usuário</span>}.</p>

            <div className="border-b border-border-color mb-8">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('apps')} className={`${activeTab === 'apps' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                        <ImageIcon className="w-4 h-4 mr-2" /> Aplicativos
                    </button>
                    {(props.ticketsMenuEnabled !== false || currentUser.role === 'master') && (
                        <button onClick={() => setActiveTab('tickets')} className={`${activeTab === 'tickets' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                            <TicketIcon className="w-4 h-4 mr-2" /> Chamados TI
                            {props.ticketsMenuEnabled === false && currentUser.role === 'master' && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Menu Oculto
                                </span>
                            )}
                        </button>
                    )}
                    {currentUser.role === 'master' && (
                        <button onClick={() => setActiveTab('analytics')} className={`${activeTab === 'analytics' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                            <ChartBarIcon className="w-4 h-4 mr-2" /> Estatísticas & Cliques
                        </button>
                    )}
                    {currentUser.role === 'master' && (
                        <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                            <UserIcon className="w-4 h-4 mr-2" /> Usuários
                        </button>
                    )}
                    <button onClick={() => setActiveTab('customization')} className={`${activeTab === 'customization' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                        <CogIcon className="w-4 h-4 mr-2" /> Personalização
                    </button>
                    {currentUser.role === 'master' && (
                        <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
                            <CogIcon className="w-4 h-4 mr-2" /> Configurações
                        </button>
                    )}
                </nav>
            </div>

            <div>
                {renderTabContent()}
            </div>
            
            {isPublishModalOpen && <PublishDataModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} allApps={apps} />}

            {isNewDashboardModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
                <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all scale-95 opacity-0 animate-fade-in-scale border border-border-color">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">Criar Novo Dashboard</h2>
                    <p className="text-text-secondary mb-6">Dê um nome ao novo dashboard. Ele estará disponível para seleção no gerenciador.</p>
                    <div>
                    <label htmlFor="dashboard-name" className="block text-sm font-medium text-text-secondary mb-2">Nome do Dashboard</label>
                    <input
                        type="text"
                        id="dashboard-name"
                        value={newDashboardName}
                        onChange={(e) => setNewDashboardName(e.target.value)}
                        className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Ex: Projetos Internos"
                    />
                    {dashboardCreationError && <p className="text-red-400 text-sm mt-2">{dashboardCreationError}</p>}
                    </div>
                    <div className="flex justify-end space-x-4 mt-8">
                    <button
                        onClick={() => setIsNewDashboardModalOpen(false)}
                        className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-slate-500 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreateDashboard}
                        className="px-6 py-2 rounded-md text-white font-semibold bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent transition-colors"
                    >
                        Criar
                    </button>
                    </div>
                    <style>{`
                    @keyframes fade-in-scale {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                    `}</style>
                </div>
                </div>
            )}
            {isCloneModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
                <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-lg mx-4 transform transition-all scale-95 opacity-0 animate-fade-in-scale border border-border-color">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">Clonar Dashboard</h2>
                    <p className="text-text-secondary mb-6">Crie uma cópia de um dashboard existente com um novo nome.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="clone-source-dashboard" className="block text-sm font-medium text-text-secondary mb-2">Dashboard de Origem (para clonar)</label>
                            <select
                                id="clone-source-dashboard"
                                value={cloneSourceId}
                                onChange={(e) => setCloneSourceId(e.target.value)}
                                className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                {profileSelectorOptions()}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="clone-dashboard-name" className="block text-sm font-medium text-text-secondary mb-2">Nome do Novo Dashboard</label>
                            <input
                                type="text"
                                id="clone-dashboard-name"
                                value={cloneDashboardName}
                                onChange={(e) => setCloneDashboardName(e.target.value)}
                                className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="Ex: Cópia - Projetos Internos"
                            />
                            {cloneError && <p className="text-red-400 text-sm mt-2">{cloneError}</p>}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 mt-8">
                    <button
                        onClick={() => setIsCloneModalOpen(false)}
                        className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-slate-500 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmClone}
                        className="px-6 py-2 rounded-md text-white font-semibold bg-accent hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary focus:ring-accent transition-colors"
                    >
                        Clonar
                    </button>
                    </div>
                    <style>{`
                    @keyframes fade-in-scale {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .animate-fade-in-scale { animation: fade-in-scale 0.3s forwards cubic-bezier(0.16, 1, 0.3, 1); }
                    `}</style>
                </div>
                </div>
            )}
             {isDeleteDashboardModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
                    <div className="bg-card-background rounded-lg shadow-2xl p-8 w-full max-w-md mx-4 border border-border-color">
                        <h2 className="text-2xl font-bold text-text-primary mb-4">Excluir Dashboard</h2>
                        <p className="text-text-secondary mb-6">Selecione o dashboard personalizado que deseja excluir. Esta ação removerá o dashboard e todos os aplicativos associados a ele.</p>
                        <div>
                            <label htmlFor="delete-dashboard-selector" className="block text-sm font-medium text-text-secondary mb-2">Dashboard para Excluir</label>
                            <select
                                id="delete-dashboard-selector"
                                value={selectedDashboardForDeletion}
                                onChange={(e) => setSelectedDashboardForDeletion(e.target.value)}
                                className="w-full px-4 py-2 bg-input-background border border-input-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                {dashboardProfiles.map(profile => (
                                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-4 mt-8">
                            <button onClick={() => setIsDeleteDashboardModalOpen(false)} className="px-6 py-2 rounded-md text-text-primary bg-slate-600 hover:bg-slate-700">Cancelar</button>
                            <button onClick={handleInitiateDelete} disabled={!selectedDashboardForDeletion} className="px-6 py-2 rounded-md text-white font-semibold bg-rose-600 hover:bg-rose-700 disabled:bg-slate-500">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmationModal 
                isOpen={!!dashboardToDelete} 
                onClose={() => setDashboardToDelete(null)} 
                onConfirm={handleConfirmDeleteDashboard} 
                title="Confirmar Exclusão de Dashboard" 
                message={`Tem certeza que deseja excluir o dashboard "${dashboardToDelete?.name}" e todos os seus aplicativos? Esta ação não pode ser desfeita.`}
                confirmButtonText="Excluir Permanentemente"
                confirmButtonVariant="danger"
            />
        </div>
    );
};