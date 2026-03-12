import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';
import { PokemonListing } from '../../models/pokemon-listing';
import { ShowcaseCreateModalComponent } from '../../components/showcase-create-modal/showcase-create-modal';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal';
import { CreateShowcaseDto, Showcase as ShowcaseModel } from '../../models/showcase';
import { ItemListingService } from '../../services/item-listing.service';
import { PokemonImportEventsService } from '../../services/pokemon-import-events.service';
import { PokemonListingService } from '../../services/pokemon-listing.service';
import { ShowcaseService } from '../../services/showcase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-showcase',
  imports: [CommonModule, FormsModule, ShowcaseCreateModalComponent, ConfirmModalComponent],
  templateUrl: './showcase.html',
  styleUrl: './showcase.css',
})
export class Showcase implements OnInit, OnDestroy {
  showcases: ShowcaseModel[] = [];
  allPokemonListings: PokemonListing[] = [];
  activeShowcase: ShowcaseModel | null = null;
  isCreatingShowcase = false;
  isShowcaseModalOpen = false;
  isAddPokemonModalOpen = false;
  isLoadingAllPokemons = false;
  addPokemonNameFilter = '';
  addPokemonNameFilterSearch = '';
  addPokemonAbilityFilter = '';
  addPokemonShinyFilter = '';
  addPokemonIvSort: 'desc' | 'asc' = 'desc';
  showAddPokemonNameDropdown = false;
  showDeleteShowcaseConfirm = false;
  deleteShowcaseMessage = '';
  pendingShowcaseDeleteId: number | null = null;

  isGeneratingImage = false;
  generateError: string | null = null;

  private readonly ivHexagonOrder: (keyof {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  })[] = ['hpIv', 'defenseIv', 'attackIv', 'speedIv', 'specialDefenseIv', 'specialAttackIv'];

  readonly ivHexagonLabels = ['HP', 'Def', 'Atk', 'Speed', 'SpDef', 'SpAtk'] as const;
  private ivHexagonLabelPositions: { x: number; y: number }[] | null = null;
  private readonly landscapeThreshold = 7;
  private importEventsSubscription?: Subscription;

  constructor(
    private showcaseService: ShowcaseService,
    private pokemonListingService: PokemonListingService,
    private pokemonImportEventsService: PokemonImportEventsService,
    private itemListingService: ItemListingService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.showcaseService.showcases$.subscribe((list) => {
      this.showcases = list;
    });

    this.showcaseService.activeShowcase$.subscribe((showcase) => {
      this.activeShowcase = showcase;
    });

    this.reloadShowcases();
    this.reloadAllPokemonListings();
    this.setupImportEvents();
  }

  ngOnDestroy(): void {
    this.importEventsSubscription?.unsubscribe();
  }

  private setupImportEvents(): void {
    this.pokemonImportEventsService.connect();
    this.importEventsSubscription = this.pokemonImportEventsService.importCompleted$.subscribe(() => {
      this.reloadShowcases();
      this.reloadAllPokemonListings();
    });
  }

  selectShowcase(id: number): void {
    this.showcaseService.setActiveShowcase(id);
  }

  openCreateShowcaseModal(): void {
    this.isShowcaseModalOpen = true;
  }

  closeCreateShowcaseModal(): void {
    if (this.isCreatingShowcase) return;
    this.isShowcaseModalOpen = false;
  }

  createShowcase(dto: CreateShowcaseDto): void {
    this.isCreatingShowcase = true;
    this.showcaseService.createShowcase(dto).subscribe({
      next: () => {
        this.isCreatingShowcase = false;
        this.isShowcaseModalOpen = false;
        this.toastService.success('Showcase creee.');
      },
      error: () => {
        this.isCreatingShowcase = false;
        this.toastService.error('Erreur lors de la creation de la showcase.');
      },
    });
  }

  removePokemon(id: number): void {
    const activeShowcase = this.activeShowcase;
    const showcaseId = activeShowcase?.id;
    if (!showcaseId) return;

    const listing = activeShowcase?.pokemonListings.find((x) => x.id === id);
    if (!listing) {
      return;
    }
    this.pokemonListingService.delete(showcaseId, id).subscribe({
      next: () => {
        this.toastService.success('Pokemon retire de la showcase.');
        this.reloadShowcases();
      },
      error: () => this.toastService.error('Erreur lors du retrait du Pokemon.'),
    });
  }

