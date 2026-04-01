import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PokemonListing } from '../../models/pokemon-listing';
import { MinecraftService } from '../../services/minecraft.service';
import { PokemonListingService } from '../../services/pokemon-listing.service';
import { ToastService } from '../../services/toast.service';

type McSyncPayload = {
  action: 'sync_party_pc_tpaccept';
  requestId: string;
  partySlotId: number;
  executeAtEpochMs: number;
};

type McSyncBridgeResult = {
  status: number | null;
  body: unknown;
  latencyMs: number;
  error?: string;
};

type McSyncTestResult = {
  requestId: string;
  executeAtEpochMs: number;
  payload: McSyncPayload;
  a: McSyncBridgeResult;
  b: McSyncBridgeResult;
};

type UuidComparisonListing = {
  id: number;
  showcaseId: number;
  title: string;
  uuid: string;
  createdSortKey: number;
};

type UuidComparisonGroup = {
  key: string;
  label: string;
  uniqueUuidCount: number;
  uuids: Array<{ value: string; count: number }>;
  listings: UuidComparisonListing[];
};

@Component({
  selector: 'app-items',
  imports: [CommonModule],
  templateUrl: './items.html',
  styleUrl: './items.css',
})
export class Items implements OnInit {
  mcTestPartySlotId = 0;
  mcTestLeadDelayMs = 1200;
  mcTestRequestId = '';
  isMcSyncTestLoading = false;
  mcSyncTestResult: McSyncTestResult | null = null;
  mcSyncTestError: string | null = null;
  isExportingPcA = false;
  isExportingPcB = false;
  isLoadingUuidComparison = false;
  uuidComparisonError: string | null = null;
  uuidComparisonGroups: UuidComparisonGroup[] = [];
  uuidComparisonLastUpdatedAt: number | null = null;
  uuidComparisonTotalListings = 0;

  constructor(
    private minecraftService: MinecraftService,
    private pokemonListingService: PokemonListingService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.refreshUuidComparison();
  }

  async runMcSyncTest(): Promise<void> {
    const partySlotId = Number(this.mcTestPartySlotId);
    const leadDelayMs = Number(this.mcTestLeadDelayMs);

    if (!Number.isInteger(partySlotId) || partySlotId < 0) {
      this.toastService.error('partySlotId doit etre un entier >= 0.');
      return;
    }

    if (!Number.isInteger(leadDelayMs) || leadDelayMs < 0) {
      this.toastService.error('leadDelayMs doit etre un entier >= 0.');
      return;
    }

    if (this.isMcSyncTestLoading) {
      return;
    }

    if (!this.mcTestRequestId.trim()) {
      this.mcTestRequestId = this.generateRequestId();
    }

    const executeAtEpochMs = Date.now() + leadDelayMs;
    const payload: McSyncPayload = {
      action: 'sync_party_pc_tpaccept',
      requestId: this.mcTestRequestId.trim(),
      partySlotId,
      executeAtEpochMs,
    };

    this.isMcSyncTestLoading = true;
    this.mcSyncTestError = null;

    try {
      const [a, b] = await Promise.allSettled([
        this.postBridgeSyncRequest('http://127.0.0.1:5149/api/bridge/sync-party-pc-and-tpaccept', payload),
        this.postBridgeSyncRequest('http://127.0.0.1:5150/api/bridge/sync-party-pc-and-tpaccept', payload),
      ]);

      this.mcSyncTestResult = {
        requestId: payload.requestId,
        executeAtEpochMs,
        payload,
        a: this.getBridgeResultFromSettled(a),
        b: this.getBridgeResultFromSettled(b),
      };

      const hasError = Boolean(this.mcSyncTestResult.a.error || this.mcSyncTestResult.b.error);
      if (hasError) {
        this.toastService.error('MC Sync test termine avec au moins une erreur.');
      } else {
        this.toastService.success('MC Sync test termine (A + B).');
      }
    } catch (error) {
      this.mcSyncTestResult = null;
      this.mcSyncTestError = String(error ?? 'Erreur inconnue');
      this.toastService.error(this.mcSyncTestError);
    } finally {
      this.isMcSyncTestLoading = false;
    }
  }

  exportPcA(): void {
    if (this.isExportingPcA) {
      return;
    }

    this.isExportingPcA = true;
    this.minecraftService.exportAllPcForInstance('A').subscribe({
      next: () => {
        this.isExportingPcA = false;
        this.toastService.success('Export PC A lance.');
        this.refreshUuidComparison();
      },
      error: (err) => {
        this.isExportingPcA = false;
        const message = err?.error?.message ?? err?.message ?? "Impossible de lancer l'export PC A.";
        this.toastService.error(message);
      },
    });
  }

  exportPcB(): void {
    if (this.isExportingPcB) {
      return;
    }

    this.isExportingPcB = true;
    this.minecraftService.exportAllPcForInstance('B').subscribe({
      next: () => {
        this.isExportingPcB = false;
        this.toastService.success('Export PC B lance.');
        this.refreshUuidComparison();
      },
      error: (err) => {
        this.isExportingPcB = false;
        const message = err?.error?.message ?? err?.message ?? "Impossible de lancer l'export PC B.";
        this.toastService.error(message);
      },
    });
  }

  getMcExecuteAtHuman(): string {
    const executeAt = this.mcSyncTestResult?.executeAtEpochMs;
    if (!executeAt || !Number.isFinite(executeAt)) {
      return '-';
    }

    return new Date(executeAt).toLocaleString();
  }

