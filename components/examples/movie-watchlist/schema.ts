"use client";

export type Genre =
  | "action"
  | "comedy"
  | "drama"
  | "horror"
  | "scifi"
  | "romance"
  | "thriller"
  | "animation"
  | "documentary";

export const GENRE_LABELS: Record<Genre, string> = {
  action: "Action",
  comedy: "Comedy",
  drama: "Drama",
  horror: "Horror",
  scifi: "Sci-Fi",
  romance: "Romance",
  thriller: "Thriller",
  animation: "Animation",
  documentary: "Documentary",
};

export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: Genre;
  director: string;
  rating: number;
  synopsis: string;
  posterEmoji: string;
  imdbUrl?: string;
}

export interface WatchlistState {
  watchedIds: string[];
  ratings: Record<string, number>;
  selectedMovieId: string | null;
  genreFilter: Genre | null;
}

export const DEFAULT_WATCHLIST_STATE: WatchlistState = {
  watchedIds: [],
  ratings: {},
  selectedMovieId: null,
  genreFilter: null,
};
