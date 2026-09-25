import React, { useState } from 'react';
import type { TicketDepartmentOption, TicketCategoryOption, TicketPriorityOption } from '../types';
import { api } from '../services/api';
import { EditIcon, DeleteIcon, PlusIcon, SpinnerIcon, TicketIcon } from './icons';
import { ConfirmationModal } from './ConfirmationModal';

interface TicketFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: TicketDepartmentOption[];
  categories: TicketCategoryOption[];
  priorities: TicketPriorityOption[];
  onConfigChange: () => Promise<void>;
  initialTab?: 'departments' | 'categories' | 'priorities';
}

type FieldType = 'departments' | 'categories' | 'priorities';

const PRESET_ICONS = ['⚙️', '💻', '🌐', '🔑', '🖨️', '📁', '📱', '📊', '🔒', '📦', '🛠️', '📧', '💾', '🛡️', '⚡', '🏢'];

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Verde (Baixa)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'sky', label: 'Azul (Média)', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { value: 'amber', label: 'Amarelo (Alta)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'rose', label: 'Vermelho (Urgente)', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { value: 'purple', label: 'Roxo (Especial)', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
];

export const TicketFieldsModal: React.FC<TicketFieldsModalProps> = ({
  isOpen,
  onClose,
  departments,
  categories,
  priorities,
  onConfigChange,
  initialTab = 'departments'
}) => {
  const [activeTab, setActiveTab] = useState<FieldType>(initialTab);

  // New item inputs
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('⚙️');
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newPriorityColor, setNewPriorityColor] = useState('sky');

  // Edit item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('📁');
  const [editColor, setEditColor] = useState('sky');

  // Loading & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Deletion confirmation warning state
  const [itemToDelete, setItemToDelete] = useState<{
    type: FieldType;
    id: string;
    name: string;
  } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // --- Handlers for Department ---
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.addTicketDepartment(newDepartmentName.trim());
      if (res) {
        setNewDepartmentName('');
        await onConfigChange();
        showFeedback(`Setor "${res.name}" adicionado com sucesso!`);
      } else {
        showFeedback('Erro ao cadastrar setor.', 'error');
      }
    } catch {
      showFeedback('Erro ao adicionar setor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers for Category ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.addTicketCategory(newCategoryName.trim(), newCategoryIcon);
      if (res) {
        setNewCategoryName('');
        await onConfigChange();
        showFeedback(`Categoria "${res.name}" adicionada com sucesso!`);
      } else {
        showFeedback('Erro ao cadastrar categoria.', 'error');
      }
    } catch {
      showFeedback('Erro ao adicionar categoria.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Handlers for Priority ---
  const handleAddPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.addTicketPriority(newPriorityName.trim(), newPriorityColor);
      if (res) {
        setNewPriorityName('');
        await onConfigChange();
        showFeedback(`Nível de urgência "${res.name}" adicionado com sucesso!`);
      } else {
        showFeedback('Erro ao cadastrar urgência.', 'error');
      }
    } catch {
      showFeedback('Erro ao adicionar urgência.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Save Edit ---
  const handleSaveEdit = async (type: FieldType, id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      if (type === 'departments') {
        await api.updateTicketDepartment(id, editName.trim());
      } else if (type === 'categories') {
        await api.updateTicketCategory(id, editName.trim(), editIcon);
      } else if (type === 'priorities') {
        await api.updateTicketPriority(id, editName.trim(), editColor);
      }
      setEditingId(null);
      await onConfigChange();
      showFeedback('Alterações salvas com sucesso!');
    } catch {
      showFeedback('Erro ao salvar alterações.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Start Edit ---
  const handleStartEdit = (type: FieldType, item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    if (type === 'categories') {
      setEditIcon(item.icon || '📁');
    }
    if (type === 'priorities') {
      setEditColor(item.color || 'sky');
    }
  };

  // --- Confirm Delete ---
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    const { type, id, name } = itemToDelete;
    try {
      if (type === 'departments') {
        await api.deleteTicketDepartment(id);
      } else if (type === 'categories') {
        await api.deleteTicketCategory(id);
      } else if (type === 'priorities') {
        await api.deleteTicketPriority(id);
      }
      setItemToDelete(null);
      await onConfigChange();
      showFeedback(`"${name}" foi excluído com sucesso!`);
    } catch {
      showFeedback('Erro ao excluir item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadgeClass = (color: string) => {
    const found = COLOR_OPTIONS.find(c => c.value === color);
    return found ? found.bg : 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
        <div className="bg-card-background border border-border-color rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-color mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/20">
                <TicketIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Gerenciar Opções do Formulário de Chamados
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Adicione, edite ou exclua setores, categorias de problemas e níveis de urgência.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-secondary transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs font-semibold flex items-center animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? '✓ ' : '✕ '}
              {feedback.message}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border-color mb-6 space-x-2">
            <button
              type="button"
              onClick={() => { setActiveTab('departments'); setEditingId(null); }}
              className={`py-2.5 px-4 font-semibold text-xs rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'departments'
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              🏢 Setor / Departamento ({departments.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('categories'); setEditingId(null); }}
              className={`py-2.5 px-4 font-semibold text-xs rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              ⚙️ Categoria do Problema ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('priorities'); setEditingId(null); }}
              className={`py-2.5 px-4 font-semibold text-xs rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'priorities'
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              ⚡ Nível de Urgência ({priorities.length})
            </button>
          </div>

          {/* TAB 1: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              {/* Form to Add New Department */}
              <form onSubmit={handleAddDepartment} className="p-4 rounded-xl bg-secondary/40 border border-border-color/80 space-y-3">
                <label className="block text-xs font-semibold text-text-secondary">
                  Adicionar Novo Setor / Departamento
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Ex: Almoxarifado, Engenharia, Manutenção..."
                    className="flex-grow px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !newDepartmentName.trim()}
                    className="px-4 py-2 bg-accent hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Department List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary mb-2">Setores Cadastrados:</p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {departments.map((dept) => {
                    const isEditing = editingId === dept.id;
                    return (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border-color/60 text-xs hover:border-accent/40 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-grow mr-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-input-background border border-input-border rounded text-xs text-text-primary w-full focus:outline-none focus:ring-1 focus:ring-accent"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit('departments', dept.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px] hover:bg-emerald-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-600 text-white rounded font-bold text-[11px] hover:bg-slate-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-text-primary">{dept.name}</span>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit('departments', dept)}
                              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-secondary transition-colors"
                              title="Editar nome do setor"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ type: 'departments', id: dept.id, name: dept.name })}
                              className="p-1 rounded text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Excluir setor (com aviso)"
                            >
                              <DeleteIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Form to Add New Category */}
              <form onSubmit={handleAddCategory} className="p-4 rounded-xl bg-secondary/40 border border-border-color/80 space-y-3">
                <label className="block text-xs font-semibold text-text-secondary">
                  Adicionar Nova Categoria de Problema
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg p-1.5 rounded bg-background border border-border-color">
                      {newCategoryIcon}
                    </span>
                    <select
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="px-2 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {PRESET_ICONS.map(icon => (
                        <option key={icon} value={icon}>{icon} Ícone</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Telefonia / Ramais, Certificado Digital..."
                    className="flex-grow px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCategoryName.trim()}
                    className="px-4 py-2 bg-accent hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary mb-2">Categorias Cadastradas:</p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {categories.map((cat) => {
                    const isEditing = editingId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border-color/60 text-xs hover:border-accent/40 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-grow mr-2">
                            <select
                              value={editIcon}
                              onChange={(e) => setEditIcon(e.target.value)}
                              className="px-2 py-1 bg-input-background border border-input-border rounded text-xs text-text-primary"
                            >
                              {PRESET_ICONS.map(i => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-input-background border border-input-border rounded text-xs text-text-primary w-full focus:outline-none focus:ring-1 focus:ring-accent"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit('categories', cat.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px] hover:bg-emerald-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-600 text-white rounded font-bold text-[11px] hover:bg-slate-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-medium text-text-primary">
                            <span className="text-base">{cat.icon || '📁'}</span>
                            <span>{cat.name}</span>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit('categories', cat)}
                              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-secondary transition-colors"
                              title="Editar categoria"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ type: 'categories', id: cat.id, name: cat.name })}
                              className="p-1 rounded text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Excluir categoria (com aviso)"
                            >
                              <DeleteIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRIORITIES */}
          {activeTab === 'priorities' && (
            <div className="space-y-6">
              {/* Form to Add New Priority */}
              <form onSubmit={handleAddPriority} className="p-4 rounded-xl bg-secondary/40 border border-border-color/80 space-y-3">
                <label className="block text-xs font-semibold text-text-secondary">
                  Adicionar Novo Nível de Urgência
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newPriorityColor}
                    onChange={(e) => setNewPriorityColor(e.target.value)}
                    className="px-2 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newPriorityName}
                    onChange={(e) => setNewPriorityName(e.target.value)}
                    placeholder="Ex: Imediata / Plantão, Baixíssima..."
                    className="flex-grow px-3 py-2 bg-input-background border border-input-border rounded-lg text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPriorityName.trim()}
                    className="px-4 py-2 bg-accent hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Priority List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary mb-2">Níveis de Urgência Cadastrados:</p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {priorities.map((prio) => {
                    const isEditing = editingId === prio.id;
                    return (
                      <div
                        key={prio.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border-color/60 text-xs hover:border-accent/40 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-grow mr-2">
                            <select
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              className="px-2 py-1 bg-input-background border border-input-border rounded text-xs text-text-primary"
                            >
                              {COLOR_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-input-background border border-input-border rounded text-xs text-text-primary w-full focus:outline-none focus:ring-1 focus:ring-accent"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit('priorities', prio.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px] hover:bg-emerald-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 bg-slate-600 text-white rounded font-bold text-[11px] hover:bg-slate-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getPriorityBadgeClass(prio.color)}`}>
                              {prio.name}
                            </span>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit('priorities', prio)}
                              className="p-1 rounded text-text-secondary hover:text-accent hover:bg-secondary transition-colors"
                              title="Editar nível de urgência"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setItemToDelete({ type: 'priorities', id: prio.id, name: prio.name })}
                              className="p-1 rounded text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Excluir nível de urgência (com aviso)"
                            >
                              <DeleteIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end pt-6 border-t border-border-color mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-text-primary transition-colors border border-border-color"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION WARNING MODAL (COM AVISO ANTES DA EXCLUSÃO) */}
      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`⚠️ Confirmar Exclusão de ${
            itemToDelete.type === 'departments'
              ? 'Setor / Departamento'
              : itemToDelete.type === 'categories'
              ? 'Categoria de Problema'
              : 'Nível de Urgência'
          }`}
          message={`⚠️ ATENÇÃO: Esta ação é definitiva e removerá "${itemToDelete.name}" das opções disponíveis para novos chamados de TI. Chamados já registrados com este item no histórico continuarão preservados. Deseja realmente excluir este item?`}
          confirmButtonText="Sim, Excluir Definitivamente"
          confirmButtonVariant="danger"
        />
      )}
    </>
  );
};
