import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import { ArrowRight, CalendarDays, Moon, MonitorSmartphone, Sun, Waypoints } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand';
import { SeriesArt } from '@/components/SeriesArt';
import { Button, Switch } from '@/components/ui';
import { actions, INDEX, useSettings } from '@/state/journey';
import type { OrderMode, ThemePreference } from '@/domain/types';
import { formatInt } from '@/lib/format';

const STEPS = 4;

function Choice({
  active,
  onClick,
  icon,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={clsx(
        'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99]',
        active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-full', active ? 'bg-accent text-white' : 'bg-surface-2 text-muted')}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-text">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{children}</span>
      </span>
    </button>
  );
}

export function OnboardingPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<OrderMode>('chronological');
  const [extras, setExtras] = useState(true);
  const [shield, setShield] = useState(true);
  const [theme, setTheme] = useState<ThemePreference>('dark');

  const finish = async (save: boolean) => {
    await actions.settings(
      save ? { orderMode: mode, includeExtras: extras, spoilerShield: shield, theme, onboardingDone: true } : { onboardingDone: true },
    );
    navigate('/', { replace: true });
  };

  const preview = (t: ThemePreference) => {
    setTheme(t);
    const light = t === 'light' || (t === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
  };

  const main = INDEX.catalog.series.filter((s) => s.kind === 'main').length;

  return (
    <div className="grain relative min-h-dvh overflow-hidden bg-bg text-text">
      <SeriesArt seriesId="twd" className="absolute inset-0" intensity={step === 0 ? 1.1 : 0.55} />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex h-12 items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Etapa ${step + 1} de ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={clsx('h-1 rounded-full transition-all duration-500', i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-text/60' : 'w-4 bg-text/20')} />
            ))}
          </div>
          <button
            type="button"
            className="h-11 rounded-full px-4 text-sm font-medium text-muted hover:text-text"
            onClick={() => void finish(false)}
            disabled={!settings}
          >
            Pular
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && (
              <div className="flex flex-1 flex-col justify-end pb-6">
                <LogoMark className="size-20 text-text" title="AFTERFALL" />
                <h1 className="mt-6">
                  <Wordmark size="lg" className="[&>svg]:hidden" />
                </h1>
                <p className="mt-5 font-serif text-3xl leading-tight text-text italic">O mundo acabou. Sua jornada continua.</p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
                  Um guia cronológico pessoal para todo o universo televisivo de The Walking Dead: {main} séries, webisódios oficiais e{' '}
                  {formatInt(INDEX.catalog.episodes.length)} itens organizados em uma única jornada. Sem cadastro — tudo fica salvo neste
                  aparelho e funciona offline.
                </p>
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-1 flex-col justify-end gap-3 pb-6" role="radiogroup" aria-labelledby="ob-order">
                <p className="eyebrow">Etapa 1 · Ordem</p>
                <h2 id="ob-order" className="display mb-3 text-5xl">Como você quer atravessar o fim do mundo?</h2>
                <Choice active={mode === 'chronological'} onClick={() => setMode('chronological')} icon={<Waypoints className="size-5" />} title="Cronológica">
                  Na ordem dos acontecimentos, intercalando as séries. A forma mais imersiva.
                </Choice>
                <Choice active={mode === 'release'} onClick={() => setMode('release')} icon={<CalendarDays className="size-5" />} title="Lançamento">
                  Na ordem em que tudo foi exibido, de 2010 até hoje.
                </Choice>
                <p className="text-xs text-faint">Dá para trocar a qualquer momento sem perder progresso.</p>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-1 flex-col justify-end pb-6">
                <p className="eyebrow">Etapa 2 · Conteúdo</p>
                <h2 className="display mt-2 mb-4 text-5xl">Extras e spoilers</h2>
                <div className="card divide-y divide-line px-4">
                  <Switch
                    id="ob-extras"
                    label="Incluir webisódios"
                    description="Curtas oficiais lançados na web. São opcionais."
                    checked={extras}
                    onCheckedChange={setExtras}
                  />
                  <Switch
                    id="ob-shield"
                    label="Proteção contra spoilers"
                    description="Esconde títulos de episódios futuros e premissas reveladoras."
                    checked={shield}
                    onCheckedChange={setShield}
                  />
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="flex flex-1 flex-col justify-end gap-3 pb-6" role="radiogroup" aria-labelledby="ob-theme">
                <p className="eyebrow">Etapa 3 · Aparência</p>
                <h2 id="ob-theme" className="display mb-3 text-5xl">Noite ou dia?</h2>
                <Choice active={theme === 'dark'} onClick={() => preview('dark')} icon={<Moon className="size-5" />} title="Escuro">
                  O padrão do AFTERFALL. Ideal depois de um episódio.
                </Choice>
                <Choice active={theme === 'light'} onClick={() => preview('light')} icon={<Sun className="size-5" />} title="Claro">
                  Papel envelhecido, para usar de dia.
                </Choice>
                <Choice active={theme === 'system'} onClick={() => preview('system')} icon={<MonitorSmartphone className="size-5" />} title="Sistema">
                  Acompanha o aparelho.
                </Choice>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!settings}
            onClick={() => (step < STEPS - 1 ? setStep((s) => s + 1) : void finish(true))}
          >
            {step === 0 ? 'Começar' : step < STEPS - 1 ? 'Continuar' : 'Iniciar jornada'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
