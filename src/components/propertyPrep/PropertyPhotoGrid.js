
"use client";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Exterior",
  "Garden",
  "Balcony",
  "Hallway",
  "Garage",
  "Laundry Room",
  "Other",
];

function SortablePhoto({ photo, index, disabled, onDelete,  onRoomTypeChange, }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photo.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
    position: "relative",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-xl border bg-white"
    >
      <div className="aspect-[4/3] bg-gray-100">
        {photo.previewUrl ? (
          <img
            src={photo.previewUrl}
            alt={`Property photo ${index + 1}`}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Preview unavailable
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Photo {index + 1}
          </p>

          <select
                value={photo.roomType || ""}
                disabled={disabled}
                onChange={(event) =>
                    onRoomTypeChange?.(photo, event.target.value)
                }
                className="mt-1 w-full max-w-44 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 disabled:opacity-50"
                aria-label={`Room type for photo ${index + 1}`}
                >
                <option value="">Select room type</option>

                {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>
                    {roomType}
                    </option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2">
            <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete?.(photo)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
                Delete
            </button>

            <button
                type="button"
                disabled={disabled}
                {...attributes}
                {...listeners}
                className="cursor-grab rounded-lg border px-3 py-2 text-gray-700 touch-none active:cursor-grabbing disabled:opacity-50"
                aria-label={`Move photo ${index + 1}`}
                title="Drag to reorder"
            >
                ☰
            </button>
        </div>
      </div>
    </article>
  );
}

export default function PropertyPhotoGrid({
  photos = [],
  onReorder,
  onDelete,
  onRoomTypeChange,
  saving = false,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id || saving) return;

    const oldIndex = photos.findIndex(
      (photo) => photo.id === active.id
    );

    const newIndex = photos.findIndex(
      (photo) => photo.id === over.id
    );

    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(
      photos,
      oldIndex,
      newIndex
    );

    await onReorder?.(reordered);
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">
        No photos uploaded yet.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Property photos ({photos.length})
        </h2>

        <p className="text-sm text-gray-500">
          {saving ? "Saving order..." : "Drag ☰ to reorder"}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={photos.map((photo) => photo.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                index={index}
                disabled={saving}
                onDelete={onDelete}
                onRoomTypeChange={onRoomTypeChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
