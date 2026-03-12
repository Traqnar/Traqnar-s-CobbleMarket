import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ItemListing } from '../models/item-listing';
import { apiUrl } from './api-base';

@Injectable({
  providedIn: 'root',
})
export class ItemListingService {
  private readonly baseApiUrl = apiUrl('/api/showcases');

  constructor(private http: HttpClient) {}

  private getApiUrl(showcaseId: number): string {
    return `${this.baseApiUrl}/${showcaseId}/item-listings`;
  }

  getAll(showcaseId: number): Observable<ItemListing[]> {
    return this.http.get<ItemListing[]>(this.getApiUrl(showcaseId));
  }

  delete(showcaseId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.getApiUrl(showcaseId)}/${id}`);
  }
}
