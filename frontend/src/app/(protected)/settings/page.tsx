'use client';

import Settings from '../../components/Settings';
import { useAuth } from '@/app/hooks/AuthHook';

export default function SettingsPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <Settings />
    </div>
  );
}