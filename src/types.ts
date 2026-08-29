import { LucideIcon } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  inStock: boolean;
  tags: string[];
}

export interface ContactInfo {
  mobile: string;
  email: string;
  address: string;
  website: string;
}

export interface KnowledgeData {
  chatbotId: string;
  userId: string;
  about: string;
  products: Product[];
  policy: string;
  contact: ContactInfo;
  faqs: any[];
}

export type NavSection = 'overview' | 'chatbots' | 'knowledge' | 'settings';

export interface Chatbot {
  _id: string;
  name: string;
  avatar?: string;
  accentColor?: string;
  theme?: string;
  greeting?: string;
  defaultMessage?: string;
  fallbackMessage?: string;
  createdAt: string;
}

export interface NavItem {
  id: NavSection;
  label: string;
  icon: LucideIcon;
}
