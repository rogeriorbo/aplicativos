export interface ApplicationLink {
  id: string;
  name: string;
  url: string;
  description?: string;
  iconUrl?: string;
  ownerId: string; // 'default' for public, or user.id for personal
  type?: 'app' | 'youtube_video';
  category?: string;
  isPinned?: boolean;
}

export interface QuickTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  date?: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:MM'
  priority?: 'low' | 'medium' | 'high';
  alarmEnabled?: boolean;
  alarmFired?: boolean;
}

export interface DashboardProfile {
  id: string;
  name: string;
}

export type UserRole = 'master' | 'admin';

export interface UserPreferences {
  customBackgroundUrl?: string; // Legacy fallback
  customBackgroundDayUrl?: string; // Tema Dia (Light mode)
  customBackgroundNightUrl?: string; // Tema Noite (Dark mode)
  defaultAdminProfileId?: string;
}

export interface User {
    id: string;
    email: string;
    password: string; 
    nickname: string;
    role: UserRole;
    preferences?: UserPreferences;
}

export interface UserUpdatePayload {
  email?: string;
  password?: string;
  nickname?: string;
  role?: UserRole;
  preferences?: UserPreferences;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userNickname: string;
  message: string;
  timestamp: number;
  recipientId?: string; // For private messages
  attachment?: {
    name: string;
    type: string;
    dataUrl: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji: array of userIds
  replyTo?: {
    messageId: string;
    userNickname: string;
    message: string;
  };
  isEdited?: boolean;
}

export interface LinkClickRecord {
  id: string;
  appId: string;
  appName: string;
  url: string;
  timestamp: number;
  userId?: string;
  userNickname?: string;
  ownerId?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface AppClickStat {
  appId: string;
  appName: string;
  url: string;
  iconUrl?: string;
  ownerId: string;
  totalClicks: number;
  uniqueUsersCount: number;
  lastClickedAt?: number;
  type?: 'app' | 'youtube_video';
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | string;
export type TicketCategory = 'hardware' | 'software' | 'network' | 'access' | 'printer' | 'other' | string;

export interface TicketDepartmentOption {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface TicketCategoryOption {
  id: string;
  name: string;
  icon: string;
  sortOrder?: number;
}

export interface TicketPriorityOption {
  id: string;
  name: string;
  level: string;
  color: string; // 'emerald' | 'sky' | 'amber' | 'rose' | 'purple'
  sortOrder?: number;
}

export interface TicketConfigOptions {
  departments: TicketDepartmentOption[];
  categories: TicketCategoryOption[];
  priorities: TicketPriorityOption[];
}

export interface TicketAttachment {
  id: string;
  name: string;
  type: string;
  size?: number;
  dataUrl: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userNickname: string;
  userRole: UserRole;
  message: string;
  isInternalNote?: boolean;
  attachments?: TicketAttachment[];
  timestamp: number;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  department: string;
  creatorId: string;
  creatorNickname: string;
  creatorEmail: string;
  assignedToId?: string;
  assignedToNickname?: string;
  createdAt: number;
  updatedAt: number;
  closedAt?: number;
  attachments?: TicketAttachment[];
  commentsCount?: number;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
}
