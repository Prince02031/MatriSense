"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earningDate: string;
  isNew: boolean;
}

interface BadgeModalProps {
  badges: Badge[];
  onClose: () => void;
}

const BadgeModal: React.FC<BadgeModalProps> = ({ badges, onClose }) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(badges[0] || null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A9B7F] to-[#2D6B5A] p-6 flex items-center justify-between">
          <h2 className="text-3xl font-black text-white">Your Badges</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* Badges List */}
          <div className="w-full md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto">
            {badges.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No badges earned yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`w-full text-left p-4 rounded-xl transition-all border-2 ${
                      selectedBadge?.id === badge.id
                        ? "border-[#4A9B7F] bg-[#4A9B7F]/10"
                        : "border-transparent bg-white hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badge.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{badge.name}</h3>
                        <p className="text-xs text-gray-500">
                          {formatDate(badge.earningDate)}
                        </p>
                      </div>
                      {badge.isNew && (
                        <span className="bg-yellow-400 text-xs font-bold rounded-full px-2 py-1 whitespace-nowrap">
                          NEW
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Badge Details */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            {selectedBadge ? (
              <div className="text-center">
                <div className="text-8xl mb-6 animate-bounce">{selectedBadge.emoji}</div>
                <h3 className="text-4xl font-black text-gray-900 mb-3">
                  {selectedBadge.name}
                </h3>
                <p className="text-lg text-gray-600 mb-6">{selectedBadge.description}</p>

                {selectedBadge.isNew && (
                  <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-3 rounded-full font-black mb-6">
                    🎉 Just Earned!
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Earned on{" "}
                    <span className="font-bold text-gray-900">
                      {formatDate(selectedBadge.earningDate)}
                    </span>
                  </p>
                </div>

                {/* Badge Rarity/Stats */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-black text-blue-600">★★★</p>
                    <p className="text-xs text-gray-600 mt-1">Rarity</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-2xl font-black text-purple-600">+100</p>
                    <p className="text-xs text-gray-600 mt-1">Bonus XP</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-black text-green-600">1/7</p>
                    <p className="text-xs text-gray-600 mt-1">Collection</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No badge selected</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full bg-[#4A9B7F] text-white font-bold py-3 rounded-xl hover:bg-[#2D6B5A] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeModal;
