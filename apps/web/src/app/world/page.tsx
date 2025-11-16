"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import dynamic from "next/dynamic";
import { TopHUD } from "@/components/world/top-hud";
import {
  FloatingButtons,
  PanelType,
} from "@/components/world/floating-buttons";
import { TasksPanel } from "@/components/world/tasks-panel";
import { InventoryPanel } from "@/components/world/inventory-panel";
import { HistoryPanel } from "@/components/world/history-panel";
import { SessionOverlay } from "@/components/world/session-overlay";
import { VictoryModal } from "@/components/world/victory-modal";
import {
  useCancelSessionMutation,
  useCompleteSessionMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useEquipItemMutation,
  useInventory,
  useLifeOSProfile,
  useLifeOSTasks,
  useSessionHistory,
  useStartSessionMutation,
} from "@/hooks/use-lifeos";
import {
  RoomName,
  SessionCompleteResponse,
  TaskTemplate,
  TaskTemplatePayload,
} from "@/types/lifeos";

const GameCanvas = dynamic(
  () =>
    import("@/components/world/game-canvas").then(
      (mod) => mod.GameCanvas
    ),
  { ssr: false }
);

const sessionSchema = z.object({
  task_template_id: z.string().uuid().optional().nullable(),
  duration_minutes: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(90),
  ]),
  room: z.enum(["study", "build", "training"]),
});

type RunningSession = {
  session_id: string;
  expected_end_time: string;
  duration_minutes: 25 | 50 | 90;
  room: RoomName;
};

