'use client';

import { useState, useEffect } from 'react';
import { TaskList } from '@/components/task-list';
import { TimeEntryPreview } from '@/components/time-entry-preview';
import { RedmineIssue, EstimationResult, TimeEntryAllocation, RedmineTimeEntry } from '@/types';
import { fetchCurrentMonthIssues, createTimeEntries, testRedmineConnection, fetchTimeEntryActivities, fetchIssueCategories } from '@/app/actions/redmine';
import { distributeTimeEntries } from '@/lib/time-distribution';
import { 
  Loader2, RefreshCw, Brain, Send, AlertCircle, Settings, CheckCircle, 
  XCircle, Clock, Github, ChevronRight, Shield, LogOut, User
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function Home() {
  const { user, signOut, signIn, loading: authLoading } = useAuth();
  const [savedApiKey, setSavedApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [issues, setIssues] = useState<RedmineIssue[]>([]);
  const [estimations, setEstimations] = useState<EstimationResult[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [allocations, setAllocations] = useState<TimeEntryAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | undefined>();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('redmine-api-key');
    if (saved) {
      setSavedApiKey(saved);
      setTempApiKey(saved);
      // Clear any error when we have a saved API key
      setError(null);
    }
  }, []);

  // Auto-fetch issues when user logs in and has API key
  useEffect(() => {
    // Clear any lingering errors when component mounts or user/key changes
    setError(null);
    
    if (user && savedApiKey) {
      console.log('User logged in with API key, fetching issues...');
      // Silently fetch issues on login - don't show errors for auto-fetch
      fetchIssuesSilently();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, savedApiKey]);

  const handleApiKeySave = async () => {
    if (!tempApiKey) {
      setError('Please enter an API key');
      return;
    }
    setSavedApiKey(tempApiKey);
    localStorage.setItem('redmine-api-key', tempApiKey);
    
    setError(null);
    setSuccess('API key saved successfully');
    
    // Auto-fetch issues after saving API key
    setTimeout(() => {
      fetchIssues();
    }, 100);
    
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleTestConnection = async () => {
    if (!tempApiKey) return;
    
    setTesting(true);
    setTestStatus('idle');
    
    const result = await testRedmineConnection(tempApiKey);
    setTestStatus(result.success ? 'success' : 'error');
    if (!result.success) {
      setError(result.error || 'Connection test failed');
    } else {
      setSuccess('Connection test successful');
      setTimeout(() => setSuccess(null), 3000);
    }
    setTesting(false);
  };


  const fetchIssues = async (silent = false) => {
    // Clear any previous errors
    if (!silent) {
      setError(null);
    }
    
    if (!savedApiKey) {
      if (!silent) {
        setError('Please enter your Redmine API key first');
      }
      return;
    }

    setLoading(true);
    
    try {
      // Fetch issues, activities, and tags in parallel
      const [issuesResult, activitiesResult, tagsResult] = await Promise.all([
        fetchCurrentMonthIssues(savedApiKey),
        fetchTimeEntryActivities(savedApiKey),
        fetchIssueCategories(savedApiKey)
      ]);

      if (issuesResult.success && issuesResult.data) {
        setIssues(issuesResult.data);
        setSelectedIssues(new Set(issuesResult.data.map(i => i.id)));
      } else if (!silent) {
        setError(issuesResult.error || 'Failed to fetch issues');
      }
      
      if (activitiesResult.success && activitiesResult.data) {
        setActivities(activitiesResult.data);
        // Set default activity if available
        const defaultActivity = activitiesResult.data.find((a: any) => a.is_default) || activitiesResult.data[0];
        if (defaultActivity) {
          setSelectedActivityId(defaultActivity.id);
        }
      }
      
      if (tagsResult.success && tagsResult.data) {
        console.log('Fetched tags:', tagsResult.data);
      }
    } catch (err) {
      if (!silent) {
        setError('Failed to fetch issues');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIssuesSilently = () => fetchIssues(true);

  const handleEstimationChange = (issueId: number, hours: number) => {
    setEstimations(prev => {
      const existing = prev.find(e => e.issueId === issueId);
      if (existing) {
        return prev.map(e => 
          e.issueId === issueId 
            ? { ...e, estimatedHours: hours }
            : e
        );
      } else {
        const issue = issues.find(i => i.id === issueId);
        return [...prev, {
          issueId,
          subject: issue?.subject || '',
          estimatedHours: hours,
          reasoning: 'Manual estimate',
        }];
      }
    });
  };

  const handleSelectionChange = (issueId: number, selected: boolean) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(issueId);
      } else {
        newSet.delete(issueId);
      }
      return newSet;
    });
  };

  const handleGeneratePreview = () => {
    const selectedIssuesWithEstimations = issues
      .filter(i => selectedIssues.has(i.id))
      .map(issue => {
        const estimation = estimations.find(e => e.issueId === issue.id);
        return {
          issue,
          estimatedHours: estimation?.estimatedHours || 0,
        };
      })
      .filter(item => item.estimatedHours > 0);

    const newAllocations = distributeTimeEntries(selectedIssuesWithEstimations);
    setAllocations(newAllocations);
    setShowPreview(true);
  };

  const handleCreateEntries = async () => {
    if (!savedApiKey) {
      setError('Redmine API key is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const entriesToCreate: Omit<RedmineTimeEntry, 'id'>[] = [];
      
      allocations.forEach(allocation => {
        allocation.entries.forEach(entry => {
          entriesToCreate.push({
            issue_id: allocation.issue.id,
            hours: entry.hours,
            comments: entry.comments,
            spent_on: entry.date,
            activity_id: selectedActivityId,
          });
        });
      });

      const result = await createTimeEntries(savedApiKey, entriesToCreate);

      if (result.success) {
        setSuccess(`Successfully created ${entriesToCreate.length} time entries`);
        setShowPreview(false);
        setAllocations([]);
        
        // Refresh issues to update spent hours
        await fetchIssues();
        
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(result.error || 'Failed to create time entries');
      }
    } catch (err) {
      setError('Failed to create time entries');
    } finally {
      setCreating(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login button
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Welcome to Redmine Tracker</h1>
            <p className="text-gray-400">Please sign in to continue</p>
          </div>
          <button
            onClick={async () => {
              setSigningIn(true);
              try {
                await signIn();
              } catch (error) {
                console.error('Sign in error:', error);
                setSigningIn(false);
              }
            }}
            disabled={signingIn}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 mx-auto"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white">
      {/* Hero Section */}
      <div className="relative">
        
        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">Redmine Tracker</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{user.name || user.email}</span>
                </div>
                {savedApiKey && (
                  <button
                    onClick={() => {
                      setSavedApiKey('');
                      setTempApiKey('');
                      localStorage.removeItem('redmine-api-key');
                    }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Change API Key
                  </button>
                )}
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
            <a
              href="https://github.com/mkhoatd/redmine-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
          {!savedApiKey ? (
            <>

              {/* Setup Form */}
              <div className="max-w-2xl mx-auto">
                <div className="backdrop-blur-xl bg-black/50 rounded-2xl border border-white/20 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold">Get Started</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-300">
                          Redmine API Key
                        </label>
                        <a
                          href={`${process.env.NEXT_PUBLIC_REDMINE_URL || 'https://redmine.digitalfortress.dev'}/my/account`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                        >
                          Get your API key
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          placeholder="Enter your Redmine API key"
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <button
                          onClick={handleTestConnection}
                          disabled={testing || !tempApiKey}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-all"
                        >
                          {testing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : testStatus === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : testStatus === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-400" />
                          ) : (
                            <Shield className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleApiKeySave}
                      disabled={!tempApiKey}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        GET STARTED
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => fetchIssues()}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Fetch Tasks
                  </button>
                  
                  {issues.length > 0 && (
                    <>
                      <button
                        onClick={handleGeneratePreview}
                        disabled={selectedIssues.size === 0}
                        className="px-6 py-3 bg-green-500/20 backdrop-blur-xl border border-green-500/30 text-green-400 rounded-lg font-medium hover:bg-green-500/30 disabled:opacity-50 transition-all flex items-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Send className="w-4 h-4" />
                        Generate Entries
                      </button>
                      
                      {activities.length > 0 && (
                        <select
                          value={selectedActivityId || ''}
                          onChange={(e) => setSelectedActivityId(e.target.value ? Number(e.target.value) : undefined)}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                        >
                          <option value="">Select Activity</option>
                          {activities.map((activity: any) => (
                            <option key={activity.id} value={activity.id}>
                              {activity.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
                
                <div className="text-sm text-gray-400">
                  {issues.length > 0 && (
                    <span>{selectedIssues.size} of {issues.length} selected</span>
                  )}
                </div>
              </div>

              {/* Notifications */}
              {error && !(error.includes('Please enter your Redmine API key') && issues.length > 0) && (
                <div className="p-4 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-lg flex items-center gap-3 animate-slide-down">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-red-400">{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-lg flex items-center gap-3 animate-slide-down">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-green-400">{success}</span>
                </div>
              )}

              {/* Task List */}
              {issues.length > 0 && (
                <div className="animate-fade-in">
                  <TaskList
                    issues={issues}
                    estimations={estimations}
                    onEstimationChange={handleEstimationChange}
                    selectedIssues={selectedIssues}
                    onSelectionChange={handleSelectionChange}
                  />
                </div>
              )}

              {/* Time Entry Preview */}
              {showPreview && allocations.length > 0 && (
                <div className="animate-slide-up">
                  <TimeEntryPreview
                    allocations={allocations}
                    onConfirm={handleCreateEntries}
                    onCancel={() => setShowPreview(false)}
                    isCreating={creating}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}