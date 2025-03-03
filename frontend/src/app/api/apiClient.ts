import { auth } from "@/firebase/firebaseConfig";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

// Helper to get the auth token
const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return currentUser.getIdToken();
};

// Generic API request handler with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return response.json();
};

// API endpoints
export const apiClient = {
  // Detection endpoints
  detection: {
    detectImage: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('user_id', auth.currentUser?.uid || '');
      formData.append('is_webcam_snapshot', 'true');

      const token = await getAuthToken();

      return fetch(`${API_BASE_URL}/detect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }).then(res => res.json());
    },

    detectBase64: async (base64Image: string) => {
      const token = await getAuthToken();

      return fetch(`${API_BASE_URL}/detect-base64`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image.split(',')[1], // Remove the data:image/jpeg;base64, part
          user_id: auth.currentUser?.uid || '',
        }),
      }).then(res => res.json());
    },

    setupWebSocket: async () => {
      const token = await getAuthToken();
      const userId = auth.currentUser?.uid;

      const socket = new WebSocket(`ws://localhost:8000/ws/detection/${userId}`);

      return new Promise<WebSocket>((resolve, reject) => {
        socket.onopen = () => {
          // Send authentication message
          socket.send(JSON.stringify({ token }));
          resolve(socket);
        };
        socket.onerror = (error) => {
          reject(error);
        };
      });
    }
  },

  // User scans history
  scans: {
    getUserScans: async (limit = 20, offset = 0) => {
      const userId = auth.currentUser?.uid;
      return apiRequest(`/users/${userId}/scans?limit=${limit}&offset=${offset}`);
    },

    getScanDetails: async (scanId: string) => {
      return apiRequest(`/scans/${scanId}`);
    },

    getUserStats: async () => {
      const userId = auth.currentUser?.uid;
      return apiRequest(`/users/${userId}/stats/summary`);
    }
  },

  // Leaderboard
  leaderboard: {
    getGlobal: async (limit = 10, offset = 0) => {
      return apiRequest(`/leaderboard?limit=${limit}&offset=${offset}`);
    },

    getUserRank: async () => {
      const userId = auth.currentUser?.uid;
      return apiRequest(`/leaderboard/user-rank/${userId}`);
    }
  }
};