import type { ReactNode } from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  label?: string;
  trailing?: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}

export function Section({ label, trailing, className, children }: SectionProps): JSX.Element {
  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')}>
      {label ? (
        <header className={styles.head}>
          <h3 className={styles.label}>{label}</h3>
          {trailing}
        </header>
      ) : null}
      {children}
    </section>
  );
}
