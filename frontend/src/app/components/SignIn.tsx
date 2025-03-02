import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // Handle successful sign in
    return result;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
  }
};

const handleGoogleSignIn = async () => {
  await signInWithGoogle();
};

const SignIn = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-200 via-green-300 to-teal-400 animate-gradient bg-[length:400%_400%]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-semibold text-center mb-8 text-gray-800">Welcome to EcoVision</h1>
        <p className="text-center text-gray-600 mb-8">Transforming the way we protect our planet 🚀</p>
        <button
          onClick={handleGoogleSignIn}
          className="cursor-pointer w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-green-500 transition-all duration-200 shadow-sm"
        >
          <img
            src="/google.logo.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default SignIn;