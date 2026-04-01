import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './api-base';

export interface SyncTransferAndTpAcceptInput {
  partySlotId: number;
  leadDelayMs?: number;
  requestId?: string;
}

export interface SyncBridgeTargetResult {
  status: number | null;
  body: unknown;
  latencyMs: number;
  error?: string;
}

export interface SyncTransferAndTpAcceptResult {
  ok: boolean;
  requestId?: string;
  executeAtEpochMs?: number;
  a?: SyncBridgeTargetResult;
  b?: SyncBridgeTargetResult;
  error?: string;
  details?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MinecraftService {
  private readonly baseApiUrl = apiUrl('/api/minecraft');
  private readonly mcInternalApiUrl = this.getMcInternalApiUrl();

  constructor(private http: HttpClient) {}

  exportAllPc(): Observable<unknown> {
    return this.http.post(`${this.baseApiUrl}/exportallpc`, {});
  }

  exportAllPcForInstance(instance: 'A' | 'B'): Observable<unknown> {
    return this.http.post(`${this.baseApiUrl}/exportallpc?instance=${instance}`, {});
  }

  syncTransferAndTpAccept(input: SyncTransferAndTpAcceptInput): Observable<SyncTransferAndTpAcceptResult> {
    return this.http.post<SyncTransferAndTpAcceptResult>(`${this.mcInternalApiUrl}/sync-transfer-and-tpaccept`, input);
  }

  private getMcInternalApiUrl(): string {
    if (typeof window !== 'undefined' && window.electronUpdates) {
      return 'http://127.0.0.1:5151/api/mc';
    }

    return apiUrl('/api/mc');
  }
}
