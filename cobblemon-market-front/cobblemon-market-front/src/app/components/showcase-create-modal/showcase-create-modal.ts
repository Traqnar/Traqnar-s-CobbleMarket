import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateShowcaseDto } from '../../models/showcase';

@Component({
  selector: 'app-showcase-create-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './showcase-create-modal.html',
  styleUrl: './showcase-create-modal.css',
})
export class ShowcaseCreateModalComponent implements OnChanges {
  @Input() open = false;
  @Input() busy = false;

  @Output() cancel = new EventEmitter<void>();
  @Output() submitCreate = new EventEmitter<CreateShowcaseDto>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue) {
      this.form.reset({ name: '', description: '' });
    }
  }

  onOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.busy) {
      this.cancel.emit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.busy) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitCreate.emit({
      name: String(value.name ?? '').trim(),
      description: String(value.description ?? '').trim() || undefined,
    });
  }
}