export default function WorldPage() {
  const [activePanel, setActivePanel] = useState<PanelType>("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<25 | 50 | 90>(25);
  const [currentRoom, setCurrentRoom] = useState<RoomName | null>(null);
  const [runningSession, setRunningSession] = useState<RunningSession | null>(
    null
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [victoryData, setVictoryData] =
    useState<SessionCompleteResponse | null>(null);
  const autoCompleteRef = useRef(false);

  const profileQuery = useLifeOSProfile();
  const tasksQuery = useLifeOSTasks();
  const inventoryQuery = useInventory();
  const historyQuery = useSessionHistory();

  const startSessionMutation = useStartSessionMutation();
  const completeSessionMutation = useCompleteSessionMutation();
  const cancelSessionMutation = useCancelSessionMutation();
  const equipMutation = useEquipItemMutation();
  const createTaskMutation = useCreateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  const hero = profileQuery.data?.hero;
  const world = profileQuery.data?.world;

  const heroSignature = useMemo(() => {
    if (!hero) {
      return "";
    }
    return [
      hero.equipped_hat?.id ?? "hat",
      hero.equipped_outfit?.id ?? "outfit",
      hero.equipped_accessory?.id ?? "accessory",
      hero.level,
    ].join("-");
  }, [hero]);

  const tasks = tasksQuery.data ?? [];
  const selectedTask: TaskTemplate | undefined = tasks.find(
    (task) => task.id === selectedTaskId
  );

  const handleStartMission = useCallback(() => {
    const missionRoom = selectedTask?.room ?? currentRoom ?? "study";
    const payload = sessionSchema.safeParse({
      task_template_id: selectedTaskId,
      duration_minutes: selectedDuration,
      room: missionRoom,
    });

    if (!payload.success) {
      toast.error(payload.error.issues[0]?.message ?? "Invalid mission data.");
      return;
    }

    startSessionMutation.mutate(payload.data, {
      onSuccess: (response) => {
        setRunningSession({
          session_id: response.session_id,
          expected_end_time: response.expected_end_time,
          duration_minutes: payload.data.duration_minutes,
          room: payload.data.room,
        });
        autoCompleteRef.current = false;
        toast.success("Mission started. Stay focused!");
      },
      onError: (error) => {
        toast.error(error.message ?? "Unable to start session.");
      },
    });
  }, [
    selectedTask,
    currentRoom,
    selectedTaskId,
    selectedDuration,
    startSessionMutation,
  ]);

  const handleCompleteSession = useCallback(() => {
    if (!runningSession) {
      return;
    }
    completeSessionMutation.mutate(
      { session_id: runningSession.session_id },
      {
        onSuccess: (response) => {
          setVictoryData(response);
          setRunningSession(null);
          setRemainingSeconds(0);
          toast.success("Mission complete! Rewards applied.");
        },
        onError: (error) => {
          toast.error(error.message ?? "Unable to complete session.");
        },
        onSettled: () => {
          autoCompleteRef.current = false;
        },
      }
    );
  }, [runningSession, completeSessionMutation]);

  const handleCancelSession = () => {
    if (!runningSession) {
      return;
    }
    cancelSessionMutation.mutate(
      { session_id: runningSession.session_id },
      {
        onSuccess: () => {
          setRunningSession(null);
          setRemainingSeconds(0);
          toast.message("Session cancelled. Take a short break.");
        },
        onError: (error) => {
          toast.error(error.message ?? "Unable to cancel session.");
        },
      }
    );
  };

  useEffect(() => {
    if (!runningSession) {
      autoCompleteRef.current = false;
      return;
    }

    const tick = () => {
      const diff =
        new Date(runningSession.expected_end_time).getTime() - Date.now();
      const seconds = Math.max(0, Math.round(diff / 1000));
      setRemainingSeconds(seconds);
      if (seconds <= 0 && !autoCompleteRef.current) {
        autoCompleteRef.current = true;
        handleCompleteSession();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [runningSession, handleCompleteSession]);

  const handleEquip = (inventoryId: string) => {
    equipMutation.mutate(
      { item_id: inventoryId },
      {
        onError: (error) => {
          toast.error(error.message ?? "Unable to update equipment.");
        },
      }
    );
  };

  const handleCreateTask = async (payload: TaskTemplatePayload) => {
    await createTaskMutation.mutateAsync(payload).catch((error) => {
      toast.error(error.message ?? "Unable to create task.");
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId).catch((error) => {
      toast.error(error.message ?? "Unable to delete task.");
    });
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <TopHUD hero={hero} world={world} />
        <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
          <div className="min-h-[520px] rounded-3xl border border-border bg-card/80 p-4 shadow-xl">
            <GameCanvas
              heroSignature={heroSignature}
              movementLocked={Boolean(runningSession)}
              onRoomChange={(room) => setCurrentRoom(room)}
            />
          </div>
          <div className="flex flex-col gap-4">
            <FloatingButtons
              activePanel={activePanel}
              onToggle={setActivePanel}
            />
            {activePanel === "tasks" && (
              <TasksPanel
                tasks={tasksQuery.data}
                selectedTaskId={selectedTaskId}
                selectedDuration={selectedDuration}
                onSelectTask={setSelectedTaskId}
                onDurationChange={setSelectedDuration}
                onStartMission={handleStartMission}
                isStarting={startSessionMutation.isPending}
                currentRoom={currentRoom}
                onCreateTask={handleCreateTask}
                creatingTask={createTaskMutation.isPending}
                onDeleteTask={handleDeleteTask}
              />
            )}
            {activePanel === "inventory" && (
              <InventoryPanel
                inventory={inventoryQuery.data}
                onEquip={handleEquip}
                equipping={equipMutation.isPending}
              />
            )}
            {activePanel === "history" && (
              <HistoryPanel
                history={historyQuery.data}
                isLoading={historyQuery.isLoading}
              />
            )}
          </div>
        </div>
      </div>
      {runningSession && (
        <SessionOverlay
          session={{
            session_id: runningSession.session_id,
            expected_end_time: runningSession.expected_end_time,
            status: "pending",
            duration_minutes: runningSession.duration_minutes,
          }}
          remainingSeconds={remainingSeconds}
          onCancel={handleCancelSession}
          onComplete={handleCompleteSession}
          isCancelling={cancelSessionMutation.isPending}
          isCompleting={completeSessionMutation.isPending}
        />
      )}
      <VictoryModal
        data={victoryData}
        open={Boolean(victoryData)}
        onOpenChange={(open) => {
          if (!open) {
            setVictoryData(null);
          }
        }}
      />
    </div>
  );
}
