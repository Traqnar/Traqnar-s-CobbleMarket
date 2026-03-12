import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './api-base';

@Injectable({
  providedIn: 'root',
})
export class MinecraftService {
  private readonly baseApiUrl = apiUrl('/api/minecraft');

  constructor(private http: HttpClient) {}

  exportAllPc(): Observable<unknown> {
    return this.http.post(`${this.baseApiUrl}/exportallpc`, {});
  }
}
