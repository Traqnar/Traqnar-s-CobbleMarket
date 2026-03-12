import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  appVersion = '';
  updateState: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' = 'idle';
  updateMessage = '';
  updateProgress = 0;
  private detachUpdateListener: (() => void) | null = null;

  ngOnInit(): void {
    if (!window.electronUpdates?.onStatus) {
      return;
    }

    window.electronUpdates.getVersion?.().then((version) => {
      this.appVersion = version ?? '';
    }).catch(() => {
      this.appVersion = '';
    });

    this.detachUpdateListener = window.electronUpdates.onStatus((status) => {
      this.updateState = (status?.state as typeof this.updateState) || 'idle';
      this.updateMessage = status?.message ?? '';
      this.updateProgress = Math.max(0, Math.min(100, Number(status?.progress ?? 0)));
    });
  }

  ngOnDestroy(): void {
    this.detachUpdateListener?.();
    this.detachUpdateListener = null;
  }

  shouldShowUpdateBanner(): boolean {
    return ['checking', 'available', 'downloading', 'downloaded'].includes(this.updateState) && !!this.updateMessage;
  }
}


