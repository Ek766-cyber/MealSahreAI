import React, { useState, useEffect } from 'react';
import { Person, Balance } from '../types';

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
  
  // Auto-Sync State
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncTime, setSyncTime] = useState('09:00'); // Default 9 AM
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Auto-Sync Logic
  useEffect(() => {
    if (!autoSyncEnabled || !sheetUrl) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // Trigger sync if times match and we haven't run it yet this minute
      if (currentTimeStr === syncTime && lastRun !== currentTimeStr) {
        setLastRun(currentTimeStr);
        handleSync();
        
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("MealShare AI", { body: "Auto-syncing data from Google Sheet..." });
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [autoSyncEnabled, syncTime, sheetUrl, lastRun]);

  const handleSync = () => {
    if (sheetUrl.trim()) {
      onSyncSheet(sheetUrl);
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
          
          <button 
            onClick={handleSync}
            disabled={isSyncing || !sheetUrl}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
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
            <p className="text-[10px] text-blue-600 mt-2 leading-tight">
              * Keep this tab open. The app will automatically fetch new data from the Sheet at this time.
            </p>
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