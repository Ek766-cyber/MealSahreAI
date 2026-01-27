import React, { useState, useEffect } from 'react';
import { Person, Balance } from '../types';
import { getApiUrl } from '../config/api';

interface DataEntryProps {
  people: Person[];
  balances: Balance[];
  onUpdatePerson: (id: string, meals: number, contribution: number) => void;
  onAddPerson: (name: string, email: string, meals: number, contribution: number) => void;
  onSyncSheet: (url: string) => Promise<void>;
  isSyncing: boolean;
}

export const DataEntry: React.FC<DataEntryProps> = ({
  people,
  balances,
  onSyncSheet,
  isSyncing
}) => {
  // Sheet State
  const [sheetUrl, setSheetUrl] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Auto-Sync State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncTime, setSyncTime] = useState('09:00'); // Default 9 AM

  // Load saved CSV URL and last fetch time on component mount
  useEffect(() => {
    const loadSheetConfig = async () => {
      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/api/sheet/config`, {
          credentials: 'include'
        });

        if (response.status === 401) {
          console.warn('⚠️ Not authenticated - skipping config load');
          setIsLoadingConfig(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.csvUrl) {
            setSheetUrl(data.csvUrl);
            console.log('✅ Loaded saved CSV URL:', data.csvUrl);
          }
          if (data.lastFetchTime) {
            setLastFetchTime(new Date(data.lastFetchTime));
          }
          if (data.autoSyncEnabled !== undefined) {
            setAutoSyncEnabled(data.autoSyncEnabled);
            console.log('✅ Loaded auto-sync enabled:', data.autoSyncEnabled);
          }
          if (data.autoSyncTime) {
            setSyncTime(data.autoSyncTime);
            console.log('✅ Loaded auto-sync time:', data.autoSyncTime);
          }
        }
      } catch (error) {
        console.error('Error loading sheet config:', error);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadSheetConfig();
  }, []);

  // Note: Auto-sync is now handled by the server-side scheduler
  // No client-side interval needed - the server will sync data automatically
  // when autoSyncEnabled is true and the scheduled time arrives

  // Save auto-sync settings when they change
  useEffect(() => {
    if (isLoadingConfig) return; // Don't save during initial load

    const saveSchedulerSettings = async () => {
      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/api/sheet/save-scheduler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            autoSyncEnabled,
            autoSyncTime: syncTime
          })
        });

        if (response.status === 401) {
          console.warn('⚠️ Not authenticated - scheduler settings not saved');
        } else if (response.ok) {
          const data = await response.json();
          console.log('✅ Auto-sync settings saved:', data);
        } else {
          console.error('Failed to save auto-sync settings');
        }
      } catch (error) {
        console.error('Error saving auto-sync settings:', error);
      }
    };

    saveSchedulerSettings();
  }, [autoSyncEnabled, syncTime, isLoadingConfig]);

  const handleSync = async () => {
    if (sheetUrl.trim()) {
      // Save CSV URL to database if it's new or changed
      try {
        const API_URL = getApiUrl();
        const configResponse = await fetch(`${API_URL}/api/sheet/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ csvUrl: sheetUrl })
        });

        if (configResponse.status === 401) {
          console.warn('⚠️ Not authenticated - CSV URL not saved');
        } else if (configResponse.ok) {
          const data = await configResponse.json();
          console.log('✅ CSV URL saved:', data.csvUrl);
        } else {
          console.error('Failed to save CSV URL');
        }
      } catch (error) {
        console.error('Error saving CSV URL:', error);
      }

      // Perform the sync
      await onSyncSheet(sheetUrl);

      // Update last fetch time
      try {
        const API_URL = getApiUrl();
        const timeResponse = await fetch(`${API_URL}/api/sheet/update-fetch-time`, {
          method: 'POST',
          credentials: 'include'
        });

        if (timeResponse.status === 401) {
          console.warn('⚠️ Not authenticated - fetch time not saved');
        } else if (timeResponse.ok) {
          const data = await timeResponse.json();
          setLastFetchTime(new Date(data.lastFetchTime));
          console.log('✅ Fetch time updated:', data.lastFetchTime);
        }
      } catch (error) {
        console.error('Error updating fetch time:', error);
      }
    }
  };

  // Refresh synced data from database (to see server-side sync results)
  const handleRefreshData = async () => {
    try {
      console.log('🔄 Refreshing data from database...');
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/sheet/config`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        // Update last fetch time
        if (data.lastFetchTime) {
          setLastFetchTime(new Date(data.lastFetchTime));
        }

        // Trigger parent component to reload synced data
        window.location.reload();

        console.log('✅ Data refreshed from database');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const downloadExampleCsv = () => {
    // Defines a structure matching the user's image:
    // 1. Meal Grid (Left)
    // 2. Deposit/Joma tables (Right - simulated empty headers for CSV alignment)
    // 3. Totals
    // 4. Summary Table (Meal Details, Cost, Available Balance)
    // 5. Mil Rate
    const csvContent =
      `Date,Sayem,Golam,Emon,Jidhan,Ethon,Konok,Tot / day,,,,Date,Sayem,Joma,,Date,Golam,Joma
1,,,,,,,,,,,,prev,122,,,,,
2,,,,,,,,,,,,,,,
3,1.00,1.00,1.00,1.00,1.00,0.00,5.00,,,,,,,,
4,0.00,0.00,0.00,0.00,0.00,0.00,0.00,,,,,,,,
5,1.00,1.00,1.00,0.00,1.00,0.00,4.00,,,,,,,,
6,1.00,1.00,1.00,0.00,1.00,0.00,4.00,,,,,,,,
,,,,,,,,,,,,,,,
Total,6.50,3.50,7.50,1.00,7.50,3.50,29.50,,,,Total,0,122,,Total,280,-51
,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,
Meal Details,Cost,Available Balance,,,,,,,,,,,
Sayem,384,-262,,,,,,,,,,,
Golam,207,-258,,,,,,,,,,,
Emon,444,-9101,,,,,,,,,,,
Jidhan,59,-39,,,,,,,,,,,
Ethon,444,-381,,,,,,,,,,,
Konok,207,41,,,,,,,,,,,
,,,,,,,,,,,,,,,
Total Joma,-8255,,,,,,,,,,,
Total Bazer,1745,,,,,,,,,,,
,,,,,,,,,,,,,,,
Mil rate,59,,,,,,,,,,,
`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'meal_share_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-800">Data Source</h3>
        <button
          onClick={downloadExampleCsv}
          className="text-xs flex items-center gap-1 text-primary hover:text-indigo-700 underline font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download Template
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto flex flex-col">

        {/* Instructions Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <svg className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            How to get the CSV Link?
          </button>

          {showInstructions && (
            <div className="mt-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-gray-700 space-y-2 animate-fade-in">
              <ol className="list-decimal list-inside space-y-1.5 ml-1">
                <li>Open your Google Sheet.</li>
                <li>Click <span className="font-bold">File</span> {'>'} <span className="font-bold">Share</span> {'>'} <span className="font-bold">Publish to web</span>.</li>
                <li>In the dialog, change "Entire Document" to the <span className="font-bold">specific sheet name</span> (e.g., "Sheet1").</li>
                <li>Change "Web page" to <span className="font-bold">Comma-separated values (.csv)</span>.</li>
                <li>Click <span className="font-bold">Publish</span> and copy the link generated.</li>
                <li>Paste the link below.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Sync Controls */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Google Sheet CSV Link</label>
          <input
            type="text"
            placeholder="https://docs.google.com/.../pub?output=csv"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm mb-3"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing || !sheetUrl || isLoadingConfig}
              className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              onClick={handleRefreshData}
              title="Reload data synced by server"
              className="px-4 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition flex justify-center items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {lastFetchTime && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Last synced: {lastFetchTime.toLocaleString()}
            </p>
          )}
        </div>

        {/* Auto Sync Settings */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-blue-900">Auto-Fetch Scheduler</h4>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input
                type="checkbox"
                name="toggle"
                id="toggle"
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                checked={autoSyncEnabled}
                onChange={() => setAutoSyncEnabled(!autoSyncEnabled)}
                style={{ right: autoSyncEnabled ? '0' : 'auto', left: autoSyncEnabled ? 'auto' : '0', borderColor: autoSyncEnabled ? '#4f46e5' : '#ccc' }}
              />
              <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${autoSyncEnabled ? 'bg-primary' : 'bg-gray-300'}`}></label>
            </div>
          </div>

          <div className={`transition-opacity duration-300 ${autoSyncEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <label className="block text-xs text-blue-800 mb-1">Daily Sync Time</label>
            <input
              type="time"
              value={syncTime}
              onChange={(e) => setSyncTime(e.target.value)}
              className="w-full px-3 py-1.5 border border-blue-200 rounded text-sm bg-white"
            />
            {autoSyncEnabled ? (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                <div className="flex items-center justify-between">
                  <span><strong>✅ Active:</strong> Data will sync automatically at {syncTime} daily (runs on server, no tab needed)</span>
                  <button
                    onClick={async () => {
                      try {
                        const API_URL = getApiUrl();
                        const response = await fetch(`${API_URL}/api/sheet/trigger-manual-sync`, {
                          method: 'POST',
                          credentials: 'include'
                        });
                        if (response.ok) {
                          console.log('✅ Manual sync triggered - check server logs');
                          setTimeout(() => handleRefreshData(), 3000); // Refresh after 3 seconds
                        }
                      } catch (error) {
                        console.error('Error triggering manual sync:', error);
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-white border border-green-300 text-green-700 rounded text-[10px] hover:bg-green-50"
                  >
                    Test Now
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-blue-600 mt-2 leading-tight">
                Enable to automatically fetch fresh data from Google Sheets daily
              </p>
            )}
          </div>
        </div>

        {/* Read-Only Data Display */}
        <div className="flex-1">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            Current Data
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-normal">Read Only</span>
          </h4>

          <div className="space-y-2">
            {people.length === 0 && (
              <p className="text-sm text-gray-400 italic text-center py-4">
                No data loaded. Please sync a sheet.
              </p>
            )}

            {people.map(p => {
              const personBalance = balances.find(b => b.personId === p.id)?.balance || 0;
              const isNegative = personBalance < 0;

              return (
                <div key={p.id} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">{p.name}</span>
                    <div className={`text-xs font-bold px-2 py-1 rounded border ${isNegative ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                      {isNegative ? 'Short: ' : 'Avail: '} {personBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <div className="flex-1 bg-white px-2 py-1 rounded border border-gray-100">
                      Meals: <span className="font-mono text-gray-800 font-medium">{p.meals.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 bg-white px-2 py-1 rounded border border-gray-100">
                      Contrib/Cost: <span className="font-mono text-gray-800 font-medium">{p.contribution.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};