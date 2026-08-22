import { GOAL_BOUNDS } from '../../domain/sessions/session-stats';
import { useI18n } from '../../shared/i18n/i18n';
import { useSettings } from '../../shared/settings/settings-provider';
import { Section } from './Section';
import { Stepper } from './Stepper';
import styles from './Stepper.module.css';

export function GoalSection(): JSX.Element {
  const { t, tn } = useI18n();
  const { settings, setDailyGoal } = useSettings();
  const { dailyGoal } = settings;

  return (
    <Section label={t('settings.goal.title')}>
      <Stepper
        name={t('settings.goal.label')}
        value={String(dailyGoal)}
        announce={tn('stats.day.count', dailyGoal)}
        current={dailyGoal}
        min={GOAL_BOUNDS.min}
        max={GOAL_BOUNDS.max}
        onChange={setDailyGoal}
      />
      <p className={styles.hint}>{t('settings.goal.hint')}</p>
    </Section>
  );
}
