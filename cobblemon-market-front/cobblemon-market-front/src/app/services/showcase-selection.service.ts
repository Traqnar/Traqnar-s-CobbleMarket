import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PokemonListing } from '../models/pokemon-listing';
import { ItemListing } from '../models/item-listing';

@Injectable({
  providedIn: 'root',
})
export class ShowcaseSelectionService {
  private readonly selectedPokemonSubject = new BehaviorSubject<PokemonListing[]>([]);
  private readonly selectedItemsSubject = new BehaviorSubject<ItemListing[]>([]);

  readonly selectedPokemon$: Observable<PokemonListing[]> =
    this.selectedPokemonSubject.asObservable();
  readonly selectedItems$: Observable<ItemListing[]> = this.selectedItemsSubject.asObservable();

  getSelectedPokemonSnapshot(): PokemonListing[] {
    return this.selectedPokemonSubject.value;
  }

  getSelectedItemsSnapshot(): ItemListing[] {
    return this.selectedItemsSubject.value;
  }

  addPokemon(pokemon: PokemonListing): void {
    const current = this.selectedPokemonSubject.value;
    const alreadyExists = current.some((p) => p.id === pokemon.id);

    if (alreadyExists) {
      return;
    }

    this.selectedPokemonSubject.next([...current, pokemon]);
  }

  removePokemon(id: number): void {
    const current = this.selectedPokemonSubject.value;
    this.selectedPokemonSubject.next(current.filter((p) => p.id !== id));
  }

  addItem(item: ItemListing): void {
    const current = this.selectedItemsSubject.value;
    const alreadyExists = current.some((i) => i.id === item.id);

    if (alreadyExists) {
      return;
    }

    this.selectedItemsSubject.next([...current, item]);
  }

  removeItem(id: number): void {
    const current = this.selectedItemsSubject.value;
    this.selectedItemsSubject.next(current.filter((i) => i.id !== id));
  }

  clearAll(): void {
    this.selectedPokemonSubject.next([]);
    this.selectedItemsSubject.next([]);
  }
}
