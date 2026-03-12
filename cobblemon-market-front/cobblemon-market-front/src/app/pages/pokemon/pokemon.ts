import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Subject } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { ShowcaseCreateModalComponent } from '../../components/showcase-create-modal/showcase-create-modal';
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal';
import { PokemonAutocomplete } from '../../models/pokemon-autocomplete';
import { CreatePokemonListing, PokemonListing, UpdatePokemonListing } from '../../models/pokemon-listing';
import { CreateShowcaseDto, Showcase as ShowcaseModel } from '../../models/showcase';
import { PokemonImportEventsService } from '../../services/pokemon-import-events.service';
import { MinecraftService } from '../../services/minecraft.service';
import { PokemonListingService } from '../../services/pokemon-listing.service';
import { PokemonSearchService } from '../../services/pokemon-search.service';
import { ShowcaseService } from '../../services/showcase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-pokemon',
  imports: [CommonModule, ReactiveFormsModule, ShowcaseCreateModalComponent, ConfirmModalComponent],
  templateUrl: './pokemon.html',
  styleUrl: './pokemon.css',
})
export class Pokemon implements OnInit {
  pokemonListings: PokemonListing[] = [];
  showcases: ShowcaseModel[] = [];
  activeShowcaseId: number | null = null;
  activeShowcaseName = '';
  showAssignShowcaseModal = false;
  selectedShowcaseIdForAssign: number | null = null;
  assigningPokemon: PokemonListing | null = null;
  showcaseActionError: string | null = null;
  showCreateShowcaseModal = false;
  isCreatingShowcase = false;
  showAddForm = false;
  editingPokemonId: number | null = null;
  editingPokemonShowcaseId: number | null = null;
  addForm!: FormGroup;
  formError: string | null = null;
  pokemonNameFilter = '';
  pokemonNameFilterSearch = '';
  private pokemonNameFilterSearchResetTimer: ReturnType<typeof setTimeout> | null = null;
  pokemonAbilityFilter = '';
  pokemonShinyFilter = '';
  pokemonPerfectIvCountFilter = '';
  pokemonIvSort: 'desc' | 'asc' = 'desc';
  readonly perfectIvCountFilterOptions: Array<{ value: string; label: string; count: number | null }> = [
    { value: '', label: 'Tous', count: null },
    { value: '0', label: '0x31', count: 0 },
    { value: '1', label: '1x31', count: 1 },
    { value: '2', label: '2x31', count: 2 },
    { value: '3', label: '3x31', count: 3 },
    { value: '4', label: '4x31', count: 4 },
    { value: '5', label: '5x31', count: 5 },
    { value: '6', label: '6x31', count: 6 },
  ];
  showPokemonNameFilterDropdown = false;
  showDeleteConfirmModal = false;
  deleteConfirmMessage = '';
  pokemonPendingDelete: PokemonListing | null = null;
  isExportingPc = false;

  pokemonSuggestions: PokemonAutocomplete[] = [];
  showPokemonDropdown = false;
  selectedPokemonPreview: PokemonAutocomplete | null = null;
  private pokemonSearch$ = new Subject<string>();

  natureSuggestions: string[] = [];
  showNatureDropdown = false;
  private natureSearch$ = new Subject<string>();

  abilitySuggestions: string[] = [];
  showAbilityDropdown = false;
  private abilitySearch$ = new Subject<string>();
  availableForms: string[] = [];
  private importEventsSubscription?: Subscription;

  constructor(
    private pokemonListingService: PokemonListingService,
    private pokemonSearchService: PokemonSearchService,
    private pokemonImportEventsService: PokemonImportEventsService,
    private minecraftService: MinecraftService,
    private showcaseService: ShowcaseService,
    private toastService: ToastService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.showcaseService.showcases$.subscribe((showcases) => {
      this.showcases = showcases;

      if (this.selectedShowcaseIdForAssign === null) {
        const firstAssignable = this.getAssignableShowcases()[0];
        this.selectedShowcaseIdForAssign = firstAssignable?.id ?? null;
      }

      this.refreshListings();
    });

    this.showcaseService.activeShowcase$.subscribe((showcase) => {
      this.activeShowcaseId = showcase?.id ?? null;
      this.activeShowcaseName = showcase?.name ?? '';
    });

    this.showcaseService.loadShowcases().subscribe({
      next: () => {},
    });

    this.buildAddForm();
    this.setupPokemonAutocomplete();
    this.setupNatureAutocomplete();
    this.setupAbilityAutocomplete();
    this.setupImportEvents();
  }

