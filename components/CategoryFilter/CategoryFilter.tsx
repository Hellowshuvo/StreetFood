'use client';

import Image from 'next/image';
import styles from './CategoryFilter.module.css';
import { CATEGORIES, type Category } from '@/lib/types';

interface CategoryFilterProps {
  activeCategory: Category | null;
  onSelect: (category: Category | null) => void;
  layout?: 'horizontal' | 'vertical';
}

export default function CategoryFilter({
  activeCategory,
  onSelect,
  layout = 'vertical',
}: CategoryFilterProps) {
  return (
    <div className={`${styles.filters} ${styles[`filters-${layout}`]}`}>
      <button
        className={`${styles.chip} ${!activeCategory ? styles.active : ''}`}
        onClick={() => onSelect(null)}
      >
        <span className={styles.iconWrapper}>
          <Image src="/icons/all.svg" alt="All" width={24} height={24} className={styles.categoryIcon} unoptimized />
        </span>
        <span className={styles.label}>All</span>
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          className={`${styles.chip} ${activeCategory === cat.value ? styles.active : ''}`}
          onClick={() =>
            onSelect(activeCategory === cat.value ? null : cat.value)
          }
        >
          <span className={styles.iconWrapper}>
            <Image src={cat.icon} alt={cat.label} width={24} height={24} className={styles.categoryIcon} unoptimized />
          </span>
          <span className={styles.label}>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}
