'use client';

import { TripSummary } from '../../hooks/useVisitTracking';

interface VisitStatsProps {
  summary: TripSummary | null;
  loading?: boolean;
}

/**
 * VisitStats Component
 * Displays comprehensive trip summary statistics
 */
export const VisitStats: React.FC<VisitStatsProps> = ({ summary, loading = false }) => {
  if (loading || !summary) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <p className="text-gray-600 text-center">Loading stats...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString() + ' ' + new Date(dateStr).toLocaleTimeString();
  };

  const tripDuration =
    summary.startTime && summary.endTime
      ? Math.floor(
          (new Date(summary.endTime).getTime() - new Date(summary.startTime).getTime()) / 1000
        )
      : 0;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 shadow-md border border-purple-200">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Trip Summary</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-3xl font-bold text-green-600">{summary.placesVisited}</p>
          <p className="text-sm text-gray-600 mt-1">Places Visited</p>
          <p className="text-xs text-gray-500 mt-1">of {summary.totalPlaces} total</p>
        </div>

        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-3xl font-bold text-blue-600">{summary.completionPercent}%</p>
          <p className="text-sm text-gray-600 mt-1">Completion</p>
        </div>

        <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
          <p className="text-3xl font-bold text-orange-600">
            {summary.averageRating ? summary.averageRating : 'N/A'}
          </p>
          <p className="text-sm text-gray-600 mt-1">Avg Rating</p>
          {summary.averageRating && (
            <p className="text-xs text-orange-500 mt-1">{'⭐'.repeat(Math.round(summary.averageRating))}</p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
          <p className="text-lg font-bold text-purple-600">{formatTime(summary.totalTimeSpent)}</p>
          <p className="text-sm text-gray-600 mt-1">Total Time</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-lg p-4 space-y-3 mb-6">
        <h4 className="font-semibold text-gray-800 text-sm border-b pb-2">Detailed Stats</h4>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Average Time per Place:</span>
          <span className="font-semibold text-gray-800">{formatTime(summary.averageTimePerPlace)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Trip Start:</span>
          <span className="text-sm font-mono text-gray-800">
            {summary.startTime ? formatDate(summary.startTime) : 'N/A'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Trip End:</span>
          <span className="text-sm font-mono text-gray-800">
            {summary.endTime ? formatDate(summary.endTime) : 'N/A'}
          </span>
        </div>

        {tripDuration > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Trip Duration:</span>
            <span className="font-semibold text-gray-800">{formatTime(tripDuration)}</span>
          </div>
        )}
      </div>

      {/* Status */}
      {summary.completionPercent === 100 ? (
        <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold text-lg">🎉 Trip Complete!</p>
          <p className="text-green-700 text-sm mt-1">All places visited successfully</p>
        </div>
      ) : (
        <div className="bg-blue-100 border border-blue-400 rounded-lg p-4 text-center">
          <p className="text-blue-800 font-semibold text-lg">✓ Trip in Progress</p>
          <p className="text-blue-700 text-sm mt-1">
            {summary.totalPlaces - summary.placesVisited} more places to visit
          </p>
        </div>
      )}
    </div>
  );
};
