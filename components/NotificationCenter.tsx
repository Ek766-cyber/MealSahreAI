import React, { useState, useEffect, useRef } from 'react';
import { generateReminders } from '../services/geminiService';
import { Balance, Reminder } from '../types';
import { getApiUrl } from '../config/api';

interface NotificationCenterProps {
  balances: Balance[];
  mealRate: number;
  onRefreshData: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ balances, mealRate, onRefreshData }) => {
  // Config State
  const [showConfig, setShowConfig] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [threshold, setThreshold] = useState(100);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [autoSend, setAutoSend] = useState(false); // If true, sends via email automatically

  // Operational State
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reminders, setReminders] = useState<Partial<Reminder>[]>([]);
  const [tone, setTone] = useState('friendly');
  const [sendStatus, setSendStatus] = useState<Record<string, 'sent' | 'error' | 'idle'>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Load notification configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/api/notifications/config`, {
          credentials: 'include'
        });

        if (response.status === 401) {
          setIsLoadingConfig(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            const config = data.config;
            setScheduledTime(config.scheduledTime || '18:00');
            setThreshold(config.threshold || 100);
            setEmailEnabled(config.emailEnabled || false);
            setAutoSend(config.autoSend || false);
            setIsEnabled(config.isEnabled || false);
            setTone(config.tone || 'friendly');
          }
        }
      } catch (error) {
        console.error('Error loading notification config:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, []);

  // Save notification configuration when settings change
  useEffect(() => {
    if (isLoadingConfig) return; // Don't save during initial load

    const saveConfig = async () => {
      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/api/notifications/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            scheduledTime,
            threshold,
            emailEnabled,
            autoSend,
            isEnabled,
            tone
          })
        });

        if (response.status === 401) {
          // Not authenticated
        } else if (response.ok) {
          const data = await response.json();
        } else {
          console.error('Failed to save notification config');
        }
      } catch (error) {
        console.error('Error saving notification config:', error);
      }
    };

    saveConfig();
  }, [scheduledTime, threshold, emailEnabled, autoSend, isEnabled, tone, isLoadingConfig]);

  // Note: Scheduling is now handled entirely by the backend server
  // The server will automatically send emails at the scheduled time
  // even when no browser tabs are open

  const handleGenerateReminders = async () => {
    setIsGenerating(true);
    const results = await generateReminders(balances, tone, mealRate, threshold);
    setReminders(results);
    setSendStatus({}); // Reset status
    setIsGenerating(false);
  };

  const handleSend = async (reminder: Partial<Reminder>) => {
    if (!reminder.personId) return;

    if (!emailEnabled) {
      // Silent notification instead of alert
      setSendStatus(prev => ({ ...prev, [reminder.personId!]: 'sent' }));
      return;
    }

    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          personId: reminder.personId,
          name: reminder.name,
          message: reminder.message,
          amountOwed: reminder.amountOwed
        })
      });

      if (response.status === 401) {
        setSendStatus(prev => ({ ...prev, [reminder.personId!]: 'error' }));
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSendStatus(prev => ({ ...prev, [reminder.personId!]: 'sent' }));

        // Silent browser notification instead of alert
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Email Sent", {
            body: `Successfully sent email to ${reminder.name}`,
            icon: '/favicon.ico'
          });
        }
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (e: any) {
      console.error('Email send error:', e);
      setSendStatus(prev => ({ ...prev, [reminder.personId!]: 'error' }));

      // Silent browser notification instead of alert
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Email Failed", {
          body: `Failed to send email to ${reminder.name}`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  const handleBatchSend = async (list: Partial<Reminder>[]) => {
    for (const r of list) {
      await handleSend(r);
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("MealShare AI", { body: `Sent ${list.length} reminders via Email.` });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Notification Center</h2>
          <p className="text-sm text-gray-500">AI-powered debt collection & reminders.</p>
          {isEnabled && autoSend && emailEnabled && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Auto-Send Active
              </span>
              <span className="text-gray-500">Runs daily at {scheduledTime}.</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
          title="Configure Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>

      {/* Configuration Panel (Collapsible) */}
      {showConfig && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-sm animate-fade-in">
          <h4 className="font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Configuration</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Low Balance Threshold ($)</label>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full px-2 py-1.5 border rounded"
              />
              <p className="text-[10px] text-slate-400 mt-1">Notify users with balance below this.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">AI Tone</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full px-2 py-1.5 border rounded"
              >
                <option value="friendly">Friendly / Polite</option>
                <option value="professional">Professional</option>
                <option value="urgent">Urgent / Strict</option>
                <option value="humorous">Humorous / Sarcastic</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={emailEnabled}
              onChange={e => setEmailEnabled(e.target.checked)}
              className="rounded text-primary"
            />
            <label htmlFor="emailEnabled" className="text-xs font-semibold text-slate-700">
              Enable Email Notifications
            </label>
          </div>
        </div>
      )}

      {/* Scheduler Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex-1">
            <span className="text-xs text-gray-500 block">Scheduled Time</span>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-transparent font-bold text-gray-800 focus:outline-none"
            />
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <button
            onClick={() => {
              const newState = !isEnabled;
              setIsEnabled(newState);
              setAutoSend(newState);
            }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
          >
            {isEnabled ? 'AUTO ON' : 'AUTO OFF'}
          </button>
        </div>

        <button
          onClick={handleGenerateReminders}
          disabled={isGenerating}
          className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-70 transition shadow-sm flex justify-center items-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Analysing Finances...
            </>
          ) : 'Generate Messages Now'}
        </button>
      </div>

      {/* Generated Reminders List */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Draft Messages</h3>
          {reminders.length > 0 && emailEnabled && (
            <button onClick={() => handleBatchSend(reminders)} className="text-[10px] text-primary hover:underline">Send All</button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm">No pending reminders.</p>
            <p className="text-xs mt-1">Adjust threshold or wait for schedule.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder, idx) => {
              const status = reminder.personId ? sendStatus[reminder.personId] : 'idle';
              return (
                <div key={idx} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl hover:shadow-md transition bg-white group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 text-sm">{reminder.name}</span>
                      {status === 'sent' && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Sent</span>}
                      {status === 'error' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Error</span>}
                    </div>
                    <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">
                      {reminder.amountOwed && reminder.amountOwed > 0 ? `Owes $${reminder.amountOwed.toFixed(0)}` : 'Low Funds'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-lg text-xs leading-relaxed">
                      "{reminder.message}"
                    </div>
                  </div>
                  <button
                    onClick={() => reminder.personId && handleSend(reminder)}
                    className="w-full mt-1 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 hover:text-gray-900 transition flex items-center justify-center gap-1"
                  >
                    {emailEnabled ? 'Send via Email' : 'Simulate Send'}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};