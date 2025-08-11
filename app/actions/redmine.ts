'use server';

import { RedmineClient } from '@/lib/redmine-client';
import { RedmineConfig, RedmineIssue, RedmineTimeEntry } from '@/types';

function getRedmineConfig(apiKey: string): RedmineConfig {
  const endpoint = process.env.NEXT_PUBLIC_REDMINE_URL;
  
  if (!endpoint) {
    throw new Error('NEXT_PUBLIC_REDMINE_URL environment variable is required');
  }
  
  if (!apiKey) {
    throw new Error('Redmine API key is required');
  }
  
  return { endpoint, apiKey };
}

export async function testRedmineConnection(apiKey: string) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    const isValid = await client.testConnection();
    return { success: isValid, error: isValid ? null : 'Invalid credentials or endpoint' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function fetchCurrentMonthIssues(apiKey: string) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    const issues = await client.getIssuesForCurrentMonth();
    
    // Fetch time entries for each issue to get spent hours
    const issuesWithHours = await Promise.all(
      issues.map(async (issue) => {
        try {
          const timeEntries = await client.getTimeEntriesForIssue(issue.id);
          const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
          return { ...issue, spent_hours: totalHours };
        } catch (error) {
          console.error(`Failed to fetch time entries for issue ${issue.id}:`, error);
          return { ...issue, spent_hours: 0 };
        }
      })
    );
    
    return { success: true, data: issuesWithHours, error: null };
  } catch (error) {
    return { success: false, data: null, error: String(error) };
  }
}

export async function fetchTimeEntriesForIssue(apiKey: string, issueId: number) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    const entries = await client.getTimeEntriesForIssue(issueId);
    return { success: true, data: entries, error: null };
  } catch (error) {
    return { success: false, data: null, error: String(error) };
  }
}

export async function fetchTimeEntryActivities(apiKey: string) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    const activities = await client.getTimeEntryActivities();
    return { success: true, data: activities, error: null };
  } catch (error) {
    return { success: false, data: null, error: String(error) };
  }
}

export async function fetchIssueCategories(apiKey: string) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    const categories = await client.getIssueCategories();
    return { success: true, data: categories, error: null };
  } catch (error) {
    return { success: false, data: null, error: String(error) };
  }
}

export async function createTimeEntries(
  apiKey: string,
  entries: Omit<RedmineTimeEntry, 'id'>[]
) {
  try {
    const config = getRedmineConfig(apiKey);
    const client = new RedmineClient(config);
    
    // Fetch available activities to get the default one
    let defaultActivityId: number | undefined;
    try {
      const activities = await client.getTimeEntryActivities();
      // Use the first activity as default, or the one marked as default
      const defaultActivity = activities.find((a: any) => a.is_default) || activities[0];
      defaultActivityId = defaultActivity?.id;
    } catch (error) {
      console.warn('Could not fetch activities, proceeding without activity_id');
    }
    
    // Add activity_id to entries if not already present
    const entriesWithActivity = entries.map(entry => ({
      ...entry,
      activity_id: entry.activity_id || defaultActivityId
    }));
    
    const created = await client.createTimeEntries(entriesWithActivity);
    return { success: true, data: created, error: null };
  } catch (error) {
    return { success: false, data: null, error: String(error) };
  }
}