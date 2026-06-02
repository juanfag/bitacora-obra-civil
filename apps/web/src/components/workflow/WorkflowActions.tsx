"use client";

import {
  canApproveDailyLog,
  canCloseDailyLog,
  canRejectDailyLog,
  canSubmitDailyLog,
} from "@/lib/daily-log-workflow";

export type WorkflowAction =
  | "submit"
  | "approve"
  | "reject"
  | "close"
  | "return-to-draft";

const workflowActionLabels: Record<WorkflowAction, string> = {
  approve: "Aprobar",
  close: "Cerrar",
  reject: "Rechazar",
  "return-to-draft": "Volver a borrador",
  submit: "Enviar a revisión",
};

const emptyStateByStatus: Record<string, string> = {
  CLOSED: "Bitácora cerrada",
  VOIDED: "Bitácora anulada",
};

type WorkflowActionsProps = {
  allowedActions?: WorkflowAction[];
  dailyLogStatus: string;
  onRunAction: (action: WorkflowAction) => void;
  processingAction: string | null;
};

export function WorkflowActions({
  allowedActions,
  dailyLogStatus,
  onRunAction,
  processingAction,
}: WorkflowActionsProps) {
  const availableActions = getAvailableActions(dailyLogStatus).filter((action) =>
    allowedActions ? allowedActions.includes(action) : true,
  );

  if (availableActions.length === 0) {
    return (
      <p className="muted">
        {emptyStateByStatus[dailyLogStatus] ??
          "No hay acciones disponibles para este estado."}
      </p>
    );
  }

  return (
    <div className="toolbar">
      {availableActions.map((action) => (
        <button
          className={action === "return-to-draft" ? "button secondary" : undefined}
          disabled={Boolean(processingAction)}
          key={action}
          onClick={() => onRunAction(action)}
          type="button"
        >
          {workflowActionLabels[action]}
        </button>
      ))}
    </div>
  );
}

function getAvailableActions(status: string) {
  const actions: WorkflowAction[] = [];

  if (canSubmitDailyLog(status)) {
    actions.push("submit");
  }

  if (status === "REJECTED") {
    actions.push("return-to-draft");
  }

  if (canApproveDailyLog(status)) {
    actions.push("approve");
  }

  if (canRejectDailyLog(status)) {
    actions.push("reject");
  }

  if (canCloseDailyLog(status)) {
    actions.push("close");
  }

  return actions;
}