  renameActiveShowcase(): void {
    if (!this.activeShowcase) {
      return;
    }

    const nextName = window.prompt('Nouveau nom de la showcase', this.activeShowcase.name)?.trim();
    if (!nextName || nextName === this.activeShowcase.name) {
      return;
    }

    this.showcaseService
      .updateShowcase(this.activeShowcase.id, {
        name: nextName,
        description: this.activeShowcase.description ?? undefined,
      })
      .subscribe({
        next: () => {
          this.toastService.success('Showcase renommee.');
          this.reloadShowcases();
        },
        error: () => this.toastService.error('Erreur lors du renommage de la showcase.'),
      });
  }

  deleteActiveShowcase(): void {
    if (!this.activeShowcase) {
      return;
    }

    const toDelete = this.activeShowcase;
    this.pendingShowcaseDeleteId = toDelete.id;
    this.deleteShowcaseMessage = `Supprimer la showcase "${toDelete.name}" ?`;
    this.showDeleteShowcaseConfirm = true;
  }

  closeDeleteShowcaseConfirm(): void {
    this.showDeleteShowcaseConfirm = false;
    this.pendingShowcaseDeleteId = null;
    this.deleteShowcaseMessage = '';
  }

  confirmDeleteActiveShowcase(): void {
    if (!this.pendingShowcaseDeleteId) {
      return;
    }

    const id = this.pendingShowcaseDeleteId;
    this.closeDeleteShowcaseConfirm();

    this.showcaseService.deleteShowcase(id).subscribe({
      next: () => {
        this.toastService.success('Showcase supprimee.');
        this.reloadShowcases();
      },
      error: () => this.toastService.error('Erreur lors de la suppression de la showcase.'),
    });
  }

  canManageActiveShowcase(): boolean {
    return !!this.activeShowcase;
  }

  openAddPokemonModal(): void {
    if (!this.canManageActiveShowcase()) {
      this.toastService.info('Selectionne une showcase pour ajouter un Pokemon.');
      return;
    }
    this.reloadAllPokemonListings();
    this.isAddPokemonModalOpen = true;
  }

  closeAddPokemonModal(): void {
    this.isAddPokemonModalOpen = false;
    this.showAddPokemonNameDropdown = false;
  }

  getAvailableInventoryPokemons(): PokemonListing[] {
    if (!this.activeShowcase) {
      return [];
    }
    return this.allPokemonListings
      .filter((listing) => !this.activeShowcase?.pokemonListings.some((x) => x.id === listing.id))
      .sort((a, b) => b.id - a.id);
  }

  getFilteredAvailablePokemons(): PokemonListing[] {
    const filtered = this.getAvailableInventoryPokemons().filter((pokemon) => {
      const matchName = !this.addPokemonNameFilter || this.getPokemonDisplayName(pokemon) === this.addPokemonNameFilter;
      const matchAbility = this.matchesAbilityFilter(pokemon, this.addPokemonAbilityFilter);
      const matchShiny = this.matchesAddPokemonShinyFilter(pokemon.isShiny);
      return matchName && matchAbility && matchShiny;
    });

    filtered.sort((a, b) =>
      this.addPokemonIvSort === 'asc'
        ? (a.totalIvPercentage ?? 0) - (b.totalIvPercentage ?? 0)
        : (b.totalIvPercentage ?? 0) - (a.totalIvPercentage ?? 0),
    );

    return filtered;
  }

