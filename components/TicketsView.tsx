import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Ticket, TicketComment, TicketAttachment, TicketStatus, TicketPriority, TicketCategory, TicketDepartmentOption, TicketCategoryOption, TicketPriorityOption } from '../types';
import { api } from '../services/api';
import { 
  TicketIcon, 
  PlusIcon, 
  SearchIcon, 
  PaperclipIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  DeleteIcon, 
  SpinnerIcon, 
  UserIcon,
  StarIcon
} from './icons';
import { ConfirmationModal } from './ConfirmationModal';
import { TicketFieldsModal } from './TicketFieldsModal';

interface TicketsViewProps {
  currentUser: User | null;
  onOpenLogin?: () => void;
}

const CATEGORY_LABELS: Record<TicketCategory, { label: string; icon: string }> = {
  hardware: { label: 'Hardware / Equipamento', icon: '💻' },
  software: { label: 'Software / Sistemas', icon: '⚙️' },
  network: { label: 'Rede / Internet', icon: '🌐' },
  access: { label: 'Acesso / E-mail / Senha', icon: '🔑' },
  printer: { label: 'Impressora / Periféricos', icon: '🖨️' },
  other: { label: 'Outros Assuntos', icon: '📁' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; badgeClass: string }> = {
  urgent: { label: 'Crítica / Urgente', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  high: { label: 'Alta', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  medium: { label: 'Média', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  low: { label: 'Baixa', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; colorClass: string; dotClass: string }> = {
  open: { label: 'Aberto', colorClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dotClass: 'bg-blue-400' },
  in_progress: { label: 'Em Andamento', colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dotClass: 'bg-amber-400' },
  waiting_user: { label: 'Aguardando Usuário', colorClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30', dotClass: 'bg-purple-400' },
  resolved: { label: 'Resolvido', colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dotClass: 'bg-emerald-400' },
  closed: { label: 'Fechado', colorClass: 'bg-slate-700/50 text-slate-400 border-slate-600', dotClass: 'bg-slate-400' },
};

const DEPARTMENTS = [
  'Geral',
  'Administrativo / RH',
  'Financeiro / Fiscal',
  'Operações / Produção',
  'Logística / Estoque',
  'Vendas / Comercial',
  'Diretoria',
  'TI / Suporte'
];

export const TicketsView: React.FC<TicketsViewProps> = ({ currentUser, onOpenLogin }) => {
  const isMaster = currentUser?.role === 'master';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Real-time comments
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<TicketAttachment[]>([]);
  const [isSendingComment, setIsSendingComment] = useState(false);

  // Dynamic ticket fields (departments, categories, priorities)
  const [departments, setDepartments] = useState<TicketDepartmentOption[]>([]);
  const [categories, setCategories] = useState<TicketCategoryOption[]>([]);
  const [priorities, setPriorities] = useState<TicketPriorityOption[]>([]);
  const [isFieldsModalOpen, setIsFieldsModalOpen] = useState(false);
  const [fieldsModalTab, setFieldsModalTab] = useState<'departments' | 'categories' | 'priorities'>('departments');

  // New ticket modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('Geral');
  const [newCategory, setNewCategory] = useState<TicketCategory>('software');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachments, setNewAttachments] = useState<TicketAttachment[]>([]);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createError, setCreateError] = useState('');

  // Fetch ticket configuration options
  const fetchTicketConfig = useCallback(async () => {
    try {
      const cfg = await api.getTicketConfig();
      if (cfg.departments && cfg.departments.length > 0) {
        setDepartments(cfg.departments);
        setNewDepartment(prev => cfg.departments.some(d => d.name === prev) ? prev : cfg.departments[0].name);
      }
      if (cfg.categories && cfg.categories.length > 0) {
        setCategories(cfg.categories);
        setNewCategory(prev => cfg.categories.some(c => c.name === prev) ? prev : cfg.categories[0].name);
      }
      if (cfg.priorities && cfg.priorities.length > 0) {
        setPriorities(cfg.priorities);
        setNewPriority(prev => cfg.priorities.some(p => p.name === prev) ? prev : cfg.priorities[0].name);
      }
    } catch (e) {
      console.error('Error fetching ticket config:', e);
    }
  }, []);

  const getCategoryInfo = (catVal: string) => {
    const found = categories.find(c => c.name.toLowerCase() === catVal?.toLowerCase() || c.id === catVal);
    if (found) {
      return { label: found.name, icon: found.icon || '📁' };
    }
    return (CATEGORY_LABELS as any)[catVal] || { label: catVal || 'Geral', icon: '📁' };
  };

  const getPriorityInfo = (prioVal: string) => {
    const found = priorities.find(p => p.name.toLowerCase() === prioVal?.toLowerCase() || p.level === prioVal || p.id === prioVal);
    if (found) {
      const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        sky: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
      return { label: found.name, badgeClass: colorMap[found.color] || colorMap.sky };
    }
    return (PRIORITY_CONFIG as any)[prioVal] || { label: prioVal || 'Média', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TicketCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all');

  // Rating modal/state
  const [satisfactionRating, setSatisfactionRating] = useState<number>(5);
  const [satisfactionFeedback, setSatisfactionFeedback] = useState<string>('');
  const [isSavingRating, setIsSavingRating] = useState(false);

  // Preview Image Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Ticket to delete
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getTickets(true);
      setTickets(data);
    } catch (e) {
      console.error('Error fetching tickets:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTicketConfig();
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    fetchTickets().finally(() => setIsLoading(false));

    // Polling tickets list every 5 seconds for live status changes
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [currentUser, fetchTickets, fetchTicketConfig]);

  // Load ticket details and comments when a ticket is selected
  const fetchComments = useCallback(async (ticketId: string) => {
    try {
      const [ticketData, commentsData] = await Promise.all([
        api.getTicket(ticketId),
        api.getTicketComments(ticketId)
      ]);
      if (ticketData) {
        setSelectedTicket(ticketData);
      }
      setComments(commentsData);
    } catch (e) {
      console.error('Error loading comments:', e);
    }
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      setComments([]);
      return;
    }

    setIsLoadingComments(true);
    fetchComments(selectedTicketId).finally(() => setIsLoadingComments(false));

    // Poll current ticket thread every 3 seconds for live chat
    const interval = setInterval(() => {
      fetchComments(selectedTicketId);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTicketId, fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  // Handle file uploads (converts file to dataUrl with preview)
  const handleFiles = (files: FileList | File[], targetSetter: React.Dispatch<React.SetStateAction<TicketAttachment[]>>) => {
    Array.from(files).forEach(file => {
      // Limit file size (5MB per file for VPS efficiency)
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite máximo recomendado de 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        targetSetter(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Support pasting screenshots from clipboard (Ctrl+V)
  const handlePasteEvent = (e: React.ClipboardEvent, targetSetter: React.Dispatch<React.SetStateAction<TicketAttachment[]>>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFiles([file], targetSetter);
        }
      }
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      setCreateError('Por favor, informe o título e a descrição do chamado.');
      return;
    }

    setIsCreatingTicket(true);
    setCreateError('');

    try {
      const created = await api.createTicket({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        priority: newPriority,
        department: newDepartment,
        attachments: newAttachments,
      });

      if (created) {
        setTickets(prev => [created, ...prev]);
        setIsNewModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewAttachments([]);
        setSelectedTicketId(created.id);
      }
    } catch (err: any) {
      setCreateError('Erro ao registrar chamado. Tente novamente.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, { status: newStatus });
      if (updated) {
        setSelectedTicket(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error changing ticket status:', e);
    }
  };

  const handlePriorityChange = async (newPriorityVal: TicketPriority) => {
    if (!selectedTicket || !isMaster) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, { priority: newPriorityVal });
      if (updated) {
        setSelectedTicket(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error updating priority:', e);
    }
  };

  const handleAssignTechnician = async (techNickname: string) => {
    if (!selectedTicket || !isMaster || !currentUser) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, {
        assignedToId: currentUser.id,
        assignedToNickname: techNickname,
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      });
      if (updated) {
        setSelectedTicket(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error assigning technician:', e);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!newCommentText.trim() && commentAttachments.length === 0)) return;

    setIsSendingComment(true);
    try {
      const comment = await api.addTicketComment(
        selectedTicket.id,
        newCommentText.trim(),
        commentAttachments,
        isMaster ? isInternalNote : false
      );

      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewCommentText('');
        setCommentAttachments([]);
        setIsInternalNote(false);
        // Refresh ticket header
        fetchComments(selectedTicket.id);
      }
    } catch (e) {
      console.error('Error adding comment:', e);
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleApplyTemplate = (text: string) => {
    setNewCommentText(text);
  };

  const handleSaveSatisfaction = async () => {
    if (!selectedTicket) return;
    setIsSavingRating(true);
    try {
      const updated = await api.updateTicket(selectedTicket.id, {
        satisfactionRating,
        satisfactionFeedback: satisfactionFeedback.trim(),
      });
      if (updated) {
        setSelectedTicket(updated);
        setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (e) {
      console.error('Error saving satisfaction:', e);
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleDeleteTicketConfirm = async () => {
    if (!ticketToDelete) return;
    try {
      await api.deleteTicket(ticketToDelete.id);
      setTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
      if (selectedTicketId === ticketToDelete.id) {
        setSelectedTicketId(null);
      }
      setTicketToDelete(null);
    } catch (e) {
      console.error('Error deleting ticket:', e);
    }
  };

  // KPI Calculations
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    waitingUser: tickets.filter(t => t.status === 'waiting_user').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(ticket => {
    if (scopeFilter === 'mine' && currentUser && ticket.creatorId !== currentUser.id) {
      return false;
    }
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all') {
      const matchPrio = ticket.priority.toLowerCase() === priorityFilter.toLowerCase();
      if (!matchPrio) return false;
    }
    if (categoryFilter !== 'all') {
      const matchCat = ticket.category.toLowerCase() === categoryFilter.toLowerCase();
      if (!matchCat) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNum = `#${ticket.ticketNumber}`.includes(term);
      const matchTitle = ticket.title.toLowerCase().includes(term);
      const matchDesc = ticket.description.toLowerCase().includes(term);
      const matchCreator = ticket.creatorNickname.toLowerCase().includes(term);
      const matchDept = ticket.department.toLowerCase().includes(term);
      if (!matchNum && !matchTitle && !matchDesc && !matchCreator && !matchDept) {
        return false;
      }
    }
    return true;
  });

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="p-4 bg-accent/10 rounded-2xl w-20 h-20 mx-auto flex items-center justify-center text-accent mb-6">
          <TicketIcon className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-3">Central de Chamados & Suporte TI</h2>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Para solicitar suporte técnico, acompanhar chamados em andamento ou interagir com o departamento de TI em tempo real, faça login com a sua conta.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-6 py-3 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-indigo-600 transition-all shadow-lg"
        >
          Fazer Login no Sistema
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-120px)] flex flex-col">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border-color/60 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TicketIcon className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                Central de Chamados TI
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary">
                Atendimento, controle de tickets e suporte técnico em tempo real para toda a empresa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { setFieldsModalTab('departments'); setIsFieldsModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-text-primary bg-secondary/80 hover:bg-secondary border border-border-color transition-all shadow-sm active:scale-95"
            title="Adicionar, editar e excluir Setores, Categorias e Níveis de Urgência"
          >
            <span>⚙️ Gerenciar Opções</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-accent to-indigo-600 hover:from-indigo-600 hover:to-accent transition-all shadow-md hover:shadow-indigo-500/20 active:scale-95"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Novo Chamado</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
        <div 
          onClick={() => setStatusFilter('all')} 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-secondary/90 border-accent shadow-sm ring-1 ring-accent' : 'bg-card-background border-border-color hover:bg-secondary/40'}`}
        >
          <p className="text-xs text-text-secondary font-medium">Total de Chamados</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{stats.total}</p>
        </div>
        <div 
          onClick={() => setStatusFilter('open')} 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'open' ? 'bg-blue-500/10 border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-card-background border-border-color hover:bg-secondary/40'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-400 font-medium">Abertos (Novos)</p>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          </div>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.open}</p>
        </div>
        <div 
          onClick={() => setStatusFilter('in_progress')} 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'in_progress' ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500' : 'bg-card-background border-border-color hover:bg-secondary/40'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-400 font-medium">Em Andamento</p>
            <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.inProgress}</p>
        </div>
        <div 
          onClick={() => setStatusFilter('waiting_user')} 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'waiting_user' ? 'bg-purple-500/10 border-purple-500 shadow-sm ring-1 ring-purple-500' : 'bg-card-background border-border-color hover:bg-secondary/40'}`}
        >
          <p className="text-xs text-purple-400 font-medium">Aguardando Usuário</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{stats.waitingUser}</p>
        </div>
        <div 
          onClick={() => setStatusFilter('resolved')} 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${statusFilter === 'resolved' ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-1 ring-emerald-500' : 'bg-card-background border-border-color hover:bg-secondary/40'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-400 font-medium">Resolvidos / Fechados</p>
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.resolved}</p>
        </div>
      </div>

      {/* Main Grid: Ticket List (Left) & Ticket Detail / Chat (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start">
        
        {/* LEFT COLUMN: List & Filters */}
        <div className={`space-y-4 ${selectedTicketId ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {/* Filter Bar */}
          <div className="bg-card-background p-4 rounded-xl border border-border-color space-y-3">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por #, título, setor, solicitante..."
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Scope filter (All vs Mine) */}
              {isMaster && (
                <div className="flex rounded-lg bg-secondary/80 p-0.5 border border-border-color text-xs">
                  <button
                    onClick={() => setScopeFilter('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${scopeFilter === 'all' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Todos da Empresa
                  </button>
                  <button
                    onClick={() => setScopeFilter('mine')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${scopeFilter === 'mine' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    Meus Chamados
                  </button>
                </div>
              )}

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-input-background border border-input-border rounded-md text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">Todas as Prioridades</option>
                {priorities.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-input-background border border-input-border rounded-md text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.icon || '📁'} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ticket List Items */}
          <div className="space-y-2.5 max-h-[calc(100vh-330px)] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-12 text-center text-text-secondary">
                <SpinnerIcon className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-sm">Carregando chamados...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-10 bg-card-background rounded-xl border border-dashed border-border-color text-center">
                <TicketIcon className="w-8 h-8 text-text-secondary mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-text-primary">Nenhum chamado encontrado</p>
                <p className="text-xs text-text-secondary mt-1">Ajuste os filtros ou crie um novo chamado de TI.</p>
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const isSelected = selectedTicketId === ticket.id;
                const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                const priorityInfo = getPriorityInfo(ticket.priority);
                const categoryInfo = getCategoryInfo(ticket.category);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-secondary border-accent shadow-md ring-1 ring-accent'
                        : 'bg-card-background border-border-color hover:border-slate-500 hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                          #{ticket.ticketNumber}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${statusInfo.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityInfo.badgeClass}`}>
                        {priorityInfo.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-text-primary line-clamp-1 mb-1">
                      {ticket.title}
                    </h3>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-text-secondary pt-2 border-t border-border-color/40">
                      <div className="flex items-center gap-2">
                        <span title={categoryInfo.label}>{categoryInfo.icon}</span>
                        <span className="font-medium text-text-primary/90">{ticket.creatorNickname}</span>
                        <span className="text-text-secondary/60">•</span>
                        <span>{ticket.department}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-text-secondary" title={`${ticket.attachments.length} anexo(s)`}>
                            <PaperclipIcon className="w-3.5 h-3.5" />
                            <span>{ticket.attachments.length}</span>
                          </span>
                        )}
                        <span>{new Date(ticket.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Ticket Detailed View & Live Interaction */}
        {selectedTicketId && selectedTicket && (
          <div className="lg:col-span-7 bg-card-background rounded-2xl border border-border-color shadow-lg overflow-hidden flex flex-col h-[calc(100vh-230px)] sticky top-20">
            {/* Header / Actions */}
            <div className="p-4 sm:p-5 border-b border-border-color bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-accent bg-accent/15 px-2.5 py-1 rounded-md border border-accent/20">
                  #{selectedTicket.ticketNumber}
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-text-primary leading-tight line-clamp-1">
                    {selectedTicket.title}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Aberto por <strong className="text-text-primary font-semibold">{selectedTicket.creatorNickname}</strong> ({selectedTicket.creatorEmail}) • Setor: {selectedTicket.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Status Switcher (Available to TI or user) */}
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent ${STATUS_CONFIG[selectedTicket.status].colorClass} bg-card-background`}
                >
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="waiting_user">Aguardando Usuário</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </select>

                {isMaster && (
                  <button
                    onClick={() => setTicketToDelete(selectedTicket)}
                    className="p-1.5 rounded-md text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Excluir Chamado Permanentemente"
                  >
                    <DeleteIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="p-1.5 rounded-md text-text-secondary hover:bg-secondary transition-colors"
                  title="Fechar Painel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Ticket Info & Metadata Bar */}
            <div className="px-5 py-3 border-b border-border-color/60 bg-background/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-text-secondary">
                  <span>{getCategoryInfo(selectedTicket.category).icon}</span>
                  <span className="font-medium text-text-primary">{getCategoryInfo(selectedTicket.category).label}</span>
                </span>
                <span className="text-border-color">|</span>
                
                {isMaster ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-secondary">Prioridade:</span>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded border focus:outline-none ${getPriorityInfo(selectedTicket.priority).badgeClass} bg-transparent`}
                    >
                      {priorities.map(p => (
                        <option key={p.id} value={p.name} className="bg-card-background text-text-primary">{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className={`px-2 py-0.5 rounded font-semibold border ${getPriorityInfo(selectedTicket.priority).badgeClass}`}>
                    Prioridade: {getPriorityInfo(selectedTicket.priority).label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.assignedToNickname ? (
                  <span className="text-text-secondary">
                    Técnico Responsável: <strong className="text-emerald-400 font-semibold">{selectedTicket.assignedToNickname}</strong>
                  </span>
                ) : (
                  isMaster ? (
                    <button
                      onClick={() => handleAssignTechnician(currentUser.nickname)}
                      className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-semibold transition-all"
                    >
                      Assumir Chamado
                    </button>
                  ) : (
                    <span className="text-text-secondary italic">Aguardando atribuição do TI</span>
                  )
                )}
              </div>
            </div>

            {/* Scrollable Chat & Ticket Details */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Original Ticket Description Card */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border-color space-y-3">
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <DocumentTextIcon className="w-4 h-4 text-accent" />
                    Descrição do Chamado
                  </span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>

                {/* Attachments list for original ticket */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="pt-3 border-t border-border-color/60">
                    <p className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                      <PaperclipIcon className="w-3.5 h-3.5" />
                      Anexos ({selectedTicket.attachments.length}):
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedTicket.attachments.map(att => {
                        const isImage = att.type.startsWith('image/');
                        return (
                          <div 
                            key={att.id}
                            className="group relative border border-border-color rounded-lg overflow-hidden bg-background p-1.5 flex items-center gap-2 text-xs"
                          >
                            {isImage ? (
                              <img 
                                src={att.dataUrl} 
                                alt={att.name} 
                                onClick={() => setPreviewImage(att.dataUrl)}
                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity" 
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-text-secondary font-bold text-[10px]">
                                PDF/DOC
                              </div>
                            )}
                            <div className="max-w-[120px]">
                              <p className="truncate font-medium text-text-primary">{att.name}</p>
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="text-[10px] text-accent hover:underline"
                              >
                                Baixar Arquivo
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status resolved banner / Satisfaction rating */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-bold">Chamado Finalizado pelo TI</span>
                    </div>
                    {selectedTicket.closedAt && (
                      <span className="text-xs opacity-75">
                        Resolvido em {new Date(selectedTicket.closedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {/* Customer Rating Box */}
                  <div className="pt-2 border-t border-emerald-500/20">
                    <p className="text-xs font-semibold mb-2">Avaliação do Atendimento:</p>
                    {selectedTicket.satisfactionRating ? (
                      <div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIcon
                              key={star}
                              className={`w-4 h-4 ${star <= (selectedTicket.satisfactionRating || 0) ? 'text-amber-400' : 'text-slate-600'}`}
                            />
                          ))}
                          <span className="ml-2 text-xs font-semibold">({selectedTicket.satisfactionRating}/5)</span>
                        </div>
                        {selectedTicket.satisfactionFeedback && (
                          <p className="text-xs mt-1.5 italic text-emerald-200">
                            &quot;{selectedTicket.satisfactionFeedback}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setSatisfactionRating(star)}
                              className="focus:outline-none hover:scale-125 transition-transform"
                            >
                              <StarIcon
                                className={`w-5 h-5 ${star <= satisfactionRating ? 'text-amber-400' : 'text-slate-600'}`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-xs font-semibold">{satisfactionRating} de 5 estrelas</span>
                        </div>
                        <input
                          type="text"
                          value={satisfactionFeedback}
                          onChange={(e) => setSatisfactionFeedback(e.target.value)}
                          placeholder="Deixe um comentário sobre o atendimento (opcional)..."
                          className="w-full px-3 py-1.5 bg-input-background border border-emerald-500/30 rounded text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                        <button
                          onClick={handleSaveSatisfaction}
                          disabled={isSavingRating}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-all"
                        >
                          {isSavingRating ? 'Enviando...' : 'Confirmar Avaliação'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments / Atendimento Thread */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-text-secondary pb-1 border-b border-border-color/40">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">Interações & Mensagens</span>
                  <span>{comments.length} mensagem(ns)</span>
                </div>

                {isLoadingComments ? (
                  <div className="py-6 text-center text-text-secondary">
                    <SpinnerIcon className="w-5 h-5 mx-auto mb-1 text-accent" />
                    <span className="text-xs">Carregando conversa...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-6 text-center text-text-secondary text-xs italic">
                    Nenhuma mensagem registrada ainda. Envie a primeira mensagem abaixo.
                  </div>
                ) : (
                  comments.map(c => {
                    const isSelf = c.userId === currentUser.id;
                    const isTech = c.userRole === 'master';

                    return (
                      <div
                        key={c.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-text-secondary">
                          <span className="font-semibold text-text-primary">{c.userNickname}</span>
                          {isTech && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/30">
                              TI
                            </span>
                          )}
                          <span>{new Date(c.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${
                            c.isInternalNote
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                              : isSelf
                              ? 'bg-accent text-white rounded-tr-none'
                              : 'bg-secondary text-text-primary rounded-tl-none border border-border-color'
                          }`}
                        >
                          {c.isInternalNote && (
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              🔒 Nota Interna de TI (visível apenas para a equipe)
                            </p>
                          )}

                          <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>

                          {/* Attachments inside comment */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                              {c.attachments.map(att => {
                                const isImg = att.type.startsWith('image/');
                                return (
                                  <div key={att.id} className="relative group">
                                    {isImg ? (
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        onClick={() => setPreviewImage(att.dataUrl)}
                                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-90 border border-white/30"
                                      />
                                    ) : (
                                      <a
                                        href={att.dataUrl}
                                        download={att.name}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/30 hover:bg-black/40 text-xs"
                                      >
                                        <PaperclipIcon className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[100px]">{att.name}</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>
            </div>

            {/* Quick Response Templates (For TI / Master Admin) */}
            {isMaster && (
              <div className="px-4 py-2 bg-secondary/20 border-t border-border-color/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-text-secondary whitespace-nowrap font-medium mr-1">Respostas Rápidas TI:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Chamado recebido pela equipe de TI. Estamos analisando o caso.')}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-accent hover:text-white transition-colors whitespace-nowrap text-text-primary border border-border-color/60"
                >
                  Recebido / Analisando
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Por favor, reinicie a estação de trabalho e efetue um novo teste.')}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-accent hover:text-white transition-colors whitespace-nowrap text-text-primary border border-border-color/60"
                >
                  Pedir Reinicialização
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Acesso liberado com sucesso. Poderia verificar se o sistema abre normalmente?')}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-accent hover:text-white transition-colors whitespace-nowrap text-text-primary border border-border-color/60"
                >
                  Acesso Liberado
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('Problema solucionado pela equipe técnica de TI. Chamado pronto para validação.')}
                  className="px-2.5 py-1 rounded-full bg-secondary hover:bg-accent hover:text-white transition-colors whitespace-nowrap text-text-primary border border-border-color/60"
                >
                  Solucionado
                </button>
              </div>
            )}

            {/* Comment Form Input */}
            <form onSubmit={handleSendComment} className="p-3 sm:p-4 border-t border-border-color bg-card-background space-y-2.5">
              {/* Attachments preview before sending */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {commentAttachments.map(att => (
                    <div key={att.id} className="relative group bg-secondary px-2.5 py-1 rounded-md border border-border-color flex items-center gap-1.5 text-xs text-text-primary">
                      <PaperclipIcon className="w-3.5 h-3.5 text-accent" />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setCommentAttachments(prev => prev.filter(a => a.id !== att.id))}
                        className="text-rose-400 hover:text-rose-300 ml-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onPaste={(e) => handlePasteEvent(e, setCommentAttachments)}
                  placeholder="Escreva uma resposta ou tire um Print Screen (Ctrl+V) para anexar..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-input-background border border-input-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary bg-secondary hover:bg-secondary/80 border border-border-color transition-colors">
                    <PaperclipIcon className="w-3.5 h-3.5 text-accent" />
                    <span>Anexar Imagem / Doc</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && handleFiles(e.target.files, setCommentAttachments)}
                      className="sr-only"
                    />
                  </label>

                  {isMaster && (
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded border-input-border text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-amber-400 font-medium">Nota Interna (Apenas TI)</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSendingComment || (!newCommentText.trim() && commentAttachments.length === 0)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isSendingComment && <SpinnerIcon className="w-4 h-4" />}
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* NEW TICKET MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="bg-card-background border border-border-color rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-border-color mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent/15 text-accent">
                  <TicketIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Abrir Novo Chamado de TI</h2>
                  <p className="text-xs text-text-secondary">Descreva sua solicitação ou problema detalhadamente.</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Assunto / Título do Chamado *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Impressora Zebra não imprime etiquetas no setor expedição"
                  className="w-full px-4 py-2.5 bg-input-background border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Setor / Departamento
                    </label>
                    <button
                      type="button"
                      onClick={() => { setFieldsModalTab('departments'); setIsFieldsModalOpen(true); }}
                      className="text-[10px] text-accent hover:underline font-medium flex items-center gap-0.5"
                      title="Adicionar, editar ou excluir setores"
                    >
                      <span>⚙️ Opções</span>
                    </button>
                  </div>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Categoria do Problema
                    </label>
                    <button
                      type="button"
                      onClick={() => { setFieldsModalTab('categories'); setIsFieldsModalOpen(true); }}
                      className="text-[10px] text-accent hover:underline font-medium flex items-center gap-0.5"
                      title="Adicionar, editar ou excluir categorias"
                    >
                      <span>⚙️ Opções</span>
                    </button>
                  </div>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.icon || '📁'} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-text-secondary">
                      Nível de Urgência
                    </label>
                    <button
                      type="button"
                      onClick={() => { setFieldsModalTab('priorities'); setIsFieldsModalOpen(true); }}
                      className="text-[10px] text-accent hover:underline font-medium flex items-center gap-0.5"
                      title="Adicionar, editar ou excluir níveis de urgência"
                    >
                      <span>⚙️ Opções</span>
                    </button>
                  </div>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {priorities.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Descrição Detalhada do Problema *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  onPaste={(e) => handlePasteEvent(e, setNewAttachments)}
                  placeholder="Explique o que aconteceu, mensagens de erro exibidas, passos para reproduzir... (Dica: você pode colar Print Screen diretamente aqui com Ctrl+V)"
                  className="w-full px-4 py-2.5 bg-input-background border border-input-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center justify-between">
                  <span>Anexar Imagens e Documentos</span>
                  <span className="text-[10px] text-text-secondary/80">Suporta PNG, JPG, PDF, DOCX (Ctrl+V para colar prints)</span>
                </label>

                <div className="border-2 border-dashed border-border-color rounded-xl p-4 bg-background/50 hover:bg-secondary/20 transition-colors text-center">
                  <input
                    type="file"
                    multiple
                    id="ticket-file-input"
                    onChange={(e) => e.target.files && handleFiles(e.target.files, setNewAttachments)}
                    className="sr-only"
                  />
                  <label htmlFor="ticket-file-input" className="cursor-pointer inline-flex flex-col items-center">
                    <PaperclipIcon className="w-8 h-8 text-accent mb-1" />
                    <span className="text-xs font-semibold text-text-primary">
                      Clique para selecionar arquivos ou arraste aqui
                    </span>
                    <span className="text-[10px] text-text-secondary mt-0.5">
                      Você também pode tirar print e dar Ctrl+V nesta janela
                    </span>
                  </label>
                </div>

                {/* Previews */}
                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {newAttachments.map(att => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg border border-border-color text-xs text-text-primary"
                      >
                        {att.type.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name} className="w-6 h-6 object-cover rounded" />
                        ) : (
                          <DocumentTextIcon className="w-4 h-4 text-accent" />
                        )}
                        <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setNewAttachments(prev => prev.filter(a => a.id !== att.id))}
                          className="text-rose-400 hover:text-rose-300 ml-1 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
                >
                  {isCreatingTicket && <SpinnerIcon className="w-4 h-4" />}
                  <span>Registrar Chamado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-center z-50 p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Pré-visualização"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 text-white bg-black/60 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirm={handleDeleteTicketConfirm}
        title="⚠️ Confirmar Exclusão de Chamado"
        message={`Tem certeza que deseja excluir permanentemente o chamado #${ticketToDelete?.ticketNumber} ("${ticketToDelete?.title}") e todo o histórico de interações?`}
        confirmButtonText="Excluir Permanentemente"
        confirmButtonVariant="danger"
      />

      {/* Dynamic Ticket Fields Management Modal */}
      <TicketFieldsModal
        isOpen={isFieldsModalOpen}
        onClose={() => setIsFieldsModalOpen(false)}
        departments={departments}
        categories={categories}
        priorities={priorities}
        onConfigChange={fetchTicketConfig}
        initialTab={fieldsModalTab}
      />
    </div>
  );
};
