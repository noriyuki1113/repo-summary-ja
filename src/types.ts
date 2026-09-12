export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  license: string | null;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  languages: Record<string, number>;
  readme: string | null;
  topLevelFiles: string[];
}
