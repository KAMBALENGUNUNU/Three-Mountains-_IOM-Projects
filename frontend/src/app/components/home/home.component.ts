import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContentTree, Section, SubTopic } from '../../models/field-guide.models';
import { ManualService } from '../../services/manual.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon/icon.component';
import { AdminModalComponent } from '../admin-modal/admin-modal.component';
import { DeleteConfirmModalComponent } from '../delete-confirm-modal/delete-confirm-modal.component';
import { EditSectionModalComponent } from '../edit-section-modal/edit-section-modal.component';
import { AddSectionModalComponent } from '../add-section-modal/add-section-modal.component';
import { AddPageModalComponent } from '../add-page-modal/add-page-modal.component';
import { EditPageModalComponent } from '../edit-page-modal/edit-page-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IconComponent,
    AdminModalComponent,
    DeleteConfirmModalComponent,
    EditSectionModalComponent,
    AddSectionModalComponent,
    AddPageModalComponent,
    EditPageModalComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  tree = signal<ContentTree | null>(null);
  loading = signal(false);
  adminModalOpen = signal(false);

  openTopics = signal<Record<string, boolean>>({});
  activeSubtopicId = signal<string | null>(null);
  previewTexts = signal<Record<string, string>>({});
  previewImages = signal<Record<string, string>>({});
  loadingPreview = signal<string | null>(null);

  // Reordering State
  reorderingSection = signal(false);
  reorderingPage = signal(false);
  draggedSectionIndex: number | null = null;
  draggedPageInfo: { sectionId: string; pageIndex: number } | null = null;

  // Edit Page Modal State
  editModalOpen = signal(false);
  selectedSubtopicId = signal<string>('');

  // Section Settings Modal State
  moduleModalOpen = signal(false);
  selectedModule = signal<Section | null>(null);

  // Add Section Modal State
  addSectionModalOpen = signal(false);

  // Add Page Modal State
  addPageModalOpen = signal(false);
  addPageDefaultTopicId = signal<number | null>(null);

  // Delete Warning Confirmation Modal State
  deleteModalOpen = signal(false);
  deleteModalType = signal<'page' | 'module'>('page');
  deleteModalTargetId = signal<string | number | null>(null);
  deleteModalTargetTitle = signal<string>('');
  deleteModalItemCount = signal<number>(0);
  deleteModalExecuting = signal(false);
  deleteModalError = signal('');

  // Dropdown list computed from tree
  readonly allSubtopicsList = computed(() => {
    const t = this.tree();
    if (!t) return [];
    const list: { id: string; label: string }[] = [];
    t.sections.forEach((sec) => {
      sec.topics.forEach((top) => {
        top.subtopics.forEach((sub) => {
          list.push({
            id: sub.id,
            label: `${sec.title} → ${sub.title}`,
          });
        });
      });
    });
    return list;
  });

  readonly coreModules = computed<Section[]>(() => {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => {
      if (s.order === 0) return false;
      const lower = s.title.toLowerCase();
      if (
        lower.includes('reference') ||
        lower.includes('bibliography') ||
        lower.includes('preliminar')
      ) {
        return false;
      }
      return true;
    });
  });

  readonly referenceSections = computed<Section[]>(() => {
    const t = this.tree();
    if (!t) return [];
    return t.sections.filter((s) => {
      if (s.order === 0) return true;
      const lower = s.title.toLowerCase();
      return (
        lower.includes('reference') ||
        lower.includes('bibliography') ||
        lower.includes('preliminar')
      );
    });
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private manualService: ManualService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.loadTree().then(() => {
      this.checkRouteForEditRequest();
    });
  }

  private checkRouteForEditRequest() {
    const editPageId = this.route.snapshot.queryParamMap.get('editPageId');
    if (editPageId) {
      this.selectedSubtopicId.set(editPageId);
      this.editModalOpen.set(true);
      // Clean query params from URL without reload
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editPageId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  async loadTree(forceRefresh: boolean = false) {
    const cached = this.manualService.getCachedTree();
    if (!forceRefresh && cached) {
      this.tree.set(cached);
      this.loading.set(false);
      return;
    }

    try {
      this.loading.set(true);
      const data = await this.manualService.fetchContentTree(forceRefresh);
      this.tree.set(data);
    } catch {
      this.tree.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  isTopicOpen(no: string): boolean {
    return !!this.openTopics()[no];
  }

  toggleTopic(no: string) {
    const map = { ...this.openTopics() };
    map[no] = !map[no];
    this.openTopics.set(map);
  }

  formatSnippet(text: string | undefined, title: string): string {
    if (!text || !text.trim()) {
      return `Standard operating guidance for ${title}.`;
    }
    // 1. Strip custom media tags [media:...] and markdown images ![alt](url)
    let clean = text
      .replace(/\[media:(?:left|right|full)(?:\|[^\]|]+)*\|[^\]]+\]/gi, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '');

    // 2. Strip HTML tags
    clean = clean.replace(/<[^>]+>/g, ' ');

    // 3. Decode common HTML entities
    clean = clean
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'");

    // 4. Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();
    if (!clean) {
      return `Standard operating guidance for ${title}.`;
    }

    const firstSentenceMatch = clean.match(/^([^.!?]+[.!?])/);
    let snippet = firstSentenceMatch ? firstSentenceMatch[1].trim() : clean;
    if (snippet.length > 130) {
      snippet = snippet.substring(0, 127).trim() + '...';
    }
    return snippet;
  }

  async toggleSubtopic(sub: SubTopic) {
    if (this.activeSubtopicId() === sub.id) {
      this.activeSubtopicId.set(null);
      return;
    }
    this.activeSubtopicId.set(sub.id);

    if (!this.previewTexts()[sub.id]) {
      if (sub.overview && sub.overview.trim()) {
        const cleanOverview = sub.overview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const snippet =
          cleanOverview.length > 130
            ? cleanOverview.substring(0, 127).trim() + '...'
            : cleanOverview;
        this.previewTexts.update((p) => ({ ...p, [sub.id]: snippet }));
        return;
      }

      this.loadingPreview.set(sub.id);
      try {
        const article = await this.manualService.fetchArticle(sub.id);
        let excerpt: string;
        if (article.overview && article.overview.trim()) {
          const cleanArtOverview = article.overview.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          excerpt =
            cleanArtOverview.length > 130
              ? cleanArtOverview.substring(0, 127).trim() + '...'
              : cleanArtOverview;
        } else {
          const para = article.content.find((b) => b.type === 'paragraph' || b.type === 'media-text')?.text;
          excerpt = this.formatSnippet(para, sub.title);
        }
        this.previewTexts.update((p) => ({ ...p, [sub.id]: excerpt }));
      } catch {
        this.previewTexts.update((p) => ({
          ...p,
          [sub.id]: this.formatSnippet(undefined, sub.title),
        }));
      } finally {
        this.loadingPreview.set(null);
      }
    }
  }

  getAllSubtopics(sec: Section): SubTopic[] {
    const list: SubTopic[] = [];
    sec.topics.forEach((top) => {
      top.subtopics.forEach((sub) => list.push(sub));
    });
    list.sort((a, b) => ((a.orderIndex ?? a.order) - (b.orderIndex ?? b.order)));
    return list;
  }

  private updateSectionNumberInTitle(title: string, newNumber: number): string {
    if (/^section\s*\d*[:.-]?\s*/i.test(title)) {
      return title.replace(/^section\s*\d*[:.-]?\s*/i, `Section ${newNumber}: `);
    }
    if (/^module\s*\d*[:.-]?\s*/i.test(title)) {
      return title.replace(/^module\s*\d*[:.-]?\s*/i, `Section ${newNumber}: `);
    }
    return `Section ${newNumber}: ${title}`;
  }

  async moveSection(fromIndex: number, direction: -1 | 1) {
    const targetIndex = fromIndex + direction;
    const modules = this.coreModules();
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    await this.reorderSectionToIndex(fromIndex, targetIndex);
  }

  async reorderSectionToIndex(fromIndex: number, toIndex: number) {
    const currentTree = this.tree();
    if (!currentTree || this.reorderingSection()) return;

    const coreList = [...this.coreModules()];
    if (fromIndex < 0 || fromIndex >= coreList.length || toIndex < 0 || toIndex >= coreList.length) return;

    const [moved] = coreList.splice(fromIndex, 1);
    coreList.splice(toIndex, 0, moved);

    // Renumber orders 1..N and update titles
    coreList.forEach((sec, idx) => {
      const newNum = idx + 1;
      sec.order = newNum;
      sec.title = this.updateSectionNumberInTitle(sec.title, newNum);
    });

    const coreRawIds = new Set(coreList.map((s) => s.rawId));
    const nonCoreBefore = currentTree.sections.filter((s) => s.order === 0 && !coreRawIds.has(s.rawId));
    const nonCoreAfter = currentTree.sections.filter((s) => s.order !== 0 && !coreRawIds.has(s.rawId));
    const updatedSections = [...nonCoreBefore, ...coreList, ...nonCoreAfter];
    this.tree.set({ ...currentTree, sections: updatedSections });

    const topicIds = coreList
      .map((s) => s.rawId)
      .filter((id): id is number => typeof id === 'number');

    try {
      this.reorderingSection.set(true);
      await this.manualService.reorderTopics(topicIds);
    } catch (err) {
      console.error('Failed to save section order:', err);
      await this.loadTree();
    } finally {
      this.reorderingSection.set(false);
    }
  }

  onSectionDragStart(event: DragEvent, index: number) {
    this.draggedSectionIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `section:${index}`);
    }
  }

  onSectionDragOver(event: DragEvent) {
    if (this.draggedSectionIndex !== null) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  async onSectionDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (this.draggedSectionIndex === null || this.draggedSectionIndex === targetIndex) {
      this.draggedSectionIndex = null;
      return;
    }
    const from = this.draggedSectionIndex;
    this.draggedSectionIndex = null;
    await this.reorderSectionToIndex(from, targetIndex);
  }

  async movePage(section: Section, fromIndex: number, direction: -1 | 1) {
    const targetIndex = fromIndex + direction;
    const pages = this.getAllSubtopics(section);
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    await this.reorderPageToIndex(section, fromIndex, targetIndex);
  }

  async reorderPageToIndex(section: Section, fromIndex: number, toIndex: number) {
    if (this.reorderingPage()) return;
    const pages = [...this.getAllSubtopics(section)];
    if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return;

    const [moved] = pages.splice(fromIndex, 1);
    pages.splice(toIndex, 0, moved);

    // Update order numbers sequentially
    pages.forEach((p, idx) => {
      p.order = idx + 1;
      p.orderIndex = idx + 1;
    });

    const currentTree = this.tree();
    if (currentTree) {
      this.tree.set({ ...currentTree });
    }

    const sectionIds = pages
      .map((p) => Number(p.id))
      .filter((id) => !isNaN(id) && id > 0);

    try {
      this.reorderingPage.set(true);
      await this.manualService.reorderSections(sectionIds);
    } catch (err) {
      console.error('Failed to save page order:', err);
      await this.loadTree();
    } finally {
      this.reorderingPage.set(false);
    }
  }

  onPageDragStart(event: DragEvent, section: Section, pageIndex: number) {
    this.draggedPageInfo = { sectionId: section.id, pageIndex };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `page:${section.id}:${pageIndex}`);
    }
  }

  onPageDragOver(event: DragEvent) {
    if (this.draggedPageInfo !== null) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  async onPageDrop(event: DragEvent, section: Section, targetIndex: number) {
    event.preventDefault();
    if (
      !this.draggedPageInfo ||
      this.draggedPageInfo.sectionId !== section.id ||
      this.draggedPageInfo.pageIndex === targetIndex
    ) {
      this.draggedPageInfo = null;
      return;
    }
    const from = this.draggedPageInfo.pageIndex;
    this.draggedPageInfo = null;
    await this.reorderPageToIndex(section, from, targetIndex);
  }

  getTintClass(order: number): string {
    const rem = order % 3;
    if (rem === 1) return 't1';
    if (rem === 2) return 't2';
    return 't0';
  }

  getIconName(order: number): string {
    if (order >= 1 && order <= 8) return `t${order}`;
    return 't0';
  }

  openArticle(subtopicId: string) {
    this.router.navigate(['/p', subtopicId]);
  }

  // --- Modal Openers & Handlers ---

  openAdminModal() {
    this.adminModalOpen.set(true);
  }

  closeAdminModal() {
    this.adminModalOpen.set(false);
  }

  openContentEditor() {
    const all = this.allSubtopicsList();
    if (all.length > 0) {
      const targetId = this.selectedSubtopicId() || all[0].id;
      this.selectedSubtopicId.set(targetId);
    }
    this.editModalOpen.set(true);
  }

  openDirectEdit(sub: SubTopic) {
    this.selectedSubtopicId.set(sub.id);
    this.editModalOpen.set(true);
  }

  async onPageSaved(event: {
    isDraft: boolean;
    id: string;
    title: string;
    overview: string;
    imageUrl: string;
    content: string;
  }) {
    if (!event.isDraft) {
      const cleanOverview = event.overview.trim().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.previewTexts.update((p) => ({
        ...p,
        [event.id]: cleanOverview || this.formatSnippet(event.content, event.title),
      }));
      this.previewImages.update((p) => ({
        ...p,
        [event.id]: event.imageUrl,
      }));
    }
    await this.loadTree();
  }

  openModuleEditor(sec: Section) {
    this.selectedModule.set(sec);
    this.moduleModalOpen.set(true);
  }

  closeModuleEditor() {
    this.moduleModalOpen.set(false);
  }

  async onSectionUpdated() {
    this.closeModuleEditor();
    await this.loadTree();
  }

  openAddSectionModal() {
    this.addSectionModalOpen.set(true);
  }

  closeAddSectionModal() {
    this.addSectionModalOpen.set(false);
  }

  async onSectionCreated() {
    this.closeAddSectionModal();
    await this.loadTree();
  }

  openAddPageModal(section?: Section) {
    if (section && typeof section.rawId === 'number') {
      this.addPageDefaultTopicId.set(section.rawId);
    } else {
      this.addPageDefaultTopicId.set(null);
    }
    this.addPageModalOpen.set(true);
  }

  closeAddPageModal() {
    this.addPageModalOpen.set(false);
  }

  async onPageCreated() {
    this.closeAddPageModal();
    await this.loadTree();
  }

  // --- Delete Confirmation Modal Methods ---

  confirmDeletePage(subId: string | number, title: string) {
    this.deleteModalType.set('page');
    this.deleteModalTargetId.set(subId);
    this.deleteModalTargetTitle.set(title || 'this page');
    this.deleteModalItemCount.set(0);
    this.deleteModalError.set('');
    this.deleteModalOpen.set(true);
  }

  confirmDeleteModule(sec: Section) {
    if (!sec.rawId) {
      alert('Cannot delete this section because its database ID is missing.');
      return;
    }
    const subCount = this.getAllSubtopics(sec).length;
    this.deleteModalType.set('module');
    this.deleteModalTargetId.set(sec.rawId);
    this.deleteModalTargetTitle.set(sec.title);
    this.deleteModalItemCount.set(subCount);
    this.deleteModalError.set('');
    this.deleteModalOpen.set(true);
  }

  closeDeleteModal() {
    if (this.deleteModalExecuting()) return;
    this.deleteModalOpen.set(false);
    this.deleteModalTargetId.set(null);
    this.deleteModalError.set('');
  }

  async executeConfirmedDelete() {
    const targetId = this.deleteModalTargetId();
    if (!targetId) return;

    this.deleteModalExecuting.set(true);
    this.deleteModalError.set('');

    try {
      if (this.deleteModalType() === 'page') {
        await this.manualService.deleteSection(String(targetId));
        if (this.activeSubtopicId() === String(targetId)) {
          this.activeSubtopicId.set(null);
        }
        if (this.editModalOpen()) {
          this.editModalOpen.set(false);
        }
        this.closeDeleteModal();
        await this.loadTree();
      } else {
        await this.manualService.deleteTopic(Number(targetId));
        if (this.moduleModalOpen()) {
          this.closeModuleEditor();
        }
        this.closeDeleteModal();
        await this.loadTree();
      }
    } catch (err: any) {
      this.deleteModalError.set(err?.message || 'Failed to execute deletion.');
    } finally {
      this.deleteModalExecuting.set(false);
    }
  }
}
