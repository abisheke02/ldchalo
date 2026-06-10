import React, { useEffect, useState } from 'react';

/**
 * Level Up celebration overlay with confetti animation.
 * Auto-dismisses after 3 seconds.
 * @param {number} newLevel - the new level achieved
 * @param {function} onDismiss - callback when overlay closes
 */
export default function LevelUpOverlay({ newLevel, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    // Generate confetti particles
    const particles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1000,
      size: 8 + Math.random() * 12,
      color: ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][Math.floor(Math.random() * 5)],
      rotation: Math.random() * 360,
    }));
    setConfetti(particles);

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // wait for fade-out
    }, 3000);

    // 🔊 Sound placeholder: level_up_fanfare
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-fade-in">
      {/* Confetti */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall pointer-events-none"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            animationDelay: `${p.delay}ms`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}

      {/* Central badge */}
      <div className="text-center animate-bounce-in">
        {/* Glow ring */}
        <div className="relative mx-auto w-40 h-40 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl">
            <div className="text-center">
              <div className="text-4xl mb-1">🏆</div>
              <div className="text-3xl font-black text-white">Level {newLevel}</div>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-2">LEVEL UP!</h2>
        <p className="text-lg text-white/80">You're getting better every day! 🌟</p>

        {/* Tap to dismiss */}
        <button
          onClick={() => { setVisible(false); onDismiss(); }}
          className="mt-6 px-8 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-full
            border border-white/30 hover:bg-white/30 transition-colors"
        >
          Keep Going! →
        </button>
      </div>
    </div>
  );
}
