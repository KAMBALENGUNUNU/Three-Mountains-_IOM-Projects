import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      [class]="'i ' + (customClass || '')"
      [attr.width]="size"
      [attr.height]="size"
      aria-hidden="true"
      focusable="false"
    >
      <use [attr.href]="'#i-' + name" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
      }
    `,
  ],
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 20;
  @Input() customClass = '';
}
