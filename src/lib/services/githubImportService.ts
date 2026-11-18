export interface GitHubRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  topics: string[];
  stars: number;
  updatedAt: string;
}

export interface GitHubImportOptions {
  username: string;
  token?: string; // Optional personal access token for higher rate limits
}

export class GitHubImportService {
  /**
   * Fetches public repositories for a GitHub user
   */
  static async fetchUserRepos(
    options: GitHubImportOptions
  ): Promise<GitHubRepoSummary[]> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ResumeMaker/1.0",
    };

    if (options.token) {
      headers["Authorization"] = `token ${options.token}`;
    }

    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(options.username)}/repos?sort=updated&per_page=30`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`GitHub user "${options.username}" not found.`);
      }
      if (response.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Please provide a Personal Access Token or try again later."
        );
      }
      throw new Error(`GitHub API error: HTTP ${response.status}`);
    }

    const rawRepos = await response.json();

    return rawRepos.map((r: any) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      htmlUrl: r.html_url,
      language: r.language,
      topics: r.topics || [],
      stars: r.stargazers_count,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Transforms selected GitHub repositories into project staged items
   */
  static transformReposToProjectItems(repos: GitHubRepoSummary[]) {
    return repos.map((repo) => {
      const bullets: string[] = [];

      if (repo.description) {
        bullets.push(repo.description);
      }

      const techStack = [repo.language, ...repo.topics].filter(Boolean);
      if (techStack.length > 0) {
        bullets.push(`Technologies utilized: ${techStack.join(", ")}`);
      }

      if (repo.stars > 0) {
        bullets.push(`Earned ${repo.stars} GitHub stars from developer community`);
      }

      return {
        entryType: "project",
        rawSnippet: `GitHub Repo: ${repo.htmlUrl}`,
        parsedDataJson: {
          title: repo.name,
          organization: "Open Source / GitHub",
          location: "Remote",
          descriptionContext: `Repository: ${repo.htmlUrl}. ${repo.description || ""}`,
          bullets,
        },
        confidence: 0.95,
      };
    });
  }
}
