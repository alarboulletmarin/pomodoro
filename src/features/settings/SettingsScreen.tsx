import { useEffect, useRef, useState } from 'react';
import type { MessageKey } from '../../types';
import { useI18n } from '../../shared/i18n/i18n';
import { IconButton } from '../../shared/ui/IconButton';
import { AboutPage } from './AboutPage';
import { AccentSection } from './AccentSection';
import { AppearanceSection } from './AppearanceSection';
import { BackIcon } from './BackIcon';
import { DurationsSection } from './DurationsSection';
import { GoalSection } from './GoalSection';
import { InstallSection } from './InstallSection';
import { LanguageSection } from './LanguageSection';
import { LegalPage } from './LegalPage';
import { MethodPage } from './MethodPage';
import { PagesSection, type SubPage } from './PagesSection';
import { SoundSection } from './SoundSection';
import { UpdateSection } from './UpdateSection';
import styles from './SettingsScreen.module.css';

export type SettingsPage = 'root' | SubPage;

export interface SettingsScreenProps {
  onClose(): void;
  /** Which page the pane opens on — the intro sends the curious straight to the method. */
  initialPage?: SettingsPage;
}

const TITLES: Record<SettingsPage, MessageKey> = {
  root: 'settings.title',
  method: 'method.title',
  about: 'about.title',
  legal: 'legal.title',
};

export function SettingsScreen({
  onClose,
  initialPage = 'root',
}: SettingsScreenProps): JSX.Element {
  const { t } = useI18n();
  const [page, setPage] = useState<SettingsPage>(initialPage);
  const title = useRef<HTMLHeadingElement>(null);

  // The pane swaps its whole content, so focus has to follow it.
  useEffect(() => {
    title.current?.focus();
  }, [page]);

  const goBack = (): void => {
    if (page === 'root') onClose();
    else setPage('root');
  };

  return (
    <section className={styles.settings} aria-label={t('settings.title')}>
      <header className={styles.header}>
        <IconButton className={styles.back} label={t('a11y.back')} onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h2 className={styles.heading} ref={title} tabIndex={-1}>
          {t(TITLES[page])}
        </h2>
      </header>

      <div className={styles.column}>
        {page === 'root' ? (
          <>
            <AppearanceSection />
            <AccentSection />
            <DurationsSection />
            <GoalSection />
            <LanguageSection />
            <SoundSection />
            <InstallSection />
            <PagesSection onOpen={setPage} />
            <UpdateSection />
          </>
        ) : null}
        {page === 'method' ? <MethodPage /> : null}
        {page === 'about' ? <AboutPage /> : null}
        {page === 'legal' ? <LegalPage /> : null}
      </div>
    </section>
  );
}
