const statusLabels: Record<string, string> = {
  APPROVED: "Aprobada",
  CLOSED: "Cerrada",
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  REJECTED: "Rechazada",
  VOIDED: "Anulada",
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className="badge">{statusLabels[status] ?? status}</span>;
}
