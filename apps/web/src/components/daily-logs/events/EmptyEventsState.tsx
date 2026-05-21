export function EmptyEventsState() {
  return (
    <div className="empty-state">
      <p>Esta bitácora aún no tiene eventos registrados.</p>
      <p className="muted">
        Cuando agregues eventos, aparecerán aquí como una línea de tiempo.
      </p>
    </div>
  );
}
