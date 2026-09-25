import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuickTask } from '../types';
import { 
  ClipboardListIcon, 
  PlusIcon, 
  DeleteIcon, 
  CloseIcon, 
  CalendarDaysIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  BellIcon,
  BellAlertIcon,
  BellSlashIcon
} from './icons';

export const QuickTasksWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'all'>('calendar');

  // Deletion confirmation modal states
  const [taskToDelete, setTaskToDelete] = useState<QuickTask | null>(null);
  const [isClearCompletedConfirmOpen, setIsClearCompletedConfirmOpen] = useState(false);

  // Active alarm triggered state & sound settings
  const [activeAlarmTask, setActiveAlarmTask] = useState<QuickTask | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('deio-tasks-alarm-muted') === 'true';
    } catch {
      return false;
    }
  });

  // Stored tasks
  const [tasks, setTasks] = useState<QuickTask[]>(() => {
    try {
      const saved = localStorage.getItem('deio-quick-tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calendar State
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  // Format YYYY-MM-DD helper
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateKey(new Date()));

  // New task form state
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskAlarmEnabled, setNewTaskAlarmEnabled] = useState(true);

  // Play electronic alarm chime
  const playAlarmSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      // Melodic energetic chime: 4 tones
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist tasks in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('deio-quick-tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save quick tasks', e);
    }
  }, [tasks]);

  // Persist sound mute preference
  useEffect(() => {
    try {
      localStorage.setItem('deio-tasks-alarm-muted', String(isSoundMuted));
    } catch {
      // ignore
    }
  }, [isSoundMuted]);

  // Alarm loop: checks every 5 seconds for tasks with alarm enabled matching date & time
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentDay = String(now.getDate()).padStart(2, '0');
      const currentDKey = `${currentYear}-${currentMonth}-${currentDay}`;
      
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentHM = `${currentHours}:${currentMinutes}`;

      setTasks((prevTasks) => {
        let triggered: QuickTask | null = null;
        const updated = prevTasks.map((task) => {
          if (
            task.alarmEnabled &&
            !task.alarmFired &&
            !task.completed &&
            task.date &&
            task.time
          ) {
            // Trigger if date and time match
            if (task.date === currentDKey && task.time === currentHM) {
              triggered = { ...task, alarmFired: true };
              return { ...task, alarmFired: true };
            }
          }
          return task;
        });

        if (triggered) {
          const matchedTask = triggered as QuickTask;
          setActiveAlarmTask(matchedTask);
          if (!isSoundMuted) {
            playAlarmSound();
          }
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`⏰ Alarme: ${matchedTask.text}`, {
                body: `Horário: ${matchedTask.time || currentHM}`,
                icon: '/favicon.ico',
              });
            } catch {
              // ignore
            }
          }
        }

        return updated;
      });
    };

    const timer = setInterval(checkAlarms, 5000);
    checkAlarms();
    return () => clearInterval(timer);
  }, [isSoundMuted, playAlarmSound]);

  // Repeat alarm chime every 4 seconds while an alarm is actively ringing
  useEffect(() => {
    if (!activeAlarmTask || isSoundMuted) return;
    const ringInterval = setInterval(() => {
      playAlarmSound();
    }, 4000);
    return () => clearInterval(ringInterval);
  }, [activeAlarmTask, isSoundMuted, playAlarmSound]);

  // Calendar navigation
  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateKey(formatDateKey(now));
  };

  // Month and year display
  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Days calculations
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Dom, 1 = Seg...
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasTasks: boolean;
      pendingCount: number;
    }> = [];

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dKey = formatDateKey(prevDate);
      const dayTasks = tasks.filter((t) => t.date === dKey);
      days.push({
        dayNumber: dayNum,
        dateKey: dKey,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasTasks: dayTasks.length > 0,
        pendingCount: dayTasks.filter((t) => !t.completed).length,
      });
    }

    // Days of current month
    for (let i = 1; i <= lastDayOfMonth; i++) {
      const curDate = new Date(year, month, i);
      const dKey = formatDateKey(curDate);
      const dayTasks = tasks.filter((t) => t.date === dKey);
      days.push({
        dayNumber: i,
        dateKey: dKey,
        isCurrentMonth: true,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasTasks: dayTasks.length > 0,
        pendingCount: dayTasks.filter((t) => !t.completed).length,
      });
    }

    // Days from next month to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dKey = formatDateKey(nextDate);
      const dayTasks = tasks.filter((t) => t.date === dKey);
      days.push({
        dayNumber: i,
        dateKey: dKey,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasTasks: dayTasks.length > 0,
        pendingCount: dayTasks.filter((t) => !t.completed).length,
      });
    }

    return days;
  }, [currentDate, tasks, todayKey, selectedDateKey]);

  // Add task handler
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    if (newTaskAlarmEnabled && newTaskTime.trim()) {
      requestNotificationPermission();
    }

    const newTask: QuickTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
      date: selectedDateKey,
      time: newTaskTime.trim() || undefined,
      alarmEnabled: newTaskTime.trim() ? newTaskAlarmEnabled : false,
      alarmFired: false,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskText('');
    setNewTaskTime('');
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // Toggle alarm for an existing task
  const handleToggleAlarm = (id: string) => {
    requestNotificationPermission();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const willEnable = !t.alarmEnabled;
          let taskTime = t.time;
          if (willEnable && !taskTime) {
            const now = new Date();
            taskTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          }
          return {
            ...t,
            time: taskTime,
            alarmEnabled: willEnable,
            alarmFired: false,
          };
        }
        return t;
      })
    );
  };

  // Snooze alarm by X minutes
  const handleSnoozeAlarm = (id: string, minutes: number = 5) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const newHours = String(now.getHours()).padStart(2, '0');
    const newMinutes = String(now.getMinutes()).padStart(2, '0');
    const snoozedTime = `${newHours}:${newMinutes}`;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, time: snoozedTime, alarmEnabled: true, alarmFired: false }
          : t
      )
    );
    setActiveAlarmTask(null);
  };

  // Dismiss ringing alarm
  const handleDismissAlarm = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, alarmFired: true } : t))
    );
    setActiveAlarmTask(null);
  };

  // Mark task completed from alarm popup
  const handleCompleteAlarmTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: true, alarmEnabled: false, alarmFired: true }
          : t
      )
    );
    setActiveAlarmTask(null);
  };

  // Test sound and alarm display
  const handleTestAlarm = () => {
    playAlarmSound();
    const mockTask: QuickTask = {
      id: 'test-alarm',
      text: 'Demonstração: Teste do Alarme Sonoro e Visual',
      completed: false,
      createdAt: Date.now(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      alarmEnabled: true,
    };
    setActiveAlarmTask(mockTask);
  };

  const promptDeleteTask = (task: QuickTask) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
    setTaskToDelete(null);
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
  };

  const confirmClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
    setIsClearCompletedConfirmOpen(false);
  };

  // Filter tasks based on view
  const displayedTasks = useMemo(() => {
    if (activeTab === 'calendar') {
      return tasks.filter((t) => t.date === selectedDateKey);
    }
    return tasks;
  }, [tasks, activeTab, selectedDateKey]);

  const totalPendingCount = tasks.filter((t) => !t.completed).length;

  // Selected date formatted in Portuguese
  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return '';
    const [y, m, d] = selectedDateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }, [selectedDateKey]);

  return (
    <>
      {/* Retractable Right Sidebar Edge Tab (Barra Lateral Retrátil) */}
      <div className="fixed right-0 top-1/3 -translate-y-1/2 z-40 select-none">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative flex flex-col items-center justify-center bg-slate-900/90 hover:bg-slate-800 text-white border-l-2 border-y border-accent/70 hover:border-accent shadow-2xl rounded-l-xl py-3 px-2 transition-all duration-200 hover:-translate-x-1 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          title="Abrir Agenda & Tarefas"
          aria-label="Abrir Agenda & Tarefas"
        >
          {/* Icons container */}
          <div className="relative flex flex-col items-center gap-1">
            <CalendarDaysIcon className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
            
            {/* Vertical text */}
            <span className="text-[11px] font-semibold text-slate-300 tracking-wider [writing-mode:vertical-lr] rotate-180 py-1 uppercase">
              Agenda & Tarefas
            </span>

            {/* Badge */}
            {totalPendingCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-md animate-pulse mt-0.5">
                {totalPendingCount > 9 ? '9+' : totalPendingCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Right Drawer Panel (Barra Lateral Direita Deslizante) */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-full sm:w-[420px] bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 text-accent">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Agenda & Tarefas</h3>
              <p className="text-xs text-slate-400 capitalize">
                {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTestAlarm}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Testar alarme sonoro e visual"
            >
              <BellAlertIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Testar Alarme</span>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar barra lateral"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/40 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'calendar'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>Calendário & Dia</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ClipboardListIcon className="w-4 h-4" />
            <span>Todas as Tarefas ({tasks.length})</span>
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {/* Calendar Section (Visible when in calendar tab) */}
          {activeTab === 'calendar' && (
            <div className="p-4 bg-slate-900/60">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Mês Anterior"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white capitalize">
                    {monthYearLabel}
                  </span>
                  <button
                    onClick={goToToday}
                    className="text-[11px] font-semibold text-accent hover:text-indigo-300 bg-accent/10 hover:bg-accent/20 border border-accent/30 px-2 py-0.5 rounded-full transition-colors"
                  >
                    Hoje
                  </button>
                </div>

                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Próximo Mês"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500 mb-1.5">
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell) => {
                  return (
                    <button
                      key={cell.dateKey}
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className={`relative h-9 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all ${
                        cell.isSelected
                          ? 'bg-accent text-white font-bold ring-2 ring-indigo-400 shadow-md scale-105 z-10'
                          : cell.isToday
                          ? 'border border-amber-400/80 text-amber-300 bg-amber-500/10 font-bold'
                          : cell.isCurrentMonth
                          ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-800/40'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>

                      {/* Event/Task Dot */}
                      {cell.hasTasks && (
                        <span
                          className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                            cell.isSelected
                              ? 'bg-white'
                              : cell.pendingCount > 0
                              ? 'bg-emerald-400'
                              : 'bg-slate-500'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks Section for Selected Date / All */}
          <div className="p-4 space-y-3">
            {/* Context title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-300">
                  {activeTab === 'calendar' ? (
                    <>Tarefas de <span className="text-accent capitalize">{selectedDateLabel}</span></>
                  ) : (
                    'Todas as Tarefas Cadastradas'
                  )}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({displayedTasks.length})
                </span>
              </div>

              {activeTab === 'calendar' && selectedDateKey !== todayKey && (
                <button
                  onClick={() => setSelectedDateKey(todayKey)}
                  className="text-[11px] text-slate-400 hover:text-accent underline"
                >
                  Ir para Hoje
                </button>
              )}
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-2.5 space-y-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder={
                  activeTab === 'calendar'
                    ? `Novo compromisso para ${selectedDateLabel}...`
                    : 'Adicionar tarefa...'
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-accent"
              />

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-400 focus-within:border-accent">
                  <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none"
                    title="Horário opcional"
                  />
                </div>

                {/* Alarm toggle for new task */}
                <button
                  type="button"
                  onClick={() => setNewTaskAlarmEnabled((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    newTaskAlarmEnabled
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs'
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                  title={
                    newTaskAlarmEnabled
                      ? 'Alarme ativado para este horário (clique para desativar)'
                      : 'Alarme desativado (clique para ativar)'
                  }
                >
                  {newTaskAlarmEnabled ? (
                    <BellAlertIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ) : (
                    <BellSlashIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{newTaskAlarmEnabled ? 'Alarme Ativo' : 'Alarme Mudo'}</span>
                </button>

                <div className="flex-1" />

                <button
                  type="submit"
                  disabled={!newTaskText.trim()}
                  className="bg-accent hover:bg-indigo-600 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </form>

            {/* Tasks List */}
            <div className="space-y-2">
              {displayedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                  {activeTab === 'calendar' ? (
                    <>Nenhum compromisso agendado para este dia.<br />Digite acima para agendar.</>
                  ) : (
                    <>Nenhuma tarefa encontrada.</>
                  )}
                </div>
              ) : (
                displayedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-800/70 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        className="rounded border-slate-600 text-accent focus:ring-accent w-4 h-4 cursor-pointer bg-slate-900 mt-0.5"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className={`text-xs text-white break-words select-none leading-relaxed ${
                            task.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.text}
                        </span>

                        {/* Metadata badges (time / date / alarm) */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {task.time && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                              <ClockIcon className="w-2.5 h-2.5" />
                              {task.time}
                            </span>
                          )}

                          {activeTab === 'all' && task.date && (
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              📅 {task.date.split('-').reverse().slice(0, 2).join('/')}
                            </span>
                          )}

                          {task.alarmEnabled && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">
                              <BellAlertIcon className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                              Alarme
                            </span>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Alarm Toggle Button (Ativar/Desativar Alarme da Tarefa) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAlarm(task.id);
                      }}
                      className={`p-1.5 rounded-lg border ml-1.5 flex-shrink-0 transition-all cursor-pointer ${
                        task.alarmEnabled
                          ? 'text-amber-400 bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 shadow-xs'
                          : 'text-slate-500 hover:text-slate-300 bg-slate-900/60 border-slate-700/60 hover:bg-slate-800'
                      }`}
                      title={
                        task.alarmEnabled
                          ? 'Alarme Ativado - Clique para desativar'
                          : 'Alarme Desativado - Clique para ativar'
                      }
                    >
                      {task.alarmEnabled ? (
                        <BellAlertIcon className="w-3.5 h-3.5" />
                      ) : (
                        <BellSlashIcon className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => promptDeleteTask(task)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 ml-1 flex-shrink-0 transition-colors cursor-pointer"
                      title="Excluir tarefa"
                    >
                      <DeleteIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {totalPendingCount} pendente(s)
            </span>
            <span className="text-slate-600">•</span>
            {/* Audio sound toggle */}
            <button
              onClick={() => setIsSoundMuted((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={isSoundMuted ? 'Som do alarme mutado (clique para ativar som)' : 'Som do alarme ativo'}
            >
              {isSoundMuted ? (
                <BellSlashIcon className="w-3 h-3 text-rose-400" />
              ) : (
                <BellIcon className="w-3 h-3 text-amber-400" />
              )}
              <span>{isSoundMuted ? 'Mudo' : 'Som Ativo'}</span>
            </button>
          </div>

          {tasks.some((t) => t.completed) && (
            <button
              onClick={() => setIsClearCompletedConfirmOpen(true)}
              className="text-accent hover:text-indigo-300 font-medium hover:underline text-xs"
            >
              Limpar concluídas
            </button>
          )}
        </div>
      </aside>

      {/* Task Deletion Confirmation Dialog */}
      {taskToDelete && (
        <div 
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={cancelDeleteTask}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl shadow-black/40 space-y-4 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Excluir Tarefa?</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Tem certeza de que deseja excluir permanentemente esta tarefa?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 break-words flex flex-col gap-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{taskToDelete.text}</span>
              {(taskToDelete.date || taskToDelete.time) && (
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                  {taskToDelete.date && <span>📅 {taskToDelete.date.split('-').reverse().join('/')}</span>}
                  {taskToDelete.time && <span>⏰ {taskToDelete.time}</span>}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={cancelDeleteTask}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <DeleteIcon className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Completed Tasks Confirmation Dialog */}
      {isClearCompletedConfirmOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsClearCompletedConfirmOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl shadow-black/40 space-y-4 animate-fade-in-scale"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Limpar Concluídas?</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Deseja remover todas as tarefas que já foram marcadas como concluídas? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsClearCompletedConfirmOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmClearCompleted}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <DeleteIcon className="w-3.5 h-3.5" />
                <span>Limpar Concluídas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alarm Triggered Modal (Ringing Alarm) */}
      {activeAlarmTask && (
        <div 
          className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none"
          onClick={() => handleDismissAlarm(activeAlarmTask.id)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl shadow-amber-500/25 animate-fade-in-scale space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with animated bell, title and time */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 animate-bounce flex-shrink-0">
                  <BellAlertIcon className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      ⏰ Alarme Disparado!
                    </span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                    Lembrete de Tarefa
                  </h3>
                </div>
              </div>

              {activeAlarmTask.time && (
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 px-2.5 py-1 rounded-lg">
                  {activeAlarmTask.time}
                </span>
              )}
            </div>

            {/* Task text card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white break-words leading-relaxed">
                {activeAlarmTask.text}
              </p>
              {activeAlarmTask.date && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  📅 Data programada: {activeAlarmTask.date.split('-').reverse().join('/')}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSnoozeAlarm(activeAlarmTask.id, 5)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Adiar 5 min
              </button>
              <button
                type="button"
                onClick={() => handleCompleteAlarmTask(activeAlarmTask.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
              >
                ✓ Concluir
              </button>
              <button
                type="button"
                onClick={() => handleDismissAlarm(activeAlarmTask.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-900/40 transition-all cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
