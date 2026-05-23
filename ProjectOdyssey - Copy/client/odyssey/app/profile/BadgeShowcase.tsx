"use client";

import React, { useState } from "react";
import BadgeModal from "./BadgeModal";

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earningDate: string;
  isNew: boolean;
}

interface BadgeShowcaseProps {
  badges: Badge[];
  onBadgeClick?: () => void;
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ badges, onBadgeClick }) => {
  const [showModal, setShowModal] = useState(false);

  // Get the most recent badge (first in array since they're sorted by earning date)
  const currentBadge = badges && badges.length > 0 ? badges[0] : null;

  const handleClick = () => {
    setShowModal(true);
    onBadgeClick?.();
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="group cursor-pointer bg-gradient-to-br from-[#4A9B7F] to-[#2D6B5A] rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

        {/* Badge Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          {currentBadge ? (
            <>
              <div className="text-7xl mb-4 animate-bounce">{currentBadge.emoji}</div>
              <h3 className="text-2xl font-black text-white mb-2">{currentBadge.name}</h3>
              <p className="text-white/80 text-sm font-medium">{currentBadge.description}</p>

              {currentBadge.isNew && (
                <div className="mt-4 inline-block bg-yellow-400 text-[#2D6B5A] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  🆕 New Badge!
                </div>
              )}

              <p className="text-white/60 text-xs mt-4">
                Click to view all badges ({badges.length})
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4 opacity-30">🎯</div>
              <h3 className="text-xl font-black text-white mb-2">No Badges Yet</h3>
              <p className="text-white/80 text-sm font-medium">
                Earn badges by exploring, reviewing, and contributing to the community
              </p>
            </>
          )}
        </div>
      </div>

      {/* Badge Modal */}
      {showModal && <BadgeModal badges={badges} onClose={() => setShowModal(false)} />}
    </>
  );
};

export default BadgeShowcase;