  refreshUuidComparison(): void {
    if (this.isLoadingUuidComparison) {
      return;
    }

    this.isLoadingUuidComparison = true;
    this.uuidComparisonError = null;

    this.pokemonListingService.getAllGlobal().subscribe({
      next: (listings) => {
        const source = listings ?? [];
        this.uuidComparisonTotalListings = source.length;
        this.uuidComparisonGroups = this.buildUuidComparisonGroups(source);
        this.uuidComparisonLastUpdatedAt = Date.now();
        this.isLoadingUuidComparison = false;
      },
      error: (err) => {
        this.isLoadingUuidComparison = false;
        this.uuidComparisonGroups = [];
        this.uuidComparisonError =
          err?.error?.message ?? err?.message ?? "Impossible de charger les listings pour comparer les UUID.";
      },
    });
  }

  getUuidComparisonLastUpdatedHuman(): string {
    if (!this.uuidComparisonLastUpdatedAt) {
      return '-';
    }

    return new Date(this.uuidComparisonLastUpdatedAt).toLocaleString();
  }

  trackByUuidGroupKey(_: number, group: UuidComparisonGroup): string {
    return group.key;
  }

  trackByUuidValue(_: number, uuidEntry: { value: string; count: number }): string {
    return uuidEntry.value;
  }

  trackByUuidListingId(_: number, listing: UuidComparisonListing): number {
    return listing.id;
  }

  private generateRequestId(): string {
    const maybeCrypto = typeof crypto !== 'undefined' ? crypto : null;
    if (maybeCrypto?.randomUUID) {
      return maybeCrypto.randomUUID();
    }

    return `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
  }

  private getBridgeResultFromSettled(
    settled: PromiseSettledResult<McSyncBridgeResult>,
  ): McSyncBridgeResult {
    if (settled.status === 'fulfilled') {
      return settled.value;
    }

    return {
      status: null,
      body: null,
      latencyMs: 0,
      error: String(settled.reason ?? 'Erreur reseau inconnue'),
    };
  }

  private async postBridgeSyncRequest(url: string, payload: McSyncPayload): Promise<McSyncBridgeResult> {
    const startedAt = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startedAt;
    const rawBody = await response.text();
    let parsedBody: unknown = rawBody;

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    return {
      status: response.status,
      body: parsedBody,
      latencyMs,
      error: response.ok ? undefined : `HTTP_${response.status}`,
    };
  }

  private buildUuidComparisonGroups(listings: PokemonListing[]): UuidComparisonGroup[] {
    const byKey = new Map<string, PokemonListing[]>();

    for (const listing of listings) {
      const key = this.buildComparablePokemonKey(listing);
      if (!byKey.has(key)) {
        byKey.set(key, []);
      }
      byKey.get(key)!.push(listing);
    }

    const groups: UuidComparisonGroup[] = [];

    for (const [key, groupListings] of byKey.entries()) {
      const uuidCounts = new Map<string, number>();
      for (const listing of groupListings) {
        const normalizedUuid = (listing.uuid ?? '').trim() || '(uuid vide)';
        uuidCounts.set(normalizedUuid, (uuidCounts.get(normalizedUuid) ?? 0) + 1);
      }

      if (uuidCounts.size <= 1) {
        continue;
      }

      const uuids = Array.from(uuidCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

      const normalizedListings: UuidComparisonListing[] = [...groupListings]
        .sort((a, b) => b.id - a.id)
        .map((listing) => ({
          id: listing.id,
          showcaseId: listing.showcaseId,
          title: listing.title,
          uuid: (listing.uuid ?? '').trim() || '(uuid vide)',
          createdSortKey: listing.id,
        }));

      groups.push({
        key,
        label: this.buildComparablePokemonLabel(groupListings[0]),
        uniqueUuidCount: uuids.length,
        uuids,
        listings: normalizedListings,
      });
    }

    return groups.sort(
      (a, b) =>
        b.uniqueUuidCount - a.uniqueUuidCount ||
        b.listings.length - a.listings.length ||
        b.listings[0].createdSortKey - a.listings[0].createdSortKey,
    );
  }

  private buildComparablePokemonKey(listing: PokemonListing): string {
    const raw = [
      this.normalizeKeyText(listing.pokemonName),
      this.normalizeKeyText(listing.form ?? ''),
      String(Number(listing.level) || 0),
      this.normalizeKeyText(listing.nature),
      this.normalizeKeyText(listing.ability),
      String(Boolean(listing.isHiddenAbility)),
      this.normalizeKeyText(listing.gender),
      String(Boolean(listing.isShiny)),
      String(Boolean(listing.isRadiant)),
      String(Number(listing.hpIv) || 0),
      String(Number(listing.attackIv) || 0),
      String(Number(listing.defenseIv) || 0),
      String(Number(listing.specialAttackIv) || 0),
      String(Number(listing.specialDefenseIv) || 0),
      String(Number(listing.speedIv) || 0),
    ];

    return raw.join('|');
  }

  private buildComparablePokemonLabel(listing: PokemonListing): string {
    const formPart = (listing.form ?? '').trim() ? ` (${listing.form?.trim()})` : '';
    const shinyPart = listing.isShiny ? ' | Shiny' : '';
    const radiantPart = listing.isRadiant ? ' | Radiant' : '';
    const hiddenPart = listing.isHiddenAbility ? ' (HA)' : '';
    const ivPart = `IV ${listing.hpIv}/${listing.attackIv}/${listing.defenseIv}/${listing.specialAttackIv}/${listing.specialDefenseIv}/${listing.speedIv}`;
    return `${listing.pokemonName}${formPart} | Lv${listing.level} | ${listing.nature} | ${listing.ability}${hiddenPart} | ${listing.gender}${shinyPart}${radiantPart} | ${ivPart}`;
  }

  private normalizeKeyText(value: string | null | undefined): string {
    return String(value ?? '').trim().toLowerCase();
  }
}
