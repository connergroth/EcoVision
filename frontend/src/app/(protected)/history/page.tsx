'use client';

import {useEffect, useState} from 'react';
import { useAuth } from '@/app/hooks/AuthHook';

interface WasteItem {
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    item: string;
    category: 'Recycling' | 'Trash' | 'Compost';
    bin: string;
    imageUrl?: string;
}

const formatFirebaseDate = (date: any) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    // Convert Firestore Timestamp to JavaScript Date
    if (date && date._seconds) {
        return new Date(date._seconds * 1000).toLocaleDateString('en-US', options);
    }
    return new Date(date).toLocaleDateString('en-US', options);
}

const ImageModal = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
             onClick={onClose}>
            <div className="relative bg-white rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] max-w-4xl w-full"
                 onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-green-600 z-10 transition-colors"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="p-8">
                    <img 
                        src={imageUrl} 
                        alt="Waste Item" 
                        className="w-full h-auto max-h-[70vh] object-contain rounded-md"
                    />
                </div>
            </div>
        </div>
    );
}

const History = () => {
    const {user, loading} = useAuth();
    const [trashData, setTrashData] = useState<WasteItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

                const formattedData = data.map((item: any) => ({
                    ...item,
                    createdAt: item.createdAt || item.date,
                }));

                setTrashData(formattedData);
            }
        };

        fetchTrashData();

    }, [user]);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {selectedImage && (
                <ImageModal 
                    imageUrl={selectedImage} 
                    onClose={() => setSelectedImage(null)} 
                />
            )}
            
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
                        {trashData.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatFirebaseDate(item.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.item}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        item.bin === 'Recycling' ? 'bg-green-100 text-green-800' :
                                        item.bin === 'Compost' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {item.bin}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <button 
                                        onClick={() => setSelectedImage(item.imageUrl)}
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        View Image
                                    </button>
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