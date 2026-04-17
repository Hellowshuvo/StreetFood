import React from 'react';
import styles from './UserAvatar.module.css';

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
  dot?: boolean;
}

export default function UserAvatar({
  name,
  src,
  size = 40,
  className = '',
  dot = false,
}: UserAvatarProps) {
  const displayName = name || 'Anonymous';
  const initial = displayName.charAt(0).toUpperCase();

  // Deterministic hue based on name
  const hue = displayName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  if (src) {
    return (
      <div className={`${styles.wrapper} ${className}`} style={{ width: size, height: size }}>
        <img src={src} alt={displayName} className={styles.avatar} />
        {dot && <div className={styles.dot} />}
      </div>
    );
  }

  return (
    <div 
      className={`${styles.wrapper} ${className}`} 
      style={{ width: size, height: size }}
    >
      <div
        className={styles.gradientAvatar}
        style={{
          width: size,
          height: size,
          background: `conic-gradient(
            hsl(${hue}, 75%, 50%),
            hsl(${(hue + 60) % 360}, 85%, 60%),
            hsl(${(hue + 120) % 360}, 80%, 55%),
            hsl(${(hue + 180) % 360}, 75%, 50%),
            hsl(${(hue + 240) % 360}, 85%, 60%),
            hsl(${(hue + 300) % 360}, 80%, 55%),
            hsl(${hue}, 75%, 50%)
          )`
        }}
      >
        <div className={styles.inner}>{initial}</div>
      </div>
      {dot && <div className={styles.dot} />}
    </div>
  );
}
