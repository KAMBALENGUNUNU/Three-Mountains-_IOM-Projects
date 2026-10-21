import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  signal,
  SimpleChanges,
  OnChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-image-crop-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div class="crop-modal-backdrop" (click)="onCancel()">
        <div class="crop-modal-card" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="crop-header">
            <div>
              <span class="crop-sub">Image Studio</span>
              <h3 class="crop-title">{{ title || 'Manual Crop & Resize' }}</h3>
            </div>
            <button type="button" class="btn-close" (click)="onCancel()" title="Cancel (Esc)">&times;</button>
          </div>

          <!-- Controls Toolbar -->
          <div class="crop-toolbar">
            <!-- Aspect Ratio Presets -->
            <div class="toolbar-group">
              <span class="toolbar-label">Crop Ratio:</span>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="aspectRatioMode() === 'free'"
                  (click)="setAspectRatioMode('free')"
                >
                  Freeform
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="aspectRatioMode() === '16-9'"
                  (click)="setAspectRatioMode('16-9')"
                >
                  16:9
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="aspectRatioMode() === '4-3'"
                  (click)="setAspectRatioMode('4-3')"
                >
                  4:3
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="aspectRatioMode() === '1-1'"
                  (click)="setAspectRatioMode('1-1')"
                >
                  1:1 Square
                </button>
              </div>
            </div>

            <!-- Target Output Width Resize -->
            <div class="toolbar-group">
              <span class="toolbar-label">Output Width:</span>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="targetOutputWidth() === 0"
                  (click)="setTargetOutputWidth(0)"
                  title="Keep natural resolution of the cropped area"
                >
                  Natural
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="targetOutputWidth() === 400"
                  (click)="setTargetOutputWidth(400)"
                >
                  400px
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="targetOutputWidth() === 650"
                  (click)="setTargetOutputWidth(650)"
                >
                  650px
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="targetOutputWidth() === 900"
                  (click)="setTargetOutputWidth(900)"
                >
                  900px
                </button>
              </div>
            </div>

            <!-- Rotate & Reset -->
            <div class="toolbar-group" style="margin-left: auto;">
              <button
                type="button"
                class="btn-tool"
                (click)="rotateClockwise()"
                title="Rotate 90 degrees clockwise"
              >
                ↻ Rotate 90°
              </button>
              <button
                type="button"
                class="btn-tool"
                (click)="resetCrop()"
                title="Reset crop selection to full image"
              >
                Reset
              </button>
            </div>
          </div>

          <!-- Interactive Workspace -->
          <div class="crop-workspace" #workspaceContainer>
            @if (loading()) {
              <div class="crop-loading">Loading image for editing...</div>
            } @else {
              <div
                class="crop-stage"
                [style.width.px]="stageWidth()"
                [style.height.px]="stageHeight()"
                #stageElement
              >
                <!-- Base Image -->
                <img
                  [src]="loadedImageSrc"
                  alt="Crop preview"
                  class="crop-image-base"
                  [style.transform]="'rotate(' + rotationDegrees() + 'deg)'"
                />

                <!-- Dimmed Mask Overlay with Cutout -->
                <div class="crop-mask-top" [style.height.px]="crop().y"></div>
                <div
                  class="crop-mask-bottom"
                  [style.top.px]="crop().y + crop().height"
                  [style.height.px]="stageHeight() - (crop().y + crop().height)"
                ></div>
                <div
                  class="crop-mask-left"
                  [style.top.px]="crop().y"
                  [style.width.px]="crop().x"
                  [style.height.px]="crop().height"
                ></div>
                <div
                  class="crop-mask-right"
                  [style.top.px]="crop().y"
                  [style.left.px]="crop().x + crop().width"
                  [style.width.px]="stageWidth() - (crop().x + crop().width)"
                  [style.height.px]="crop().height"
                ></div>

                <!-- Crop Box Window & Handles -->
                <div
                  class="crop-box"
                  [style.left.px]="crop().x"
                  [style.top.px]="crop().y"
                  [style.width.px]="crop().width"
                  [style.height.px]="crop().height"
                  (mousedown)="startDrag($event, 'move')"
                  (touchstart)="startDrag($event, 'move')"
                >
                  <!-- Rule-of-thirds grid lines -->
                  <div class="crop-grid-h1"></div>
                  <div class="crop-grid-h2"></div>
                  <div class="crop-grid-v1"></div>
                  <div class="crop-grid-v2"></div>

                  <!-- 8 Resizing Handles -->
                  <div class="handle handle-nw" (mousedown)="$event.stopPropagation(); startDrag($event, 'nw')" (touchstart)="$event.stopPropagation(); startDrag($event, 'nw')"></div>
                  <div class="handle handle-ne" (mousedown)="$event.stopPropagation(); startDrag($event, 'ne')" (touchstart)="$event.stopPropagation(); startDrag($event, 'ne')"></div>
                  <div class="handle handle-sw" (mousedown)="$event.stopPropagation(); startDrag($event, 'sw')" (touchstart)="$event.stopPropagation(); startDrag($event, 'sw')"></div>
                  <div class="handle handle-se" (mousedown)="$event.stopPropagation(); startDrag($event, 'se')" (touchstart)="$event.stopPropagation(); startDrag($event, 'se')"></div>
                  <div class="handle handle-n" (mousedown)="$event.stopPropagation(); startDrag($event, 'n')" (touchstart)="$event.stopPropagation(); startDrag($event, 'n')"></div>
                  <div class="handle handle-s" (mousedown)="$event.stopPropagation(); startDrag($event, 's')" (touchstart)="$event.stopPropagation(); startDrag($event, 's')"></div>
                  <div class="handle handle-w" (mousedown)="$event.stopPropagation(); startDrag($event, 'w')" (touchstart)="$event.stopPropagation(); startDrag($event, 'w')"></div>
                  <div class="handle handle-e" (mousedown)="$event.stopPropagation(); startDrag($event, 'e')" (touchstart)="$event.stopPropagation(); startDrag($event, 'e')"></div>
                </div>
              </div>
            }
          </div>

          <!-- Bottom Footer with Metrics & Actions -->
          <div class="crop-footer">
            <div class="crop-meta">
              <span class="meta-tag">
                Original: <strong>{{ originalWidth }} &times; {{ originalHeight }} px</strong>
              </span>
              <span class="meta-tag">
                Crop Area: <strong>{{ getRealCropWidth() }} &times; {{ getRealCropHeight() }} px</strong>
              </span>
              <span class="meta-tag tag-target">
                Output: <strong>{{ getOutputWidth() }} &times; {{ getOutputHeight() }} px</strong>
              </span>
            </div>

            <div class="crop-actions">
              <button type="button" class="btn-cancel" (click)="onCancel()">
                Cancel
              </button>
              <button
                type="button"
                class="btn-apply"
                [disabled]="loading() || processing()"
                (click)="applyCropAndResize()"
              >
                {{ processing() ? 'Processing...' : 'Apply Crop & Resize' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .crop-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        padding: 1.2rem;
      }

      .crop-modal-card {
        background: #ffffff;
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #cbd5e1;
      }

      .crop-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.4rem;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
      }

      .crop-sub {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        color: #0284c7;
        display: block;
      }

      .crop-title {
        margin: 0.15rem 0 0;
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
      }

      .btn-close {
        background: transparent;
        border: none;
        font-size: 1.6rem;
        line-height: 1;
        color: #64748b;
        cursor: pointer;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }

      .btn-close:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      .crop-toolbar {
        display: flex;
        align-items: center;
        gap: 1.2rem;
        padding: 0.75rem 1.4rem;
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        flex-wrap: wrap;
      }

      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .toolbar-label {
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
      }

      .pill-group {
        display: inline-flex;
        background: #f1f5f9;
        border-radius: 6px;
        padding: 2px;
        border: 1px solid #cbd5e1;
      }

      .pill-btn {
        background: transparent;
        border: none;
        padding: 0.35rem 0.7rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.15s;
      }

      .pill-btn:hover {
        color: #0f172a;
      }

      .pill-btn.active {
        background: #0284c7;
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }

      .btn-tool {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #334155;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .btn-tool:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .crop-workspace {
        position: relative;
        background: #090d16;
        height: 440px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        user-select: none;
      }

      .crop-loading {
        color: #94a3b8;
        font-size: 0.95rem;
      }

      .crop-stage {
        position: relative;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      }

      .crop-image-base {
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
        user-select: none;
        transition: transform 0.2s ease;
      }

      /* Dimmed Mask Cutouts */
      .crop-mask-top,
      .crop-mask-bottom,
      .crop-mask-left,
      .crop-mask-right {
        position: absolute;
        background: rgba(0, 0, 0, 0.55);
        pointer-events: none;
        z-index: 2;
      }

      .crop-mask-top {
        top: 0;
        left: 0;
        right: 0;
      }

      .crop-mask-bottom {
        left: 0;
        right: 0;
        bottom: 0;
      }

      .crop-mask-left {
        left: 0;
      }

      .crop-mask-right {
        right: 0;
      }

      /* Crop Box Window */
      .crop-box {
        position: absolute;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.3);
        cursor: move;
        z-index: 10;
        box-sizing: border-box;
      }

      /* Rule of Thirds Grid */
      .crop-grid-h1,
      .crop-grid-h2,
      .crop-grid-v1,
      .crop-grid-v2 {
        position: absolute;
        border-color: rgba(255, 255, 255, 0.35);
        border-style: dashed;
        pointer-events: none;
      }

      .crop-grid-h1 {
        top: 33.33%;
        left: 0;
        right: 0;
        border-top-width: 1px;
      }

      .crop-grid-h2 {
        top: 66.66%;
        left: 0;
        right: 0;
        border-top-width: 1px;
      }

      .crop-grid-v1 {
        left: 33.33%;
        top: 0;
        bottom: 0;
        border-left-width: 1px;
      }

      .crop-grid-v2 {
        left: 66.66%;
        top: 0;
        bottom: 0;
        border-left-width: 1px;
      }

      /* Handles */
      .handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #ffffff;
        border: 2px solid #0284c7;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        box-sizing: border-box;
      }

      .handle-nw {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }

      .handle-ne {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }

      .handle-sw {
        bottom: -5px;
        left: -5px;
        cursor: nesw-resize;
      }

      .handle-se {
        bottom: -5px;
        right: -5px;
        cursor: nwse-resize;
      }

      .handle-n {
        top: -5px;
        left: calc(50% - 5px);
        cursor: ns-resize;
      }

      .handle-s {
        bottom: -5px;
        left: calc(50% - 5px);
        cursor: ns-resize;
      }

      .handle-w {
        left: -5px;
        top: calc(50% - 5px);
        cursor: ew-resize;
      }

      .handle-e {
        right: -5px;
        top: calc(50% - 5px);
        cursor: ew-resize;
      }

      .crop-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 1.4rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 0.8rem;
      }

      .crop-meta {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        flex-wrap: wrap;
      }

      .meta-tag {
        font-size: 0.78rem;
        color: #64748b;
        background: #f1f5f9;
        padding: 0.25rem 0.6rem;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
      }

      .meta-tag strong {
        color: #1e293b;
      }

      .meta-tag.tag-target {
        background: #e0f2fe;
        border-color: #bae6fd;
        color: #0369a1;
      }

      .meta-tag.tag-target strong {
        color: #0284c7;
      }

      .crop-actions {
        display: flex;
        gap: 0.65rem;
      }

      .btn-cancel {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        padding: 0.5rem 1.1rem;
        font-size: 0.88rem;
        font-weight: 700;
        color: #475569;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .btn-cancel:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      .btn-apply {
        background: #0284c7;
        border: none;
        padding: 0.5rem 1.3rem;
        font-size: 0.88rem;
        font-weight: 700;
        color: #ffffff;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
      }

      .btn-apply:hover:not(:disabled) {
        background: #0369a1;
      }

      .btn-apply:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ImageCropModalComponent implements OnChanges {
  @Input() open = false;
  @Input() imageSrc = '';
  @Input() title = 'Crop & Resize Image';

  @Output() close = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();

  @ViewChild('workspaceContainer') workspaceRef?: ElementRef<HTMLDivElement>;
  @ViewChild('stageElement') stageRef?: ElementRef<HTMLDivElement>;

  loading = signal(true);
  processing = signal(false);

  loadedImageSrc = '';
  originalWidth = 0;
  originalHeight = 0;

  // Viewport / Stage dimensions
  stageWidth = signal(400);
  stageHeight = signal(300);

  // Crop rectangle inside the stage (pixels)
  crop = signal<CropRect>({ x: 20, y: 20, width: 200, height: 150 });

  // Ratio mode: 'free' | '16-9' | '4-3' | '1-1'
  aspectRatioMode = signal<'free' | '16-9' | '4-3' | '1-1'>('free');

  // Output width target in px (0 means natural crop size)
  targetOutputWidth = signal<number>(650);

  // Rotation in degrees (0, 90, 180, 270)
  rotationDegrees = signal<number>(0);

  // Drag interaction state
  private activeAction: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialCropState: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  private imgObj: HTMLImageElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.initCropSession();
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent) {
    if (this.open) {
      this.onCancel();
    }
  }

  private initCropSession() {
    if (!this.imageSrc) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.rotationDegrees.set(0);
    this.loadedImageSrc = this.imageSrc;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imgObj = img;
      this.originalWidth = img.naturalWidth || img.width;
      this.originalHeight = img.naturalHeight || img.height;
      this.computeStageDimensions();
      this.resetCrop();
      this.loading.set(false);
    };
    img.onerror = () => {
      alert('Could not load image for cropping.');
      this.loading.set(false);
      this.onCancel();
    };
    img.src = this.imageSrc;
  }

  private computeStageDimensions() {
    const maxStageW = 680;
    const maxStageH = 380;
    const imgW = this.originalWidth;
    const imgH = this.originalHeight;

    if (!imgW || !imgH) {
      this.stageWidth.set(400);
      this.stageHeight.set(300);
      return;
    }

    const scale = Math.min(maxStageW / imgW, maxStageH / imgH, 1.0);
    const w = Math.round(imgW * scale);
    const h = Math.round(imgH * scale);

    this.stageWidth.set(w);
    this.stageHeight.set(h);
  }

  resetCrop() {
    const sw = this.stageWidth();
    const sh = this.stageHeight();

    // Default crop box: centered 85% width/height
    const padX = Math.round(sw * 0.08);
    const padY = Math.round(sh * 0.08);
    let cw = sw - padX * 2;
    let ch = sh - padY * 2;

    const ratio = this.getNumericRatio();
    if (ratio) {
      if (cw / ch > ratio) {
        cw = Math.round(ch * ratio);
      } else {
        ch = Math.round(cw / ratio);
      }
    }

    const cx = Math.max(0, Math.round((sw - cw) / 2));
    const cy = Math.max(0, Math.round((sh - ch) / 2));

    this.crop.set({ x: cx, y: cy, width: cw, height: ch });
  }

  setAspectRatioMode(mode: 'free' | '16-9' | '4-3' | '1-1') {
    this.aspectRatioMode.set(mode);
    const ratio = this.getNumericRatio();
    if (!ratio) return;

    const current = this.crop();
    let newW = current.width;
    let newH = Math.round(newW / ratio);

    if (newH > this.stageHeight()) {
      newH = this.stageHeight() - 10;
      newW = Math.round(newH * ratio);
    }

    if (newW > this.stageWidth()) {
      newW = this.stageWidth() - 10;
      newH = Math.round(newW / ratio);
    }

    const cx = Math.min(Math.max(0, current.x), this.stageWidth() - newW);
    const cy = Math.min(Math.max(0, current.y), this.stageHeight() - newH);

    this.crop.set({ x: cx, y: cy, width: newW, height: newH });
  }

  private getNumericRatio(): number | null {
    switch (this.aspectRatioMode()) {
      case '16-9': return 16 / 9;
      case '4-3': return 4 / 3;
      case '1-1': return 1 / 1;
      default: return null;
    }
  }

  setTargetOutputWidth(width: number) {
    this.targetOutputWidth.set(width);
  }

  rotateClockwise() {
    const current = this.rotationDegrees();
    this.rotationDegrees.set((current + 90) % 360);
  }

  // --- Real pixel metrics ---

  getRealCropWidth(): number {
    const sw = this.stageWidth();
    if (!sw || !this.originalWidth) return 0;
    const factor = this.originalWidth / sw;
    return Math.round(this.crop().width * factor);
  }

  getRealCropHeight(): number {
    const sh = this.stageHeight();
    if (!sh || !this.originalHeight) return 0;
    const factor = this.originalHeight / sh;
    return Math.round(this.crop().height * factor);
  }

  getOutputWidth(): number {
    const realW = this.getRealCropWidth();
    const targetW = this.targetOutputWidth();
    if (targetW > 0 && targetW < realW) {
      return targetW;
    }
    return realW;
  }

  getOutputHeight(): number {
    const realW = this.getRealCropWidth();
    const realH = this.getRealCropHeight();
    if (!realW || !realH) return 0;
    const outW = this.getOutputWidth();
    return Math.round((realH / realW) * outW);
  }

  // --- Mouse / Touch Drag Handlers ---

  startDrag(event: MouseEvent | TouchEvent, action: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e') {
    event.preventDefault();
    this.activeAction = action;

    const pt = this.getEventPoint(event);
    this.dragStartX = pt.x;
    this.dragStartY = pt.y;
    this.initialCropState = { ...this.crop() };

    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
    window.addEventListener('touchmove', this.onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', this.onWindowTouchEnd);
  }

  private onWindowMouseMove = (e: MouseEvent) => {
    this.handleDragMove(e.clientX, e.clientY);
  };

  private onWindowTouchMove = (e: TouchEvent) => {
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      this.handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  private onWindowMouseUp = () => {
    this.stopDrag();
  };

  private onWindowTouchEnd = () => {
    this.stopDrag();
  };

  private stopDrag() {
    this.activeAction = null;
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    window.removeEventListener('touchmove', this.onWindowTouchMove);
    window.removeEventListener('touchend', this.onWindowTouchEnd);
  }

  private getEventPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in event && event.touches && event.touches[0]) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    const me = event as MouseEvent;
    return { x: me.clientX, y: me.clientY };
  }

  private handleDragMove(clientX: number, clientY: number) {
    if (!this.activeAction) return;

    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    const init = this.initialCropState;
    const sw = this.stageWidth();
    const sh = this.stageHeight();
    const minSize = 30;

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    if (this.activeAction === 'move') {
      newX = Math.min(Math.max(0, init.x + dx), sw - init.width);
      newY = Math.min(Math.max(0, init.y + dy), sh - init.height);
    } else {
      const ratio = this.getNumericRatio();

      if (this.activeAction.includes('e')) {
        newW = Math.min(Math.max(minSize, init.width + dx), sw - init.x);
      }
      if (this.activeAction.includes('s')) {
        newH = Math.min(Math.max(minSize, init.height + dy), sh - init.y);
      }
      if (this.activeAction.includes('w')) {
        const potentialW = init.width - dx;
        if (potentialW >= minSize && init.x + dx >= 0) {
          newX = init.x + dx;
          newW = potentialW;
        }
      }
      if (this.activeAction.includes('n')) {
        const potentialH = init.height - dy;
        if (potentialH >= minSize && init.y + dy >= 0) {
          newY = init.y + dy;
          newH = potentialH;
        }
      }

      if (ratio) {
        if (this.activeAction === 'e' || this.activeAction === 'w') {
          newH = Math.round(newW / ratio);
          if (newY + newH > sh) newH = sh - newY;
        } else {
          newW = Math.round(newH * ratio);
          if (newX + newW > sw) newW = sw - newX;
        }
      }
    }

    this.crop.set({ x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
  }

  // --- Render Cropped Image to Canvas ---

  applyCropAndResize() {
    if (!this.imgObj) return;

    this.processing.set(true);

    try {
      const sw = this.stageWidth();
      const sh = this.stageHeight();
      const factorX = this.originalWidth / sw;
      const factorY = this.originalHeight / sh;

      const crop = this.crop();
      const realCropX = Math.round(crop.x * factorX);
      const realCropY = Math.round(crop.y * factorY);
      const realCropW = Math.round(crop.width * factorX);
      const realCropH = Math.round(crop.height * factorY);

      const targetW = this.getOutputWidth();
      const targetH = this.getOutputHeight();

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        alert('Could not initialize canvas context.');
        this.processing.set(false);
        return;
      }

      // High quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the cropped portion to canvas
      ctx.drawImage(
        this.imgObj,
        realCropX,
        realCropY,
        realCropW,
        realCropH,
        0,
        0,
        targetW,
        targetH
      );

      // Convert to clean JPEG or PNG
      const isPng = this.loadedImageSrc.startsWith('data:image/png');
      const outputMime = isPng ? 'image/png' : 'image/jpeg';
      const resultDataUrl = canvas.toDataURL(outputMime, 0.92);

      this.applied.emit(resultDataUrl);
      this.onCancel();
    } catch (err) {
      console.error('Failed to crop and resize image:', err);
      alert('Failed to process image crop.');
    } finally {
      this.processing.set(false);
    }
  }

  onCancel() {
    this.stopDrag();
    this.close.emit();
  }
}
