import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User, ChatMessage } from '../types';
import { PaperAirplaneIcon, CloseIcon, FaceSmileIcon, UsersIcon, ArrowLeftIcon, PaperclipIcon } from './icons';
import { ChatMessageItem } from './ChatMessageItem';

interface ChatPanelProps {
  currentUser: User;
  messages: ChatMessage[];
  allUsers: User[];
  onSendMessage: (
    message: string, 
    attachment?: { name: string; type: string; dataUrl: string }, 
    recipientId?: string,
    replyTo?: { messageId: string; userNickname: string; message: string; }
  ) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onEditMessage: (messageId: string, newMessage: string) => Promise<void>;
  onReactToMessage: (messageId: string, emoji: string) => Promise<void>;
  onClose: () => void;
}

type ChatView = 'public' | 'users' | 'private';
const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🔥', '🎉', '👋', '🙏', '😢', '😎'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const ChatPanel: React.FC<ChatPanelProps> = (props) => {
  const { 
    currentUser, 
    messages, 
    allUsers, 
    onSendMessage,
    onDeleteMessage,
    onEditMessage,
    onReactToMessage,
    onClose
  } = props;
  
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [view, setView] = useState<ChatView>('public');
  const [privateChatUser, setPrivateChatUser] = useState<User | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, view, privateChatUser]);

  useEffect(() => {
    if (error) {
        const timer = setTimeout(() => setError(''), 3000);
        return () => clearTimeout(timer);
    }
  }, [error]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() || attachment) {
      const recipientId = view === 'private' ? privateChatUser?.id : undefined;
      const replyInfo = replyingTo ? {
          messageId: replyingTo.id,
          userNickname: replyingTo.userNickname,
          message: replyingTo.message
      } : undefined;

      await onSendMessage(newMessage.trim(), attachment || undefined, recipientId, replyInfo);
      
      setNewMessage('');
      setAttachment(null);
      setReplyingTo(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
      setShowEmojiPicker(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        setError('O arquivo é muito grande (máx 2MB).');
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        setAttachment({
            name: file.name,
            type: file.type,
            dataUrl: event.target?.result as string,
        });
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const openPrivateChat = (user: User) => {
    setPrivateChatUser(user);
    setView('private');
  }

  const publicMessages = useMemo(() => messages.filter(m => !m.recipientId), [messages]);
  const privateMessages = useMemo(() => {
    if (view !== 'private' || !privateChatUser) return [];
    return messages.filter(m => 
      (m.userId === currentUser.id && m.recipientId === privateChatUser.id) ||
      (m.userId === privateChatUser.id && m.recipientId === currentUser.id)
    );
  }, [messages, view, privateChatUser, currentUser.id]);

  const displayedMessages = view === 'public' ? publicMessages : privateMessages;

  const renderHeader = () => {
    let title = 'Chat da Comunidade';
    if (view === 'users') title = 'Usuários Online';
    if (view === 'private' && privateChatUser) title = `Chat com ${privateChatUser.nickname}`;
    
    return (
      <header className="flex items-center justify-between p-4 border-b border-border-color flex-shrink-0">
        <div className="flex items-center">
            {view !== 'public' && (
                <button onClick={() => setView(view === 'private' ? 'users' : 'public')} className="p-1 rounded-full text-text-secondary hover:bg-secondary mr-2" aria-label="Voltar">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
            )}
            <h2 className="text-lg font-bold text-text-primary truncate">{title}</h2>
        </div>
        <div className="flex items-center">
            {view === 'public' && (
                <button onClick={() => setView('users')} className="p-1 rounded-full text-text-secondary hover:bg-secondary mr-2" aria-label="Ver usuários">
                    <UsersIcon className="w-5 h-5" />
                </button>
            )}
            <button onClick={() => { onClose(); setView('public'); }} className="p-1 rounded-full text-text-secondary hover:bg-secondary" aria-label="Fechar chat">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
      </header>
    );
  };
  
  const renderContent = () => {
    if (view === 'users') {
        return (
            <div className="flex-grow p-2 overflow-y-auto">
                <ul className="divide-y divide-border-color">
                    {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                        <li key={user.id}>
                            <button onClick={() => openPrivateChat(user)} className="w-full flex items-center p-3 text-left hover:bg-secondary rounded-lg transition-colors">
                                <div className="relative mr-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 text-sm flex items-center justify-center font-bold text-accent" title={user.nickname}>
                                        {user.nickname.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-card-background"></span>
                                </div>
                                <span className="text-sm font-medium text-text-primary truncate">{user.nickname}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
      <div className="flex-grow p-4 overflow-y-auto" onClick={() => setShowEmojiPicker(false)}>
         <div className="space-y-4">
            {displayedMessages.map((msg) => (
                <ChatMessageItem 
                    key={msg.id}
                    message={msg}
                    currentUser={currentUser}
                    isPublicChat={view === 'public'}
                    onDelete={onDeleteMessage}
                    onEdit={onEditMessage}
                    onReact={onReactToMessage}
                    onReply={setReplyingTo}
                />
            ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-96 h-[70vh] sm:h-[60vh] sm:max-h-[700px] z-50 flex flex-col transform transition-transform duration-300 animate-slide-in">
        <div className="bg-card-background backdrop-blur-lg border border-border-color rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col h-full overflow-hidden">
            {renderHeader()}
            {renderContent()}
            
            {(view === 'public' || view === 'private') && (
              <div className="p-4 border-t border-border-color flex-shrink-0 relative">
                  {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-secondary border border-border-color rounded-lg shadow-lg animate-fade-in-fast">
                          <div className="grid grid-cols-6 gap-2">
                              {EMOJIS.map(emoji => (
                                  <button
                                      key={emoji}
                                      onClick={() => handleEmojiSelect(emoji)}
                                      className="text-2xl rounded-md hover:bg-background/50 p-1 transition-colors"
                                      type="button"
                                      aria-label={`Emoji ${emoji}`}
                                  >
                                      {emoji}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                  {replyingTo && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-1.5 bg-secondary border border-border-color rounded-t-lg shadow-lg animate-fade-in-fast flex items-center justify-between text-xs">
                          <div className="text-text-secondary overflow-hidden">
                            Respondendo a <span className="font-semibold text-text-primary">{replyingTo.userNickname}</span>:
                            <p className="truncate italic">"{replyingTo.message}"</p>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="text-text-secondary hover:text-text-primary p-1 rounded-full flex-shrink-0 ml-2">
                              <CloseIcon className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  {attachment && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 px-2 py-1 bg-secondary border border-border-color rounded-lg shadow-lg animate-fade-in-fast flex items-center justify-between">
                        <p className="text-xs text-text-secondary truncate">Anexo: {attachment.name}</p>
                        <button onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="text-rose-400 hover:text-rose-300 p-1 rounded-full">
                            <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>
                  )}
                   {error && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 px-3 py-1 bg-rose-500/20 text-rose-300 text-xs rounded-lg animate-fade-in-fast">
                           {error}
                        </div>
                   )}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-text-secondary hover:text-accent hover:bg-secondary transition-colors" title="Anexar arquivo">
                            <PaperclipIcon />
                        </button>
                      <div className="relative flex-grow">
                          <input
                              ref={inputRef}
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Digite sua mensagem..."
                              className="w-full pl-4 pr-10 py-2 bg-input-background border border-input-border rounded-full text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                          <button 
                              type="button" 
                              onClick={() => setShowEmojiPicker(prev => !prev)} 
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-accent"
                              title="Adicionar emoji"
                              aria-expanded={showEmojiPicker}
                          >
                              <FaceSmileIcon className="w-5 h-5" />
                          </button>
                      </div>
                      <button type="submit" className="bg-accent text-white rounded-full p-3 hover:bg-indigo-600 transition-colors disabled:bg-slate-500" disabled={!newMessage.trim() && !attachment}>
                          <PaperAirplaneIcon className="w-5 h-5" />
                      </button>
                  </form>
              </div>
            )}
        </div>
        <style>{`
            @keyframes slide-in {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-slide-in {
                animation: slide-in 0.3s ease-out forwards;
            }
            @keyframes fade-in-fast {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-fast {
                animation: fade-in-fast 0.2s ease-out forwards;
            }
        `}</style>
    </div>
  );
};