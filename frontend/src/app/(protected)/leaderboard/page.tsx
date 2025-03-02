'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/hooks/AuthHook';

interface LeaderboardEntry {
  email: string;
      co2Saved: number;
      uploads: number;
      rank: number;
      trashCaptures: number;
}


const calculateAccountAge = (createdAt: any): number => {
  let createdDate: Date;
  
  if (createdAt instanceof Date) {
    createdDate = createdAt;
  } else if (typeof createdAt === 'string') {
    createdDate = new Date(createdAt);
  } else if (createdAt && typeof createdAt.toDate === 'function') {
    createdDate = createdAt.toDate(); // Firebase Timestamp
  } else {
    // Fallback if date is invalid
    console.warn('Invalid date format received:', createdAt);
    return 0;
  }
  
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default function LeaderboardPage() {

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

    const { user } = useAuth();

    useEffect(() => {
      if(user) {
        const fetchLeaderboard = async () => {
            const response = await fetch(`/api/leaderboard`);
            const data = await response.json();

            const leaderboardData = data.map((entry: any) => ({
              ...entry,
              accountAge: calculateAccountAge(entry.createdAt)
            }));

            setLeaderboardData(leaderboardData);
        };

        fetchLeaderboard();
      }
    }, [user]);


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-center text-3xl font-bold mb-6">Eco Impact Leaderboard 🌿</h1>
      

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploads</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboardData
              .sort((a, b) => b.uploads - a.uploads)
              .map((entry, index) => (
                <tr key={entry.email} className={index < 3 ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {index === 0 && "🥇 "}
                        {index === 1 && "🥈 "}
                        {index === 2 && "🥉 "}
                        {entry.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.accountAge} days</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{entry.trashCaptures}</div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
