'use client';

import { useState } from 'react';
import { RedmineIssue, EstimationResult } from '@/types';
import { 
  Clock, Hash, AlertCircle, CheckCircle2,
  Tag, Folder, Activity
} from 'lucide-react';

interface TaskListProps {
  issues: RedmineIssue[];
  estimations: EstimationResult[];
  onEstimationChange: (issueId: number, hours: number) => void;
  selectedIssues: Set<number>;
  onSelectionChange: (issueId: number, selected: boolean) => void;
}

export function TaskList({ 
  issues, 
  estimations, 
  onEstimationChange,
  selectedIssues,
  onSelectionChange 
}: TaskListProps) {
  const estimationMap = new Map(estimations.map(e => [e.issueId, e]));

  const handleHoursChange = (issueId: number, value: string) => {
    const hours = parseFloat(value) || 0;
    onEstimationChange(issueId, hours);
  };

  const handleSelectAll = (checked: boolean) => {
    issues.forEach(issue => {
      onSelectionChange(issue.id, checked);
    });
  };

  const allSelected = issues.length > 0 && issues.every(issue => selectedIssues.has(issue.id));
  const someSelected = issues.some(issue => selectedIssues.has(issue.id));

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'closed':
      case 'done':
        return 'from-green-400 to-emerald-500';
      case 'in progress':
      case 'active':
        return 'from-blue-400 to-cyan-500';
      case 'new':
        return 'from-purple-400 to-pink-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Tasks</h2>
            <p className="text-sm text-gray-400">{issues.length} issues found</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">Select All</span>
          </label>
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {issues.map((issue) => {
          const estimation = estimationMap.get(issue.id);
          const isSelected = selectedIssues.has(issue.id);
          
          return (
            <div
              key={issue.id}
              className={`
                backdrop-blur-xl border rounded-xl transition-all duration-300
                ${isSelected 
                  ? 'bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}
            >
              {/* Main Content */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectionChange(issue.id, e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/10 text-purple-500 focus:ring-purple-500"
                  />
                  
                  {/* Issue Details */}
                  <div className="flex-1 space-y-3">
                    {/* Title Row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-purple-400 font-mono">#{issue.id}</span>
                          <span className={`
                            px-2 py-0.5 text-xs font-medium rounded-full
                            bg-gradient-to-r ${getStatusColor(issue.status.name)}
                            text-white
                          `}>
                            {issue.status.name}
                          </span>
                        </div>
                        <h3 className="text-white font-medium leading-tight">
                          {issue.subject}
                        </h3>
                      </div>
                      
                      {/* Hours Display and Input */}
                      <div className="flex flex-col items-end gap-2">
                        {/* Spent Hours Display */}
                        {issue.spent_hours !== undefined && issue.spent_hours > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-green-400 font-medium">
                              {issue.spent_hours.toFixed(1)}h logged
                            </span>
                          </div>
                        )}
                        {/* Estimation Input */}
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={estimation?.estimatedHours || 0}
                            onChange={(e) => handleHoursChange(issue.id, e.target.value)}
                            step="0.5"
                            min="0"
                            max="40"
                            className="w-24 pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        <span>{issue.project.name}</span>
                      </div>
                      {issue.assigned_to && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          <span>{issue.assigned_to.name}</span>
                        </div>
                      )}
                      {issue.tracker && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{issue.tracker.name}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Description Preview */}
                    {issue.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {issue.description}
                      </p>
                    )}
                    
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {issues.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4">
            <AlertCircle className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
          <p className="text-gray-400">No tasks found for the current month</p>
        </div>
      )}
    </div>
  );
}