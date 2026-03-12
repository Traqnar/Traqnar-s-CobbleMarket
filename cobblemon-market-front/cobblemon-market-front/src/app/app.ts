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
  updateActionBusy = false;
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
    return ['available', 'downloading', 'downloaded', 'error'].includes(this.updateState) && !!this.updateMessage;
  }

  canRunUpdateAction(): boolean {
    return !this.updateActionBusy && ['available', 'downloaded', 'error'].includes(this.updateState);
  }

  getUpdateActionLabel(): string {
    if (this.updateActionBusy) return 'Patiente...';
    if (this.updateState === 'available') return 'Mettre a jour';
    if (this.updateState === 'downloaded') return 'Redemarrer';
    if (this.updateState === 'error') return 'Reessayer';
    return 'Mettre a jour';
  }

  runUpdateAction(): void {
    if (!window.electronUpdates?.performUpdateAction || !this.canRunUpdateAction()) {
      return;
    }

    this.updateActionBusy = true;
    window.electronUpdates.performUpdateAction()
      .catch(() => undefined)
      .finally(() => {
        this.updateActionBusy = false;
      });
  }
}


