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
  customBackgroundUrl?: string;
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
