'use client';

import { useEffect, useState } from 'react';
import { VisitLog } from '../../hooks/useVisitTracking';

interface ActiveVisitCardProps {
  currentVisit: VisitLog | null;
  onOpenCheckOut: () => void;
  loading?: boolean;
}

/**
 * ActiveVisitCard Component
 * Displays current active visit with live timer
 */
export const ActiveVisitCard: React.FC<ActiveVisitCardProps> = ({
  currentVisit,
  onOpenCheckOut,
  loading = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState('0m');

  useEffect(() => {
    if (!currentVisit?.entered_at) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(currentVisit.entered_at).getTime()) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds}s`);
      } else {
        setElapsedTime(`${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentVisit?.entered_at]);

  if (!currentVisit) return null;

  const isNearExpected =
    currentVisit.expected_duration &&
    (Date.now() - new Date(currentVisit.entered_at).getTime()) / 1000 >=
      currentVisit.expected_duration * 0.7;

  return (
    <div className={`
      rounded-lg p-4 shadow-lg border-2
      ${isNearExpected ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'}
    `}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{currentVisit.place_name}</h3>
          <p className="text-sm text-gray-600">Currently checking in</p>
        </div>
        <div className="text-3xl animate-pulse">✓</div>
      </div>

      <div className="bg-white rounded-lg p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 font-semibold">⏱️ Time elapsed:</span>
          <span className="text-2xl font-bold text-blue-600">{elapsedTime}</span>
        </div>
        {currentVisit.expected_duration && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isNearExpected ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  ((Date.now() - new Date(currentVisit.entered_at).getTime()) / 1000 /
                    currentVisit.expected_duration) *
                    100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {isNearExpected && (
        <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded mb-3">
          ⚠️ You've spent ~70% of expected time. Consider checking out!
        </p>
      )}

      <button
        onClick={onOpenCheckOut}
        disabled={loading}
        className={`
          w-full py-2 rounded-lg font-semibold transition-all
          ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
          }
        `}
      >
        {loading ? '⏳ Processing...' : '→ Check Out'}
      </button>
    </div>
  );
};
