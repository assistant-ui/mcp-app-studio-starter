"use client";

import type { MapCenter, POI } from "@/components/examples/poi-map";

export interface POIMapDemoInput extends Record<string, unknown> {
  id: string;
  pois: POI[];
  initialCenter: MapCenter;
  initialZoom: number;
  title: string;
}

export const POI_MAP_DEMO_INPUT: POIMapDemoInput = {
  id: "demo-poi-map",
  pois: [
    {
      id: "1",
      name: "Ferry Building Marketplace",
      description:
        "Historic ferry terminal turned gourmet food hall with local vendors, restaurants and farmers market.",
      category: "landmark",
      lat: 37.7956,
      lng: -122.3933,
      address: "1 Ferry Building, San Francisco, CA",
      rating: 4.6,
      tags: ["food", "shopping", "waterfront"],
    },
    {
      id: "2",
      name: "Dolores Park",
      description:
        "Popular urban park with stunning city views, tennis courts, and a vibrant weekend scene.",
      category: "park",
      lat: 37.7596,
      lng: -122.427,
      address: "Dolores St & 19th St, San Francisco, CA",
      rating: 4.7,
      tags: ["outdoors", "views", "picnic"],
    },
    {
      id: "3",
      name: "Tartine Bakery",
      description:
        "Legendary bakery known for its country bread, morning buns, and long lines of devoted fans.",
      category: "cafe",
      lat: 37.7614,
      lng: -122.4241,
      address: "600 Guerrero St, San Francisco, CA",
      rating: 4.5,
      tags: ["bakery", "coffee", "pastries"],
    },
    {
      id: "4",
      name: "SFMOMA",
      description:
        "World-class modern art museum featuring works by Warhol, Kahlo, and Rauschenberg.",
      category: "museum",
      lat: 37.7857,
      lng: -122.401,
      address: "151 3rd St, San Francisco, CA",
      rating: 4.6,
      tags: ["art", "culture", "architecture"],
    },
    {
      id: "5",
      name: "Zuni Cafe",
      description:
        "Iconic restaurant famous for its wood-fired roast chicken and Caesar salad since 1979.",
      category: "restaurant",
      lat: 37.7764,
      lng: -122.4211,
      address: "1658 Market St, San Francisco, CA",
      rating: 4.4,
      tags: ["california cuisine", "brunch", "classic"],
    },
  ],
  initialCenter: { lat: 37.7749, lng: -122.4194 },
  initialZoom: 13,
  title: "San Francisco Highlights",
};

export interface MovieWatchlistDemoInput extends Record<string, unknown> {
  movies: Array<{
    id: string;
    title: string;
    year: number;
    genre: string;
    director: string;
    rating: number;
    synopsis: string;
    posterEmoji: string;
    imdbUrl?: string;
  }>;
  title: string;
}

export const MOVIE_WATCHLIST_DEMO_INPUT: MovieWatchlistDemoInput = {
  title: "Weekend Watchlist",
  movies: [
    {
      id: "1",
      title: "Blade Runner 2049",
      year: 2017,
      genre: "scifi",
      director: "Denis Villeneuve",
      rating: 4.3,
      synopsis:
        "A young blade runner discovers a long-buried secret that leads him to track down former blade runner Rick Deckard.",
      posterEmoji: "🤖",
      imdbUrl: "https://www.imdb.com/title/tt1856101/",
    },
    {
      id: "2",
      title: "Parasite",
      year: 2019,
      genre: "thriller",
      director: "Bong Joon-ho",
      rating: 4.7,
      synopsis:
        "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
      posterEmoji: "🪨",
    },
    {
      id: "3",
      title: "The Grand Budapest Hotel",
      year: 2014,
      genre: "comedy",
      director: "Wes Anderson",
      rating: 4.4,
      synopsis:
        "A writer encounters the owner of an aging high-class hotel, who tells of his early years as a lobby boy under the hotel's legendary concierge.",
      posterEmoji: "🏨",
      imdbUrl: "https://www.imdb.com/title/tt2278388/",
    },
    {
      id: "4",
      title: "Spirited Away",
      year: 2001,
      genre: "animation",
      director: "Hayao Miyazaki",
      rating: 4.8,
      synopsis:
        "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.",
      posterEmoji: "🐉",
      imdbUrl: "https://www.imdb.com/title/tt0245429/",
    },
    {
      id: "5",
      title: "There Will Be Blood",
      year: 2007,
      genre: "drama",
      director: "Paul Thomas Anderson",
      rating: 4.5,
      synopsis:
        "A story of family, religion, hatred, oil and madness, focusing on a turn-of-the-century prospector in the early days of the business.",
      posterEmoji: "🛢️",
    },
    {
      id: "6",
      title: "Get Out",
      year: 2017,
      genre: "horror",
      director: "Jordan Peele",
      rating: 4.4,
      synopsis:
        "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
      posterEmoji: "🫖",
    },
  ],
};

export interface WelcomeCardDemoInput extends Record<string, unknown> {
  title: string;
  message: string;
}

export const WELCOME_CARD_DEMO_INPUT: WelcomeCardDemoInput = {
  title: "Welcome!",
  message:
    "This is your MCP App. Edit this component to build something amazing.",
};
