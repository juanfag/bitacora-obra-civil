export function isDailyLogEditable(status: string) {
  return status === "DRAFT" || status === "REJECTED";
}

export function canCreateDailyLogEvent(status: string) {
  return isDailyLogEditable(status);
}

export function canUploadEventAttachment(status: string) {
  return isDailyLogEditable(status);
}

export function canSubmitDailyLog(status: string) {
  return status === "DRAFT";
}

export function canApproveDailyLog(status: string) {
  return status === "IN_REVIEW";
}

export function canRejectDailyLog(status: string) {
  return status === "IN_REVIEW";
}

export function canCloseDailyLog(status: string) {
  return status === "APPROVED";
}

export function isDailyLogReadOnly(status: string) {
  return !isDailyLogEditable(status);
}
