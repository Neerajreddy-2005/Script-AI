import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { ApiError, MAX_UPLOAD_MB, UPLOAD_ACCEPT, api } from "@/lib/api";
import type { KnowledgeDocument } from "@/types/api";

interface Props {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

const STATUS_STYLES: Record<KnowledgeDocument["status"], string> = {
  ready: "bg-green-50 text-green-700",
  processing: "bg-accent-soft text-accent-text",
  uploaded: "bg-accent-soft text-accent-text",
  deleting: "bg-gray-100 text-gray-600",
  failed: "bg-red-50 text-red-700",
};

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

const KnowledgeBasePanel = ({ enabled, onEnabledChange, selectedIds, onSelectedIdsChange }: Props) => {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const documents = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });

  const upload = useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: ({ document, duplicate }) => {
      toast.success(duplicate ? `"${document.filename}" is already in your knowledge base` : `Indexed "${document.filename}" (${document.chunk_count} chunks)`);
      onEnabledChange(true);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Upload failed"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const remove = useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: (_data, id) => {
      onSelectedIdsChange(selectedIds.filter((s) => s !== id));
      toast.success("Document deleted");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Delete failed"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`Files must be at most ${MAX_UPLOAD_MB} MB`);
      return;
    }
    upload.mutate(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  const toggleSelected = (id: string) =>
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);

  const docs = documents.data ?? [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-scriptai-black">Knowledge Base</h2>
        <label className="flex items-center gap-2 text-sm text-scriptai-darkgray cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line-input"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          Use in script
        </label>
      </div>
      <p className="text-sm text-scriptai-darkgray mb-4">
        Upload brand guides, product sheets, or FAQs (TXT, MD, PDF up to {MAX_UPLOAD_MB} MB). Scripts will cite them as sources.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="btn-secondary w-full flex items-center justify-center gap-2 py-2"
        onClick={() => fileInput.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {upload.isPending ? "Indexing..." : "Upload document"}
      </button>

      <div className="mt-4 space-y-2">
        {documents.isLoading && <p className="text-sm text-scriptai-darkgray">Loading documents...</p>}
        {documents.isError && (
          <p className="text-sm text-red-600">
            {documents.error instanceof ApiError ? documents.error.message : "Could not load documents."}
          </p>
        )}
        {!documents.isLoading && !documents.isError && docs.length === 0 && (
          <p className="text-sm text-scriptai-darkgray">No documents yet.</p>
        )}
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
            <input
              type="checkbox"
              aria-label={`Use ${doc.filename} only`}
              className="h-4 w-4 rounded border-line-input"
              disabled={doc.status !== "ready"}
              checked={selectedIds.includes(doc.id)}
              onChange={() => toggleSelected(doc.id)}
            />
            <FileText className="h-4 w-4 shrink-0 text-scriptai-blue" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-scriptai-black" title={doc.filename}>
                {doc.filename}
              </p>
              <p className="text-xs text-scriptai-darkgray">
                {formatSize(doc.file_size)} · {doc.chunk_count} chunks
                {doc.error_code ? ` · ${doc.error_code.replace(/_/g, " ")}` : ""}
              </p>
            </div>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status]}`}>{doc.status}</span>
            <button
              type="button"
              aria-label={`Delete ${doc.filename}`}
              className="text-gray-400 hover:text-red-600"
              onClick={() => remove.mutate(doc.id)}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {docs.length > 0 && (
        <p className="mt-3 text-xs text-scriptai-darkgray">
          {selectedIds.length ? `Searching ${selectedIds.length} selected document(s).` : "Searching all ready documents. Tick documents to narrow the search."}
        </p>
      )}
    </div>
  );
};

export default KnowledgeBasePanel;
