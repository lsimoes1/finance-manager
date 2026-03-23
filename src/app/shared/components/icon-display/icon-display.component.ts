import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="!isImage; else imgTemplate">
      <span [class]="customClass" [style.fontSize]="size">{{ icon || defaultIcon }}</span>
    </ng-container>
    <ng-template #imgTemplate>
      <img [src]="icon" [class]="customClass" [style.width]="size" [style.height]="size" style="object-fit: contain; pointer-events: none;">
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; }
  `]
})
export class IconDisplayComponent {
  @Input() icon: string | null | undefined = '';
  @Input() defaultIcon: string = '🏷️';
  @Input() customClass: string = 'normal-emoji';
  @Input() size: string = '1em';

  get isImage(): boolean {
    const i = this.icon;
    if (!i) return false;
    const lower = i.toLowerCase();
    return i.includes('/') || lower.endsWith('.svg') || lower.endsWith('.icon') || lower.endsWith('.png') || lower.endsWith('.ico');
  }

  // Compatibilidade
  get isSvg(): boolean { return this.isImage; }
}
