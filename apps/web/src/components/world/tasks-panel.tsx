"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RoomName, TaskTemplate, TaskTemplatePayload } from "@/types/lifeos";

const createTaskSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().max(80).optional().or(z.literal("")),
  room: z.enum(["study", "build", "training"]),
  default_duration: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(90),
  ]),
});

interface TasksPanelProps {
  tasks?: TaskTemplate[];
  selectedTaskId: string | null;
  selectedDuration: 25 | 50 | 90;
  onSelectTask: (taskId: string | null) => void;
  onDurationChange: (duration: 25 | 50 | 90) => void;
  onStartMission: () => void;
  isStarting: boolean;
  currentRoom: RoomName | null;
  onCreateTask: (payload: TaskTemplatePayload) => Promise<void>;
  creatingTask: boolean;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export function TasksPanel({
  tasks,
  selectedTaskId,
  selectedDuration,
  onSelectTask,
  onDurationChange,
  onStartMission,
  isStarting,
  currentRoom,
  onCreateTask,
  creatingTask,
  onDeleteTask,
}: TasksPanelProps) {
  const [formState, setFormState] = useState({
    name: "",
    category: "",
    room: "study" as RoomName,
    default_duration: 25 as 25 | 50 | 90,
  });

  const handleCreate = async () => {
    const parsed = createTaskSchema.safeParse({
      ...formState,
      category: formState.category?.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid task details.");
      return;
    }
    try {
      await onCreateTask(parsed.data);
      setFormState({
        name: "",
        category: "",
        room: parsed.data.room,
        default_duration: parsed.data.default_duration,
      });
      toast.success("Task added to your mission board.");
    } catch {
      // toast handled upstream
    }
  };

  return (
    <Card className="w-full rounded-3xl border border-border bg-card/80 p-6 text-foreground shadow-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Current room:{" "}
            <strong className="text-foreground">
              {currentRoom ? currentRoom.toUpperCase() : "Plaza"}
            </strong>
          </span>
          <span>Select a mission and duration.</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {tasks?.map((task) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(isSelected ? null : task.id)}
                className={`flex w-full items-start justify-between rounded-2xl border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/60 hover:border-primary/40"
                }`}
              >
                <div>
                  <p className="text-base font-semibold leading-tight text-foreground">
                    {task.name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {task.room} • {task.default_duration}m
                  </p>
                  {task.category && (
                    <p className="text-xs text-muted-foreground">{task.category}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteTask(task.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
            );
          })}
          {!tasks?.length && (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No missions yet. Create one below to get started.
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Duration</p>
          <div className="mt-2 flex gap-2">
            {[25, 50, 90].map((duration) => (
              <Button
                key={duration}
                variant={selectedDuration === duration ? "default" : "ghost"}
                className={`rounded-2xl ${
                  selectedDuration === duration
                    ? "bg-gradient-to-r from-primary to-primary"
                    : "border border-border bg-card/40 text-foreground"
                }`}
                onClick={() => onDurationChange(duration as 25 | 50 | 90)}
              >
                {duration} min
              </Button>
            ))}
          </div>
        </div>
        <Button
          className="rounded-2xl bg-gradient-to-r from-primary to-primary text-base font-semibold"
          disabled={isStarting}
          onClick={onStartMission}
        >
          {isStarting ? "Starting..." : "Start Mission"}
        </Button>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
        <p className="text-sm font-semibold text-foreground">Add New Task</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Task name"
            value={formState.name}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, name: event.target.value }))
            }
            className="rounded-2xl bg-card/70"
          />
          <Input
            placeholder="Category (optional)"
            value={formState.category}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                category: event.target.value,
              }))
            }
            className="rounded-2xl bg-card/70"
          />
          <select
            className="rounded-2xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
            value={formState.room}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                room: event.target.value as RoomName,
              }))
            }
          >
            <option value="study">Study Room</option>
            <option value="build">Build Room</option>
            <option value="training">Training Room</option>
          </select>
          <select
            className="rounded-2xl border border-border bg-card/70 px-3 py-2 text-sm text-foreground"
            value={formState.default_duration}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                default_duration: Number(event.target.value) as 25 | 50 | 90,
              }))
            }
          >
            <option value={25}>25 minutes</option>
            <option value={50}>50 minutes</option>
            <option value={90}>90 minutes</option>
          </select>
        </div>
        <Button
          onClick={handleCreate}
          disabled={creatingTask}
          className="mt-3 w-full rounded-2xl border border-border bg-card/70 text-sm"
          variant="ghost"
        >
          {creatingTask ? "Saving..." : "Save Task"}
        </Button>
      </div>
    </Card>
  );
}
