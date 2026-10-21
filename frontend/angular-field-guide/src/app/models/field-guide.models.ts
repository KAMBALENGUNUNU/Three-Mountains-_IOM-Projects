// ============================================================
// Core domain types — mirrors the backend API contracts.
// ============================================================

export type UserRole = 'officer' | 'admin' | 'trainee';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  facility?: string;
  country?: string;
  avatarUrl?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---- Content tree ----

export interface SubTopic {
  id: string;
  title: string;
  slug: string;
  order: number;
  pageCount: number;
  startPage: number;
  endPage: number;
  wordCount?: number;
  overview?: string;
  imageUrl?: string;
  orderIndex?: number;
  children?: SubTopic[];
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  order: number;
  icon?: string;
  subtopics: SubTopic[];
}

export interface Section {
  id: string;
  rawId?: number;
  title: string;
  slug: string;
  order: number;
  description: string;
  imageUrl?: string;
  topics: Topic[];
}

export interface ContentTree {
  documentTitle: string;
  totalPages: number;
  version: string;
  lastUpdated: string;
  sections: Section[];
}

// ---- Article / page content ----

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'callout' | 'code' | 'image' | 'quote' | 'media-text';
  level?: number;
  text?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  caption?: string;
  imageUrl?: string;
  alignment?: 'left' | 'right' | 'full';
  variant?: 'info' | 'warning' | 'danger' | 'success';
  _outlineIndex?: number;
}

export interface Article {
  id: string;
  subtopicId: string;
  subtopicTitle: string;
  topicTitle: string;
  sectionTitle: string;
  sectionId: string;
  topicId: string;
  title: string;
  slug: string;
  content: ContentBlock[];
  pages: number[];
  pageNumber: number;
  wordCount: number;
  overview?: string;
  imageUrl?: string;
  lastUpdated: string;
  author?: string;
  tags?: string[];
}

// ---- Search ----

export interface SearchHit {
  subtopicId: string;
  subtopicTitle: string;
  topicTitle: string;
  sectionTitle: string;
  sectionId: string;
  topicId: string;
  slug: string;
  snippet: string;
  pageNumber: number;
  matchCount: number;
  matchPositions: { start: number; end: number }[];
}

export interface SearchResult {
  query: string;
  totalOccurrences: number;
  totalSections: number;
  hits: SearchHit[];
  tookMs: number;
}

// ---- Admin ----

export interface AdminStats {
  sections: number;
  topics: number;
  subtopics: number;
  totalPages: number;
  lastRebuild: string;
  version: string;
}

export interface ContentEditPayload {
  id: string;
  title?: string;
  content?: string;
  overview?: string;
  imageUrl?: string;
  order?: number;
  isDraft?: boolean;
  changeSummary?: string;
}

export interface SectionVersion {
  id: number;
  sectionId: number;
  versionNumber: number;
  title: string;
  content: string;
  overview?: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PUBLISHED';
  changeSummary?: string;
  createdBy: string;
  createdAt: string;
}

// ---- Flattened tree node ----

export interface FlatNode {
  sectionId: string;
  sectionTitle: string;
  sectionSlug: string;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  subtopicId: string;
  subtopicTitle: string;
  slug: string;
  order: number;
  pageCount: number;
  startPage: number;
  endPage: number;
  wordCount: number;
}