  getAvailablePokemonNameOptions(): string[] {
    return Array.from(
      new Set(
        this.getAvailableInventoryPokemons()
          .filter((p) => this.matchesAbilityFilter(p, this.addPokemonAbilityFilter) && this.matchesAddPokemonShinyFilter(p.isShiny))
          .map((p) => this.getPokemonDisplayName(p))
          .filter((v) => !!v),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  getAvailablePokemonNameOptionDetails(): Array<{ name: string; imageUrl: string }> {
    const search = this.normalizeName(this.addPokemonNameFilterSearch);
    const byName = new Map<string, string>();
    for (const p of this.getAvailableInventoryPokemons()) {
      if (!this.matchesAbilityFilter(p, this.addPokemonAbilityFilter)) continue;
      if (!this.matchesAddPokemonShinyFilter(p.isShiny)) continue;
      if (!p.pokemonName) continue;
      const displayName = this.getPokemonDisplayName(p);
      if (search && !this.normalizeName(displayName).includes(search)) continue;
      if (!byName.has(displayName)) {
        byName.set(displayName, this.getPokemonImage(p));
      }
    }
    return Array.from(byName.entries())
      .map(([name, imageUrl]) => ({ name, imageUrl }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  toggleAddPokemonNameDropdown(): void {
    if (!this.showAddPokemonNameDropdown) {
      this.addPokemonNameFilterSearch = this.addPokemonNameFilter;
    }
    this.showAddPokemonNameDropdown = !this.showAddPokemonNameDropdown;
  }

  closeAddPokemonNameDropdown(): void {
    setTimeout(() => {
      this.showAddPokemonNameDropdown = false;
    }, 120);
  }

  selectAddPokemonNameFilter(name: string): void {
    this.addPokemonNameFilter = name;
    this.addPokemonNameFilterSearch = name;
    this.showAddPokemonNameDropdown = false;
  }

  onAddPokemonNameFilterSearchInput(value: string): void {
    this.addPokemonNameFilterSearch = value;
  }

  getSelectedAddPokemonNameImage(): string | null {
    if (!this.addPokemonNameFilter) return null;
    const match = this.getAvailablePokemonNameOptionDetails().find((x) => x.name === this.addPokemonNameFilter);
    return match?.imageUrl ?? null;
  }

  getAvailableAbilityOptions(): Array<{ value: string; label: string }> {
    const byValue = new Map<string, { value: string; label: string }>();

    for (const p of this.getAvailableInventoryPokemons()) {
      if (this.addPokemonNameFilter && this.getPokemonDisplayName(p) !== this.addPokemonNameFilter) continue;
      if (!this.matchesAddPokemonShinyFilter(p.isShiny)) continue;

      const ability = (p.ability ?? '').trim();
      if (!ability) continue;

      const value = this.buildAbilityFilterValue(ability, Boolean(p.isHiddenAbility));
      if (!byValue.has(value)) {
        byValue.set(value, {
          value,
          label: p.isHiddenAbility ? `${ability} (HA)` : ability,
        });
      }
    }

    return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  private matchesAddPokemonShinyFilter(isShiny: boolean): boolean {
    if (this.addPokemonShinyFilter === 'shiny') return isShiny;
    if (this.addPokemonShinyFilter === 'nonshiny') return !isShiny;
    return true;
  }

  private buildAbilityFilterValue(ability: string, isHiddenAbility: boolean): string {
    return `${ability}::${isHiddenAbility ? 'ha' : 'normal'}`;
  }

  private matchesAbilityFilter(
    listing: Pick<PokemonListing, 'ability' | 'isHiddenAbility'>,
    selectedValue: string,
  ): boolean {
    if (!selectedValue) return true;
    const ability = (listing.ability ?? '').trim();
    if (!ability) return false;
    return this.buildAbilityFilterValue(ability, Boolean(listing.isHiddenAbility)) === selectedValue;
  }

  addExistingPokemonToActiveShowcase(source: PokemonListing): void {
    if (!this.activeShowcase) {
      this.toastService.info('Ouvre une showcase cible pour ajouter un Pokemon.');
      return;
    }

    const stillAvailable = this.getAvailableInventoryPokemons().some((listing) => listing.id === source.id);
    if (!stillAvailable) {
      this.toastService.info('Pokemon indisponible ou deja present dans cette showcase.');
      return;
    }

    this.showcaseService.linkPokemonListing(this.activeShowcase.id, source.id).subscribe({
      next: () => {
        this.toastService.success('Pokemon ajoute a la showcase.');
        this.reloadShowcases();
        this.reloadAllPokemonListings();
      },
      error: () => {
        this.toastService.error("Erreur lors de l'ajout du Pokemon.");
      },
    });
  }

  private normalizeName(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  removeItem(id: number): void {
    const showcaseId = this.activeShowcase?.id;
    if (!showcaseId) return;

    this.itemListingService.delete(showcaseId, id).subscribe({
      next: () => {
        this.toastService.success('Item retire de la showcase.');
        this.reloadShowcases();
      },
      error: () => this.toastService.error("Erreur lors du retrait de l'item."),
    });
  }

  clearAll(): void {
    if (!this.activeShowcase) return;

    const showcaseId = this.activeShowcase.id;
    const requests = [
      ...this.activeShowcase.pokemonListings.map((p) => this.pokemonListingService.delete(showcaseId, p.id)),
      ...this.activeShowcase.itemListings.map((i) => this.itemListingService.delete(showcaseId, i.id)),
    ];

    if (!requests.length) return;

    forkJoin(requests).subscribe({
      next: () => {
        this.toastService.success('Showcase videe.');
        this.reloadShowcases();
      },
      error: () => this.toastService.error('Erreur lors du clear de la showcase.'),
    });
  }

  private reloadShowcases(): void {
    this.showcaseService.loadShowcases().subscribe();
  }

  private reloadAllPokemonListings(): void {
    this.isLoadingAllPokemons = true;
    this.pokemonListingService.getAllGlobal().subscribe({
      next: (listings) => {
        this.isLoadingAllPokemons = false;
        this.allPokemonListings = listings ?? [];
      },
      error: () => {
        this.isLoadingAllPokemons = false;
        this.allPokemonListings = [];
        this.toastService.error("Impossible de charger la liste globale des Pokemon.");
      },
    });
  }

  getPokemonImage(listing: PokemonListing): string {
    return listing.customImageUrl && listing.customImageUrl.trim() !== ''
      ? listing.customImageUrl
      : listing.defaultImageUrl;
  }

  getPokemonDisplayName(listing: Pick<PokemonListing, 'pokemonName' | 'form'>): string {
    const trimmedName = (listing.pokemonName ?? '').trim();
    const trimmedForm = (listing.form ?? '').trim();
    return trimmedForm ? `${trimmedName} (${trimmedForm})` : trimmedName;
  }

  getIvPercentageDisplay(value: number | null | undefined): number {
    return Math.floor(Number(value) || 0);
  }

  getIvValues(listing: PokemonListing): {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  } {
    return {
      hpIv: listing.hpIv,
      attackIv: listing.attackIv,
      defenseIv: listing.defenseIv,
      specialAttackIv: listing.specialAttackIv,
      specialDefenseIv: listing.specialDefenseIv,
      speedIv: listing.speedIv,
    };
  }

  getIvHexagonLabelPositions(): { x: number; y: number }[] {
    if (this.ivHexagonLabelPositions) {
      return this.ivHexagonLabelPositions;
    }

    const cx = 50;
    const cy = 50;
    const r = 46;

    this.ivHexagonLabelPositions = [0, 1, 2, 3, 4, 5].map((i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);
      return { x, y };
    });

    return this.ivHexagonLabelPositions;
  }

  getIvRadarPath(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): string {
    const cx = 50;
    const cy = 50;
    const maxR = 40;
    const maxStat = 31;

    const orderedValues = this.ivHexagonOrder.map((key) => Math.min(maxStat, Math.max(0, ivs[key])));
    const points = orderedValues.map((value, i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const r = maxR * (value / maxStat);
      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')} Z`;
  }

  getIvValuesOrdered(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): number[] {
    return this.ivHexagonOrder.map((key) => Math.min(31, Math.max(0, ivs[key] ?? 0)));
  }

  getIvValueColor(value: number): string {
    const clampedValue = Math.min(31, Math.max(0, Number(value) || 0));
    const t = clampedValue / 31;
    const cold = { r: 100, g: 116, b: 139 };
    const mid = { r: 251, g: 191, b: 36 };
    const hot = { r: 239, g: 68, b: 68 };

    let r: number;
    let g: number;
    let b: number;

    if (t <= 0.5) {
      const s = t * 2;
      r = Math.round(cold.r + (mid.r - cold.r) * s);
      g = Math.round(cold.g + (mid.g - cold.g) * s);
      b = Math.round(cold.b + (mid.b - cold.b) * s);
    } else {
      const s = (t - 0.5) * 2;
      r = Math.round(mid.r + (hot.r - mid.r) * s);
      g = Math.round(mid.g + (hot.g - mid.g) * s);
      b = Math.round(mid.b + (hot.b - mid.b) * s);
    }

    return `rgb(${r},${g},${b})`;
  }

  async downloadShowcasePng(): Promise<void> {
    const pokemonList = this.activeShowcase?.pokemonListings ?? [];
    if (!pokemonList.length || this.isGeneratingImage) {
      return;
    }

    this.isGeneratingImage = true;
    this.generateError = null;

    try {
      const blob = await this.buildShowcaseImageBlob(pokemonList);
      if (!blob) {
        throw new Error('Blob generation failed');
      }

      const link = document.createElement('a');
      link.download = `showcase-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      this.toastService.success('Image telechargee.');
    } catch {
      this.generateError = "Impossible de generer l'image pour le moment.";
      this.toastService.error(this.generateError ?? "Impossible de generer l'image pour le moment.");
    } finally {
      this.isGeneratingImage = false;
    }
  }

  async copyShowcaseToClipboard(): Promise<void> {
    const pokemonList = this.activeShowcase?.pokemonListings ?? [];
    if (!pokemonList.length || this.isGeneratingImage) {
      return;
    }

    this.isGeneratingImage = true;
    this.generateError = null;

    try {
      const blob = await this.buildShowcaseImageBlob(pokemonList);
      if (!blob) {
        throw new Error('Blob generation failed');
      }

      const copied = await this.copyBlobToClipboard(blob);
      if (copied) {
        this.toastService.success('Showcase copiee dans le presse-papiers.');
      } else {
        this.toastService.info('Copie presse-papiers non disponible.');
      }
    } catch {
      this.generateError = "Impossible de copier le showcase pour le moment.";
      this.toastService.error(this.generateError ?? "Impossible de copier le showcase pour le moment.");
    } finally {
      this.isGeneratingImage = false;
    }
  }

  private async buildShowcaseImageBlob(pokemonList: PokemonListing[]): Promise<Blob | null> {
    const layout = this.getShowcaseImageLayout(pokemonList.length);
    const { cardWidth, cardHeight, gap, padding, headerHeight, footerHeight, columns } = layout;
    const rows = Math.ceil(pokemonList.length / columns);

    const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
    const height = headerHeight + padding + rows * cardHeight + (rows - 1) * gap + footerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    this.drawBackground(ctx, width, height);
    this.drawHeader(ctx, width, layout.mode, pokemonList.length);

    for (let i = 0; i < pokemonList.length; i += 1) {
      const pokemon = pokemonList[i];
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = padding + col * (cardWidth + gap);
      const y = headerHeight + row * (cardHeight + gap);
      await this.drawPokemonCard(ctx, pokemon, x, y, cardWidth, cardHeight);
    }

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png');
    });
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#0b1220');
    bg.addColorStop(1, '#172554');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
    ctx.beginPath();
    ctx.arc(width - 120, 70, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  private getShowcaseImageLayout(count: number): {
    mode: 'portrait' | 'landscape';
    cardWidth: number;
    cardHeight: number;
    gap: number;
    padding: number;
    headerHeight: number;
    footerHeight: number;
    columns: number;
  } {
    const safeCount = Math.max(1, count);
    const isLandscape = safeCount >= this.landscapeThreshold;

    if (isLandscape) {
      const columns = safeCount >= 12 ? 5 : safeCount >= 9 ? 4 : 3;
      return {
        mode: 'landscape',
        cardWidth: 312,
        cardHeight: 330,
        gap: 12,
        padding: 20,
        headerHeight: 88,
        footerHeight: 16,
        columns,
      };
    }

    return {
      mode: 'portrait',
      cardWidth: 360,
      cardHeight: 384,
      gap: 14,
      padding: 24,
      headerHeight: 88,
      footerHeight: 16,
      columns: Math.min(3, safeCount),
    };
  }

  private drawHeader(
    ctx: CanvasRenderingContext2D,
    width: number,
    mode: 'portrait' | 'landscape',
    count: number,
  ): void {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 30px Segoe UI, Arial, sans-serif';
    ctx.fillText('TRAQNAR&co', 24, 44);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 13px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${count} Pokemon - ${mode === 'landscape' ? 'Landscape' : 'Portrait'} layout`, 24, 66);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 82);
    ctx.lineTo(width - 24, 82);
    ctx.stroke();
  }

  private async drawPokemonCard(
    ctx: CanvasRenderingContext2D,
    pokemon: PokemonListing,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    this.roundRect(ctx, x, y, width, height, 14);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const centerX = x + width / 2;
    const imageSize = Math.min(116, Math.max(84, Math.floor(height * 0.31)));
    const imageX = Math.round(centerX - imageSize / 2);
    const imageY = y + 14;
    const img = await this.loadImageForCanvas(this.getPokemonImage(pokemon));
    if (img) {
      ctx.drawImage(img, imageX, imageY, imageSize, imageSize);
    } else {
      ctx.fillStyle = '#334155';
      this.roundRect(
        ctx,
        imageX + Math.max(6, Math.floor((imageSize - 72) / 2)),
        imageY + Math.max(6, Math.floor((imageSize - 72) / 2)),
        72,
        72,
        10,
      );
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const titleY = imageY + imageSize + 24;
    const nameY = titleY + 22;
    const metaY = nameY + 20;
    const detailsY = metaY + 18;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 18px Segoe UI, Arial, sans-serif';
    ctx.fillText(this.truncate(pokemon.title, 32), centerX, titleY);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 15px Segoe UI, Arial, sans-serif';
    ctx.fillText(`${this.truncate(this.getPokemonDisplayName(pokemon), 24)} - Lv ${pokemon.level}`, centerX, nameY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 13px Segoe UI, Arial, sans-serif';
    ctx.fillText(
      `${pokemon.isShiny ? 'Shiny' : 'Not shiny'} - ${this.getIvPercentageDisplay(pokemon.totalIvPercentage)}% IV`,
      centerX,
      metaY,
    );

    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 12px Segoe UI, Arial, sans-serif';
    ctx.fillText(
      `${this.truncate(pokemon.nature, 14)} - ${this.truncate(pokemon.ability, 16)} - ${this.truncate(pokemon.gender, 10)}`,
      centerX,
      detailsY,
    );

    const radarRadius = Math.max(32, Math.min(40, Math.floor(height * 0.13)));
    const textBottom = detailsY + 8;
    const minRadarY = textBottom + 26 + radarRadius;
    const preferredRadarY = y + height - (radarRadius + 16);
    const radarY = Math.max(minRadarY, preferredRadarY);
    this.drawIvRadarCanvas(ctx, this.getIvValues(pokemon), centerX, radarY, radarRadius);
  }

  private drawIvRadarCanvas(
    ctx: CanvasRenderingContext2D,
    ivs: {
      hpIv: number;
      attackIv: number;
      defenseIv: number;
      specialAttackIv: number;
      specialDefenseIv: number;
      speedIv: number;
    },
    cx: number,
    cy: number,
    maxR: number,
  ): void {
    const maxStat = 31;
    const ordered = this.getIvValuesOrdered(ivs);

    const gridPoints = [0, 1, 2, 3, 4, 5].map((i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      return {
        x: cx + maxR * Math.cos(angleRad),
        y: cy - maxR * Math.sin(angleRad),
      };
    });

    ctx.beginPath();
    gridPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    const fillPoints = ordered.map((value, i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const r = maxR * (Math.max(0, Math.min(maxStat, value)) / maxStat);
      return {
        x: cx + r * Math.cos(angleRad),
        y: cy - r * Math.sin(angleRad),
      };
    });

    ctx.beginPath();
    fillPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();

    const labelRadius = maxR + 9;
    const valueRadius = maxR + 19;
    ctx.textAlign = 'center';

    for (let i = 0; i < 6; i += 1) {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const labelX = cx + labelRadius * Math.cos(angleRad);
      const labelY = cy - labelRadius * Math.sin(angleRad);
      const valueX = cx + valueRadius * Math.cos(angleRad);
      const valueY = cy - valueRadius * Math.sin(angleRad);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 8px Segoe UI, Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.ivHexagonLabels[i], labelX, labelY);

      ctx.fillStyle = this.getIvValueColor(ordered[i]);
      ctx.font = '700 9px Segoe UI, Arial, sans-serif';
      ctx.fillText(String(ordered[i]), valueX, valueY);
    }
  }

  private async loadImageForCanvas(url: string): Promise<HTMLImageElement | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = objectUrl;
      });

      URL.revokeObjectURL(objectUrl);
      return image;
    } catch {
      return null;
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  private truncate(value: string, maxLength: number): string {
    if (!value) {
      return '';
    }
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }

  private async copyBlobToClipboard(blob: Blob): Promise<boolean> {
    try {
      if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') {
        return false;
      }

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  }

}