  ngOnDestroy(): void {
    this.importEventsSubscription?.unsubscribe();
    if (this.pokemonNameFilterSearchResetTimer) {
      clearTimeout(this.pokemonNameFilterSearchResetTimer);
      this.pokemonNameFilterSearchResetTimer = null;
    }
  }

  private setupImportEvents(): void {
    this.pokemonImportEventsService.connect();
    this.importEventsSubscription = this.pokemonImportEventsService.importCompleted$.subscribe((event) => {
      this.refreshListings();
      this.showcaseService.loadShowcases().subscribe();

      const details = [
        `${event.importedCount ?? 0} importes`,
        `${event.skippedCount ?? 0} ignores`,
      ];

      if ((event.duplicateUuidCount ?? 0) > 0) {
        details.push(`${event.duplicateUuidCount} doublons UUID`);
      }

      if ((event.unknownSpeciesCount ?? 0) > 0) {
        details.push(`${event.unknownSpeciesCount} especes inconnues`);
      }

      this.toastService.success(`Import PC termine: ${details.join(', ')}.`);
    });
  }

  private setupPokemonAutocomplete(): void {
    this.pokemonSearch$
      .pipe(
        debounceTime(250),
        filter((q) => q.trim().length >= 2),
        distinctUntilChanged(),
        switchMap((q) => this.pokemonSearchService.autocomplete(q)),
      )
      .subscribe((results) => {
        this.pokemonSuggestions = results;
        this.showPokemonDropdown = results.length > 0;
      });
  }

  private setupNatureAutocomplete(): void {
    this.natureSearch$
      .pipe(
        debounceTime(250),
        switchMap((q) => this.pokemonSearchService.searchNatures(q)),
      )
      .subscribe((results) => {
        this.natureSuggestions = results ?? [];
        this.showNatureDropdown = this.natureSuggestions.length > 0;
      });
  }

  private setupAbilityAutocomplete(): void {
    this.abilitySearch$
      .pipe(
        debounceTime(250),
        map((q) => ({
          q,
          pokedexNumber: Number(this.addForm?.get('pokedexNumber')?.value),
        })),
        switchMap(({ q, pokedexNumber }) => {

          if (pokedexNumber && pokedexNumber > 0) {
            return this.pokemonSearchService.searchAbilitiesByPokemon(pokedexNumber, q);
          }

          return this.pokemonSearchService.searchAbilities(q);
        }),
      )
      .subscribe((results: any) => {
        if (!results) {
          this.abilitySuggestions = [];
          this.showAbilityDropdown = false;
          return;
        }

        if (Array.isArray(results) && results.length > 0 && typeof results[0] === 'object') {
          this.abilitySuggestions = results.map((x: any) => x.name);
        } else {
          this.abilitySuggestions = results as string[];
        }

        this.showAbilityDropdown = this.abilitySuggestions.length > 0;
      });
  }

  onPokemonNameInput(value: string): void {
    this.selectedPokemonPreview = null;
    this.availableForms = [];
    this.addForm.patchValue({ form: '' }, { emitEvent: false });
    this.pokemonSearch$.next(value);

    if (!value.trim()) {
      this.pokemonSuggestions = [];
      this.showPokemonDropdown = false;
    }
  }

  onPokemonNameFocus(): void {
    const q = this.addForm.get('pokemonName')?.value?.trim();
    if (q && q.length >= 2 && this.pokemonSuggestions.length > 0) {
      this.showPokemonDropdown = true;
    }
  }

