import { useState, useRef, useEffect } from 'react';
import { Copy, Archive, ClipboardCopy, MoreHorizontal, ChevronDown, ChevronUp, Undo2, Trash2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useToastContext } from '../../contexts/ToastContext';
import type { LocalDictationItem, Priority, EffortSize } from '../../types';
import { PRIORITY_LABELS, EFFORT_LABELS, PRIORITY_DESCRIPTIONS, EFFORT_DESCRIPTIONS } from '../../types';
import { timeAgo, tryHapticFeedback } from '../../lib/utils';

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const EFFORTS: EffortSize[] = ['small', 'medium', 'large'];

const PRIORITY_COLORS: Record<Priority, { border: string; bg: string; text: string }> = {
  critical: {
    border: 'border-l-priority-critical',
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-priority-critical',
  },
  high: {
    border: 'border-l-priority-high',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-priority-high',
  },
  medium: {
    border: 'border-l-priority-medium',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    text: 'text-priority-medium',
  },
  low: {
    border: 'border-l-priority-low',
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    text: 'text-priority-low',
  },
};

const PRIORITY_PICKER_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-200 dark:border-red-500/30',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  medium: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 border-slate-200 dark:border-slate-500/30',
};

const EFFORT_COLORS: Record<EffortSize, string> = {
  small: 'bg-primary-100 text-primary-700 dark:bg-primary-400/15 dark:text-primary-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400',
  large: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-400',
};

interface ItemCardProps {
  item: LocalDictationItem;
  projectName?: string;
  projectColor?: string;
  isArchiveView?: boolean;
}

export function ItemCard({ item, projectName, projectColor, isArchiveView }: ItemCardProps) {
  const { updateItem, copyItem, copyAndArchiveItem, archiveItem, restoreItem, removeItem, projects } = useData();
  const { addToast } = useToastContext();
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showEffortPicker, setShowEffortPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const priorityPickerRef = useRef<HTMLDivElement>(null);
  const effortPickerRef = useRef<HTMLDivElement>(null);
  const projectPickerRef = useRef<HTMLDivElement>(null);

  const priority = PRIORITY_COLORS[item.priority];
  const isLong = item.content.length > 150;

  useEffect(() => {
    if (!showPriorityPicker && !showEffortPicker && !showProjectPicker) return;
    const handleTap = (e: MouseEvent) => {
      if (showPriorityPicker && priorityPickerRef.current && !priorityPickerRef.current.contains(e.target as Node)) {
        setShowPriorityPicker(false);
      }
      if (showEffortPicker && effortPickerRef.current && !effortPickerRef.current.contains(e.target as Node)) {
        setShowEffortPicker(false);
      }
      if (showProjectPicker && projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setShowProjectPicker(false);
      }
    };
    document.addEventListener('mousedown', handleTap);
    return () => document.removeEventListener('mousedown', handleTap);
  }, [showPriorityPicker, showEffortPicker, showProjectPicker]);

  const handlePriorityChange = async (newPriority: Priority) => {
    if (newPriority === item.priority) {
      setShowPriorityPicker(false);
      return;
    }
    tryHapticFeedback();
    await updateItem(item.id, { priority: newPriority });
    setShowPriorityPicker(false);
    addToast(`Priority: ${PRIORITY_LABELS[newPriority].toLowerCase()}`);
  };

  const handleEffortChange = async (newEffort: EffortSize) => {
    if (newEffort === item.effort_size) {
      setShowEffortPicker(false);
      return;
    }
    tryHapticFeedback();
    await updateItem(item.id, { effort_size: newEffort });
    setShowEffortPicker(false);
  };

  const handleProjectChange = async (newProjectId: string | null) => {
    if (newProjectId === item.project_id) {
      setShowProjectPicker(false);
      return;
    }
    tryHapticFeedback();
    await updateItem(item.id, { project_id: newProjectId });
    setShowProjectPicker(false);
    const name = newProjectId ? projects.find(p => p.id === newProjectId)?.name : 'Inbox';
    addToast(`Moved to ${name}`);
  };

  const handleCopy = async () => {
    tryHapticFeedback();
    await copyItem(item.id);
    addToast('Copied to clipboard');
  };

  const handleCopyAndArchive = async () => {
    tryHapticFeedback();
    setExiting(true);
    await new Promise((r) => setTimeout(r, 300));
    await copyAndArchiveItem(item.id);
    addToast('Copied to clipboard -- archived');
  };

  const handleArchive = async () => {
    setExiting(true);
    await new Promise((r) => setTimeout(r, 300));
    await archiveItem(item.id);
    addToast('Archived');
  };

  const handleRestore = async () => {
    await restoreItem(item.id);
    addToast('Restored to active');
  };

  const handleDelete = async () => {
    setExiting(true);
    await new Promise((r) => setTimeout(r, 300));
    await removeItem(item.id);
    addToast('Deleted', 'info');
  };

  const activeProjects = projects.filter(p => !p.is_archived);
  const currentProject = projects.find(p => p.id === item.project_id);

  return (
    <div
      className={`group relative bg-white dark:bg-surface-dark-card rounded-xl border-l-4 ${priority.border} shadow-soft dark:shadow-dark-soft hover:shadow-medium dark:hover:shadow-dark-medium transition-all ${exiting ? 'animate-slide-out-right' : 'animate-scale-in'}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isArchiveView ? (
              <>
                <span title={PRIORITY_DESCRIPTIONS[item.priority]} className={`px-2.5 py-1 rounded-2xl text-xs font-semibold ${priority.bg} ${priority.text}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
                <span title={EFFORT_DESCRIPTIONS[item.effort_size]} className={`px-2 py-1 rounded-2xl text-xs font-semibold ${EFFORT_COLORS[item.effort_size]}`}>
                  {EFFORT_LABELS[item.effort_size]}
                </span>
              </>
            ) : (
              <>
                <div className="relative" ref={priorityPickerRef}>
                  <button
                    onClick={() => {
                      setShowPriorityPicker(!showPriorityPicker);
                      setShowEffortPicker(false);
                      setShowProjectPicker(false);
                    }}
                    title={`${PRIORITY_DESCRIPTIONS[item.priority]} — click to change`}
                    className={`px-2.5 py-1 min-h-[36px] sm:min-h-0 rounded-2xl text-xs font-semibold ${priority.bg} ${priority.text} hover:ring-2 hover:ring-current/20 active:scale-95 transition-all cursor-pointer`}
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </button>
                  {showPriorityPicker && (
                    <div className="absolute left-0 top-full mt-1 z-30 flex gap-1 p-1.5 bg-white dark:bg-surface-dark-elevated rounded-xl shadow-lg border border-neutral-200 dark:border-surface-dark-border animate-scale-in">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePriorityChange(p)}
                          title={PRIORITY_DESCRIPTIONS[p]}
                          className={`px-2.5 py-1.5 min-h-[40px] sm:min-h-[32px] rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                            item.priority === p
                              ? PRIORITY_PICKER_COLORS[p]
                              : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400'
                          }`}
                        >
                          {PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" ref={effortPickerRef}>
                  <button
                    onClick={() => {
                      setShowEffortPicker(!showEffortPicker);
                      setShowPriorityPicker(false);
                      setShowProjectPicker(false);
                    }}
                    title={`${EFFORT_DESCRIPTIONS[item.effort_size]} — click to change`}
                    className={`px-2 py-1 min-h-[36px] sm:min-h-0 rounded-2xl text-xs font-semibold ${EFFORT_COLORS[item.effort_size]} hover:ring-2 hover:ring-current/20 active:scale-95 transition-all cursor-pointer`}
                  >
                    {EFFORT_LABELS[item.effort_size]}
                  </button>
                  {showEffortPicker && (
                    <div className="absolute left-0 top-full mt-1 z-30 flex gap-1 p-1.5 bg-white dark:bg-surface-dark-elevated rounded-xl shadow-lg border border-neutral-200 dark:border-surface-dark-border animate-scale-in">
                      {EFFORTS.map((e) => (
                        <button
                          key={e}
                          onClick={() => handleEffortChange(e)}
                          title={EFFORT_DESCRIPTIONS[e]}
                          className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            item.effort_size === e
                              ? 'bg-neutral-200 dark:bg-surface-dark-elevated text-neutral-800 dark:text-neutral-200'
                              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400'
                          }`}
                        >
                          {EFFORT_LABELS[e]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="relative" ref={projectPickerRef}>
              <button
                onClick={() => {
                  setShowProjectPicker(!showProjectPicker);
                  setShowPriorityPicker(false);
                  setShowEffortPicker(false);
                }}
                title={`Project: ${currentProject?.name ?? 'Inbox'} — click to move`}
                className="px-2 py-1 min-h-[36px] sm:min-h-0 rounded-2xl text-xs font-medium bg-neutral-100 dark:bg-surface-dark-elevated text-neutral-600 dark:text-neutral-300 hover:ring-2 hover:ring-neutral-300/50 dark:hover:ring-neutral-500/30 active:scale-95 transition-all cursor-pointer"
                style={currentProject?.color_label ? { borderLeft: `3px solid ${currentProject.color_label}`, paddingLeft: '8px' } : undefined}
              >
                {currentProject?.name ?? 'Inbox'}
              </button>
              {showProjectPicker && (
                <div className="absolute left-0 top-full mt-1 z-30 w-48 py-1 bg-white dark:bg-surface-dark-elevated rounded-lg shadow-lg border border-neutral-200 dark:border-surface-dark-border animate-scale-in max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleProjectChange(null)}
                    className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-dark-card"
                  >
                    Inbox
                  </button>
                  {activeProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProjectChange(p.id)}
                      className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-dark-card"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color_label }}
                      />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {timeAgo(item.created_at)}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                title="More actions"
                className="w-10 h-10 sm:w-7 sm:h-7 flex items-center justify-center rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:bg-neutral-100 dark:hover:bg-surface-dark-elevated text-neutral-400 dark:text-neutral-500 transition-all"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 py-1 bg-white dark:bg-surface-dark-elevated rounded-lg shadow-lg border border-neutral-200 dark:border-surface-dark-border animate-scale-in">
                    {isArchiveView ? (
                      <button
                        onClick={() => { setShowMenu(false); handleRestore(); }}
                        className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-dark-card"
                      >
                        <Undo2 size={14} /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowMenu(false); handleArchive(); }}
                        className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-dark-card"
                      >
                        <Archive size={14} /> Archive
                      </button>
                    )}
                    <button
                      onClick={() => { setShowMenu(false); handleDelete(); }}
                      className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed">
          {isLong && !expanded ? (
            <>
              {item.content.slice(0, 150)}...
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-0.5 ml-1 text-primary-500 dark:text-primary-400 text-xs font-medium hover:underline min-h-[36px] sm:min-h-0"
              >
                more <ChevronDown size={12} />
              </button>
            </>
          ) : (
            <>
              {item.content}
              {isLong && (
                <button
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-0.5 ml-1 text-primary-500 dark:text-primary-400 text-xs font-medium hover:underline min-h-[36px] sm:min-h-0"
                >
                  less <ChevronUp size={12} />
                </button>
              )}
            </>
          )}
        </div>

        {isArchiveView && item.copied_at && (
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            Copied out {timeAgo(item.copied_at)}
          </p>
        )}

        {!isArchiveView && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCopy}
              title="Copy text to clipboard"
              className="flex items-center justify-center gap-2 flex-1 sm:flex-none h-12 sm:h-10 sm:px-4 rounded-lg border border-neutral-300 dark:border-surface-dark-border text-neutral-700 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-surface-dark-elevated active:bg-neutral-100 dark:active:bg-surface-dark-border transition-colors active:scale-[0.98]"
            >
              <ClipboardCopy size={15} />
              Copy
            </button>
            <button
              onClick={handleCopyAndArchive}
              title="Copy text to clipboard and move to archive"
              className="flex items-center justify-center gap-2 flex-1 sm:flex-none h-12 sm:h-10 sm:px-4 rounded-lg bg-primary-400 text-neutral-900 text-sm font-bold hover:bg-primary-500 active:bg-primary-600 transition-colors active:scale-[0.98]"
            >
              <Archive size={15} />
              Copy & Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
