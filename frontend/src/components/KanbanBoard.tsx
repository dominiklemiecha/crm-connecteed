import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

export interface KanbanColumn<T> {
  id: string;
  label: string;
  color: string;
  items: T[];
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn<T>[];
  renderCard: (item: T, columnId: string) => React.ReactNode;
  onCardMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
  onAddCard?: (columnId: string) => void;
  onCardClick?: (item: T) => void;
}

export default function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  onCardMove,
  onAddCard,
  onCardClick,
}: KanbanBoardProps<T>) {
  const [dragging, setDragging] = useState<{ itemId: string; fromColumn: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragItem = useRef<string | null>(null);
  const dragFrom = useRef<string | null>(null);

  const handleDragStart = (itemId: string, columnId: string) => {
    setDragging({ itemId, fromColumn: columnId });
    dragItem.current = itemId;
    dragFrom.current = columnId;
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOver(columnId);
  };

  const handleDrop = (e: React.DragEvent, toColumn: string) => {
    e.preventDefault();
    if (dragItem.current && dragFrom.current && dragFrom.current !== toColumn) {
      onCardMove?.(dragItem.current, dragFrom.current, toColumn);
    }
    setDragging(null);
    setDragOver(null);
    dragItem.current = null;
    dragFrom.current = null;
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  // Mobile: scrollable horizontal with snap. Desktop: grid auto.
  return (
    <div className="flex md:grid gap-3 h-full overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-2 -mx-4 px-4 md:mx-0 md:px-0"
      style={{
        gridTemplateColumns: columns.length > 0 ? `repeat(${columns.length}, minmax(0, 1fr))` : undefined,
      }}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          className={`flex flex-col rounded-xl border-2 transition-colors min-w-[280px] md:min-w-0 snap-start flex-shrink-0 md:flex-shrink ${
            dragOver === col.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
          }`}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          {/* Column header */}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl ${col.color}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm truncate">{col.label}</span>
              <span className="bg-white/60 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                {col.items.length}
              </span>
            </div>
            {onAddCard && (
              <button
                onClick={() => onAddCard(col.id)}
                className="p-1.5 rounded-lg hover:bg-white/40 transition-colors flex-shrink-0"
                aria-label="Aggiungi"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cards */}
          <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[120px]">
            {col.items.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id, col.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onCardClick?.(item)}
                className={`cursor-pointer transition-all ${
                  dragging?.itemId === item.id ? 'opacity-40 scale-95' : 'hover:shadow-md active:scale-[0.98]'
                }`}
              >
                {renderCard(item, col.id)}
              </div>
            ))}
            {col.items.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">
                Nessun elemento
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
