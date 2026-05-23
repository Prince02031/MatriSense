'use client';

import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface PhotoCollageProps {
  photos: string[];
  onRemovePhoto: (index: number) => void;
}

const PhotoCollage: React.FC<PhotoCollageProps> = ({ photos, onRemovePhoto }) => {
  return (
    <div>
      {photos.length === 1 && (
        <div className="relative rounded-2xl overflow-hidden shadow-lg h-64 w-full lg:h-80">
          <img
            src={photos[0]}
            alt="Memory photo 1"
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => onRemovePhoto(0)}
            className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {photos.length === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl overflow-hidden shadow-lg h-64"
            >
              <img
                src={photo}
                alt={`Memory photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length === 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Large featured photo */}
          <div className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden shadow-lg h-80">
            <img
              src={photos[0]}
              alt="Main memory photo"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onRemovePhoto(0)}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Two smaller photos on the right */}
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="relative rounded-2xl overflow-hidden shadow-lg h-36"
            >
              <img
                src={photos[idx]}
                alt={`Memory photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        💡 Photos are arranged as travel stamps of your journey
      </div>
    </div>
  );
};

export default PhotoCollage;
