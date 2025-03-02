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
    <nav className="bg-emerald-600 p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link 
            href="/" 
            className="text-white hover:text-emerald-200 transition-colors"
          >
            Home
          </Link>
          <Link 
            href="/image" 
            className="text-white hover:text-emerald-200 transition-colors"
          >
            Scan Image
          </Link>
        </div>
        
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
