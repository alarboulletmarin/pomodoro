import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps): JSX.Element {
  return (
    <button
      type={type}
      aria-label={label}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className={styles.glyph} aria-hidden="true">
        {children}
      </span>
    </button>
  );
}
