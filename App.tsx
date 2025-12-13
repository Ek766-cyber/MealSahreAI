import React, { useState, useMemo, useEffect } from 'react';
import { Person, Balance, User } from './types';
import { Dashboard } from './components/Dashboard';
import { DataEntry } from './components/DataEntry';
import { NotificationCenter } from './components/NotificationCenter';
import { Login } from './components/Login';
import { MemberManager } from './components/MemberManager';
import { fetchSheetData } from './services/sheetService';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // App Data
  const [people, setPeople] = useState<Person[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSheetUrl, setLastSheetUrl] = useState('');
  const [sheetMealRate, setSheetMealRate] = useState<number | null>(null);

  // UI State
  const [showMemberManager, setShowMemberManager] = useState(false);

  // --- PERSISTENCE: Check for existing session ---
  useEffect(() => {
    const savedUser = localStorage.getItem('mealshare_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('mealshare_user', JSON.stringify(newUser));
  };

  const handleLogout = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('mealshare_user');
      setPeople([]);
    }
  };

  // --- CORE LOGIC: Meal Rate Calculation ---
  const { balances, totalCost, totalMeals, mealRate } = useMemo(() => {
    const totalC = people.reduce((sum, p) => sum + p.contribution, 0);
    const totalM = people.reduce((sum, p) => sum + p.meals, 0);

    // Priority: 1. Rate from Sheet, 2. Calculated Rate
    const rate = sheetMealRate !== null && sheetMealRate > 0
      ? sheetMealRate
      : (totalM > 0 ? totalC / totalM : 0);

    const calculatedBalances: Balance[] = people.map(person => {
      const cost = person.meals * rate;
      const balance = person.customBalance !== undefined
        ? person.customBalance
        : (person.contribution - cost);

      let status: Balance['status'] = 'SETTLED';
      if (balance > 1) status = 'OWED';
      if (balance < -1) status = 'OWES';

      return {
        personId: person.id,
        name: person.name,
        meals: person.meals,
        contribution: person.contribution,
        cost,
        balance,
        status
      };
    }).sort((a, b) => a.balance - b.balance);

    return {
      balances: calculatedBalances,
      totalCost: totalC,
      totalMeals: totalM,
      mealRate: rate
    };
  }, [people, sheetMealRate]);

  // --- SYNC LOGIC ---
  const handleSyncSheet = async (url: string) => {
    setIsSyncing(true);
    try {
      setLastSheetUrl(url);

      // 1. Fetch from Sheet
      const { people: sheetPeople, hasContribution, extractedRate } = await fetchSheetData(url);

      // 2. Fetch from Database (Contact Info)
      const dbMembers = await dbService.getMembers();

      // 3. Update Meal Rate
      if (extractedRate) setSheetMealRate(extractedRate);
      else setSheetMealRate(null);

      if (sheetPeople.length > 0) {
        setPeople(currentPeople => {
          // Map to lowercase for easy lookup
          const dbMap = new Map(dbMembers.map(m => [m.sheetName.toLowerCase().trim(), m.email]));

          return sheetPeople.map(sp => {
            // MERGE: Sheet Data + Database Email
            const dbEmail = dbMap.get(sp.name.toLowerCase().trim());

            // If this person already existed in our state, we can preserve other fields if needed, 
            // but usually Sheet + DB is the source of truth.
            return {
              ...sp,
              email: dbEmail || sp.email // Prefer DB email, fallback to generated
            };
          });
        });

        const rateMsg = extractedRate ? `\nFound Meal Rate: ${extractedRate}` : '';
        // Only alert if manual sync (hacky check: if syncing takes < 200ms it might be auto, but let's just alert always for now or silence it for auto-sync in future)
      } else {
        alert("Found no valid data in sheet. Check the format.");
      }
    } catch (e) {
      console.error(e);
      alert("Error syncing sheet. Check URL or format.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = () => {
    if (lastSheetUrl) {
      handleSyncSheet(lastSheetUrl);
    }
  };

  // If not logged in, show Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-sm">M</div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">MealShare AI</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-gray-700">{user.name}</span>
                  <span className="text-xs text-gray-400">{user.email}</span>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-600 transition p-1"
                title="Logout"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Meal Rate Tracker</h2>
            <p className="text-gray-600 mt-1">
              Sync with Google Sheet and manage database contacts.
            </p>
          </div>
          {lastSheetUrl && (
            <div className="text-xs text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              ● Linked to Google Sheet
            </div>
          )}
        </div>

        {/* Dashboard Section */}
        <Dashboard
          balances={balances}
          totalCost={totalCost}
          totalMeals={totalMeals}
          mealRate={mealRate}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
          {/* Left Column: Data Manager (4 cols) */}
          <div className="lg:col-span-5 h-full flex flex-col gap-4">
            <DataEntry
              people={people}
              balances={balances}
              onUpdatePerson={() => { }} // Disabled for sheet mode
              onAddPerson={() => { }}    // Disabled for sheet mode
              onSyncSheet={handleSyncSheet}
              isSyncing={isSyncing}
            />

            {/* Database Control */}
            <button
              onClick={() => setShowMemberManager(true)}
              className="w-full bg-slate-800 text-white p-3 rounded-lg shadow-sm hover:bg-slate-700 transition flex items-center justify-between group"
            >
              <span className="flex items-center gap-2 font-semibold">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                Manage Database Members
              </span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Right Column: Notification Logic (8 cols) */}
          <div className="lg:col-span-7 h-full">
            <NotificationCenter
              balances={balances}
              mealRate={mealRate}
              onRefreshData={handleRefresh}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showMemberManager && (
        <MemberManager
          onClose={() => setShowMemberManager(false)}
          onDataChanged={handleRefresh}
        />
      )}
    </div>
  );
};

export default App;