'use client';

import { TimeEntryAllocation, DayAllocation } from '@/types';
import { 
  Calendar, Clock, CheckCircle, AlertTriangle, X, ChevronRight,
  CalendarDays, Timer, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getDailyBreakdown, calculateTotalHours } from '@/lib/time-distribution';

interface TimeEntryPreviewProps {
  allocations: TimeEntryAllocation[];
  onConfirm: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

export function TimeEntryPreview({ 
  allocations, 
  onConfirm, 
  onCancel,
  isCreating 
}: TimeEntryPreviewProps) {
  const dailyBreakdown = getDailyBreakdown(allocations);
  const totalHours = calculateTotalHours(allocations);
  const totalEntries = allocations.reduce((sum, a) => sum + a.entries.length, 0);

  const sortedDays = Array.from(dailyBreakdown.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  const getDayColor = (hours: number) => {
    if (hours > 8) return 'from-red-500 to-pink-500';
    if (hours > 6) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-purple-400" />
                Time Entry Preview
              </h2>
              <div className="mt-2 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-purple-500/20">
                    <Clock className="w-3 h-3 text-purple-400" />
                  </div>
                  <span className="text-gray-300">
                    <span className="text-white font-medium">{totalHours.toFixed(1)}</span> hours
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-500/20">
                    <CheckCircle className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-gray-300">
                    <span className="text-white font-medium">{totalEntries}</span> entries
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-green-500/20">
                    <Calendar className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-gray-300">
                    <span className="text-white font-medium">{dailyBreakdown.size}</span> days
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-4">
            {sortedDays.map(([date, day]) => {
              const dayColor = getDayColor(day.totalHours);
              
              return (
                <div 
                  key={date} 
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all"
                >
                  <div className="px-5 py-3 bg-gradient-to-r from-white/5 to-white/10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${dayColor}`}>
                          <CalendarDays className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {format(parseISO(date), 'EEEE')}
                          </div>
                          <div className="text-sm text-gray-400">
                            {format(parseISO(date), 'MMMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-3 py-1 rounded-full text-sm font-medium
                          bg-gradient-to-r ${dayColor} text-white
                        `}>
                          {day.totalHours.toFixed(1)}h
                        </span>
                        {day.totalHours > 8 && (
                          <div className="p-1 rounded-lg bg-red-500/20">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-5 py-3 space-y-2">
                    {day.entries.map((entry, idx) => {
                      const issue = allocations.find(a => a.issue.id === entry.issueId)?.issue;
                      return (
                        <div 
                          key={`${entry.issueId}-${idx}`} 
                          className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                            <div>
                              <span className="text-purple-400 text-xs font-mono">#{entry.issueId}</span>
                              <p className="text-sm text-gray-300 line-clamp-1">
                                {issue?.subject || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-3 h-3 text-gray-500" />
                            <span className="text-sm text-gray-400 font-medium">
                              {entry.hours.toFixed(1)}h
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Time Entries...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create {totalEntries} Time Entries
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}