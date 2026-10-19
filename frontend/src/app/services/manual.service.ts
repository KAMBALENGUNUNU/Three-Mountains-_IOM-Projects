import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ContentTree,
  Article,
  ContentBlock,
  SearchResult,
  SearchHit,
  AdminStats,
  ContentEditPayload,
  Section,
  Topic,
  SubTopic,
  FlatNode,
} from '../models/field-guide.models';

const API_BASE_URL =
  typeof window !== 'undefined' && (window.location.port === '4200' || window.location.port === '5176')
    ? 'http://localhost:8080/api'
    : '/api';

interface BackendSection {
  id: number;
  title: string;
  content: string;
  overview?: string;
  imageUrl?: string;
  orderIndex?: number;
}

interface BackendSubTopic {
  id: number;
  subNumber: number;
  title: string;
  sections?: BackendSection[];
}

interface BackendTopic {
  id: number;
  topicNumber: number;
  title: string;
  imageUrl?: string;
  subTopics?: BackendSubTopic[];
}

interface BackendTocData {
  topics: BackendTopic[];
}

interface BackendSearchHit {
  sectionId: number;
  title: string;
  snippet: string;
  score: number;
  occurrences: number;
}

interface BackendSearchResult {
  query: string;
  matchingSectionsCount: number;
  totalOccurrences: number;
  hits: BackendSearchHit[];
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class ManualService {
  private cachedTree: ContentTree | null = null;

  constructor(private http: HttpClient) {}

  getCachedTree(): ContentTree | null {
    return this.cachedTree;
  }

  isBookArtifact(title: string): boolean {
    if (!title) return false;
    const t = title.toUpperCase().trim();
    return (
      t.includes('LIST OF FIGURES') ||
      t.includes('LIST OF TABLES') ||
      t === 'FIGURES' ||
      t === 'TABLES' ||
      t.startsWith('LIST OF FIGURE') ||
      t.startsWith('LIST OF TABLE')
    );
  }

  cleanSectionTitle(title: string): string {
    if (!title) return '';
    return title
      .replace(/\.{2,}\s*\d+/g, '')
      .replace(/\.{2,}/g, '')
      .replace(/^[•\-\*]\s*/, '')
      .trim();
  }

  async fetchContentTree(): Promise<ContentTree> {
    const res = await firstValueFrom(
      this.http.get<ApiResponseEnvelope<BackendTocData>>(`${API_BASE_URL}/manual/toc`),
    );
    const backendTopics = res.data?.topics || [];

    const topicPageOffsets: Record<number, number> = {
      0: 1,   // Preliminaries
      1: 15,  // Migration Management
      2: 35,  // Legal Framework
      3: 56,  // Travel Documents
      4: 72,  // Migration Clearance
      5: 84,  // Professional Conduct
      6: 92,  // Cross Border Communities
      7: 104, // Transnational Organised Crime
      8: 118, // Managing Orderly Migration in Crisis
      9: 125, // References
    };

    const sections: Section[] = backendTopics.map((top) => {
      const topicNum = top.topicNumber;
      const basePage = topicPageOffsets[topicNum] || 1;
      let pageRunningOffset = basePage;

      const validSubTopics = (top.subTopics || []).filter(
        (sub) => !this.isBookArtifact(sub.title),
      );

      const topics: Topic[] = validSubTopics.map((sub) => {
        const validSections = (sub.sections || []).filter(
          (sec) => !this.isBookArtifact(sec.title),
        );

        const subtopics: SubTopic[] = validSections.map((sec, secIdx) => {
          const textLen = sec.content ? sec.content.length : 1200;
          const pageSpan = Math.max(1, Math.round(textLen / 2000));
          const startP = pageRunningOffset;
          const endP = startP + pageSpan;
          pageRunningOffset = endP;

          const words = sec.content ? sec.content.trim().split(/\s+/).filter(Boolean).length : 500;
          const cleanTitle = this.cleanSectionTitle(sec.title);

          return {
            id: String(sec.id),
            title: cleanTitle,
            slug: this.slugify(cleanTitle),
            order: sec.orderIndex ?? (secIdx + 1),
            orderIndex: sec.orderIndex,
            pageCount: pageSpan + 1,
            startPage: startP,
            endPage: endP,
            wordCount: words,
            overview: sec.overview,
            imageUrl: sec.imageUrl,
          };
        });

        let topicTitle = sub.title;
        if (topicNum === 0) {
          if (topicTitle.toUpperCase().includes('ACRONYM')) {
            topicTitle = 'Acronyms & Abbreviations Glossary';
          } else if (topicTitle.toUpperCase().includes('CURRICULUM')) {
            topicTitle = 'Curriculum Framework & Outcomes';
          }
        } else if (topicNum === 9) {
          topicTitle = 'Statutory References & Bibliography';
        } else if (sub.subNumber) {
          topicTitle = `${topicNum}.${sub.subNumber} ${sub.title}`;
        }

        return {
          id: `top-${sub.id}`,
          title: topicTitle,
          slug: this.slugify(topicTitle),
          order: sub.subNumber,
          icon: this.getTopicIcon(topicNum),
          subtopics,
        };
      });

      let sectionTitle = top.title;
      if (topicNum >= 1 && topicNum <= 8) {
        if (/^module\s*\d*[:.-]?\s*/i.test(sectionTitle)) {
          sectionTitle = sectionTitle.replace(/^module\s*\d*[:.-]?\s*/i, `Section ${topicNum}: `);
        } else if (!sectionTitle.toLowerCase().startsWith('section')) {
          sectionTitle = `Section ${topicNum}: ${sectionTitle}`;
        }
      }

      return {
        id: `sec-${top.id}`,
        rawId: top.id,
        title: sectionTitle,
        slug: this.slugify(sectionTitle),
        order: topicNum,
        description: this.getModuleDescription(topicNum, top.title),
        imageUrl: top.imageUrl,
        topics,
      };
    });

    const tree: ContentTree = {
      documentTitle: 'OSBP Migration Management Learner Manual',
      totalPages: 127,
      version: '5.4 — February 2024',
      lastUpdated: '2024-02-15',
      sections,
    };

    this.cachedTree = tree;
    return tree;
  }

  async fetchArticle(subtopicId: string): Promise<Article> {
    const res = await firstValueFrom(
      this.http.get<ApiResponseEnvelope<BackendSection> | BackendSection>(
        `${API_BASE_URL}/manual/sections/${subtopicId}`,
      ),
    );

    const sec: BackendSection =
      res && typeof res === 'object' && 'data' in res ? (res as ApiResponseEnvelope<BackendSection>).data : (res as BackendSection);

    let sectionTitle = 'OSBP Manual';
    let topicTitle = 'Migration Management';
    let sectionId = 'sec-1';
    let topicId = 'top-1';
    let startPage = 1;
    let endPage = 2;

    if (this.cachedTree) {
      for (const s of this.cachedTree.sections) {
        for (const t of s.topics) {
          const found = t.subtopics.find((st) => st.id === String(subtopicId));
          if (found) {
            sectionTitle = s.title;
            topicTitle = t.title;
            sectionId = s.id;
            topicId = t.id;
            startPage = found.startPage;
            endPage = found.endPage;
            break;
          }
        }
      }
    }

    const contentBlocks = this.parseTextToContentBlocks(sec.content, sec.title);
    const wordCount = sec.content ? sec.content.trim().split(/\s+/).filter(Boolean).length : 500;

    return {
      id: `art-${sec.id}`,
      subtopicId: String(sec.id),
      subtopicTitle: sec.title,
      topicTitle,
      sectionTitle,
      sectionId,
      topicId,
      title: sec.title,
      slug: this.slugify(sec.title),
      content: contentBlocks,
      pages: [startPage, endPage],
      pageNumber: startPage,
      wordCount,
      overview: sec.overview,
      imageUrl: sec.imageUrl,
      lastUpdated: '2024-02-15',
      author: 'EAC Secretariat & IOM Technical Committee',
      tags: ['EAC', 'OSBP', 'Migration', 'Standard Operating Procedures'],
    };
  }

  cleanPdfArtifacts(text: string): string {
    if (!text) return '';
    return text
      .replace(/^[ \t]*(?:EAC|IOM|OSBP)?\s*(?:MIGRATION\s+MANAGEMENT\s+)?LEARNER['’]S\s+MANUAL[^\n]*$/gim, '')
      .replace(/^[ \t]*EAST\s+AFRICAN\s+COMMUNITY[^\n]*$/gim, '')
      .replace(/^[ \t]*Page\s+\d+\s+of\s+\d+[^\n]*$/gim, '')
      .replace(/^[ \t]*\d{1,3}[ \t]*$/gm, '')
      .replace(/\.{3,}\s*\d+/g, '')
      .replace(/\.{3,}/g, '…')
      .replace(/\?݃\?݃\?/g, '')
      .replace(/\uFFFD/g, '');
  }

  parseTextToContentBlocks(rawText: string, title: string): ContentBlock[] {
    if (!rawText || !rawText.trim()) {
      return [
        {
          type: 'callout',
          variant: 'info',
          text: `Content for ${title} is recorded in the official manual.`,
        },
      ];
    }

    const cleanedText = this.cleanPdfArtifacts(rawText);

    if (title.toLowerCase().includes('acronym')) {
      const acronymRows: string[][] = [];
      const lines = cleanedText.split('\n');
      for (const l of lines) {
        const trimmed = l.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^([A-Z0-9/&.-]{2,15})\s+(?:[-–—:]\s*)?([A-Za-z0-9\s,()./'’"–—-]+)$/);
        if (match) {
          acronymRows.push([match[1].trim(), match[2].trim()]);
        } else if (trimmed.includes('\t')) {
          const parts = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            acronymRows.push([parts[0], parts.slice(1).join(' ')]);
          }
        } else {
          const firstSpace = trimmed.indexOf(' ');
          if (firstSpace > 1 && firstSpace <= 12) {
            const maybeAcronym = trimmed.slice(0, firstSpace).trim();
            const rest = trimmed.slice(firstSpace + 1).trim();
            if (/^[A-Z0-9/&-]+$/.test(maybeAcronym) && rest.length > 2) {
              acronymRows.push([maybeAcronym, rest]);
            }
          }
        }
      }

      if (acronymRows.length > 0) {
        return [
          {
            type: 'callout',
            variant: 'info',
            text: 'Official abbreviations, treaty terms, and institutional acronyms utilized across all 8 modules of the OSBP Learner Manual.',
          },
          {
            type: 'table',
            headers: ['Acronym / Abbreviation', 'Definition & Full Operational Term'],
            rows: acronymRows,
          },
        ];
      }
    }

    const blocks: ContentBlock[] = [];
    const lines = cleanedText.split('\n');
    let currentParagraph: string[] = [];
    let currentList: string[] = [];
    let currentTableHeaders: string[] | null = null;
    let currentTableRows: string[][] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').replace(/\s{2,}/g, ' ').trim();
        if (text) {
          const lower = text.toLowerCase();
          if (
            lower.startsWith('note:') ||
            lower.startsWith('important:') ||
            lower.startsWith('warning:') ||
            lower.startsWith('directive:') ||
            lower.startsWith('learning objective:') ||
            lower.startsWith('caution:')
          ) {
            const variant = lower.includes('warning') || lower.includes('caution')
              ? 'warning'
              : lower.includes('directive') || lower.includes('important')
              ? 'danger'
              : lower.includes('objective')
              ? 'success'
              : 'info';
            blocks.push({ type: 'callout', variant, text });
          } else if (text.startsWith('"') && text.endsWith('"') && text.length < 300) {
            blocks.push({ type: 'quote', text: text.replace(/^"|"$/g, '') });
          } else {
            blocks.push({ type: 'paragraph', text });
          }
        }
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push({ type: 'list', items: [...currentList] });
        currentList = [];
      }
    };

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        blocks.push({
          type: 'table',
          headers: currentTableHeaders || undefined,
          rows: [...currentTableRows],
        });
        currentTableHeaders = null;
        currentTableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        flushParagraph();
        flushList();
        flushTable();
        continue;
      }

      if (line.includes('|') && line.startsWith('|') && line.endsWith('|')) {
        flushParagraph();
        flushList();
        const cells = line
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        if (cells.every((c) => /^[-:]+$/.test(c))) {
          continue;
        }

        if (!currentTableHeaders && currentTableRows.length === 0) {
          currentTableHeaders = cells;
        } else {
          currentTableRows.push(cells);
        }
        continue;
      } else {
        flushTable();
      }

      if (line.startsWith('# ')) {
        flushParagraph();
        flushList();
        blocks.push({ type: 'heading', level: 1, text: line.replace(/^#\s+/, '') });
        continue;
      }
      if (line.startsWith('## ')) {
        flushParagraph();
        flushList();
        blocks.push({ type: 'heading', level: 2, text: line.replace(/^##\s+/, '') });
        continue;
      }
      if (line.startsWith('### ')) {
        flushParagraph();
        flushList();
        blocks.push({ type: 'heading', level: 3, text: line.replace(/^###\s+/, '') });
        continue;
      }

      const listMatch = line.match(/^([•\-\*]|\d+\.|\([a-z]\)|[ivx]+\.)\s+(.+)$/i);
      if (listMatch) {
        flushParagraph();
        currentList.push(listMatch[2]);
        continue;
      }

      if (line.startsWith('> ')) {
        flushParagraph();
        flushList();
        blocks.push({
          type: 'callout',
          variant: 'info',
          text: line.replace(/^>\s*/, ''),
        });
        continue;
      }

      if (currentList.length > 0) {
        flushList();
      }
      currentParagraph.push(line);
    }

    flushParagraph();
    flushList();
    flushTable();

    return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: cleanedText }];
  }

  async searchContent(query: string): Promise<SearchResult> {
    const startTime = Date.now();
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        query: '',
        totalOccurrences: 0,
        totalSections: 0,
        hits: [],
        tookMs: 0,
      };
    }

    const res = await firstValueFrom(
      this.http.get<ApiResponseEnvelope<BackendSearchResult> | BackendSearchResult>(
        `${API_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&limit=50`,
      ),
    );

    const data: BackendSearchResult =
      res && typeof res === 'object' && 'data' in res ? (res as ApiResponseEnvelope<BackendSearchResult>).data : (res as BackendSearchResult);

    const tookMs = Date.now() - startTime;
    const validBackendHits = (data.hits || []).filter((h) => !this.isBookArtifact(h.title));

    const hits: SearchHit[] = validBackendHits.map((h) => {
      let topicTitle = 'OSBP Manual';
      let sectionTitle = 'Module';
      let sectionId = 'sec-1';
      let topicId = 'top-1';
      let pageNumber = 1;

      if (this.cachedTree) {
        for (const s of this.cachedTree.sections) {
          for (const t of s.topics) {
            const match = t.subtopics.find((st) => st.id === String(h.sectionId));
            if (match) {
              sectionTitle = s.title;
              topicTitle = t.title;
              sectionId = s.id;
              topicId = t.id;
              pageNumber = match.startPage;
              break;
            }
          }
        }
      }

      const cleanTitle = this.cleanSectionTitle(h.title);

      return {
        subtopicId: String(h.sectionId),
        subtopicTitle: cleanTitle,
        topicTitle,
        sectionTitle,
        sectionId,
        topicId,
        slug: this.slugify(cleanTitle),
        snippet: this.cleanPdfArtifacts(h.snippet || ''),
        pageNumber,
        matchCount: h.occurrences || 1,
        matchPositions: [],
      };
    });

    const totalOccurrences = hits.reduce((acc, h) => acc + h.matchCount, 0);

    return {
      query: data.query || trimmed,
      totalOccurrences: totalOccurrences || (data.totalOccurrences || 0),
      totalSections: hits.length,
      hits,
      tookMs,
    };
  }

  async fetchAdminStats(): Promise<AdminStats> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponseEnvelope<AdminStats> | AdminStats>(`${API_BASE_URL}/admin/stats`),
      );
      const data: AdminStats =
        res && typeof res === 'object' && 'data' in res ? (res as ApiResponseEnvelope<AdminStats>).data : (res as AdminStats);
      return {
        sections: data.sections || 211,
        topics: data.topics || 10,
        subtopics: data.subtopics || 51,
        totalPages: data.totalPages || 127,
        lastRebuild: data.lastRebuild || new Date().toISOString(),
        version: data.version || '5.4 — February 2024',
      };
    } catch {
      return {
        sections: 211,
        topics: 10,
        subtopics: 51,
        totalPages: 127,
        lastRebuild: new Date().toISOString(),
        version: '5.4 — February 2024',
      };
    }
  }

  async saveContentEdit(payload: ContentEditPayload): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.put(`${API_BASE_URL}/admin/sections/${payload.id}`, {
        title: payload.title,
        content: payload.content,
        overview: payload.overview,
        imageUrl: payload.imageUrl,
      }),
    );
    return { ok: true };
  }

