"use client";

import type { MapCenter, POI } from "@/components/examples/poi-map";

export interface POIMapDemoInput {
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

export interface WelcomeCardDemoInput {
  title: string;
  message: string;
}

export const WELCOME_CARD_DEMO_INPUT: WelcomeCardDemoInput = {
  title: "Welcome!",
  message:
    "This is your MCP App. Edit this component to build something amazing.",
};