  onPokemonNameBlur(): void {
    setTimeout(() => (this.showPokemonDropdown = false), 150);
  }

  selectPokemonSuggestion(p: PokemonAutocomplete): void {
    this.addForm.patchValue({
      pokemonName: p.englishName,
      pokedexNumber: p.pokedexNumber,
      form: '',
      ability: '',
    });

    this.availableForms = this.normalizeForms(p.forms);
    this.selectedPokemonPreview = p;
    this.pokemonSuggestions = [];
    this.showPokemonDropdown = false;

    this.abilitySuggestions = [];
    this.showAbilityDropdown = false;
  }

  selectForm(form: string): void {
    this.addForm.patchValue({
      form,
    });
  }

  onNatureInput(value: string): void {
    this.natureSearch$.next(value);
  }

  onNatureFocus(): void {
    const q = this.addForm.get('nature')?.value ?? '';
    if (this.natureSuggestions.length > 0) {
      this.showNatureDropdown = true;
      return;
    }

    this.natureSearch$.next(q);
  }

  onNatureBlur(): void {
    setTimeout(() => (this.showNatureDropdown = false), 150);
  }

  selectNatureSuggestion(nature: string): void {
    this.addForm.patchValue({
      nature,
    });

    this.natureSuggestions = [];
    this.showNatureDropdown = false;
  }

  onAbilityInput(value: string): void {
    this.abilitySearch$.next(value);
  }

  onAbilityFocus(): void {
    const q = this.addForm.get('ability')?.value ?? '';
    if (this.abilitySuggestions.length > 0) {
      this.showAbilityDropdown = true;
      return;
    }

    this.abilitySearch$.next(q);
  }

  onAbilityBlur(): void {
    setTimeout(() => (this.showAbilityDropdown = false), 150);
  }

  selectAbilitySuggestion(ability: string): void {
    this.addForm.patchValue({
      ability,
    });

    this.abilitySuggestions = [];
    this.showAbilityDropdown = false;
  }

  getPokemonSuggestionLabel(p: PokemonAutocomplete): string {
    const englishLabel = (p.englishName ?? '').trim();
    const frenchLabel = (p.frenchName ?? '').trim();
    if (englishLabel === frenchLabel) return englishLabel;
    return `${englishLabel} / ${frenchLabel}`;
  }

