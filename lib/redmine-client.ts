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

  async getIssuesForCurrentMonth(): Promise<RedmineIssue[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.getAssignedIssues(startOfMonth, endOfMonth);
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
}