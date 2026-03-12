import { ItemListing } from './item-listing';
import { PokemonListing } from './pokemon-listing';

export interface Showcase {
  id: number;
  name: string;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  pokemonListings: PokemonListing[];
  itemListings: ItemListing[];
}

export interface CreateShowcaseDto {
  name: string;
  description?: string | null;
}

export type UpdateShowcaseDto = CreateShowcaseDto;
