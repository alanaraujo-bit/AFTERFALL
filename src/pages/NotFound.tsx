import { Link } from 'react-router';
import { LogoMark } from '@/components/brand';
import { buttonStyles } from '@/components/styles';

export function NotFoundPage() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center safe-top">
      <div>
        <LogoMark className="mx-auto size-16 text-text" />
        <h1 className="display mt-6 text-5xl text-text">Nada por aqui</h1>
        <p className="mt-3 text-muted">Este caminho não existe — ou o mundo o engoliu.</p>
        <Link to="/" className={buttonStyles('primary', 'md', 'mt-6')}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
