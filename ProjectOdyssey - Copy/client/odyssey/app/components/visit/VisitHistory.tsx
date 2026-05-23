'use client';

import { VisitLog } from '../../hooks/useVisitTracking';

interface VisitHistoryProps {
  visits: VisitLog[];
  onAddFeedback: (visitId: string, data: any) => Promise<any>;
  loading?: boolean;
}

/**
 * VisitHistory Component
 * Shows list of all visits for the trip with ratings and details
 */
export const VisitHistory: React.FC<VisitHistoryProps> = ({
  visits,
  onAddFeedback,
  loading = false,
}) => {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '⟳' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '○' },
      skipped: { bg: 'bg-red-100', text: 'text-red-800', icon: '⊗' },
    };
    const badge = badges[status] || badges.pending;
    return badge;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-gray-800">Visit History</h3>
      
      {visits.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No visits yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {visits.map((visit) => {
            const badge = getStatusBadge(visit.status);
            const isCompleted = visit.status === 'completed';
            const timeSpent = visit.time_spent ? formatTime(visit.time_spent) : 'N/A';
            const entryTime = formatDate(visit.entered_at);
            const exitTime = visit.exited_at ? formatDate(visit.exited_at) : 'In progress';

            return (
              <div
                key={visit.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{visit.place_name}</h4>
                    <p className="text-xs text-gray-600">
                      {entryTime} → {exitTime}
                    </p>
                  </div>
                  <span className={`${badge.bg} ${badge.text} px-2 py-1 rounded-full text-xs font-semibold`}>
                    {badge.icon} {visit.status}
                  </span>
                </div>

                <div className="flex gap-4 text-sm mb-2">
                  <span className="text-gray-600">⏱️ {timeSpent}</span>
                  {visit.user_rating && (
                    <span className="text-gray-600">
                      {'⭐'.repeat(visit.user_rating)} {visit.user_rating}/5
                    </span>
                  )}
                </div>

                {visit.notes && (
                  <p className="text-sm text-gray-700 italic mb-2 p-2 bg-gray-50 rounded">
                    "{visit.notes}"
                  </p>
                )}

                {isCompleted && !visit.user_rating && (
                  <button
                    onClick={() =>
                      onAddFeedback(visit.id, {
                        userRating: 5,
                        notes: 'Great experience!',
                      })
                    }
                    disabled={loading}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    Add Feedback
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
