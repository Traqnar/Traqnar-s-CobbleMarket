import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { apiUrl } from './api-base';

export interface PokemonImportCompletedEvent {
  type: string;
  importedAtUtc?: string;
  importedCount: number;
  skippedCount: number;
  duplicateUuidCount: number;
  unknownSpeciesCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class PokemonImportEventsService {
  private eventSource: EventSource | null = null;
  private readonly importCompletedSubject = new Subject<PokemonImportCompletedEvent>();

  readonly importCompleted$: Observable<PokemonImportCompletedEvent> = this.importCompletedSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(): void {
    if (typeof window === 'undefined' || this.eventSource) {
      return;
    }

    const source = new EventSource(apiUrl('/api/pokemon-listings/import-events'));

    source.addEventListener('import-pc', (event) => {
      this.handleImportPcEvent(event as MessageEvent<string>);
    });

    source.onmessage = (event) => {
      this.handleImportPcEvent(event);
    };

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        this.eventSource = null;
      }
    };

    this.eventSource = source;
  }

  private handleImportPcEvent(event: MessageEvent<string>): void {
    let payload: PokemonImportCompletedEvent | null = null;

    try {
      payload = JSON.parse(event.data) as PokemonImportCompletedEvent;
    } catch {
      return;
    }

    if (!payload || payload.type !== 'import-pc') {
      return;
    }

    this.ngZone.run(() => {
      this.importCompletedSubject.next(payload!);
    });
  }
}
