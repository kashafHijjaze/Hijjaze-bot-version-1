export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
}

export interface WASession {
  id: string;
  userId: string;
  phone: string;
  status: 'disconnected' | 'connecting' | 'connected';
  name?: string;
  avatar?: string;
  lastConnected?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}
