import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  imports: [CommonModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModalComponent {
  @Input() open = false;
  @Input() title = 'Confirmation';
  @Input() message = 'Confirmer cette action ?';
  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';
  @Input() danger = false;
  @Input() busy = false;

  @Output() confirmAction = new EventEmitter<void>();
  @Output() cancelAction = new EventEmitter<void>();

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.busy) {
      this.cancelAction.emit();
    }
  }
}
