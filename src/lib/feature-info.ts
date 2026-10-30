// Client-safe: feature names and descriptions shared by the admin panel and the server.

export const FEATURE_KEYS = [
  "describe",
  "import",
  "quickAdd",
  "export",
  "health",
  "club",
  "clubSearch",
  "intros",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_INFO: Record<FeatureKey, { label: string; description: string; group: "Map" | "Club" }> = {
  quickAdd: { label: "Add a group", description: "Paste a list of names for one circle.", group: "Map" },
  describe: { label: "Describe people (AI)", description: "Members write about people in their own words and Gemini turns it into a map.", group: "Map" },
  import: { label: "Import files", description: "CSV import: the Mycelium template, LinkedIn Connections.csv, or any sheet with names.", group: "Map" },
  export: { label: "Download my map", description: "Members can download their own map as CSV.", group: "Map" },
  health: { label: "Network health", description: "Insights on bridges, fading ties, blind spots and intros to make.", group: "Map" },
  club: { label: "Club reach", description: "The shared, name-free view of everyone's maps. Turning this off also hides search and intros.", group: "Club" },
  clubSearch: { label: "Who are you trying to reach?", description: "Search across the club's maps, with AI matching when AI is on.", group: "Club" },
  intros: { label: "Introduction requests", description: "Members can ask each other for warm introductions.", group: "Club" },
};

