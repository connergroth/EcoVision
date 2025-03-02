'use client';

import {useEffect, useState} from 'react';
import { useAuth } from '@/app/hooks/AuthHook';

interface WasteItem {
    date: string;
    item: string;
    category: 'Recycling' | 'Trash' | 'Compost';
    weight: number;
}

const dummyData: WasteItem[] = [
    { date: '2024-03-20', item: 'Cardboard Box', category: 'Recycling', weight: 0.5 },
    { date: '2024-03-20', item: 'Food Scraps', category: 'Compost', weight: 0.3 },
    { date: '2024-03-19', item: 'Plastic Bottles', category: 'Recycling', weight: 0.2 },
    { date: '2024-03-19', item: 'Paper Bags', category: 'Recycling', weight: 0.1 },
    { date: '2024-03-18', item: 'Coffee Grounds', category: 'Compost', weight: 0.4 },
    { date: '2024-03-18', item: 'Candy Wrappers', category: 'Trash', weight: 0.1 },
];

const History = () => {


    const {user, loading} = useAuth();

    const [trashData, setTrashData] = useState<WasteItem[]>([]);

    useEffect(() => {
        const fetchTrashData = async () => {
            if (user) {
                const response = await fetch(`/api/user-trash?userId=${user.uid}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                if(!response.ok) {
                    console.error('Failed to fetch trash data');
                    return;
                }
                const data = await response.json();
                setTrashData(data);
            }
        };

        fetchTrashData();

    }, [user]);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">Waste Management History</h1>
            
            <div className="overflow-x-auto shadow-lg rounded-lg">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {dummyData.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.item}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        item.category === 'Recycling' ? 'bg-green-100 text-green-800' :
                                        item.category === 'Compost' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {item.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.weight}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default History;