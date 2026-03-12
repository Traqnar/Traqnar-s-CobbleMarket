import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PokemonAutocomplete } from '../models/pokemon-autocomplete';
import { apiUrl } from './api-base';

export interface PokemonByNameResult {
  name: string;
  pokedexNumber: number;
  imageUrl: string;
  forms?: string[] | null;
  abilities: Array<{ name: string; isHidden?: boolean; slot?: number }> | string[];
}

@Injectable({
  providedIn: 'root',
})
export class PokemonSearchService {
  private apiUrl = apiUrl('/api/PokemonSearch');

  constructor(private http: HttpClient) {}

  autocomplete(query: string): Observable<PokemonAutocomplete[]> {
    const params = { query: query.trim() };
    return this.http.get<PokemonAutocomplete[]>(`${this.apiUrl}/autocomplete`, {
      params,
    });
  }

  getByName(name: string): Observable<PokemonByNameResult> {
    return this.http.get<PokemonByNameResult>(`${this.apiUrl}/by-name/${encodeURIComponent(name.trim())}`);
  }

  searchNatures(query: string) {
    const q = query?.trim();
    const params: Record<string, string | number> = { take: 10 };
    if (q) {
      params['q'] = q;
    }

    return this.http.get<string[]>(`${this.apiUrl}/natures/search`, {
      params,
    });
  }

  searchAbilities(query: string) {
    const q = query?.trim();
    const params: Record<string, string | number> = { take: 10 };
    if (q) {
      params['q'] = q;
    }

    return this.http.get<string[]>(`${this.apiUrl}/abilities/search`, {
      params,
    });
  }

  searchAbilitiesByPokemon(pokedexNumber: number, query: string) {
    const q = query?.trim();
    const params: Record<string, string | number> = { take: 10 };
    if (q) {
      params['q'] = q;
    }

    return this.http.get<{ name: string; isHidden: boolean; slot: number }[]>(
      `${this.apiUrl}/abilities/by-pokemon/${pokedexNumber}`,
      {
        params,
      }
    );
  }
}
