const LoadingPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                <p className="text-lg text-gray-600 font-medium">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingPage;