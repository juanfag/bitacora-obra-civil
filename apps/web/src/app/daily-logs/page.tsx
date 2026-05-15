"use client";

import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";

const statuses = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "CLOSED"];

export default function DailyLogsPage() {
  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Daily Logs</p>
            <h1>Daily log register</h1>
            <p className="muted">
              Placeholder list for project daily logs, filters, and creation flow.
            </p>
          </div>
          <Link className="button" href="/daily-logs/demo">
            Open detail
          </Link>
        </div>

        <div className="panel toolbar">
          <select aria-label="Status filter" defaultValue="">
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input aria-label="Work date" type="date" />
          <button type="button">Create daily log</button>
        </div>
      </section>
    </AuthGuard>
  );
}