  private buildAddForm(): void {
    this.addForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      price: [0, [Validators.required, Validators.min(0)]],
      description: ['', [Validators.maxLength(500)]],
      pokedexNumber: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
      pokemonName: ['', [Validators.required, Validators.maxLength(50)]],
      form: ['', [Validators.maxLength(50)]],
      level: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      nature: ['', [Validators.required, Validators.maxLength(50)]],
      ability: ['', [Validators.required, Validators.maxLength(50)]],
      gender: ['', [Validators.required, Validators.maxLength(20)]],
      isShiny: [false],
      customImageUrl: ['', [Validators.maxLength(500)]],
      hpIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
      attackIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
      defenseIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
      specialAttackIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
      specialDefenseIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
      speedIv: [0, [Validators.required, Validators.min(0), Validators.max(31)]],
    });
  }

  openAddForm(): void {
    this.resetAddFormState();
    this.showAddForm = true;
  }

  openEditForm(pokemon: PokemonListing): void {
    this.resetAddFormState();
    this.editingPokemonId = pokemon.id;
    this.editingPokemonShowcaseId = pokemon.showcaseId;
    this.showAddForm = true;

    this.addForm.patchValue({
      title: pokemon.title,
      price: pokemon.price,
      description: pokemon.description ?? '',
      pokedexNumber: pokemon.pokedexNumber,
      pokemonName: pokemon.pokemonName,
      form: pokemon.form ?? '',
      level: pokemon.level,
      nature: pokemon.nature,
      ability: pokemon.ability,
      gender: pokemon.gender,
      isShiny: pokemon.isShiny,
      customImageUrl: pokemon.customImageUrl ?? '',
      hpIv: pokemon.hpIv,
      attackIv: pokemon.attackIv,
      defenseIv: pokemon.defenseIv,
      specialAttackIv: pokemon.specialAttackIv,
      specialDefenseIv: pokemon.specialDefenseIv,
      speedIv: pokemon.speedIv,
    });

    this.selectedPokemonPreview = {
      pokedexNumber: pokemon.pokedexNumber,
      englishName: pokemon.pokemonName,
      frenchName: pokemon.pokemonName,
      forms: this.normalizeForms([pokemon.form ?? '']),
      imageUrl: this.getPokemonImage(pokemon),
    };
    this.loadAvailableForms(pokemon.pokemonName, pokemon.form ?? '');
  }

  closeAddForm(): void {
    this.resetAddFormState();
    this.showAddForm = false;
  }

  onFormOverlayMouseDown(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeAddForm();
    }
  }

  private resetAddFormState(): void {
    this.formError = null;
    this.editingPokemonId = null;
    this.editingPokemonShowcaseId = null;
    this.selectedPokemonPreview = null;

    this.pokemonSuggestions = [];
    this.showPokemonDropdown = false;

    this.availableForms = [];

    this.natureSuggestions = [];
    this.showNatureDropdown = false;

    this.abilitySuggestions = [];
    this.showAbilityDropdown = false;

    this.addForm.reset({
      title: '',
      price: 0,
      description: '',
      pokedexNumber: 1,
      pokemonName: '',
      form: '',
      level: 1,
      nature: '',
      ability: '',
      gender: '',
      isShiny: false,
      customImageUrl: '',
      hpIv: 0,
      attackIv: 0,
      defenseIv: 0,
      specialAttackIv: 0,
      specialDefenseIv: 0,
      speedIv: 0,
    });

    this.addForm.markAsPristine();
    this.addForm.markAsUntouched();
  }

  submitAddForm(): void {
    if (!this.getDefaultTargetShowcaseId() && !this.editingPokemonShowcaseId) {
      this.formError = "Aucune showcase disponible. Cree d'abord une showcase.";
      this.toastService.error(this.formError);
      return;
    }

    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      this.toastService.info('Formulaire invalide: verifie les champs.');
      return;
    }

    this.formError = null;
    const value = this.addForm.getRawValue();

    const dto: CreatePokemonListing = {
      title: value.title,
      price: Number(value.price),
      description: value.description ?? '',
      pokedexNumber: Number(value.pokedexNumber),
      pokemonName: value.pokemonName,
      form: value.form?.trim() || undefined,
      level: Number(value.level),
      nature: value.nature,
      ability: value.ability,
      gender: value.gender,
      isShiny: Boolean(value.isShiny),
      customImageUrl: value.customImageUrl?.trim() || undefined,
      hpIv: Number(value.hpIv),
      attackIv: Number(value.attackIv),
      defenseIv: Number(value.defenseIv),
      specialAttackIv: Number(value.specialAttackIv),
      specialDefenseIv: Number(value.specialDefenseIv),
      speedIv: Number(value.speedIv),
    };

    const targetShowcaseId = this.editingPokemonId
      ? this.editingPokemonShowcaseId
      : this.getDefaultTargetShowcaseId();

    if (!targetShowcaseId) {
      this.formError = 'Showcase cible introuvable.';
      this.toastService.error(this.formError);
      return;
    }

    const request$ = this.editingPokemonId
      ? this.pokemonListingService.update(targetShowcaseId, this.editingPokemonId, dto as UpdatePokemonListing)
      : this.pokemonListingService.create(targetShowcaseId, dto);

    request$.subscribe({
      next: () => {
        this.toastService.success(this.editingPokemonId ? 'Pokemon modifie.' : 'Pokemon cree.');
        this.closeAddForm();
        this.showcaseService.loadShowcases().subscribe();
      },
      error: (err) => {
        this.formError =
          err?.error?.message ??
          err?.message ??
          (this.editingPokemonId ? 'Erreur lors de la mise a jour.' : "Erreur lors de l'ajout.");
        this.toastService.error(this.formError ?? "Erreur lors de l'ajout.");
      },
    });
  }

  deleteListing(pokemon: PokemonListing): void {
    this.pokemonPendingDelete = pokemon;
    this.deleteConfirmMessage = `Supprimer le listing "${pokemon.title}" (${pokemon.pokemonName}) ?`;
    this.showDeleteConfirmModal = true;
  }

  exportAllPc(): void {
    if (this.isExportingPc) {
      return;
    }

    this.isExportingPc = true;
    this.toastService.info('Synchronisation PC en cours...');

    this.pokemonListingService.getAllGlobal().subscribe({
      next: (listings) => {
        const pcLinkedIds = (listings ?? [])
          .filter((x) => !!(x.uuid ?? '').trim())
          .map((x) => x.id);

        const cleanup$ = pcLinkedIds.length
          ? forkJoin(
              pcLinkedIds.map((id) =>
                this.pokemonListingService.deleteGlobal(id).pipe(catchError(() => of(void 0))),
              ),
            )
          : of([]);

        cleanup$.subscribe({
          next: () => {
            this.refreshListings();
            this.showcaseService.loadShowcases().subscribe();
            this.launchPcExport();
          },
          error: () => {
            this.isExportingPc = false;
            this.toastService.error("Impossible de preparer la synchronisation du PC.");
          },
        });
      },
      error: () => {
        this.isExportingPc = false;
        this.toastService.error("Impossible de charger la liste Pokemon avant export.");
      },
    });
  }

  private launchPcExport(): void {
    this.minecraftService.exportAllPc().subscribe({
      next: () => {
        this.isExportingPc = false;
        this.toastService.success("Export PC lance. La liste se mettra a jour quand l'import sera termine.");
      },
      error: (err) => {
        this.isExportingPc = false;
        const message =
          err?.error?.message ??
          err?.message ??
          "Impossible de lancer l'export du PC.";
        this.toastService.error(message);
      },
    });
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.pokemonPendingDelete = null;
    this.deleteConfirmMessage = '';
  }

  confirmDeleteListing(): void {
    if (!this.pokemonPendingDelete) {
      return;
    }

    const pokemon = this.pokemonPendingDelete;
    this.closeDeleteConfirmModal();

    this.pokemonListingService.deleteGlobal(pokemon.id).subscribe({
      next: () => {
        this.toastService.success('Pokemon supprime.');
        this.showcaseService.loadShowcases().subscribe();
      },
      error: (err) => {
        this.formError = err?.error?.message ?? err?.message ?? 'Erreur lors de la suppression.';
        this.toastService.error(this.formError ?? 'Erreur lors de la suppression.');
      },
    });
  }

  isEditMode(): boolean {
    return this.editingPokemonId !== null;
  }

  openAssignShowcaseModal(pokemon: PokemonListing): void {
    this.showcaseActionError = null;
    this.assigningPokemon = pokemon;

    const assignableShowcases = this.getAssignableShowcases();

    if (!assignableShowcases.length) {
      this.showCreateShowcaseModal = true;
      return;
    }

    const activeAssignable = assignableShowcases.find((x) => x.id === this.activeShowcaseId);
    this.selectedShowcaseIdForAssign = activeAssignable?.id ?? assignableShowcases[0].id;
    this.showAssignShowcaseModal = true;
  }

  closeAssignShowcaseModal(): void {
    this.showAssignShowcaseModal = false;
    this.assigningPokemon = null;
    this.showcaseActionError = null;
  }

  confirmAssignToShowcase(): void {
    if (!this.assigningPokemon || !this.selectedShowcaseIdForAssign) {
      this.toastService.info('Selectionne une showcase cible.');
      return;
    }

    this.showcaseService.linkPokemonListing(this.selectedShowcaseIdForAssign, this.assigningPokemon.id).subscribe({
      next: () => {
        this.showAssignShowcaseModal = false;
        this.assigningPokemon = null;
        this.toastService.success('Pokemon ajoute a la showcase.');
        this.showcaseService.loadShowcases().subscribe();
      },
      error: (err) => {
        this.showcaseActionError =
          err?.error?.message ??
          err?.message ??
          "Erreur lors de l'ajout a la showcase.";
        this.toastService.error(this.showcaseActionError ?? "Erreur lors de l'ajout a la showcase.");
      },
    });
  }

  openCreateShowcaseModal(): void {
    this.showCreateShowcaseModal = true;
  }

  closeCreateShowcaseModal(): void {
    if (this.isCreatingShowcase) return;
    this.showCreateShowcaseModal = false;
  }

  createShowcase(dto: CreateShowcaseDto): void {
    this.isCreatingShowcase = true;
    this.showcaseService.createShowcase(dto).subscribe({
      next: (created) => {
        this.isCreatingShowcase = false;
        this.showCreateShowcaseModal = false;
        this.selectedShowcaseIdForAssign = created.id;
        this.toastService.success('Showcase creee.');

        if (this.assigningPokemon) {
          this.showAssignShowcaseModal = true;
          this.confirmAssignToShowcase();
        }
      },
      error: (err) => {
        this.isCreatingShowcase = false;
        this.showcaseActionError =
          err?.error?.message ??
          err?.message ??
          "Erreur lors de la creation de la showcase.";
        this.toastService.error(this.showcaseActionError ?? "Erreur lors de la creation de la showcase.");
      },
    });
  }

  getPokemonImage(listing: PokemonListing): string {
    return listing.customImageUrl && listing.customImageUrl.trim() !== ''
      ? listing.customImageUrl
      : listing.defaultImageUrl;
  }

  getPokemonDisplayName(listing: Pick<PokemonListing, 'pokemonName' | 'form'>): string {
    return this.formatPokemonLabel(listing.pokemonName, listing.form);
  }

  getSelectedForm(): string {
    return (this.addForm?.get('form')?.value ?? '').trim();
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

  getFormIvValues(): {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  } {
    const v = this.addForm?.getRawValue();
    if (!v) {
      return {
        hpIv: 0,
        attackIv: 0,
        defenseIv: 0,
        specialAttackIv: 0,
        specialDefenseIv: 0,
        speedIv: 0,
      };
    }

    return {
      hpIv: Number(v.hpIv) || 0,
      attackIv: Number(v.attackIv) || 0,
      defenseIv: Number(v.defenseIv) || 0,
      specialAttackIv: Number(v.specialAttackIv) || 0,
      specialDefenseIv: Number(v.specialDefenseIv) || 0,
      speedIv: Number(v.speedIv) || 0,
    };
  }

  private readonly ivHexagonOrder: (keyof {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  })[] = ['hpIv', 'defenseIv', 'attackIv', 'speedIv', 'specialDefenseIv', 'specialAttackIv'];

  readonly ivHexagonLabels = ['HP', 'Def', 'Atk', 'Speed', 'SpDef', 'SpAtk'] as const;

  private _ivHexagonLabelPositions: { x: number; y: number }[] | null = null;

  getIvHexagonLabelPositions(): { x: number; y: number }[] {
    if (this._ivHexagonLabelPositions) return this._ivHexagonLabelPositions;

    const cx = 50;
    const cy = 50;
    const r = 46;

    this._ivHexagonLabelPositions = [0, 1, 2, 3, 4, 5].map((i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);
      return { x, y };
    });

    return this._ivHexagonLabelPositions;
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

    const order = this.ivHexagonOrder.map((key) => Math.min(maxStat, Math.max(0, ivs[key])));

    const points = order.map((val, i) => {
      const angleDeg = 90 - i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const r = maxR * (val / maxStat);
      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')} Z`;
  }

  getIvValueColor(value: number): string {
    const v = Math.min(31, Math.max(0, Number(value) || 0));
    const t = v / 31;

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

  getIvValuesOrdered(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): number[] {
    return this.ivHexagonOrder.map((k) => Math.min(31, Math.max(0, ivs[k] ?? 0)));
  }

  getIvTotal(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): number {
    return this.getIvValuesOrdered(ivs).reduce((sum, value) => sum + value, 0);
  }

  getIvPercentage(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): number {
    return Math.floor((this.getIvTotal(ivs) / 186) * 100);
  }

  getIvPercentageDisplay(value: number | null | undefined): number {
    return Math.floor(Number(value) || 0);
  }

  getIvSummary(ivs: {
    hpIv: number;
    attackIv: number;
    defenseIv: number;
    specialAttackIv: number;
    specialDefenseIv: number;
    speedIv: number;
  }): string {
    return this.ivHexagonOrder.map((k) => ivs[k]).join('/');
  }

  private refreshListings(): void {
    this.pokemonListingService.getAllGlobal().subscribe({
      next: (listings) => {
        this.pokemonListings = [...(listings ?? [])].sort((a, b) => b.id - a.id);
      },
      error: () => {
        this.pokemonListings = [];
        this.toastService.error("Impossible de charger tous les Pokemon.");
      },
    });
  }

  getFilteredPokemonListings(): PokemonListing[] {
    const filtered = this.pokemonListings.filter((pokemon) => {
      const matchName = !this.pokemonNameFilter || this.getPokemonDisplayName(pokemon) === this.pokemonNameFilter;
      const matchAbility = !this.pokemonAbilityFilter || (pokemon.ability ?? '') === this.pokemonAbilityFilter;
      const matchShiny = this.matchesShinyFilter(pokemon.isShiny);
      const requiredPerfectIvCount = this.pokemonPerfectIvCountFilter === '' ? null : Number(this.pokemonPerfectIvCountFilter);
      const matchPerfectIvCount =
        requiredPerfectIvCount === null || Number.isNaN(requiredPerfectIvCount)
          ? true
          : this.getPerfectIvCount(pokemon) === requiredPerfectIvCount;
      return matchName && matchAbility && matchShiny && matchPerfectIvCount;
    });

    filtered.sort((a, b) =>
      this.pokemonIvSort === 'asc'
        ? (a.totalIvPercentage ?? 0) - (b.totalIvPercentage ?? 0)
        : (b.totalIvPercentage ?? 0) - (a.totalIvPercentage ?? 0),
    );

    return filtered;
  }

  getPokemonNameFilterOptions(): string[] {
    return Array.from(
      new Set(
        this.pokemonListings
          .filter((p) => (!this.pokemonAbilityFilter || (p.ability ?? '') === this.pokemonAbilityFilter) && this.matchesShinyFilter(p.isShiny))
          .map((p) => this.getPokemonDisplayName(p))
          .filter((v) => !!v),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  getPokemonNameFilterOptionDetails(): Array<{ name: string; imageUrl: string }> {
    const search = this.normalizeName(this.pokemonNameFilterSearch);
    const byName = new Map<string, string>();
    for (const p of this.pokemonListings) {
      if (this.pokemonAbilityFilter && (p.ability ?? '') !== this.pokemonAbilityFilter) continue;
      if (!this.matchesShinyFilter(p.isShiny)) continue;
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

  togglePokemonNameFilterDropdown(): void {
    if (!this.showPokemonNameFilterDropdown) {
      this.pokemonNameFilterSearch = '';
    }
    this.showPokemonNameFilterDropdown = !this.showPokemonNameFilterDropdown;
  }

  closePokemonNameFilterDropdown(): void {
    setTimeout(() => {
      this.showPokemonNameFilterDropdown = false;
    }, 120);
  }

  selectPokemonNameFilter(name: string): void {
    this.pokemonNameFilter = name;
    this.pokemonNameFilterSearch = name;
    this.showPokemonNameFilterDropdown = false;
  }

  onPokemonNameFilterDropdownKeydown(event: KeyboardEvent): void {
    if (!this.showPokemonNameFilterDropdown) {
      return;
    }

    if (event.key === 'Escape') {
      this.showPokemonNameFilterDropdown = false;
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.pokemonNameFilterSearch = this.pokemonNameFilterSearch.slice(0, -1);
      this.restartPokemonNameFilterSearchResetTimer();
      return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    event.preventDefault();
    this.pokemonNameFilterSearch += event.key;
    this.restartPokemonNameFilterSearchResetTimer();
  }

  private restartPokemonNameFilterSearchResetTimer(): void {
    if (this.pokemonNameFilterSearchResetTimer) {
      clearTimeout(this.pokemonNameFilterSearchResetTimer);
    }

    this.pokemonNameFilterSearchResetTimer = setTimeout(() => {
      this.pokemonNameFilterSearch = '';
      this.pokemonNameFilterSearchResetTimer = null;
    }, 3000);
  }

  getSelectedPokemonNameFilterImage(): string | null {
    if (!this.pokemonNameFilter) return null;
    const match = this.getPokemonNameFilterOptionDetails().find((x) => x.name === this.pokemonNameFilter);
    return match?.imageUrl ?? null;
  }

  getPokemonAbilityFilterOptions(): string[] {
    return Array.from(
      new Set(
        this.pokemonListings
          .filter((p) => (!this.pokemonNameFilter || this.getPokemonDisplayName(p) === this.pokemonNameFilter) && this.matchesShinyFilter(p.isShiny))
          .map((p) => p.ability)
          .filter((v) => !!v),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  private matchesShinyFilter(isShiny: boolean): boolean {
    if (this.pokemonShinyFilter === 'shiny') return isShiny;
    if (this.pokemonShinyFilter === 'nonshiny') return !isShiny;
    return true;
  }

  getPerfectIvCount(listing: PokemonListing): number {
    const ivs = this.getIvValues(listing);
    return Object.values(ivs).filter((value) => Number(value) === 31).length;
  }

  setPokemonPerfectIvCountFilter(value: string): void {
    this.pokemonPerfectIvCountFilter = value;
  }

  isPokemonPerfectIvFilterSelected(value: string): boolean {
    return this.pokemonPerfectIvCountFilter === value;
  }

  getPerfectIvFilterClass(count: number | null): string {
    if (count === null) return 'tier-all';
    if (count >= 6) return 'tier-elite';
    if (count >= 5) return 'tier-high';
    if (count >= 3) return 'tier-mid';
    return 'tier-low';
  }

  getAssignableShowcases(): ShowcaseModel[] {
    return this.showcases;
  }

  private getDefaultTargetShowcaseId(): number | null {
    return this.activeShowcaseId ?? this.showcases[0]?.id ?? null;
  }

  private loadAvailableForms(pokemonName: string, currentForm = ''): void {
    const trimmedName = (pokemonName ?? '').trim();
    if (!trimmedName) {
      this.availableForms = [];
      return;
    }

    this.pokemonSearchService.getByName(trimmedName).subscribe({
      next: (result) => {
        this.availableForms = this.normalizeForms(result.forms);
        const normalizedCurrentForm = this.normalizeName(currentForm);
        const stillExists = !normalizedCurrentForm || this.availableForms.some((form) => this.normalizeName(form) === normalizedCurrentForm);
        if (!stillExists) {
          this.addForm.patchValue({ form: '' }, { emitEvent: false });
        }
      },
      error: () => {
        this.availableForms = this.normalizeForms(currentForm ? [currentForm] : []);
      },
    });
  }

  private normalizeForms(forms?: string[] | null): string[] {
    const unique = new Map<string, string>();
    for (const form of forms ?? []) {
      const trimmed = (form ?? '').trim();
      if (!trimmed) continue;
      const key = this.normalizeName(trimmed);
      if (!unique.has(key)) {
        unique.set(key, trimmed);
      }
    }

    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  private formatPokemonLabel(name: string, form?: string | null): string {
    const trimmedName = (name ?? '').trim();
    const trimmedForm = (form ?? '').trim();

    if (!trimmedForm) {
      return trimmedName;
    }

    return `${trimmedName} (${trimmedForm})`;
  }

  private normalizeName(value: string): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

}

