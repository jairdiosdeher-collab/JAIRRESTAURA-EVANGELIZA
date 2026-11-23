import React, {useRef, useState} from 'react';
import {
  Check,
  Copy,
  Download,
  Film,
  FolderArchive,
  HardDrive,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {SCENE_MAP} from '../data/sceneCatalog';
import {
  downloadProjectJson,
  exportFullBackup,
  restoreBackupFromFile,
} from '../services/storageDb';
import {getProjectTotalDuration} from '../services/videoExporter';
import type {MinistryIdentity, VideoProject} from '../types/evangeliza';

interface ProjectsVaultProps {
  projects: VideoProject[];
  ministryIdentity: MinistryIdentity;
  onUpdateMinistryIdentity: (identity: MinistryIdentity) => void;
  onOpenProject: (project: VideoProject) => void;
  onDuplicateProject: (project: VideoProject) => void;
  onDeleteProject: (id: string) => void;
  onCreateNew: () => void;
  onRefreshData: () => Promise<void>;
}

export const ProjectsVault: React.FC<ProjectsVaultProps> = ({
  projects,
  ministryIdentity,
  onUpdateMinistryIdentity,
  onOpenProject,
  onDuplicateProject,
  onDeleteProject,
  onCreateNew,
  onRefreshData,
}) => {
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportAll = async () => {
    setBackupError(null);
    const payload = await exportFullBackup();
    setBackupNotice(
      `Respaldo descargado con ${payload.projects.length} proyectos y configuración del ministerio.`,
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupError(null);
    setBackupNotice(null);
    try {
      const res = await restoreBackupFromFile(file);
      await onRefreshData();
      setBackupNotice(
        `Restauración completada: ${res.importedProjects} proyecto(s) recuperado(s) sin borrar tus videos previos.`,
      );
    } catch (err) {
      setBackupError(
        err instanceof Error ? err.message : 'No se pudo leer el archivo de respaldo.',
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#9A6B1E] dark:text-[#EAB354]">
            Almacenamiento Local Seguro (IndexedDB) · Sin Registro Obligatorio
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-stone-900 sm:text-4xl dark:text-[#F4F1EA]">
            Mis Videos y Respaldos
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-stone-600 dark:text-slate-400">
            Todos tus guiones, configuraciones y voces grabadas permanecen guardados en tu dispositivo. Descarga respaldos para conservarlos siempre.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Backup & Ministry Identity Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E] lg:col-span-7">
          <div className="flex items-start gap-3">
            <FolderArchive className="mt-0.5 h-5 w-5 text-[#B47B22] dark:text-[#EAB354]" />
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Sistema de Respaldos Autónomo
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
                Exporta todos tus proyectos en un archivo portátil para guardarlos en tu computadora, USB o nube personal, o restaura proyectos en otro dispositivo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void handleExportAll()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-[#090B10] dark:hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Exportar respaldo completo (.json)
            </button>

            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-[#FAF8F4] px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200 dark:hover:bg-slate-900">
              <Upload className="h-4 w-4" />
              Restaurar respaldo (.json)
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void handleImportFile(e)}
                className="sr-only"
              />
            </label>
          </div>

          {backupNotice && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {backupNotice}
            </p>
          )}
          {backupError && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {backupError}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-stone-200 pt-3 text-xs text-stone-500 dark:border-slate-800 dark:text-slate-400">
            <HardDrive className="h-3.5 w-3.5" />
            <span>
              Base de datos local IndexedDB activa · Los proyectos no se borran al actualizar la aplicación.
            </span>
          </div>
        </div>

        {/* Ministry Identity Configuration */}
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 dark:border-slate-800 dark:bg-[#11151E] lg:col-span-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
                Identidad del Ministerio
              </h2>
              <p className="mt-1 text-xs text-stone-600 dark:text-slate-400">
                Personaliza la firma que aparece al cierre de tus videos.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateMinistryIdentity({
                  ...ministryIdentity,
                  enabled: !ministryIdentity.enabled,
                })
              }
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                ministryIdentity.enabled
                  ? 'border-[#B47B22] bg-[#B47B22] text-white dark:border-[#D4A24C] dark:bg-[#D4A24C] dark:text-[#090B10]'
                  : 'border-stone-300 bg-[#FAF8F4] text-stone-600 dark:border-slate-700 dark:bg-[#090B10] dark:text-slate-400'
              }`}
            >
              {ministryIdentity.enabled && <Check className="h-3.5 w-3.5" />}
              {ministryIdentity.enabled ? 'Activa' : 'Oculta'}
            </button>
          </div>

          <div className="space-y-2.5">
            <input
              type="text"
              value={ministryIdentity.brandName}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, brandName: e.target.value})
              }
              aria-label="Nombre del ministerio"
              className="w-full min-h-[40px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm font-semibold text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
            <input
              type="text"
              value={ministryIdentity.authorLine}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, authorLine: e.target.value})
              }
              aria-label="Autor o pastor"
              className="w-full min-h-[40px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-sm text-stone-900 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-100"
            />
            <input
              type="text"
              value={ministryIdentity.motto}
              onChange={(e) =>
                onUpdateMinistryIdentity({...ministryIdentity, motto: e.target.value})
              }
              aria-label="Lema ministerial"
              className="w-full min-h-[40px] rounded-xl border border-stone-300 bg-[#FAF8F4] px-3 text-xs tracking-wide text-stone-800 dark:border-slate-700 dark:bg-[#090B10] dark:text-stone-200"
            />
          </div>
        </div>
      </div>

      {/* Saved Projects List */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-[#11151E]">
          <Film className="mx-auto h-10 w-10 text-stone-400 dark:text-slate-500" />
          <h3 className="mt-3 font-display text-2xl font-bold text-stone-900 dark:text-[#F4F1EA]">
            Aún no has guardado proyectos
          </h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
            Crea tu primer video en el Estudio o elige una predicación preparada.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#B47B22] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10]"
          >
            Ir al Estudio de Creación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => {
            const firstScene = proj.script.scenes[0];
            const thumb =
              firstScene?.customImageDataUrl ||
              (firstScene ? SCENE_MAP[firstScene.imageId]?.src : undefined) ||
              SCENE_MAP.inspiring_sunrise.src;
            const totalDur = getProjectTotalDuration(proj);
            const updatedLabel = new Date(proj.updatedAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={proj.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-800 dark:bg-[#11151E]"
              >
                <div>
                  <div className="relative h-40 overflow-hidden bg-slate-950">
                    <img
                      src={thumb}
                      alt={proj.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-xs text-amber-300 font-mono-tabular">
                        {proj.aspectRatio} · {totalDur}s · {proj.script.scenes.length} escenas
                      </p>
                      <h3 className="mt-0.5 truncate font-display text-xl font-bold text-white">
                        {proj.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {proj.script.bibleReference} · Actualizado {updatedLabel}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-stone-700 dark:text-slate-300">
                      {proj.script.hook3s}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-4 py-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#B47B22] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#9A6B1E] dark:bg-[#D4A24C] dark:text-[#090B10] dark:hover:bg-[#EAB354]"
                  >
                    <Film className="h-3.5 w-3.5" />
                    Abrir editor
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => downloadProjectJson(proj)}
                      title="Descargar proyecto (.json)"
                      aria-label="Descargar proyecto"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateProject(proj)}
                      title="Duplicar proyecto"
                      aria-label="Duplicar proyecto"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(proj.id)}
                      title="Eliminar proyecto"
                      aria-label="Eliminar proyecto"
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
