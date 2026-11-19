import { StagedItemInput } from "@/lib/repositories/importRepository";

export interface GitHubRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  url: string;
  updatedAt: string;
}

export type GithubRepoMetadata = GitHubRepoSummary;

export interface FetchUserReposOptions {
  username: string;
  token?: string;
}

export class GitHubImportService {
  /**
   * Fetches public repositories for a given GitHub username
   */
  static async listUserRepos(username: string, token?: string): Promise<GitHubRepoSummary[]> {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) throw new Error("GitHub username is required.");

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ResumeMaker-Intake/1.0",
    };
    if (token) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=15`, {
      headers,
    });

    if (res.status === 404) {
      throw new Error(`GitHub user '${cleanUser}' not found.`);
    }
    if (res.status === 403 || res.status === 429) {
      throw new Error("GitHub API rate limit exceeded. Provide a personal access token for higher limits.");
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || null,
      language: repo.language || null,
      topics: repo.topics || [],
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      url: repo.html_url,
      updatedAt: repo.updated_at,
    }));
  }

  static async fetchUserRepos(options: FetchUserReposOptions): Promise<GitHubRepoSummary[]> {
    return this.listUserRepos(options.username, options.token);
  }

  /**
   * Converts selected GitHub repositories into staged project entries
   */
  static convertReposToStagedItems(repos: GitHubRepoSummary[]): StagedItemInput[] {
    return repos.map((repo) => {
      const bullets: string[] = [];

      // Headline bullet
      const langPart = repo.language ? ` in ${repo.language}` : "";
      const descPart = repo.description ? ` focused on ${repo.description.replace(/\.$/, "")}` : "";
      bullets.push(`Architected and open-sourced ${repo.name}${langPart}${descPart}.`);

      // Technologies & Topics bullet
      if (repo.topics.length > 0) {
        bullets.push(`Implemented modern distributed patterns leveraging ${repo.topics.slice(0, 6).join(", ")}.`);
      }

      // Metric & Traction bullet
      if (repo.stars > 0 || repo.forks > 0) {
        bullets.push(`Maintained open-source repository reaching ${repo.stars} stars and ${repo.forks} forks.`);
      }

      return {
        entryType: "project",
        rawSnippet: `GitHub Repository: ${repo.url}\n${repo.description || ""}`,
        parsedDataJson: {
          title: repo.name,
          organization: "Open Source / GitHub",
          location: repo.url,
          descriptionContext: repo.description || null,
          bullets: bullets.length > 0 ? bullets : [`Open-source software project: ${repo.name}`],
        },
        confidence: 0.95,
      };
    });
  }

  static transformReposToProjectItems(repos: GitHubRepoSummary[]): StagedItemInput[] {
    return this.convertReposToStagedItems(repos);
  }
}

export const GithubImportService = GitHubImportService;
