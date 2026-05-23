'use client';

import { ProgressStats } from '../../hooks/useVisitTracking';

interface TripProgressProps {
  progress: ProgressStats | null;
  loading?: boolean;
}

/**
 * TripProgress Component
 * Displays trip progress with statistics and visual indicators
 */
export const TripProgress: React.FC<TripProgressProps> = ({ progress, loading = false }) => {
  if (loading || !progress) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <p className="text-gray-600 text-center">Loading progress...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const progressPercent = progress.completionPercent;
  const isNearCompletion = progressPercent >= 80;
  const isCompleted = progressPercent === 100;

  return (
    <div className={`rounded-lg p-6 shadow-md border-2 ${
      isCompleted ? 'bg-green-50 border-green-400' : 'bg-blue-50 border-blue-400'
    }`}>
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Trip Progress</h3>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-700">{progressPercent}%</span>
          <span className="text-sm text-gray-600">
            {progress.completed} of {progress.total} places visited
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${
              isCompleted ? 'bg-green-500' : isNearCompletion ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-green-600">{progress.completed}</p>
          <p className="text-xs text-gray-600 mt-1">Completed</p>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-blue-600">{progress.inProgress}</p>
          <p className="text-xs text-gray-600 mt-1">In Progress</p>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-yellow-600">{progress.pending}</p>
          <p className="text-xs text-gray-600 mt-1">Pending</p>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-3xl font-bold text-red-600">{progress.skipped}</p>
          <p className="text-xs text-gray-600 mt-1">Skipped</p>
        </div>
      </div>

      {/* Time Stats */}
      <div className="bg-white rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-2">
          ⏱️ <span className="font-semibold">Total Time Spent:</span> {formatTime(progress.totalTimeSpent)}
        </p>
        {progress.completed > 0 && (
          <p className="text-sm text-gray-700">
            ⏱️ <span className="font-semibold">Average per Place:</span>{' '}
            {formatTime(progress.totalTimeSpent / progress.completed)}
          </p>
        )}
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-lg text-center">
          <p className="text-green-800 font-semibold">🎉 Trip completed! Great job!</p>
        </div>
      )}

      {isNearCompletion && !isCompleted && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg text-center">
          <p className="text-yellow-800 font-semibold">🎯 Almost there! {100 - progressPercent}% to go!</p>
        </div>
      )}
    </div>
  );
};
