import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CreateShowcaseDto, Showcase, UpdateShowcaseDto } from '../models/showcase';
import { apiUrl } from './api-base';

@Injectable({
  providedIn: 'root',
})
export class ShowcaseService {
  private readonly apiUrl = apiUrl('/api/showcases');
  private readonly hiddenShowcaseNames = new Set(['legacy showcase', 'nos pokemons', 'nos pokemon']);

  private readonly showcasesSubject = new BehaviorSubject<Showcase[]>([]);
  private readonly activeShowcaseIdSubject = new BehaviorSubject<number | null>(null);

  readonly showcases$: Observable<Showcase[]> = this.showcasesSubject.asObservable();
  readonly activeShowcaseId$: Observable<number | null> = this.activeShowcaseIdSubject.asObservable();
  readonly activeShowcase$: Observable<Showcase | null> = combineLatest([
    this.showcases$,
    this.activeShowcaseId$,
  ]).pipe(map(([showcases, activeId]) => showcases.find((x) => x.id === activeId) ?? null));

  constructor(private http: HttpClient) {}

  loadShowcases(): Observable<Showcase[]> {
    return this.http.get<Showcase[]>(this.apiUrl).pipe(
      tap((showcases) => {
        const visibleShowcases = (showcases ?? []).filter((x) => !this.isHiddenSystemShowcase(x));
        this.showcasesSubject.next(visibleShowcases);

        const activeId = this.activeShowcaseIdSubject.value;
        const stillExists = activeId !== null && visibleShowcases.some((x) => x.id === activeId);

        if (stillExists) {
          return;
        }

        this.activeShowcaseIdSubject.next(visibleShowcases.length ? visibleShowcases[0].id : null);
      }),
    );
  }

  setActiveShowcase(id: number): void {
    this.activeShowcaseIdSubject.next(id);
  }

  createShowcase(dto: CreateShowcaseDto): Observable<Showcase> {
    return this.http.post<Showcase>(this.apiUrl, dto).pipe(
      tap((created) => {
        const next = [created, ...this.showcasesSubject.value.filter((x) => x.id !== created.id)];
        this.showcasesSubject.next(next);
        this.activeShowcaseIdSubject.next(created.id);
      }),
    );
  }

  updateShowcase(id: number, dto: UpdateShowcaseDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => {
        const next = this.showcasesSubject.value.map((x) =>
          x.id === id
            ? {
                ...x,
                name: dto.name,
                description: dto.description ?? null,
              }
            : x,
        );
        this.showcasesSubject.next(next);
      }),
    );
  }

  deleteShowcase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const next = this.showcasesSubject.value.filter((x) => x.id !== id);
        this.showcasesSubject.next(next);

        if (this.activeShowcaseIdSubject.value === id) {
          this.activeShowcaseIdSubject.next(next.length ? next[0].id : null);
        }
      }),
    );
  }

  linkPokemonListing(showcaseId: number, listingId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${showcaseId}/pokemon-listings/link/${listingId}`,
      {},
    );
  }

  linkItemListing(showcaseId: number, listingId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${showcaseId}/item-listings/link/${listingId}`,
      {},
    );
  }

  getActiveShowcaseIdSnapshot(): number | null {
    return this.activeShowcaseIdSubject.value;
  }

  private isHiddenSystemShowcase(showcase: Showcase | null | undefined): boolean {
    const normalizedName = String(showcase?.name ?? '').trim().toLowerCase();
    return !!normalizedName && this.hiddenShowcaseNames.has(normalizedName);
  }
}
