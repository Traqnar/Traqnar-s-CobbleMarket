export interface PokemonListing {
  id: number;
  uuid: string;
  showcaseId: number;
  title: string;
  price: number;
  description: string;
  pokedexNumber: number;
  pokemonName: string;
  form?: string | null;
  level: number;
  nature: string;
  ability: string;
  isHiddenAbility: boolean;
  gender: string;
  isShiny: boolean;
  defaultImageUrl: string;
  customImageUrl?: string | null;
  hpIv: number;
  attackIv: number;
  defenseIv: number;
  specialAttackIv: number;
  specialDefenseIv: number;
  speedIv: number;
  totalIvPercentage: number;
}

/** DTO pour la création d’un listing Pokémon (aligné sur l’API) */
export interface CreatePokemonListing {
  title: string;
  price: number;
  description: string;
  pokedexNumber: number;
  pokemonName: string;
  form?: string | null;
  level: number;
  nature: string;
  ability: string;
  isHiddenAbility?: boolean;
  gender: string;
  isShiny: boolean;
  customImageUrl?: string | null;
  hpIv: number;
  attackIv: number;
  defenseIv: number;
  specialAttackIv: number;
  specialDefenseIv: number;
  speedIv: number;
}

/** DTO pour la mise a jour d'un listing Pokemon (meme structure que la creation) */
export type UpdatePokemonListing = CreatePokemonListing;

