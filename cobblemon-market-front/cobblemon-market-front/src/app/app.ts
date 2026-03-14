import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { UiStateStorageService } from './services/ui-state-storage.service';

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
  private currentAvailableVersion = '';
  private refusedUpdateVersion = '';
  private detachUpdateListener: (() => void) | null = null;
  private currentRouteUrl = '/';
  private routerEventsSubscription?: Subscription;
  private restoreScrollRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private uiStateStorage: UiStateStorageService,
  ) {}

  ngOnInit(): void {
    this.currentRouteUrl = this.router.url || '/';
    this.restoreScrollForRoute(this.currentRouteUrl);

    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.saveScrollForRoute(this.currentRouteUrl);
        return;
      }

      if (event instanceof NavigationEnd) {
        this.currentRouteUrl = event.urlAfterRedirects || event.url;
        this.restoreScrollForRoute(this.currentRouteUrl);
      }
    });

    if (!window.electronUpdates?.onStatus) {
      return;
    }

    window.electronUpdates
      .getVersion?.()
      .then((version) => {
        this.ngZone.run(() => {
          this.appVersion = version ?? '';
        });
      })
      .catch(() => {
        this.ngZone.run(() => {
          this.appVersion = '';
        });
      });

    this.detachUpdateListener = window.electronUpdates.onStatus((status) => {
      this.ngZone.run(() => {
        this.updateState = (status?.state as typeof this.updateState) || 'idle';
        this.updateMessage = status?.message ?? '';
        this.updateProgress = Math.max(0, Math.min(100, Number(status?.progress ?? 0)));
        if (typeof status?.version === 'string' && status.version.trim()) {
          this.currentAvailableVersion = status.version.trim();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.saveScrollForRoute(this.currentRouteUrl);
    if (this.restoreScrollRetryTimer) {
      clearTimeout(this.restoreScrollRetryTimer);
      this.restoreScrollRetryTimer = null;
    }
    this.routerEventsSubscription?.unsubscribe();
    this.detachUpdateListener?.();
    this.detachUpdateListener = null;
  }

  shouldShowUpdateBanner(): boolean {
    if (this.updateState === 'available' && this.isCurrentVersionRefused()) {
      return false;
    }
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
    this.refusedUpdateVersion = '';
    window.electronUpdates.performUpdateAction()
      .catch(() => undefined)
      .finally(() => {
        this.updateActionBusy = false;
      });
  }

  refuseUpdate(): void {
    if (!this.currentAvailableVersion) {
      return;
    }
    this.refusedUpdateVersion = this.currentAvailableVersion;
  }

  private isCurrentVersionRefused(): boolean {
    return !!this.currentAvailableVersion && this.currentAvailableVersion === this.refusedUpdateVersion;
  }

  private buildScrollStateKey(url: string): string {
    return `ui:scroll:${url}`;
  }

  private saveScrollForRoute(url: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.uiStateStorage.setNumber(this.buildScrollStateKey(url), Math.max(0, Number(window.scrollY) || 0));
  }

  private restoreScrollForRoute(url: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.restoreScrollRetryTimer) {
      clearTimeout(this.restoreScrollRetryTimer);
      this.restoreScrollRetryTimer = null;
    }

    const targetY = this.uiStateStorage.getNumber(this.buildScrollStateKey(url), 0);
    if (targetY <= 0) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    let attempts = 0;
    const maxAttempts = 30;
    const tick = () => {
      const maxReachableY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const canReachTarget = maxReachableY >= targetY || attempts >= maxAttempts;
      window.scrollTo({ top: Math.min(targetY, maxReachableY), left: 0, behavior: 'auto' });

      if (canReachTarget) {
        this.restoreScrollRetryTimer = null;
        return;
      }

      attempts += 1;
      this.restoreScrollRetryTimer = setTimeout(tick, 100);
    };

    this.restoreScrollRetryTimer = setTimeout(tick, 0);
  }
}


