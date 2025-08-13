import axios, { AxiosInstance } from 'axios';
import { RedmineIssue, RedmineTimeEntry, RedmineConfig } from '@/types';

export class RedmineClient {
  private client: AxiosInstance;

  constructor(config: RedmineConfig) {
    this.client = axios.create({
      baseURL: config.endpoint,
      headers: {
        'X-Redmine-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get('/users/current.json');
      return response.data.user;
    } catch (error) {
      throw new Error(`Failed to get current user: ${error}`);
    }
  }

  async getAssignedIssues(startDate: Date, endDate: Date): Promise<RedmineIssue[]> {
    try {
      const user = await this.getCurrentUser();
      const params = {
        assigned_to_id: user.id,
        status_id: 'open',
        limit: 100,
        [`created_on`]: `><${startDate.toISOString().split('T')[0]}|${endDate.toISOString().split('T')[0]}`,
      };

      const response = await this.client.get('/issues.json', { params });
      return response.data.issues;
    } catch (error) {
      throw new Error(`Failed to fetch assigned issues: ${error}`);
    }
  }

  async getAllOpenIssues(): Promise<RedmineIssue[]> {
    try {
      const user = await this.getCurrentUser();
      const params = {
        assigned_to_id: user.id,
        status_id: 'open',
        limit: 100,
      };

      const response = await this.client.get('/issues.json', { params });
      return response.data.issues;
    } catch (error) {
      throw new Error(`Failed to fetch open issues: ${error}`);
    }
  }

  async getIssuesFromDateRange(startDate: Date, endDate: Date): Promise<RedmineIssue[]> {
    try {
      const user = await this.getCurrentUser();
      const params = {
        assigned_to_id: user.id,
        limit: 100,
        [`created_on`]: `><${startDate.toISOString().split('T')[0]}|${endDate.toISOString().split('T')[0]}`,
      };

      const response = await this.client.get('/issues.json', { params });
      return response.data.issues;
    } catch (error) {
      throw new Error(`Failed to fetch issues from date range: ${error}`);
    }
  }

  async getIssuesForCurrentMonth(): Promise<RedmineIssue[]> {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Fetch both open issues and issues from the date range
    const [openIssues, dateRangeIssues] = await Promise.all([
      this.getAllOpenIssues(),
      this.getIssuesFromDateRange(startOfLastMonth, endOfMonth)
    ]);
    
    // Merge and deduplicate by issue ID
    const issueMap = new Map<number, RedmineIssue>();
    
    openIssues.forEach(issue => {
      issueMap.set(issue.id, issue);
    });
    
    dateRangeIssues.forEach(issue => {
      issueMap.set(issue.id, issue);
    });
    
    // Sort by creation date (newest first)
    return Array.from(issueMap.values()).sort((a, b) => {
      return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
    });
  }

  async getTimeEntriesForIssue(issueId: number): Promise<RedmineTimeEntry[]> {
    try {
      const response = await this.client.get('/time_entries.json', {
        params: {
          issue_id: issueId,
          limit: 100,
        },
      });
      return response.data.time_entries;
    } catch (error) {
      throw new Error(`Failed to fetch time entries for issue ${issueId}: ${error}`);
    }
  }

  async createTimeEntry(entry: Omit<RedmineTimeEntry, 'id'>): Promise<RedmineTimeEntry> {
    try {
      const response = await this.client.post('/time_entries.json', {
        time_entry: entry,
      });
      return response.data.time_entry;
    } catch (error) {
      throw new Error(`Failed to create time entry: ${error}`);
    }
  }

  async createTimeEntries(entries: Omit<RedmineTimeEntry, 'id'>[]): Promise<RedmineTimeEntry[]> {
    const results: RedmineTimeEntry[] = [];
    const errors: Array<{ entry: Omit<RedmineTimeEntry, 'id'>; error: string }> = [];

    for (const entry of entries) {
      try {
        const created = await this.createTimeEntry(entry);
        results.push(created);
      } catch (error) {
        errors.push({ entry, error: String(error) });
      }
    }

    if (errors.length > 0) {
      console.error('Some time entries failed to create:', errors);
    }

    return results;
  }

  async getTimeEntryActivities() {
    try {
      const response = await this.client.get('/enumerations/time_entry_activities.json');
      return response.data.time_entry_activities;
    } catch (error) {
      throw new Error(`Failed to fetch time entry activities: ${error}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  async getIssueCategories(): Promise<any[]> {
    try {
      const projectIds = new Set<number>();
      
      // Get projects from recent issues to fetch their categories
      try {
        const issues = await this.getIssuesForCurrentMonth();
        issues.forEach(issue => {
          if (issue.project?.id) {
            projectIds.add(issue.project.id);
          }
        });
      } catch (error) {
        console.warn('Could not fetch issues for categories:', error);
        // Continue anyway, return empty array if no projects found
      }

      if (projectIds.size === 0) {
        console.log('No projects found to fetch categories from');
        return [];
      }

      const allCategories: any[] = [];
      
      // Fetch categories for each project
      for (const projectId of projectIds) {
        try {
          const response = await this.client.get(`/projects/${projectId}/issue_categories.json`);
          if (response.data.issue_categories) {
            allCategories.push(...response.data.issue_categories.map((cat: any) => ({
              ...cat,
              project_id: projectId
            })));
          }
        } catch (error) {
          console.warn(`Failed to fetch categories for project ${projectId}:`, error);
        }
      }
      
      return allCategories;
    } catch (error) {
      throw new Error(`Failed to fetch issue categories: ${error}`);
    }
  }
}