  async updateTopic(
    id: number,
    payload: { title: string; imageUrl?: string | null; topicNumber?: number },
  ): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.put(`${API_BASE_URL}/admin/topics/${id}`, {
        title: payload.title,
        imageUrl: payload.imageUrl ?? '',
        topicNumber: payload.topicNumber,
      }),
    );
    return { ok: true };
  }

  async deleteTopic(id: number): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/admin/topics/${id}`),
    );
    return { ok: true };
  }

  async deleteSection(id: string): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.delete(`${API_BASE_URL}/admin/sections/${id}`),
    );
    this.cachedTree = null;
    return { ok: true };
  }

  async reorderTopics(topicIds: number[]): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.put(`${API_BASE_URL}/admin/topics/reorder`, topicIds),
    );
    this.cachedTree = null;
    return { ok: true };
  }

  async reorderSections(sectionIds: number[]): Promise<{ ok: boolean }> {
    await firstValueFrom(
      this.http.put(`${API_BASE_URL}/admin/sections/reorder`, sectionIds),
    );
    this.cachedTree = null;
    return { ok: true };
  }

  clearCache(): void {
    this.cachedTree = null;
  }

  async rebuildIndex(): Promise<{ ok: boolean; pages: number }> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/admin/rebuild-index`, {}));
    return { ok: true, pages: 127 };
  }

  async uploadManual(file: File): Promise<{ ok: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await firstValueFrom(
      this.http.post<{ message?: string }>(`${API_BASE_URL}/admin/upload-manual`, formData),
    );
    return { ok: true, message: res?.message || 'Manual uploaded successfully.' };
  }

  getFlattenedNodes(): FlatNode[] {
    if (!this.cachedTree) return [];
    const flat: FlatNode[] = [];
    for (const s of this.cachedTree.sections) {
      for (const t of s.topics) {
        for (const st of t.subtopics) {
          flat.push({
            sectionId: s.id,
            sectionTitle: s.title,
            sectionSlug: s.slug,
            topicId: t.id,
            topicTitle: t.title,
            topicSlug: t.slug,
            subtopicId: st.id,
            subtopicTitle: st.title,
            slug: st.slug,
            order: st.order,
            pageCount: st.pageCount,
            startPage: st.startPage,
            endPage: st.endPage,
            wordCount: st.wordCount || 500,
          });
        }
      }
    }
    return flat;
  }

  getAdjacentSubtopics(subtopicId: string): { prev: FlatNode | null; next: FlatNode | null } {
    const nodes = this.getFlattenedNodes();
    const idx = nodes.findIndex((n) => n.subtopicId === String(subtopicId));
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? nodes[idx - 1] : null,
      next: idx < nodes.length - 1 ? nodes[idx + 1] : null,
    };
  }

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  private getTopicIcon(topicNumber: number): string {
    const icons: Record<number, string> = {
      0: 'BookOpen',
      1: 'Compass',
      2: 'Scale',
      3: 'FileText',
      4: 'CheckCircle2',
      5: 'Award',
      6: 'Users',
      7: 'AlertTriangle',
      8: 'ShieldAlert',
      9: 'Bookmark',
    };
    return icons[topicNumber] || 'FileText';
  }

  private getModuleDescription(num: number, title: string): string {
    const descriptions: Record<number, string> = {
      0: 'Curriculum architecture, course objectives, delivery methods, and official operational acronym definitions.',
      1: 'Foundations of migration, regional mobility patterns, and One-Stop Border Post institutional concepts.',
      2: 'International conventions, regional protocols, EAC treaties, and national migration legal frameworks.',
      3: 'Classification, physical and biometric security features, verification protocols, visas, and EAC passes.',
      4: 'Entry and exit clearance compliance, sequence of controls, and handling exceptional border cases.',
      5: 'Ethics, human rights standards, professional integrity, and corruption prevention in border control.',
      6: 'Facilitating borderland communities, porous border management, and cross-border conflict resolution.',
      7: 'Detecting smuggling of migrants, human trafficking identification, and counter-terrorism measures.',
      8: 'Humanitarian border management, assisting vulnerable migrants, natural disasters, and health pandemics.',
      9: 'Comprehensive bibliography, statutory legal citations, and partner state agreements.',
    };
    return descriptions[num] || title;
  }
}
