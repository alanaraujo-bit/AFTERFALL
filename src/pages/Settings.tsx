import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { BookOpen, ChevronRight, Download, Moon, MonitorSmartphone, RotateCcw, Sun, Upload } from 'lucide-react';
import { Container, PageHeader } from '@/components/Page';
import { ConfirmDialog, Sheet } from '@/components/dialogs';
import { Button, Segmented, Skeleton, Switch } from '@/components/ui';
import { ALL_IDS, actions, useJourney, useSettings } from '@/state/journey';
import { db } from '@/data/db';
import { resetProgress } from '@/data/progressRepo';
import { applyImport, backupFileName, exportBackup, parseBackup, previewImport, type Backup, type ImportPreview } from '@/data/backup';
import { INDEX } from '@/state/journey';
import { formatInt } from '@/lib/format';


function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** iOS/iPadOS (inclusive iPad em modo desktop), onde downloads por <a download> são pouco confiáveis no app instalado. */
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function doExport() {
  const backup = await exportBackup(db, __APP_VERSION__);
  const text = JSON.stringify(backup, null, 2);
  const file = new File([text], backupFileName(), { type: 'application/json' });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup do AFTERFALL' });
      toast.success('Backup pronto', { description: 'Salve o arquivo em “Arquivos” para restaurar depois.' });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      // compartilhamento indisponível: cai para o download
    }
  }
  download(file.name, text);
  toast.success('Backup exportado', { description: `${formatInt(backup.progress.length)} registros salvos no arquivo.` });
}

