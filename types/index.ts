export interface RedmineConfig {
  endpoint: string;
  apiKey: string;
}

export interface RedmineIssue {
  id: number;
  project: {
    id: number;
    name: string;
  };
  tracker: {
    id: number;
    name: string;
  };
  status: {
    id: number;
    name: string;
  };
  priority: {
    id: number;
    name: string;
  };
  author: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
  subject: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  done_ratio: number;
  is_private: boolean;
  estimated_hours?: number;
  spent_hours?: number;
  created_on: string;
  updated_on: string;
  closed_on?: string;
}

export interface RedmineTimeEntry {
  id?: number;
  issue_id: number;
  user_id?: number;
  hours: number;
  comments: string;
  activity_id?: number;
  spent_on: string;
}

export interface TimeEntryAllocation {
  issue: RedmineIssue;
  estimatedHours: number;
  entries: TimeEntryToCreate[];
}

export interface TimeEntryToCreate {
  date: string;
  hours: number;
  comments: string;
}

export interface EstimationResult {
  issueId: number;
  subject: string;
  estimatedHours: number;
  reasoning: string;
}

export interface DayAllocation {
  date: string;
  totalHours: number;
  entries: Array<{
    issueId: number;
    hours: number;
    comments: string;
  }>;
}