 
/* eslint-disable @next/next/no-img-element */
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

  if (src) {
    return (
      <div className={`${styles.wrapper} ${className}`} style={{ width: size, height: size }}>
        <img src={src} alt={displayName} className={styles.avatar} />
        {dot && <div className={styles.dot} />}
      </div>
    );
  }

  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;

  return (
    <div 
      className={`${styles.wrapper} ${className}`} 
      style={{ width: size, height: size }}
    >
      <img src={fallbackAvatarUrl} alt={displayName} className={styles.avatar} />
      {dot && <div className={styles.dot} />}
    </div>
  );
}
