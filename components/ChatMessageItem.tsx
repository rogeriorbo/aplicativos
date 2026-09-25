import React, { useState, useRef, useEffect } from 'react';
import type { User, ChatMessage } from '../types';
import { PaperclipIcon, FaceSmileIcon, ReplyIcon, DotsVerticalIcon, EditIcon, DeleteIcon } from './icons';

interface ChatMessageItemProps {
    message: ChatMessage;
    currentUser: User;
    isPublicChat: boolean;
    onDelete: (messageId: string) => void;
    onEdit: (messageId: string, newMessage: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onReply: (message: ChatMessage) => void;
}

const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, currentUser, isPublicChat, onDelete, onEdit, onReact, onReply }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(message.message);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    
    const [menuPositionClass, setMenuPositionClass] = useState('bottom-full mb-1');
    const menuContainerRef = useRef<HTMLDivElement>(null);

    const isCurrentUser = message.userId === currentUser.id;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setIsEmojiPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (!isEditing) {
            setEditedText(message.message);
        }
    }, [isEditing, message.message]);

    const determineMenuPosition = () => {
        if (menuContainerRef.current) {
            const scrollContainer = menuContainerRef.current.closest('.overflow-y-auto');
            // A safe approximation for menu height in pixels
            const menuApproxHeight = 150; 
            
            if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const buttonRect = menuContainerRef.current.getBoundingClientRect();
                const spaceAbove = buttonRect.top - containerRect.top;
                
                if (spaceAbove < menuApproxHeight) {
                    setMenuPositionClass('top-full mt-1'); // Not enough space above, open downwards
                } else {
                    setMenuPositionClass('bottom-full mb-1'); // Enough space above, open upwards
                }
            } else {
                // Fallback to viewport if no scroll container is found
                const rect = menuContainerRef.current.getBoundingClientRect();
                if (rect.top < menuApproxHeight) {
                    setMenuPositionClass('top-full mt-1');
                } else {
                    setMenuPositionClass('bottom-full mb-1');
                }
            }
        }
    };

    const handleToggleMenu = () => {
        if (!isMenuOpen) determineMenuPosition();
        setIsMenuOpen(p => !p);
        setIsEmojiPickerOpen(false);
    };

    const handleOpenEmojiPicker = () => {
        determineMenuPosition();
        setIsEmojiPickerOpen(true);
        setIsMenuOpen(false);
    };

    const handleSaveEdit = () => {
        if (editedText.trim()) {
            onEdit(message.id, editedText.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedText(message.message);
        setIsEditing(false);
    };
    
    const renderAttachment = (msg: ChatMessage) => {
        if (!msg.attachment) return null;
        if (msg.attachment.type.startsWith('image/')) {
            return (
                <a href={msg.attachment.dataUrl} target="_blank" rel="noopener noreferrer">
                    <img src={msg.attachment.dataUrl} alt={msg.attachment.name} className="mt-2 rounded-lg max-w-full h-auto max-h-48 object-contain cursor-pointer" />
                </a>
            );
        }
        return (
            <a href={msg.attachment.dataUrl} download={msg.attachment.name} className="mt-2 flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/40">
                <PaperclipIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm truncate">{msg.attachment.name}</span>
            </a>
        );
    };

    const renderMenu = () => (
        <div className="relative" ref={menuContainerRef}>
            <button onClick={handleToggleMenu} className="p-1.5 rounded-full hover:bg-secondary">
                <DotsVerticalIcon className="w-4 h-4 text-text-secondary" />
            </button>
            {isMenuOpen && (
                <div className={`absolute w-32 bg-secondary rounded-lg shadow-xl border border-border-color z-10 ${menuPositionClass} ${isCurrentUser ? 'right-0' : 'left-0'}`}>
                    <button onClick={() => { onReply(message); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-left p-2 hover:bg-background rounded-t-lg text-sm">
                        <ReplyIcon className="w-4 h-4"/> Responder
                    </button>
                    <button onClick={handleOpenEmojiPicker} className="w-full flex items-center gap-2 text-left p-2 hover:bg-background text-sm">
                       <FaceSmileIcon className="w-4 h-4"/> Reagir
                    </button>
                    {isCurrentUser && (
                        <>
                            <div className="h-px bg-border-color my-1"></div>
                            <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-left p-2 hover:bg-background text-sm">
                                <EditIcon className="w-4 h-4"/> Editar
                            </button>
                            <button onClick={() => { onDelete(message.id); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 text-left p-2 hover:bg-background text-rose-400 rounded-b-lg text-sm">
                                <DeleteIcon className="w-4 h-4"/> Excluir
                            </button>
                        </>
                    )}
                </div>
            )}
            {isEmojiPickerOpen && (
                 <div className={`absolute flex flex-wrap justify-center gap-2 p-2 bg-secondary rounded-lg shadow-xl border border-border-color z-10 w-32 ${menuPositionClass} ${isCurrentUser ? 'right-0' : 'left-0'}`}>
                    {EMOJI_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => { onReact(message.id, emoji); setIsEmojiPickerOpen(false); }} className="text-lg p-1 rounded-md hover:bg-background">{emoji}</button>
                    ))}
                </div>
            )}
        </div>
    );

    const messageContent = (
      <div className={`max-w-xs md:max-w-sm rounded-lg px-3 py-2 ${isCurrentUser ? 'bg-accent text-white rounded-br-none' : 'bg-secondary text-text-primary rounded-bl-none'}`}>
          {!isCurrentUser && isPublicChat && <p className="text-xs font-bold text-accent mb-1">{message.userNickname}</p>}
          
          {message.replyTo && (
              <div className={`p-2 mb-2 border-l-2 ${isCurrentUser ? 'border-white/30 text-white/80 bg-white/10' : 'border-slate-400/50 bg-slate-500/10'} text-xs rounded-md`}>
                  <p className="font-semibold">{message.replyTo.userNickname}</p>
                  <p className="italic truncate">{message.replyTo.message}</p>
              </div>
          )}

          {isEditing ? (
              <div className="space-y-2">
                  <textarea
                      value={editedText}
                      onChange={e => setEditedText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === 'Escape') handleCancelEdit(); }}
                      className="w-full text-sm bg-input-background text-text-primary rounded-md p-2 focus:ring-2 focus:ring-white/50 focus:outline-none"
                      rows={3}
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button onClick={handleCancelEdit} className="text-xs px-3 py-1 rounded-md hover:bg-white/10">Cancelar</button>
                      <button onClick={handleSaveEdit} className="text-xs px-3 py-1 rounded-md bg-white text-accent font-semibold">Salvar</button>
                  </div>
              </div>
          ) : (
              <>
                  {message.message && <p className="text-sm break-words whitespace-pre-wrap">{message.message}</p>}
                  {renderAttachment(message)}
              </>
          )}
          
          <div className="flex justify-end items-center gap-2 mt-1">
              {message.isEdited && <span className={`text-xs ${isCurrentUser ? 'text-indigo-200' : 'text-text-secondary'} italic`}> (editado)</span>}
              <p className={`text-xs ${isCurrentUser ? 'text-indigo-200' : 'text-text-secondary'}`}>{formatTimestamp(message.timestamp)}</p>
          </div>
      </div>
    );

    return (
      <div className={`flex items-start gap-2.5 ${isCurrentUser ? 'justify-end' : ''}`}>
          {!isCurrentUser && (
              <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 text-sm flex items-center justify-center font-bold text-accent" title={message.userNickname}>
                {message.userNickname.charAt(0).toUpperCase()}
              </div>
          )}
          
          <div className={`flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex flex-col">
                  {messageContent}
                   {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isCurrentUser ? 'justify-end pr-2' : 'pl-2'}`}>
                          {Object.entries(message.reactions).map(([emoji, rawUserIds]) => {
                              const userIds = Array.isArray(rawUserIds) ? rawUserIds as string[] : [];
                              if (userIds.length === 0) return null;
                              const userHasReacted = userIds.includes(currentUser.id);
                              return (
                              <button key={emoji} onClick={() => onReact(message.id, emoji)} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${userHasReacted ? 'bg-accent/20 border-accent text-accent' : 'bg-secondary/80 border-border-color hover:border-slate-500'}`}>
                                  <span>{emoji}</span>
                                  <span className="font-medium">{userIds.length}</span>
                              </button>
                          )})}
                      </div>
                  )}

              </div>
              
              {renderMenu()}
          </div>
          
          {isCurrentUser && (
              <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 text-sm flex items-center justify-center font-bold text-text-primary" title={message.userNickname}>
                {message.userNickname.charAt(0).toUpperCase()}
              </div>
          )}
      </div>
    );
};