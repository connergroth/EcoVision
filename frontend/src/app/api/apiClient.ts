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