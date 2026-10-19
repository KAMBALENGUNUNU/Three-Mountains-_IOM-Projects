import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="rte-wrapper" [class.focused]="isFocused" (click)="onWrapperClick($event)">
      <!-- Formatting Toolbar -->
      <div class="rte-toolbar" role="toolbar" aria-label="Text Formatting Toolbar" (mousedown)="$event.preventDefault()">
        <!-- History: Undo / Redo -->
        <div class="rte-btn-group">
          <button
            type="button"
            class="rte-btn"
            title="Undo (Ctrl+Z)"
            (click)="execCmd('undo')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
          </button>
          <button
            type="button"
            class="rte-btn"
            title="Redo (Ctrl+Y)"
            (click)="execCmd('redo')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Block style / Heading dropdown -->
        <div class="rte-btn-group">
          <select
            class="rte-select"
            [value]="currentBlockFormat"
            (change)="onBlockFormatChange($event)"
            title="Paragraph Style & Heading Level"
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="blockquote">Quote block</option>
            <option value="pre">Code block</option>
          </select>
        </div>

        <div class="rte-separator"></div>

        <!-- Inline text formatting -->
        <div class="rte-btn-group">
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.bold"
            title="Bold (Ctrl+B)"
            (click)="execCmd('bold')"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.italic"
            title="Italic (Ctrl+I)"
            (click)="execCmd('italic')"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.underline"
            title="Underline (Ctrl+U)"
            (click)="execCmd('underline')"
          >
            <span style="text-decoration: underline;">U</span>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.strikethrough"
            title="Strikethrough"
            (click)="execCmd('strikeThrough')"
          >
            <span style="text-decoration: line-through;">S</span>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Text alignment -->
        <div class="rte-btn-group">
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.align === 'left'"
            title="Align Left"
            (click)="setTextAlign('left')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.align === 'center'"
            title="Align Center"
            (click)="setTextAlign('center')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.align === 'right'"
            title="Align Right"
            (click)="setTextAlign('right')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.align === 'justify'"
            title="Justify"
            (click)="setTextAlign('justify')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Lists -->
        <div class="rte-btn-group">
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.unorderedList"
            title="Bulleted List"
            (click)="execCmd('insertUnorderedList')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.orderedList"
            title="Numbered List"
            (click)="execCmd('insertOrderedList')"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
          </button>
        </div>

        <div class="rte-separator"></div>

        <!-- Links -->
        <div class="rte-btn-group">
          <button
            type="button"
            class="rte-btn"
            [class.active]="activeStyles.isLink"
            title="Insert or Edit Link"
            (click)="openLinkModal()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          @if (activeStyles.isLink) {
            <button
              type="button"
              class="rte-btn"
              title="Remove Link"
              (click)="removeLink()"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          }
        </div>

        <div class="rte-separator"></div>

        <!-- Table Operations Dropdown / Buttons -->
        <div class="rte-btn-group rte-relative">
          <button
            type="button"
            class="rte-btn"
            [class.active]="showTableMenu"
            title="Table Tools (Insert & Manage)"
            (click)="toggleTableMenu()"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>
            </svg>
            <span style="font-size: 0.72rem; margin-left: 3px;">▼</span>
          </button>

          @if (showTableMenu) {
            <div class="rte-dropdown-menu" (mousedown)="$event.preventDefault()">
              <button type="button" class="rte-menu-item" (click)="openTableModal()">
                <span>➕ Insert New Table...</span>
              </button>
              <div class="rte-menu-divider"></div>
              <button type="button" class="rte-menu-item" (click)="insertTableRow('above')">
                <span>Add Row Above</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="insertTableRow('below')">
                <span>Add Row Below</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="deleteTableRow()">
                <span style="color: #dc2626;">Delete Current Row</span>
              </button>
              <div class="rte-menu-divider"></div>
              <button type="button" class="rte-menu-item" (click)="insertTableColumn('left')">
                <span>Add Column Left</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="insertTableColumn('right')">
                <span>Add Column Right</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="deleteTableColumn()">
                <span style="color: #dc2626;">Delete Current Column</span>
              </button>
              <div class="rte-menu-divider"></div>
              <button type="button" class="rte-menu-item" (click)="deleteEntireTable()">
                <span style="color: #dc2626; font-weight: 700;">Delete Table</span>
              </button>
            </div>
          }
        </div>

        <div class="rte-separator"></div>

        <!-- Overflow / More Menu -->
        <div class="rte-btn-group rte-relative">
          <button
            type="button"
            class="rte-btn"
            [class.active]="showMoreMenu"
            title="More Options"
            (click)="toggleMoreMenu()"
          >
            <span style="font-size: 0.95rem; font-weight: 800; line-height: 1;">•••</span>
          </button>

          @if (showMoreMenu) {
            <div class="rte-dropdown-menu rte-dropdown-right" (mousedown)="$event.preventDefault()">
              <button type="button" class="rte-menu-item" (click)="insertHorizontalRule()">
                <span>Horizontal Divider Line</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="execCmd('subscript')">
                <span>Subscript (x₂)</span>
              </button>
              <button type="button" class="rte-menu-item" (click)="execCmd('superscript')">
                <span>Superscript (x²)</span>
              </button>
              <div class="rte-menu-divider"></div>
              <button type="button" class="rte-menu-item" (click)="clearFormatting()">
                <span style="color: #b91c1c;">Clear Formatting</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Editable Content Surface -->
      <div
        #editorSurface
        class="rte-content"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        [attr.placeholder]="placeholder"
        (input)="onContentInput()"
        (blur)="onBlur()"
        (focus)="onFocus()"
        (keydown)="onKeyDown($event)"
        (keyup)="onKeyUp()"
        (mouseup)="onMouseUp()"
        (paste)="onPaste($event)"
      ></div>

      <!-- Link Insertion / Editing Modal Modal Dialog -->
      @if (showLinkModal) {
        <div class="rte-modal-backdrop" (mousedown)="$event.stopPropagation()">
          <div class="rte-modal-dialog">
            <h4 class="rte-modal-title">{{ editingExistingLink ? 'Edit Hyperlink' : 'Insert Hyperlink' }}</h4>
            <div class="rte-form-row">
              <label>Text to Display:</label>
              <input
                type="text"
                class="rte-input"
                [(ngModel)]="linkText"
                placeholder="Display text"
              />
            </div>
            <div class="rte-form-row">
              <label>Destination Web URL (href):</label>
              <input
                type="text"
                class="rte-input"
                [(ngModel)]="linkUrl"
                placeholder="https://example.com"
                (keydown.enter)="applyLink()"
              />
            </div>
            <div class="rte-modal-actions">
              <button type="button" class="rte-modal-btn cancel" (click)="closeLinkModal()">Cancel</button>
              <button type="button" class="rte-modal-btn save" (click)="applyLink()" [disabled]="!linkUrl.trim()">
                Save Link
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Table Insertion Modal Dialog -->
      @if (showTableModal) {
        <div class="rte-modal-backdrop" (mousedown)="$event.stopPropagation()">
          <div class="rte-modal-dialog">
            <h4 class="rte-modal-title">Insert Table</h4>
            <div class="rte-form-row" style="display: flex; gap: 1rem;">
              <div style="flex: 1;">
                <label>Rows:</label>
                <input
                  type="number"
                  class="rte-input"
                  min="1"
                  max="50"
                  [(ngModel)]="tableRows"
                />
              </div>
              <div style="flex: 1;">
                <label>Columns:</label>
                <input
                  type="number"
                  class="rte-input"
                  min="1"
                  max="20"
                  [(ngModel)]="tableCols"
                />
              </div>
            </div>
            <div class="rte-form-row">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" [(ngModel)]="tableHasHeader" />
                Include header row with shaded background
              </label>
            </div>
            <div class="rte-modal-actions">
              <button type="button" class="rte-modal-btn cancel" (click)="showTableModal = false">Cancel</button>
              <button type="button" class="rte-modal-btn save" (click)="confirmInsertTable()">
                Insert Table
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rte-wrapper {
      position: relative;
      background: #ffffff;
      border: 1px solid var(--line, #d5dce8);
      border-radius: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      display: flex;
      flex-direction: column;
    }
    .rte-wrapper.focused {
      border-color: var(--blue, #0035A0);
      box-shadow: 0 0 0 3px rgba(0, 53, 160, 0.12);
    }
    .rte-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 3px;
      padding: 6px 8px;
      background: #f8fafc;
      border-bottom: 1px solid var(--line, #d5dce8);
      border-radius: 8px 8px 0 0;
      user-select: none;
    }
    .rte-btn-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .rte-relative {
      position: relative;
    }
    .rte-separator {
      width: 1px;
      height: 20px;
      background: #e2e8f0;
      margin: 0 4px;
    }
    .rte-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      font-size: 0.88rem;
      font-family: inherit;
      color: #334155;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.1s ease;
    }
    .rte-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .rte-btn.active {
      background: #0035A0;
      color: #ffffff;
      border-color: #0035A0;
    }
    .rte-select {
      height: 28px;
      padding: 0 8px;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: inherit;
      color: #1e293b;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      cursor: pointer;
      outline: none;
    }
    .rte-select:focus {
      border-color: #0035A0;
    }
    .rte-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 50;
      margin-top: 4px;
      min-width: 190px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rte-dropdown-right {
      left: auto;
      right: 0;
    }
    .rte-menu-item {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      font-size: 0.82rem;
      font-weight: 500;
      color: #334155;
      background: transparent;
      border: 0;
      border-radius: 4px;
      text-align: left;
      cursor: pointer;
      transition: background 0.1s;
      width: 100%;
    }
    .rte-menu-item:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .rte-menu-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 3px 0;
    }
    .rte-content {
      min-height: 120px;
      max-height: 480px;
      overflow-y: auto;
      padding: 12px 14px;
      font-size: 1rem;
      line-height: 1.65;
      color: var(--ink, #1a1a1a);
      outline: none;
    }
    .rte-content:empty:before {
      content: attr(placeholder);
      color: #94a3b8;
      pointer-events: none;
      display: block;
    }
    .rte-content h2 {
      font-size: 1.4rem;
      font-weight: 800;
      margin: 0.8rem 0 0.4rem;
      color: #00143c;
    }
    .rte-content h3 {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0.7rem 0 0.35rem;
      color: #00143c;
    }
    .rte-content h4 {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0.6rem 0 0.3rem;
      color: #00143c;
    }
    .rte-content p {
      margin: 0 0 0.75rem;
    }
    .rte-content blockquote {
      margin: 0.8rem 0;
      padding: 0.6rem 1rem;
      background: #f8fafc;
      border-left: 4px solid #0035A0;
      border-radius: 0 4px 4px 0;
      color: #334155;
      font-style: italic;
    }
    .rte-content pre {
      background: #1e293b;
      color: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.88rem;
    }
    .rte-content ul, .rte-content ol {
      margin: 0.4rem 0 0.8rem;
      padding-left: 1.6rem;
    }
    .rte-content li {
      margin-bottom: 0.25rem;
    }
    .rte-content a {
      color: #0035A0;
      text-decoration: underline;
      cursor: pointer;
    }
    .rte-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8rem 0;
      font-size: 0.92rem;
    }
    .rte-content th, .rte-content td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .rte-content th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .rte-content hr {
      border: 0;
      height: 1px;
      background: #cbd5e1;
      margin: 1.2rem 0;
    }

    /* Modal dialogs */
    .rte-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      border-radius: 8px;
    }
    .rte-modal-dialog {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 420px;
      padding: 1.2rem 1.4rem;
    }
    .rte-modal-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin: 0 0 1rem;
      color: #0f172a;
    }
    .rte-form-row {
      margin-bottom: 0.9rem;
    }
    .rte-form-row label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.35rem;
    }
    .rte-input {
      width: 100%;
      height: 2.3rem;
      padding: 0 0.75rem;
      font-size: 0.92rem;
      font-family: inherit;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      outline: none;
    }
    .rte-input:focus {
      border-color: #0035A0;
      box-shadow: 0 0 0 2px rgba(0, 53, 160, 0.15);
    }
    .rte-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 1.2rem;
    }
    .rte-modal-btn {
      height: 2.2rem;
      padding: 0 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    .rte-modal-btn.cancel {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .rte-modal-btn.save {
      background: #0035A0;
      color: #ffffff;
      border: 1px solid #0035A0;
    }
    .rte-modal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class RichTextEditorComponent implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {
  @Input() placeholder: string = 'Enter text here...';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('editorSurface', { static: true }) editorSurface!: ElementRef<HTMLDivElement>;

  isFocused = false;
  showTableMenu = false;
  showMoreMenu = false;
  showLinkModal = false;
  showTableModal = false;

  currentBlockFormat = 'p';
  activeStyles = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    unorderedList: false,
    orderedList: false,
    align: 'left',
    isLink: false,
  };

  // Link dialog state
  linkUrl = '';
  linkText = '';
  editingExistingLink = false;
  private savedRange: Range | null = null;
  private currentLinkElement: HTMLAnchorElement | null = null;

  // Table dialog state
  tableRows = 3;
  tableCols = 3;
  tableHasHeader = true;

  // Value accessor callbacks
  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit() {
    this.updateSurfaceHtml(this.value);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].firstChange) {
      const incoming = changes['value'].currentValue || '';
      if (incoming !== this.getSurfaceHtml()) {
        this.updateSurfaceHtml(incoming);
      }
    }
  }

  ngOnDestroy() {
    // cleanup
  }

  // --- ControlValueAccessor ---
  writeValue(val: string): void {
    const safeVal = val || '';
    if (safeVal !== this.getSurfaceHtml()) {
      this.updateSurfaceHtml(safeVal);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    if (this.editorSurface) {
      this.editorSurface.nativeElement.contentEditable = isDisabled ? 'false' : 'true';
    }
  }

  // --- Interaction & Event Handlers ---
  onWrapperClick(event: MouseEvent) {
    // If clicked on empty space inside wrapper but outside toolbar/modals, focus surface
    if (event.target === this.editorSurface.nativeElement) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.rte-toolbar') && !target.closest('.rte-modal-dialog')) {
      this.editorSurface.nativeElement.focus();
    }
  }

  onFocus() {
    this.isFocused = true;
    this.updateActiveFormatting();
  }

  onBlur() {
    this.isFocused = false;
    this.onTouched();
    this.saveSelection();
  }

  onKeyUp() {
    this.updateActiveFormatting();
    this.emitChange();
  }

  onMouseUp() {
    this.updateActiveFormatting();
    this.saveSelection();
  }

  onContentInput() {
    this.emitChange();
    this.updateActiveFormatting();
  }

  onKeyDown(event: KeyboardEvent) {
    // Global hotkeys for Windows/Mac
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        this.execCmd('bold');
      } else if (key === 'i') {
        event.preventDefault();
        this.execCmd('italic');
      } else if (key === 'u') {
        event.preventDefault();
        this.execCmd('underline');
      } else if (key === 'z') {
        if (event.shiftKey) {
          event.preventDefault();
          this.execCmd('redo');
        } else {
          event.preventDefault();
          this.execCmd('undo');
        }
      } else if (key === 'y') {
        event.preventDefault();
        this.execCmd('redo');
      }
    }
  }

  // --- Intelligent Clipboard Paste ---
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const htmlData = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');

    if (htmlData && htmlData.trim()) {
      const sanitizedHtml = this.sanitizeAndCleanHtml(htmlData);
      this.insertHtmlAtCursor(sanitizedHtml);
    } else if (plainText) {
      // Split paragraphs gracefully
      const paragraphs = plainText
        .split(/\r?\n\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (paragraphs.length <= 1) {
        this.insertTextAtCursor(plainText);
      } else {
        const html = paragraphs
          .map((p) => `<p>${this.escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
          .join('');
        this.insertHtmlAtCursor(html);
      }
    }

    this.emitChange();
    this.updateActiveFormatting();
  }

  // --- HTML Sanitizer & Normalizer ---
  private sanitizeAndCleanHtml(rawHtml: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove unwanted Word comments, xml blocks, scripts, and meta tags
    const badTags = doc.querySelectorAll('script, style, meta, link, object, embed, iframe, applet');
    badTags.forEach((el) => el.remove());

    const cleanNode = (node: Node): Node | null => {
      if (node.nodeType === Node.COMMENT_NODE) {
        return null;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || '');
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        // Check allowed element tags
        const allowedTags = new Set([
          'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i',
          'u', 's', 'strike', 'del', 'blockquote', 'pre', 'code', 'ul', 'ol',
          'li', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'hr', 'br', 'span'
        ]);

        if (!allowedTags.has(tag)) {
          // Flatten wrapper: replace this node with its processed children
          const fragment = document.createDocumentFragment();
          el.childNodes.forEach((child) => {
            const cleanedChild = cleanNode(child);
            if (cleanedChild) fragment.appendChild(cleanedChild);
          });
          return fragment;
        }

        // Map tag aliases to standard tags
        let targetTag = tag;
        if (targetTag === 'strike' || targetTag === 'del') targetTag = 's';
        if (targetTag === 'h1') targetTag = 'h2'; // Keep page hierarchy consistent

        const newEl = document.createElement(targetTag);

        // Preserve meaningful styles: text-align
        const textAlign = el.style.textAlign;
        if (textAlign && ['left', 'center', 'right', 'justify'].includes(textAlign)) {
          newEl.style.textAlign = textAlign;
        }

        // Preserve links with safe target/rel
        if (targetTag === 'a') {
          const href = el.getAttribute('href') || '';
          if (href && !href.trim().toLowerCase().startsWith('javascript:')) {
            newEl.setAttribute('href', href);
            newEl.setAttribute('target', '_blank');
            newEl.setAttribute('rel', 'noopener noreferrer');
          }
        }

        // Preserve table column spans / row spans
        if (targetTag === 'td' || targetTag === 'th') {
          const colspan = el.getAttribute('colspan');
          const rowspan = el.getAttribute('rowspan');
          if (colspan) newEl.setAttribute('colspan', colspan);
          if (rowspan) newEl.setAttribute('rowspan', rowspan);
        }

        // Recursively clean children
        el.childNodes.forEach((child) => {
          const cleanedChild = cleanNode(child);
          if (cleanedChild) newEl.appendChild(cleanedChild);
        });

        return newEl;
      }

      return null;
    };

    const container = document.createElement('div');
    doc.body.childNodes.forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) container.appendChild(cleaned);
    });

    return container.innerHTML.trim();
  }

  // --- Insertion Helpers ---
  private insertHtmlAtCursor(html: string) {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node: ChildNode | null;
    let lastNode: ChildNode | null = null;
    while ((node = tempDiv.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);

    if (lastNode) {
      const newRange = range.cloneRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  private insertTextAtCursor(text: string) {
    this.restoreSelection();
    document.execCommand('insertText', false, text);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Toolbar Commands & Execution ---
  execCmd(cmd: string, val: string = '') {
    this.restoreSelection();
    document.execCommand(cmd, false, val);
    this.emitChange();
    this.updateActiveFormatting();
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'justify') {
    this.restoreSelection();
    const cmdMap: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    document.execCommand(cmdMap[align], false);
    this.emitChange();
    this.updateActiveFormatting();
  }

  onBlockFormatChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.currentBlockFormat = val;
    this.restoreSelection();
    document.execCommand('formatBlock', false, `<${val}>`);
    this.emitChange();
    this.updateActiveFormatting();
  }

  insertHorizontalRule() {
    this.showMoreMenu = false;
    this.execCmd('insertHorizontalRule');
  }

  clearFormatting() {
    this.showMoreMenu = false;
    this.execCmd('removeFormat');
  }

  // --- Link Operations ---
  openLinkModal() {
    this.saveSelection();
    const sel = window.getSelection();
    let text = '';
    let href = '';
    this.currentLinkElement = null;

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      text = range.toString();

      // Check if inside an anchor
      let node: Node | null = range.commonAncestorContainer;
      while (node && node !== this.editorSurface.nativeElement) {
        if (node.nodeName.toLowerCase() === 'a') {
          this.currentLinkElement = node as HTMLAnchorElement;
          href = this.currentLinkElement.getAttribute('href') || '';
          text = this.currentLinkElement.innerText;
          break;
        }
        node = node.parentNode;
      }
    }

    this.linkText = text;
    this.linkUrl = href || 'https://';
    this.editingExistingLink = !!this.currentLinkElement;
    this.showLinkModal = true;
  }

  closeLinkModal() {
    this.showLinkModal = false;
    this.linkUrl = '';
    this.linkText = '';
    this.currentLinkElement = null;
    this.restoreSelection();
  }

  applyLink() {
    const url = this.linkUrl.trim();
    if (!url) return;

    this.restoreSelection();

    if (this.currentLinkElement) {
      this.currentLinkElement.setAttribute('href', url);
      this.currentLinkElement.setAttribute('target', '_blank');
      this.currentLinkElement.setAttribute('rel', 'noopener noreferrer');
      if (this.linkText.trim()) {
        this.currentLinkElement.innerText = this.linkText.trim();
      }
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const textToUse = this.linkText.trim() || url;
        const aHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(textToUse)}</a>`;
        this.insertHtmlAtCursor(aHtml);
      }
    }

    this.showLinkModal = false;
    this.currentLinkElement = null;
    this.emitChange();
    this.updateActiveFormatting();
  }

  removeLink() {
    this.restoreSelection();
    document.execCommand('unlink', false);
    this.emitChange();
    this.updateActiveFormatting();
  }

  // --- Table Operations ---
  toggleTableMenu() {
    this.saveSelection();
    this.showTableMenu = !this.showTableMenu;
    if (this.showTableMenu) {
      this.showMoreMenu = false;
    }
  }

  toggleMoreMenu() {
    this.saveSelection();
    this.showMoreMenu = !this.showMoreMenu;
    if (this.showMoreMenu) {
      this.showTableMenu = false;
    }
  }

  openTableModal() {
    this.showTableMenu = false;
    this.tableRows = 3;
    this.tableCols = 3;
    this.tableHasHeader = true;
    this.showTableModal = true;
  }

  confirmInsertTable() {
    this.showTableModal = false;
    this.restoreSelection();

    let html = '<table>';
    if (this.tableHasHeader) {
      html += '<thead><tr>';
      for (let c = 0; c < this.tableCols; c++) {
        html += `<th>Header ${c + 1}</th>`;
      }
      html += '</tr></thead>';
    }

    html += '<tbody>';
    for (let r = 0; r < this.tableRows; r++) {
      html += '<tr>';
      for (let c = 0; c < this.tableCols; c++) {
        html += `<td>Cell ${r + 1},${c + 1}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    this.insertHtmlAtCursor(html);
    this.emitChange();
  }

  private findParentTableElement(type: 'tr' | 'table' | 'td'): HTMLElement | null {
    this.restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
    while (node && node !== this.editorSurface.nativeElement) {
      if (node.nodeName.toLowerCase() === type || (type === 'td' && node.nodeName.toLowerCase() === 'th')) {
        return node as HTMLElement;
      }
      node = node.parentNode;
    }
    return null;
  }

  insertTableRow(position: 'above' | 'below') {
    this.showTableMenu = false;
    const tr = this.findParentTableElement('tr') as HTMLTableRowElement | null;
    if (!tr) {
      alert('Please place your cursor inside a table row first.');
      return;
    }
    const cols = tr.children.length;
    const newTr = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      const td = document.createElement('td');
      td.innerHTML = '&nbsp;';
      newTr.appendChild(td);
    }
    if (position === 'above') {
      tr.parentNode?.insertBefore(newTr, tr);
    } else {
      tr.parentNode?.insertBefore(newTr, tr.nextSibling);
    }
    this.emitChange();
  }

  deleteTableRow() {
    this.showTableMenu = false;
    const tr = this.findParentTableElement('tr');
    if (!tr) {
      alert('Please place your cursor inside a table row first.');
      return;
    }
    const tbody = tr.parentNode;
    tr.remove();
    if (tbody && !tbody.hasChildNodes()) {
      tbody.parentElement?.remove();
    }
    this.emitChange();
  }

  insertTableColumn(position: 'left' | 'right') {
    this.showTableMenu = false;
    const cell = this.findParentTableElement('td') as HTMLTableCellElement | null;
    const table = this.findParentTableElement('table') as HTMLTableElement | null;
    if (!cell || !table) {
      alert('Please place your cursor inside a table cell first.');
      return;
    }
    const colIndex = cell.cellIndex;
    const rows = Array.from(table.rows);
    rows.forEach((row) => {
      const isHeader = row.parentElement?.tagName.toLowerCase() === 'thead' || row.firstElementChild?.tagName.toLowerCase() === 'th';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = isHeader ? 'Col' : '&nbsp;';
      if (position === 'left') {
        row.insertBefore(newCell, row.cells[colIndex]);
      } else {
        row.insertBefore(newCell, row.cells[colIndex + 1] || null);
      }
    });
    this.emitChange();
  }

  deleteTableColumn() {
    this.showTableMenu = false;
    const cell = this.findParentTableElement('td') as HTMLTableCellElement | null;
    const table = this.findParentTableElement('table') as HTMLTableElement | null;
    if (!cell || !table) {
      alert('Please place your cursor inside a table cell first.');
      return;
    }
    const colIndex = cell.cellIndex;
    const rows = Array.from(table.rows);
    rows.forEach((row) => {
      if (row.cells[colIndex]) {
        row.deleteCell(colIndex);
      }
    });
    if (table.rows.length === 0 || table.rows[0].cells.length === 0) {
      table.remove();
    }
    this.emitChange();
  }

  deleteEntireTable() {
    this.showTableMenu = false;
    const table = this.findParentTableElement('table');
    if (table) {
      table.remove();
      this.emitChange();
    } else {
      alert('Please place your cursor inside a table to delete it.');
    }
  }

  // --- Selection State Preservation ---
  private saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (this.editorSurface.nativeElement.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  private restoreSelection() {
    if (this.savedRange) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this.savedRange);
      }
    }
  }

  private updateActiveFormatting() {
    try {
      this.activeStyles.bold = document.queryCommandState('bold');
      this.activeStyles.italic = document.queryCommandState('italic');
      this.activeStyles.underline = document.queryCommandState('underline');
      this.activeStyles.strikethrough = document.queryCommandState('strikeThrough');
      this.activeStyles.unorderedList = document.queryCommandState('insertUnorderedList');
      this.activeStyles.orderedList = document.queryCommandState('insertOrderedList');

      // Detect current block format
      const blockTag = (document.queryCommandValue('formatBlock') || 'p').toLowerCase().replace(/[<>]/g, '');
      this.currentBlockFormat = ['p', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(blockTag) ? blockTag : 'p';

      // Detect link & alignment
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        let foundLink = false;
        let foundAlign = 'left';

        while (node && node !== this.editorSurface.nativeElement) {
          if (node.nodeName.toLowerCase() === 'a') {
            foundLink = true;
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const align = (node as HTMLElement).style.textAlign;
            if (align && ['left', 'center', 'right', 'justify'].includes(align)) {
              foundAlign = align;
            }
          }
          node = node.parentNode;
        }

        this.activeStyles.isLink = foundLink;
        this.activeStyles.align = foundAlign;
      }
    } catch {
      // Ignored if queryCommandState is unavailable
    }
  }

  private updateSurfaceHtml(html: string) {
    if (this.editorSurface) {
      this.editorSurface.nativeElement.innerHTML = html;
    }
  }

  private getSurfaceHtml(): string {
    return this.editorSurface ? this.editorSurface.nativeElement.innerHTML : '';
  }

  private emitChange() {
    let html = this.getSurfaceHtml();
    // Normalize empty content
    if (html === '<p><br></p>' || html === '<br>' || html === '<div><br></div>') {
      html = '';
    }
    this.value = html;
    this.valueChange.emit(html);
    this.onChange(html);
  }
}
