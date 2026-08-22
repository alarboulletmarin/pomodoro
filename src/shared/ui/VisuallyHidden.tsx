import type { ReactNode } from 'react';
import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Announce content changes to assistive technology without showing them. */
  live?: 'polite' | 'assertive';
}

export function VisuallyHidden({ children, live }: VisuallyHiddenProps): JSX.Element {
  return (
    <span
      className={styles.visuallyHidden}
      {...(live ? { role: 'status', 'aria-live': live } : {})}
    >
      {children}
    </span>
  );
}
