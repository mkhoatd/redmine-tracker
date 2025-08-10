import { format, isWeekend, addDays, startOfMonth, endOfMonth, isAfter, isBefore, isSameDay } from 'date-fns';
import { RedmineIssue, TimeEntryToCreate, TimeEntryAllocation, DayAllocation } from '@/types';

const MAX_HOURS_PER_DAY = 8;
const MIN_HOURS_PER_ENTRY = 0.5;

export function distributeTimeEntries(
  issues: Array<{ issue: RedmineIssue; estimatedHours: number }>,
  startDate?: Date,
  endDate?: Date
): TimeEntryAllocation[] {
  const now = new Date();
  const start = startDate || now;
  const end = endDate || endOfMonth(now);
  
  const workdays = getWorkdays(start, end);
  const dayAllocations = new Map<string, DayAllocation>();
  
  workdays.forEach(date => {
    dayAllocations.set(format(date, 'yyyy-MM-dd'), {
      date: format(date, 'yyyy-MM-dd'),
      totalHours: 0,
      entries: []
    });
  });

  const allocations: TimeEntryAllocation[] = [];
  const sortedIssues = [...issues].sort((a, b) => b.estimatedHours - a.estimatedHours);

  for (const { issue, estimatedHours } of sortedIssues) {
    const entries: TimeEntryToCreate[] = [];
    let remainingHours = estimatedHours;
    
    for (const [dateStr, dayAlloc] of dayAllocations.entries()) {
      if (remainingHours <= 0) break;
      
      const availableHours = MAX_HOURS_PER_DAY - dayAlloc.totalHours;
      if (availableHours <= 0) continue;
      
      const hoursToAllocate = Math.min(remainingHours, availableHours);
      
      if (hoursToAllocate >= MIN_HOURS_PER_ENTRY) {
        entries.push({
          date: dateStr,
          hours: roundToQuarter(hoursToAllocate),
          comments: `Working on: ${issue.subject}`
        });
        
        dayAlloc.totalHours += hoursToAllocate;
        dayAlloc.entries.push({
          issueId: issue.id,
          hours: hoursToAllocate,
          comments: `Working on: ${issue.subject}`
        });
        
        remainingHours -= hoursToAllocate;
      }
    }
    
    if (entries.length > 0) {
      allocations.push({
        issue,
        estimatedHours,
        entries
      });
    }
  }
  
  return allocations;
}

export function getWorkdays(startDate: Date, endDate: Date): Date[] {
  const workdays: Date[] = [];
  let currentDate = startDate;
  
  while (!isAfter(currentDate, endDate)) {
    if (!isWeekend(currentDate)) {
      workdays.push(currentDate);
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return workdays;
}

export function calculateTotalHours(allocations: TimeEntryAllocation[]): number {
  return allocations.reduce((total, allocation) => {
    return total + allocation.entries.reduce((sum, entry) => sum + entry.hours, 0);
  }, 0);
}

export function getDailyBreakdown(allocations: TimeEntryAllocation[]): Map<string, DayAllocation> {
  const breakdown = new Map<string, DayAllocation>();
  
  allocations.forEach(allocation => {
    allocation.entries.forEach(entry => {
      if (!breakdown.has(entry.date)) {
        breakdown.set(entry.date, {
          date: entry.date,
          totalHours: 0,
          entries: []
        });
      }
      
      const day = breakdown.get(entry.date)!;
      day.totalHours += entry.hours;
      day.entries.push({
        issueId: allocation.issue.id,
        hours: entry.hours,
        comments: entry.comments
      });
    });
  });
  
  return breakdown;
}

function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

export function getRemainingWorkdays(): number {
  const now = new Date();
  const end = endOfMonth(now);
  return getWorkdays(now, end).length;
}

export function getAvailableHours(): number {
  return getRemainingWorkdays() * MAX_HOURS_PER_DAY;
}