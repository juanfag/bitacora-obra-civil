type DailyLogDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const workflowActions = ["Submit", "Approve", "Reject", "Close", "Cancel"];

export default async function DailyLogDetailPage({
  params,
}: DailyLogDetailPageProps) {
  const { id } = await params;

  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">Daily Log Detail</p>
          <h1>Daily log {id}</h1>
          <p className="muted">
            Placeholder detail screen for workflow actions, events, and attachments.
          </p>
        </div>
      </div>

      <div className="grid">
        <article className="panel">
          <h2>Workflow</h2>
          <div className="status-row">
            <span className="badge">DRAFT</span>
            {workflowActions.map((action) => (
              <button key={action} type="button">
                {action}
              </button>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Events</h2>
          <p className="muted">
            DailyLogEvent list and create/edit forms will be connected to the API client later.
          </p>
          <button type="button">Add event</button>
        </article>

        <article className="panel">
          <h2>Attachments</h2>
          <p className="muted">
            Upload controls will accept PDF, JPEG, and PNG while the DailyLog is editable.
          </p>
          <button type="button">Upload attachment</button>
        </article>
      </div>
    </section>
  );
}
