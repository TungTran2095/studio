import TimestampMonitor from '@/components/timestamp-monitor';

export default function TimestampTestPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Timestamp Monitor Test</h1>
        <p className="text-gray-600 mt-2">
          Theo dõi và debug timestamp synchronization với Binance API
        </p>
      </div>
      
      <TimestampMonitor />
    </div>
  );
}

