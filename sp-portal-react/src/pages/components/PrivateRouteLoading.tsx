// @ts-nocheck
export function PrivateRouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 text-lg font-semibold">Loading...</p>
      </div>
    </div>
  );
}

export default PrivateRouteLoading;
