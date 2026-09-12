export const CATEGORIES = [
  "AI & Machine Learning",
  "Business Software",
  "Community & Social",
  "Content & Publishing",
  "Data & Analytics",
  "Developer Tools",
  "Infrastructure & Operations",
  "Miscellaneous",
  "Productivity & Utilities",
  "Security & Privacy",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Repo {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number | null;
  forks: number | null;
  license: string | null;
  primaryLanguage: string | null;
  lastCommitAt: string | null;
  topics: string[];
  isArchived: boolean;
  summaryJa: string | null;
  useCaseJa: string | null;
  targetUserJa: string | null;
  alternativeTo: string | null;
  category: Category | null;
  rawReadmeExcerpt: string | null;
  createdAt: string;
  updatedAt: string;
  starsUpdatedAt: string | null;
}
