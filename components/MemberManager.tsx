import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { DBMember } from '../types';

interface MemberManagerProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ onClose, onDataChanged }) => {
  const [members, setMembers] = useState<DBMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [sheetName, setSheetName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = async () => {
    setIsLoading(true);
    const data = await dbService.getMembers();
    setMembers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await dbService.addMember({ sheetName, email });
      setSheetName('');
      setEmail('');
      await loadMembers();
      onDataChanged(); // Notify parent to re-sync names
    } catch (e: any) {
      setError(e.message || "Failed to add member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this mapping?")) {
      await dbService.deleteMember(id);
      await loadMembers();
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Database Member Directory</h3>
            <p className="text-xs text-gray-500">Map Google Sheet names to real email addresses.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Add Form */}
          <form onSubmit={handleAdd} className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-6">
            <h4 className="text-xs font-bold text-indigo-900 uppercase mb-3">Add New Member</h4>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Name in Sheet (e.g. 'John Doe')" 
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <input 
                  type="email" 
                  placeholder="Contact Email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-white px-4 py-2 rounded text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add'}
              </button>
            </div>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </form>

          {/* List */}
          <div className="border rounded-lg overflow-hidden">
             <table className="w-full text-sm text-left text-gray-500">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                 <tr>
                   <th className="px-6 py-3">Sheet Name</th>
                   <th className="px-6 py-3">Database Email</th>
                   <th className="px-6 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {isLoading ? (
                   <tr><td colSpan={3} className="px-6 py-8 text-center">Loading database...</td></tr>
                 ) : members.length === 0 ? (
                   <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No members in database.</td></tr>
                 ) : (
                   members.map(m => (
                     <tr key={m._id} className="bg-white border-b hover:bg-gray-50">
                       <td className="px-6 py-3 font-medium text-gray-900">{m.sheetName}</td>
                       <td className="px-6 py-3">{m.email}</td>
                       <td className="px-6 py-3 text-right">
                         <button onClick={() => handleDelete(m._id)} className="text-red-600 hover:text-red-900 text-xs font-semibold">
                           Delete
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};