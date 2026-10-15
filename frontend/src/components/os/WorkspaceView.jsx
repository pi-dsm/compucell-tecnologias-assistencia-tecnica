import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import OrderCard from './OrderCard';

// Classes literais (o Tailwind precisa enxergá-las no código-fonte)
const GRID = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
};

function SortableCard({ order, onOpen, onStatusChange }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10 opacity-60' : ''}`}
    >
      <OrderCard order={order} onOpen={onOpen} onStatusChange={onStatusChange} />
    </div>
  );
}

export default function WorkspaceView({ orders, savedOrder, onReorder, onOpen, onStatusChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [columns, setColumns] = useState(() => Number(localStorage.getItem('workspace_columns')) || 4);

  // Ordem salva primeiro; OSs novas (sem posição) mantêm a ordem recebida da API
  const sorted = useMemo(() => {
    const pos = new Map((savedOrder || []).map((id, i) => [id, i]));
    const rank = (o) => (pos.has(o.id) ? pos.get(o.id) : Number.MAX_SAFE_INTEGER);
    return [...orders].sort((a, b) => rank(a) - rank(b));
  }, [orders, savedOrder]);

  const changeColumns = (n) => {
    setColumns(n);
    localStorage.setItem('workspace_columns', String(n));
  };

  const handleEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = sorted.map((o) => o.id);
    onReorder(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2 text-sm text-slate-500">
        Cards por linha
        <div className="flex rounded-lg bg-slate-100 p-1">
          {[2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => changeColumns(n)} className={`rounded-md px-2.5 py-0.5 font-semibold ${columns === n ? 'bg-white text-blue-700 shadow-card' : 'text-slate-500'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
        <SortableContext items={sorted.map((o) => o.id)} strategy={rectSortingStrategy}>
          <div className={`grid grid-cols-1 gap-3 ${GRID[columns]}`}>
            {sorted.map((o) => <SortableCard key={o.id} order={o} onOpen={onOpen} onStatusChange={onStatusChange} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}