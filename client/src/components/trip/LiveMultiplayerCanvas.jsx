import React, { useRef, useCallback } from 'react';
import { useTrip } from '../../context/TripContext';

export const LiveMultiplayerCanvas = ({ children }) => {
  const { remoteCursors = {}, emitCursorMove, emitCursorLeave } = useTrip();
  const containerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, Number(x.toFixed(2))));
    const clampedY = Math.max(0, Math.min(100, Number(y.toFixed(2))));

    emitCursorMove(clampedX, clampedY);
  }, [emitCursorMove]);

  const handleMouseLeave = useCallback(() => {
    emitCursorLeave();
  }, [emitCursorLeave]);

  const activeCursors = Object.values(remoteCursors);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full"
    >
      {/* Floating Remote Multiplayer Cursors */}
      {activeCursors.map((cursor) => {
        const userColor = cursor.color || '#FF6B45';
        return (
          <div
            key={cursor.userId}
            className="pointer-events-none absolute z-50 transition-all duration-100 ease-out will-change-transform"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Custom Styled Pointer Arrow */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-md select-none"
            >
              <path
                d="M5.65 12.37H5.46L5.32 12.5L0.5 16.88V1.2L11.78 12.37H5.65Z"
                fill={userColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Floating Collaborator Name Badge */}
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md flex items-center gap-1 whitespace-nowrap -mt-1 ml-3 select-none animate-fadeIn"
              style={{ backgroundColor: userColor }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping" />
              <span>{cursor.name || 'Traveler'}</span>
            </div>
          </div>
        );
      })}

      {/* Main Workspace Content */}
      {children}
    </div>
  );
};

export default LiveMultiplayerCanvas;
