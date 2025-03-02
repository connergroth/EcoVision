'use client';

import { useState } from 'react';

interface LeaderboardEntry {
  username: string;
  co2Saved: number;
  uploads: number;
  rank: number;
}

const dummyData: LeaderboardEntry[] = [
  { username: "EcoWarrior", co2Saved: 2500, uploads: 45, rank: 1 },
  { username: "GreenHero", co2Saved: 2100, uploads: 38, rank: 2 },
  { username: "RecycleMaster", co2Saved: 1800, uploads: 32, rank: 3 },
  { username: "EarthDefender", co2Saved: 1500, uploads: 28, rank: 4 },
  { username: "TrashHunter", co2Saved: 1200, uploads: 25, rank: 5 },
];

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<'co2Saved' | 'uploads'>('co2Saved');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Eco Impact Leaderboard</h1>
      
      <div className="mb-4">
        <label className="mr-2">Sort by:</label>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'co2Saved' | 'uploads')}
          className="border rounded p-1"
        >
          <option value="co2Saved">CO2 Saved</option>
          <option value="uploads">Uploads</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO2 Saved (g)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploads</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dummyData
              .sort((a, b) => b[sortBy] - a[sortBy])
              .map((entry, index) => (
                <tr key={entry.username} className={index < 3 ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.username}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.co2Saved}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.uploads}</div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
