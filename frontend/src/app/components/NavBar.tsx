"use client"
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
const NavBar = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 w-full z-50 top-0">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="text-gray-700 font-medium hover:text-emerald-600 transition-all duration-200 text-sm"
            >
              Home
            </Link>
            <Link 
              href="/image" 
              className="text-gray-700 font-medium hover:text-emerald-600 transition-all duration-200 text-sm"
            >
              Scan Image
            </Link>
            <Link 
              href="/history" 
              className="text-gray-700 font-medium hover:text-emerald-600 transition-all duration-200 text-sm"
            >
              History
            </Link>
            <Link 
              href="/leaderboard" 
              className="text-gray-700 font-medium hover:text-emerald-600 transition-all duration-200 text-sm"
            >
              Leaderboard
            </Link>
            <Link 
              href="/settings" 
              className="text-gray-700 font-medium hover:text-emerald-600 transition-all duration-200 text-sm"
            >
              Settings
            </Link>
          </div>
          
          <button
            onClick={handleSignOut}
            className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;