import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api";
import type { Reminder } from "@/types/api";

/** Value for <input type="datetime-local"> in the browser's local time zone. */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inOneHour = () => new Date(Date.now() + 60 * 60 * 1000);
const tomorrowNine = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

const STATUS_LABEL: Record<Reminder["status"], string> = {
  pending: "scheduled",
  processing: "sending",
  sent: "sent",
  failed: "failed",
  cancelled: "cancelled",
};

const RemindersPanel = ({ suggestedTitle, userEmail }: { suggestedTitle?: string; userEmail?: string | null }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(toLocalInput(tomorrowNine()));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (suggestedTitle) setTitle(`Post "${suggestedTitle}"`);
  }, [suggestedTitle]);

  const reminders = useQuery({ queryKey: ["reminders"], queryFn: api.listReminders, refetchInterval: 60_000 });

  const create = useMutation({
    mutationFn: () => api.createReminder(title.trim(), new Date(when), note.trim() || undefined),
    onSuccess: (r) => {
      toast.success(`Reminder set for ${new Date(r.remind_at).toLocaleString()}`);
      setNote("");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not create the reminder"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const cancel = useMutation({
    mutationFn: api.cancelReminder,
    onSuccess: () => toast.success("Reminder cancelled"),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not cancel"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Give the reminder a title");
    if (new Date(when).getTime() < Date.now() + 60_000) return toast.error("Pick a time at least a minute from now");
    create.mutate();
  };

  const items = reminders.data ?? [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-scriptai-black mb-2">
        <Bell className="h-5 w-5 text-scriptai-blue" /> Email Reminders
      </h2>
      <p className="text-sm text-scriptai-darkgray mb-4">
        We'll email {userEmail ? <span className="font-medium">{userEmail}</span> : "you"} at the chosen time.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input className="input-field" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Film the cold brew video" aria-label="Reminder title" />
        <input type="datetime-local" className="input-field" value={when} onChange={(e) => setWhen(e.target.value)}
          aria-label="Reminder time" />
        <div className="flex gap-2 text-xs">
          <button type="button" className="btn-secondary px-2 py-1" onClick={() => setWhen(toLocalInput(inOneHour()))}>In 1 hour</button>
          <button type="button" className="btn-secondary px-2 py-1" onClick={() => setWhen(toLocalInput(tomorrowNine()))}>Tomorrow 9:00</button>
        </div>
        <textarea className="input-field" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note" aria-label="Reminder note" />
        <button type="submit" className="btn-primary w-full py-2 flex items-center justify-center gap-2" disabled={create.isPending}>
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Set reminder
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {reminders.isError && (
          <p className="text-sm text-red-600">
            {reminders.error instanceof ApiError ? reminders.error.message : "Could not load reminders."}
          </p>
        )}
        {items.map((r) => (
          <div key={r.id} className="flex items-start gap-2 rounded-md border border-gray-100 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-scriptai-black" title={r.title}>{r.title}</p>
              <p className="text-xs text-scriptai-darkgray">
                {new Date(r.remind_at).toLocaleString()} · {STATUS_LABEL[r.status]}
              </p>
            </div>
            {r.status === "pending" && (
              <button type="button" aria-label={`Cancel ${r.title}`} className="text-gray-400 hover:text-red-600"
                onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RemindersPanel;
