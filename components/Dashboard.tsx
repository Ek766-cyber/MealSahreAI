import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Balance } from '../types';

interface DashboardProps {
  balances: Balance[];
  totalCost: number;
  totalMeals: number;
  mealRate: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ balances, totalCost, totalMeals, mealRate }) => {
  const data = balances.map(b => ({
    name: b.name,
    balance: parseFloat(b.balance.toFixed(2)),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Meal Rate Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg col-span-2">
            <span className="text-sm text-gray-600">Current Meal Rate</span>
            <p className="text-3xl font-bold text-primary">${mealRate.toFixed(2)} <span className="text-sm font-normal text-gray-500">/ meal</span></p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Total Bazar/Cost</span>
            <p className="text-xl font-bold text-gray-800">${totalCost.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Total Meals</span>
            <p className="text-xl font-bold text-gray-800">{totalMeals.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Balance Distribution</h3>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Owes (Add Money)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Get Back</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`$${value}`, 'Balance']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <ReferenceLine y={0} stroke="#666" />
            <Bar dataKey="balance" radius={[4, 4, 4, 4]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};