function Group({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return (
    <section className="card px-5 py-2">
      <h2 className="eyebrow pt-4 pb-1">{title}</h2>
      {description && <p className="pb-2 text-[0.8125rem] text-muted">{description}</p>}
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-medium text-text">{label}</p>
        {description && <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettings();
  const journey = useJourney();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<{ backup: Backup; preview: ImportPreview; migratedFrom?: number } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!settings) {
    return (
      <>
        <PageHeader title="Ajustes" />
        <Container>
          <Skeleton className="h-96" />
        </Container>
      </>
    );
  }

  async function onFile(file: File) {
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      toast.error('Não foi possível importar', { description: parsed.error });
      return;
    }
    const preview = await previewImport(db, parsed.backup, ALL_IDS);
    setImporting({ backup: parsed.backup, preview, migratedFrom: parsed.migratedFrom });
  }

  async function runImport(mode: 'merge' | 'replace') {
    if (!importing) return;
    try {
      await applyImport(db, importing.backup, mode);
      toast.success(mode === 'merge' ? 'Backup mesclado' : 'Progresso substituído pelo backup');
    } catch (e) {
      console.error(e);
      toast.error('A importação falhou', { description: 'Nenhum dado foi alterado.' });
    }
    setImporting(null);
  }

  return (
    <>
      <PageHeader title="Ajustes" eyebrow="Preferências" />
      <Container className="max-w-3xl space-y-5">
        <Group title="Jornada">
          <Row label="Ordem da jornada" description="Seu progresso é o mesmo nas duas ordens.">
            <Segmented
              label="Ordem da jornada"
              value={settings.orderMode}
              onChange={(v) => void actions.settings({ orderMode: v })}
              options={[
                { value: 'chronological', label: 'Cronológica' },
                { value: 'release', label: 'Lançamento' },
              ]}
            />
          </Row>
          <Switch
            id="extras"
            label="Incluir extras (webisódios)"
            description="Curtas oficiais lançados na web. Ocultar não apaga o progresso deles."
            checked={settings.includeExtras}
            onCheckedChange={(v) => void actions.settings({ includeExtras: v })}
          />
          <Switch
            id="spoilers"
            label="Proteção contra spoilers"
            description="Esconde títulos de episódios futuros e premissas que revelam personagens. Você pode revelar item a item."
            checked={settings.spoilerShield}
            onCheckedChange={(v) => void actions.settings({ spoilerShield: v })}
          />
        </Group>

        <Group title="Aparência">
          <Row label="Tema">
            <Segmented
              label="Tema"
              value={settings.theme}
              onChange={(v) => void actions.settings({ theme: v })}
              options={[
                { value: 'dark', label: 'Escuro', icon: <Moon className="size-3.5" /> },
                { value: 'light', label: 'Claro', icon: <Sun className="size-3.5" /> },
                { value: 'system', label: 'Sistema', icon: <MonitorSmartphone className="size-3.5" /> },
              ]}
            />
          </Row>
          <Row label="Animações" description="“Sistema” respeita a preferência de movimento reduzido do aparelho.">
            <Segmented
              label="Animações"
              value={settings.motion}
              onChange={(v) => void actions.settings({ motion: v })}
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'reduced', label: 'Reduzidas' },
                { value: 'full', label: 'Completas' },
              ]}
            />
          </Row>
        </Group>

        <Group
          title="Backup"
          description="Seu progresso fica só neste aparelho. Se o navegador limpar os dados do site, ele se perde — exporte um backup de vez em quando."
        >
          <Row label="Exportar backup" description={journey ? `${formatInt(journey.progress.size)} registros · arquivo JSON` : undefined}>
            <Button icon={<Download className="size-4" />} onClick={() => void doExport()}>
              Exportar
            </Button>
          </Row>
          <Row label="Importar backup" description="Você verá uma prévia e escolherá entre mesclar ou substituir.">
            <Button icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
              Importar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Arquivo de backup"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onFile(f);
              }}
            />
          </Row>
          <Row label="Reiniciar a maratona" description="Apaga todo o progresso, notas e favoritos. Preferências são mantidas.">
            <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setResetOpen(true)}>
              Reiniciar
            </Button>
          </Row>
        </Group>

        <Group title="Sobre">
          <Link to="/ajustes/fontes" className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-4 hover:bg-surface-2">
            <BookOpen className="size-5 text-muted" />
            <span className="flex-1">
              <span className="block text-[0.9375rem] font-medium text-text">Fontes e metodologia</span>
              <span className="block text-[0.8125rem] text-muted">Como a cronologia foi montada, grau de confiança e limitações</span>
            </span>
            <ChevronRight className="size-4 text-faint" />
          </Link>
          <div className="py-4 text-[0.8125rem] leading-relaxed text-muted">
            <p>
              <strong className="text-text">AFTERFALL {__APP_VERSION__}</strong> · dados {INDEX.catalog.version}
            </p>
            <p className="mt-2">
              Aplicativo pessoal e <strong className="text-text">não oficial</strong>, sem vínculo com AMC, Skybound ou os detentores de
              The Walking Dead. Nomes e marcas pertencem aos seus donos. Não hospeda nem aponta para vídeos.
            </p>
          </div>
        </Group>
      </Container>

      <Sheet
        open={!!importing}
        onOpenChange={(v) => !v && setImporting(null)}
        title="Importar backup"
        description={importing ? `Exportado em ${new Date(importing.preview.exportedAt).toLocaleString('pt-BR')}` : undefined}
      >
        {importing && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">No backup</dt>
                <dd className="mt-1 font-semibold text-text tabular">{formatInt(importing.preview.incomingCompleted)} concluídos</dd>
                <dd className="text-xs text-faint tabular">{formatInt(importing.preview.incoming)} registros</dd>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <dt className="text-xs text-muted">Neste aparelho</dt>
                <dd className="mt-1 font-semibold text-text tabular">{formatInt(importing.preview.currentCompleted)} concluídos</dd>
                <dd className="text-xs text-faint tabular">{formatInt(importing.preview.current)} registros</dd>
              </div>
            </dl>
            <ul className="space-y-1.5 text-[0.8125rem] text-muted">
              <li>
                <strong className="text-text">{formatInt(importing.preview.conflicts)}</strong> episódios com estado diferente nos dois lados.
              </li>
              {importing.preview.unknownIds.length > 0 && (
                <li>
                  {formatInt(importing.preview.unknownIds.length)} registros de itens que não existem neste catálogo (serão guardados, mas não exibidos).
                </li>
              )}
              {importing.migratedFrom && <li>Backup de formato antigo (v{importing.migratedFrom}) — será convertido.</li>}
            </ul>
            <div className="space-y-2 rounded-2xl border border-line p-3 text-[0.8125rem] text-muted">
              <p>
                <strong className="text-text">Mesclar:</strong> mantém tudo; em conflitos vale a alteração mais recente. Favoritos e notas nunca são perdidos.
              </p>
              <p>
                <strong className="text-text">Substituir:</strong> troca o progresso deste aparelho pelo do backup.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button variant="primary" onClick={() => void runImport('merge')}>
                Mesclar
              </Button>
              <Button variant="danger" onClick={() => void runImport('replace')}>
                Substituir
              </Button>
              <Button variant="ghost" onClick={() => setImporting(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reiniciar a maratona?"
        destructive
        description="Todo o progresso, notas e favoritos deste aparelho serão apagados. Esta ação não pode ser desfeita — recomendamos exportar um backup antes."
        extra={
          <Button className="mt-4 w-full" icon={<Download className="size-4" />} onClick={() => void doExport()}>
            Exportar backup antes
          </Button>
        }
        confirmLabel="Apagar progresso"
        onConfirm={async () => {
          await resetProgress(db);
          toast('Maratona reiniciada', { description: 'O mundo acabou de novo. Boa jornada.' });
        }}
      />
    </>
  );
}
