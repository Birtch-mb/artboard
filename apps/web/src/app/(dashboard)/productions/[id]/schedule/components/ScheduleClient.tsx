'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Calendar, Loader2, Trash2, LayoutList, AlignLeft, History, Send } from 'lucide-react';
import { GanttView } from './GanttView';
import { useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Character = { id: string; name: string };

type SceneData = {
  id: string;
  sceneNumber: string;
  intExt: 'INT' | 'EXT' | 'INT_EXT';
  scriptedLocationName: string;
  set: { id: string; name: string } | null;
  timeOfDay: string;
  synopsis: string | null;
  pageCount: string | null;
  characters: { character: Character }[];
};

type ScheduleEntry = {
  id: string;
  order: number;
  scene: SceneData;
};

type ShootDay = {
  id: string;
  dayNumber: number;
  date: string | null;
  notes: string | null;
  scenes: ScheduleEntry[];
};

type Schedule = {
  shootDays: ShootDay[];
  unscheduledScenes: SceneData[];
};

type Props = {
  initialSchedule: Schedule;
  productionId: string;
  canEdit: boolean;
  token: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_URL = '/api/proxy';

function sortScenes(scenes: SceneData[]) {
  return [...scenes].sort((a, b) => {
    const parse = (n: string): [number, string] => {
      const m = n.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
      if (!m) return [0, n];
      return [parseInt(m[2], 10), m[3] || ''];
    };
    const [aNum, aAlpha] = parse(a.sceneNumber);
    const [bNum, bAlpha] = parse(b.sceneNumber);
    if (aNum !== bNum) return aNum - bNum;
    return aAlpha.localeCompare(bAlpha);
  });
}

function sortEntries(entries: ScheduleEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const parse = (n: string): [number, string] => {
      const m = n.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
      if (!m) return [0, n];
      return [parseInt(m[2], 10), m[3] || ''];
    };
    const [aNum, aAlpha] = parse(a.scene.sceneNumber);
    const [bNum, bAlpha] = parse(b.scene.sceneNumber);
    if (aNum !== bNum) return aNum - bNum;
    return aAlpha.localeCompare(bAlpha);
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function totalPages(entries: ScheduleEntry[]) {
  const sum = entries.reduce(
    (acc, e) => acc + (e.scene.pageCount ? parseFloat(e.scene.pageCount) : 0),
    0,
  );
  return sum > 0 ? sum.toFixed(2) : null;
}

const INT_EXT_LABEL: Record<string, string> = {
  INT: 'INT',
  EXT: 'EXT',
  INT_EXT: 'I/E',
};

const INT_EXT_COLOR: Record<string, string> = {
  INT: 'bg-blue-900/60 text-blue-300',
  EXT: 'bg-green-900/60 text-green-300',
  INT_EXT: 'bg-purple-900/60 text-purple-300',
};

const TOD_LABEL: Record<string, string> = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
  DAWN: 'DAWN',
  DUSK: 'DUSK',
  CONTINUOUS: 'CONT',
  LATER: 'LATER',
  MOMENTS_LATER: 'M.L.',
};

const TOD_COLOR: Record<string, string> = {
  DAY: 'bg-yellow-900/50 text-yellow-300',
  NIGHT: 'bg-indigo-900/60 text-indigo-300',
  DAWN: 'bg-orange-900/50 text-orange-300',
  DUSK: 'bg-orange-900/50 text-orange-300',
  CONTINUOUS: 'bg-neutral-700 text-neutral-300',
  LATER: 'bg-neutral-700 text-neutral-300',
  MOMENTS_LATER: 'bg-neutral-700 text-neutral-300',
};

// ─── Scene Row ───────────────────────────────────────────────────────────────

function SceneRow({ scene, action }: { scene: SceneData; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-neutral-800/70 hover:bg-neutral-800/30 group transition-colors">
      {/* Scene number */}
      <div className="w-9 shrink-0 text-right pt-0.5">
        <span className="text-sm font-mono font-bold text-white">{scene.sceneNumber}</span>
      </div>

      {/* INT/EXT + TOD badges */}
      <div className="flex flex-col gap-1 shrink-0 mt-0.5">
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded leading-none ${INT_EXT_COLOR[scene.intExt] ?? 'bg-neutral-700 text-neutral-300'}`}
        >
          {INT_EXT_LABEL[scene.intExt] ?? scene.intExt}
        </span>
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded leading-none ${TOD_COLOR[scene.timeOfDay] ?? 'bg-neutral-700 text-neutral-300'}`}
        >
          {TOD_LABEL[scene.timeOfDay] ?? scene.timeOfDay}
        </span>
      </div>

      {/* Location / Set / Synopsis / Characters */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-white leading-snug">
            {scene.scriptedLocationName}
          </span>
          {scene.set && (
            <span className="text-xs text-neutral-500">→ {scene.set.name}</span>
          )}
        </div>
        {scene.synopsis && (
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{scene.synopsis}</p>
        )}
        {scene.characters.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {scene.characters.map(({ character }) => (
              <span
                key={character.id}
                className="text-xs bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded"
              >
                {character.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Page count */}
      {scene.pageCount && (
        <div className="shrink-0 text-xs text-neutral-600 pt-0.5 tabular-nums">
          {parseFloat(scene.pageCount).toFixed(2)}p
        </div>
      )}

      {/* Action slot */}
      {action && (
        <div className="shrink-0 flex items-start pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {action}
        </div>
      )}
    </div>
  );
}

// ─── Unscheduled Panel ───────────────────────────────────────────────────────

function UnscheduledPanel({
  scenes,
  shootDays,
  canEdit,
  loading,
  onAssign,
}: {
  scenes: SceneData[];
  shootDays: ShootDay[];
  canEdit: boolean;
  loading: string | null;
  onAssign: (sceneId: string, dayId: string) => void;
}) {
  const sorted = sortScenes(scenes);

  return (
    <div>
      <div className="px-6 py-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-white">
          Unscheduled Scenes
          <span className="text-sm font-normal text-neutral-500 ml-2">({scenes.length})</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Scenes not yet assigned to a shoot day.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-neutral-500 text-sm">All scenes have been scheduled.</p>
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-neutral-600 font-medium border-b border-neutral-800/50">
            <div className="w-9 text-right">#</div>
            <div className="w-14">IE/TOD</div>
            <div className="flex-1">Location · Set · Synopsis · Cast</div>
            <div className="w-10">Pgs</div>
            {canEdit && shootDays.length > 0 && <div className="w-28">Assign</div>}
          </div>
          {sorted.map((scene) => (
            <SceneRow
              key={scene.id}
              scene={scene}
              action={
                canEdit && shootDays.length > 0 ? (
                  loading === `assign-${scene.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  ) : (
                    <select
                      className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-700 rounded px-2 py-1 cursor-pointer hover:border-neutral-500 transition-colors"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) onAssign(scene.id, e.target.value);
                      }}
                    >
                      <option value="">Assign…</option>
                      {shootDays.map((day) => (
                        <option key={day.id} value={day.id}>
                          Day {day.dayNumber}
                          {day.date ? ` — ${formatDate(day.date)}` : ''}
                        </option>
                      ))}
                    </select>
                  )
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Day Panel ───────────────────────────────────────────────────────────────

function DayPanel({
  day,
  canEdit,
  loading,
  onDeleteDay,
  onUpdateDay,
  onRemoveScene,
  onAddScenes,
}: {
  day: ShootDay;
  canEdit: boolean;
  loading: string | null;
  onDeleteDay: () => void;
  onUpdateDay: (data: { date?: string | null; notes?: string | null }) => void;
  onRemoveScene: (sceneId: string) => void;
  onAddScenes: () => void;
}) {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(
    day.date ? new Date(day.date).toISOString().split('T')[0] : '',
  );
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(day.notes ?? '');

  const sorted = sortEntries(day.scenes);
  const pages = totalPages(day.scenes);

  const saveDate = () => {
    onUpdateDay({ date: dateValue || null });
    setIsEditingDate(false);
  };

  const saveNotes = () => {
    onUpdateDay({ notes: notesValue || null });
    setIsEditingNotes(false);
  };

  return (
    <div>
      {/* Day header */}
      <div className="px-6 py-4 border-b border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white">
              Day {day.dayNumber}
              {day.date && (
                <span className="text-sm font-normal text-neutral-400 ml-2">
                  — {formatDate(day.date)}
                </span>
              )}
            </h2>

            {/* Date editor */}
            {canEdit && (
              <div className="mt-1.5">
                {isEditingDate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      className="text-xs bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1 focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      onClick={saveDate}
                      className="text-xs text-brand-primary hover:opacity-80"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDate(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDate(true)}
                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <Calendar className="h-3 w-3" />
                    {day.date ? 'Change date' : 'Set date'}
                  </button>
                )}
              </div>
            )}

            {/* Notes editor */}
            <div className="mt-2">
              {isEditingNotes ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Day notes…"
                    className="text-xs bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1.5 w-full max-w-md h-16 resize-none focus:outline-none focus:border-neutral-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveNotes}
                      className="text-xs text-brand-primary hover:opacity-80"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => canEdit && setIsEditingNotes(true)}
                  className={`text-xs text-neutral-500 leading-relaxed ${canEdit ? 'cursor-pointer hover:text-neutral-300' : ''}`}
                >
                  {day.notes ?? (canEdit ? 'Add notes…' : '')}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <>
                <button
                  onClick={onAddScenes}
                  className="flex items-center gap-1.5 text-xs bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 px-3 py-1.5 rounded transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Scenes
                </button>
                <button
                  onClick={onDeleteDay}
                  disabled={loading === `delete-${day.id}`}
                  className="flex items-center text-neutral-600 hover:text-red-400 border border-neutral-800 hover:border-red-900/50 px-2 py-1.5 rounded transition-colors disabled:opacity-40"
                  title="Delete shoot day"
                >
                  {loading === `delete-${day.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-2 text-xs text-neutral-500 border-b border-neutral-800/50 flex items-center gap-3">
        <span>
          {sorted.length} scene{sorted.length !== 1 ? 's' : ''}
        </span>
        {pages && <span>· {pages} pages</span>}
      </div>

      {/* Scene list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-neutral-500 text-sm">No scenes scheduled for this day.</p>
          {canEdit && (
            <button
              onClick={onAddScenes}
              className="mt-3 text-sm text-brand-primary hover:opacity-80"
            >
              + Add Scenes
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-neutral-600 font-medium border-b border-neutral-800/50">
            <div className="w-9 text-right">#</div>
            <div className="w-14">IE/TOD</div>
            <div className="flex-1">Location · Set · Synopsis · Cast</div>
            <div className="w-10">Pgs</div>
            {canEdit && <div className="w-6" />}
          </div>
          {sorted.map((entry) => (
            <SceneRow
              key={entry.id}
              scene={entry.scene}
              action={
                canEdit ? (
                  loading === `remove-${entry.scene.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  ) : (
                    <button
                      onClick={() => onRemoveScene(entry.scene.id)}
                      className="text-neutral-600 hover:text-red-400 transition-colors"
                      title="Remove from this day"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Scenes Modal ────────────────────────────────────────────────────────

function AddScenesModal({
  scenes,
  dayNumber,
  loading,
  onAssign,
  onClose,
}: {
  scenes: SceneData[];
  dayNumber: number;
  loading: string | null;
  onAssign: (sceneId: string) => void;
  onClose: () => void;
}) {
  const sorted = sortScenes(scenes);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg w-full max-w-2xl max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-white">Add Scenes to Day {dayNumber}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-neutral-500 text-sm">No unscheduled scenes available.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {sorted.map((scene) => (
              <div key={scene.id} className="flex items-stretch border-b border-neutral-800/70">
                <div className="flex-1 min-w-0">
                  <SceneRow scene={scene} />
                </div>
                <div className="shrink-0 flex items-center px-3 border-l border-neutral-800/50">
                  {loading === `assign-${scene.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                  ) : (
                    <button
                      onClick={() => onAssign(scene.id)}
                      className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-primary/90 transition-colors font-medium"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-4 py-1.5 rounded border border-neutral-700 hover:border-neutral-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleClient({ initialSchedule, productionId, canEdit, token }: Props) {
  const [shootDays, setShootDays] = useState<ShootDay[]>(initialSchedule.shootDays);
  const [unscheduledScenes, setUnscheduledScenes] = useState<SceneData[]>(
    initialSchedule.unscheduledScenes,
  );
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | 'unscheduled'>('unscheduled');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddSceneModalOpen, setIsAddSceneModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishLabel, setPublishLabel] = useState('');
  const [viewMode, setViewMode] = useState<'schedule' | 'gantt' | 'history'>('schedule');

  const scheduleBase = `${API_URL}/productions/${productionId}/schedule`;
  const authHeader = { Authorization: `Bearer ${token}` };

  const refreshSchedule = useCallback(async () => {
    const res = await fetch(scheduleBase, { headers: authHeader });
    if (!res.ok) throw new Error('Failed to fetch schedule');
    const data: Schedule = await res.json();
    setShootDays(data.shootDays);
    setUnscheduledScenes(data.unscheduledScenes);

    const vRes = await fetch(`${scheduleBase}/versions`, { headers: authHeader });
    if (vRes.ok) {
      const vData = await vRes.json();
      setVersions(vData);
    }
  }, [scheduleBase, token]);

  useEffect(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    setError(null);
    try {
      await fn();
      await refreshSchedule();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleAddDay = () =>
    withLoading('add-day', async () => {
      await fetch(`${scheduleBase}/days`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    });

  const handlePublish = () =>
    withLoading('publish', async () => {
      await fetch(`${scheduleBase}/publish`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionLabel: publishLabel }),
      });
      setIsPublishModalOpen(false);
      setPublishLabel('');
      setViewMode('history');
    });

  const handleDeleteDay = (dayId: string) =>
    withLoading(`delete-${dayId}`, async () => {
      await fetch(`${scheduleBase}/days/${dayId}`, { method: 'DELETE', headers: authHeader });
      if (selectedDayId === dayId) setSelectedDayId('unscheduled');
    });

  const handleUpdateDay = (dayId: string, data: { date?: string | null; notes?: string | null }) =>
    withLoading(`update-${dayId}`, async () => {
      await fetch(`${scheduleBase}/days/${dayId}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    });

  const handleAssignScene = (sceneId: string, dayId: string) =>
    withLoading(`assign-${sceneId}`, async () => {
      await fetch(`${scheduleBase}/days/${dayId}/scenes`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId }),
      });
    });

  const handleRemoveScene = (dayId: string, sceneId: string) =>
    withLoading(`remove-${sceneId}`, async () => {
      await fetch(`${scheduleBase}/days/${dayId}/scenes/${sceneId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
    });

  const selectedDay = selectedDayId === 'unscheduled'
    ? null
    : shootDays.find((d) => d.id === selectedDayId) ?? null;

  // If a selected day was deleted, fall back to unscheduled
  if (selectedDayId !== 'unscheduled' && !selectedDay && shootDays.length === 0) {
    setSelectedDayId('unscheduled');
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 53px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Schedule</h1>
          <p className="text-sm text-neutral-400">
            Assign scenes to shoot days to build your one-liner.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && shootDays.length > 0 && viewMode === 'schedule' && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={loading === 'publish'}
              className="flex items-center gap-2 rounded-md bg-neutral-800 border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Publish Version
            </button>
          )}

          {canEdit && viewMode === 'schedule' && (
            <button
              onClick={handleAddDay}
              disabled={loading === 'add-day'}
              className="flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {loading === 'add-day' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Day
            </button>
          )}

          <div className="flex bg-neutral-900 border border-neutral-700 rounded-md p-1 overflow-hidden ml-2">
            <button
              onClick={() => setViewMode('schedule')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded ${viewMode === 'schedule' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Schedule
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded ${viewMode === 'gantt' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              <AlignLeft className="w-3.5 h-3.5" /> Gantt
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded ${viewMode === 'history' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              <History className="w-3.5 h-3.5" /> Versions
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 text-sm text-red-400 bg-red-900/20 border-b border-red-900/40 flex items-center justify-between shrink-0">
          {error}
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Body */}
      {viewMode === 'gantt' ? (
        <GanttView productionId={productionId} canEdit={canEdit} token={token} />
      ) : viewMode === 'history' ? (
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-neutral-500 text-sm">No schedule versions have been published yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {versions.map((v) => (
                <div key={v.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-neutral-800/70">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                        {v.versionLabel}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Published by <span className="text-neutral-300 font-medium">{v.publisher?.name || 'Unknown'}</span> on {v.publishedAt ? formatDate(v.publishedAt) : 'Unknown date'}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-neutral-400 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded shadow-inner">
                      {v._count?.shootDays || 0} Shoot Days
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Change Summary</h4>
                    <ul className="list-disc pl-5 space-y-1.5 marker:text-neutral-700 bg-neutral-950/50 rounded-md p-4 border border-neutral-900">
                      {(v.changeSummary || []).map((change: string, idx: number) => (
                        <li key={idx} className="text-sm text-neutral-300">
                          {change}
                        </li>
                      ))}
                      {(!v.changeSummary || v.changeSummary.length === 0) && (
                        <p className="text-sm text-neutral-500 italic ml-[-1rem]">No significant changes recorded.</p>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — shoot day list */}
          <div className="w-60 border-r border-neutral-800 overflow-y-auto shrink-0 flex flex-col">
            {/* Unscheduled */}
            <button
              onClick={() => setSelectedDayId('unscheduled')}
              className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors outline-none ${selectedDayId === 'unscheduled'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
            >
              <span>Unscheduled</span>
              <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full tabular-nums">
                {unscheduledScenes.length}
              </span>
            </button>

            {/* Shoot days */}
            {shootDays.length > 0 && (
              <div className="border-t border-neutral-800">
                {shootDays.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayId(day.id)}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors outline-none ${selectedDayId === day.id
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Day {day.dayNumber}</span>
                      <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full tabular-nums">
                        {day.scenes.length}
                      </span>
                    </div>
                    {day.date && (
                      <div className="text-xs text-neutral-500 mt-0.5">{formatDate(day.date)}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {shootDays.length === 0 && (
              <div className="px-4 py-8 text-center flex-1">
                <p className="text-xs text-neutral-600">No shoot days yet.</p>
                {canEdit && (
                  <p className="text-xs text-brand-primary/80 mt-1">Click "Add Day" to start.</p>
                )}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto bg-neutral-950/30">
            {selectedDayId === 'unscheduled' ? (
              <UnscheduledPanel
                scenes={unscheduledScenes}
                shootDays={shootDays}
                canEdit={canEdit}
                loading={loading}
                onAssign={handleAssignScene}
              />
            ) : selectedDay ? (
              <DayPanel
                day={selectedDay}
                canEdit={canEdit}
                loading={loading}
                onDeleteDay={() => handleDeleteDay(selectedDay.id)}
                onUpdateDay={(data) => handleUpdateDay(selectedDay.id, data)}
                onRemoveScene={(sceneId) => handleRemoveScene(selectedDay.id, sceneId)}
                onAddScenes={() => setIsAddSceneModalOpen(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-600 text-sm">Select a shoot day from the left panel.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg w-full max-w-sm flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-neutral-800">
              <h3 className="text-lg font-bold text-white">Publish Schedule</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Save a permanent snapshot of the schedule.
              </p>
            </div>
            <div className="p-5">
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wide">
                Version Label
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Yellow Revision"
                value={publishLabel}
                onChange={(e) => setPublishLabel(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-900 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsPublishModalOpen(false);
                  setPublishLabel('');
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                disabled={loading === 'publish'}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={!publishLabel.trim() || loading === 'publish'}
                className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading === 'publish' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Publish'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Scenes Modal */}
      {isAddSceneModalOpen && selectedDay && (
        <AddScenesModal
          scenes={unscheduledScenes}
          dayNumber={selectedDay.dayNumber}
          loading={loading}
          onAssign={(sceneId) => {
            handleAssignScene(sceneId, selectedDay.id);
          }}
          onClose={() => setIsAddSceneModalOpen(false)}
        />
      )}
    </div>
  );
}
