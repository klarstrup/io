export default function Offline() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-100 text-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-800">You are offline</h1>
      <p className="mb-8 text-gray-600">
        It seems you have lost your internet connection. Please check your
        connection and try again.
      </p>
    </div>
  );
}
