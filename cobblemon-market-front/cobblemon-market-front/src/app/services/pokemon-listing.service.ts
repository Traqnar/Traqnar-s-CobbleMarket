import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePokemonListing, PokemonListing, UpdatePokemonListing } from '../models/pokemon-listing';
import { apiUrl } from './api-base';

@Injectable({
  providedIn: 'root',
})
export class PokemonListingService {
  private readonly baseApiUrl = apiUrl('/api/showcases');
  private readonly globalApiUrl = apiUrl('/api/pokemon-listings');

  constructor(private http: HttpClient) {}

  private getApiUrl(showcaseId: number): string {
    return `${this.baseApiUrl}/${showcaseId}/pokemon-listings`;
  }

  getAll(showcaseId: number): Observable<PokemonListing[]> {
    return this.http.get<PokemonListing[]>(this.getApiUrl(showcaseId));
  }

  getAllGlobal(): Observable<PokemonListing[]> {
    return this.http.get<PokemonListing[]>(this.globalApiUrl);
  }

  create(showcaseId: number, dto: CreatePokemonListing): Observable<PokemonListing> {
    return this.http.post<PokemonListing>(this.getApiUrl(showcaseId), dto);
  }

  update(showcaseId: number, id: number, dto: UpdatePokemonListing): Observable<PokemonListing> {
    return this.http.put<PokemonListing>(`${this.getApiUrl(showcaseId)}/${id}`, dto);
  }

  delete(showcaseId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl(showcaseId)}/${id}`);
  }

  deleteGlobal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.globalApiUrl}/${id}`);
  }
}
