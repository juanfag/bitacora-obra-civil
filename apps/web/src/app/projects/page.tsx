import Link from "next/link";

const placeholderProjects = [
  {
    id: "project-demo",
    code: "PROY-DEMO-001",
    name: "Proyecto Demo Bitacora de Obra",
    status: "ACTIVE",
  },
];

export default function ProjectsPage() {
  return (
    <section>
      <div className="page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Project workspace</h1>
          <p className="muted">
            Select a project before creating or reviewing daily logs.
          </p>
        </div>
        <Link className="button secondary" href="/daily-logs">
          View daily logs
        </Link>
      </div>

      <div className="grid">
        {placeholderProjects.map((project) => (
          <article className="card" key={project.id}>
            <div className="status-row">
              <span className="badge">{project.status}</span>
              <span className="badge">{project.code}</span>
            </div>
            <h2>{project.name}</h2>
            <p className="muted">
              Placeholder project card. API-backed project selection will be wired in a later phase.
            </p>
            <Link className="button" href="/daily-logs">
              Open
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
