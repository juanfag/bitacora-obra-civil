"use client";

import { FormEvent, useState } from "react";
import { CreateDailyLogEventInput } from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";

type CreateDailyLogEventFormProps = {
  catalogError?: string | null;
  eventTypes: EventType[];
  isSubmitting: boolean;
  onSubmit: (values: CreateDailyLogEventInput) => Promise<boolean>;
};

export function CreateDailyLogEventForm({
  catalogError = null,
  eventTypes,
  isSubmitting,
  onSubmit,
}: CreateDailyLogEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventTypeId, setEventTypeId] = useState("");
  const [activity, setActivity] = useState("");
  const [executionDescription, setExecutionDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const values = {
      activity: activity.trim(),
      eventTypeId: eventTypeId.trim(),
      executionDescription: executionDescription.trim(),
    };

    if (!values.eventTypeId || !values.activity || !values.executionDescription) {
      setValidationError("Todos los campos del evento son obligatorios.");
      return;
    }

    const wasCreated = await onSubmit(values);

    if (wasCreated) {
      setEventTypeId("");
      setActivity("");
      setExecutionDescription("");
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="create-event-actions">
        <button onClick={() => setIsOpen(true)} type="button">
          + Agregar evento
        </button>
      </div>
    );
  }

  return (
    <form className="form event-form" onSubmit={handleSubmit}>
      <div className="toolbar">
        <h2>Agregar evento</h2>
        <button
          className="button secondary"
          disabled={isSubmitting}
          onClick={() => {
            setIsOpen(false);
            setValidationError(null);
          }}
          type="button"
        >
          Cancelar
        </button>
      </div>

      {eventTypes.length > 0 ? (
        <div className="field">
          <label htmlFor="eventTypeId">Tipo de evento</label>
          <select
            id="eventTypeId"
            name="eventTypeId"
            onChange={(changeEvent) => setEventTypeId(changeEvent.target.value)}
            required
            value={eventTypeId}
          >
            <option value="">Selecciona un tipo de evento</option>
            {eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {getEventTypeOptionLabel(eventType)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="eventTypeId">ID del tipo de evento</label>
          <p className="muted">
            No hay tipos de evento disponibles. Puedes ingresar el ID manualmente temporalmente.
          </p>
          {catalogError ? <p className="form-error">{catalogError}</p> : null}
          <input
            id="eventTypeId"
            name="eventTypeId"
            onChange={(changeEvent) => setEventTypeId(changeEvent.target.value)}
            placeholder="UUID del tipo de evento"
            required
            type="text"
            value={eventTypeId}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="eventActivity">Actividad</label>
        <input
          id="eventActivity"
          name="activity"
          onChange={(changeEvent) => setActivity(changeEvent.target.value)}
          required
          type="text"
          value={activity}
        />
      </div>

      <div className="field">
        <label htmlFor="eventExecutionDescription">
          Descripción de ejecución
        </label>
        <textarea
          id="eventExecutionDescription"
          name="executionDescription"
          onChange={(changeEvent) =>
            setExecutionDescription(changeEvent.target.value)
          }
          required
          rows={4}
          value={executionDescription}
        />
      </div>

      {validationError ? <p className="form-error">{validationError}</p> : null}

      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Guardando..." : "Guardar evento"}
      </button>
    </form>
  );
}

function getEventTypeOptionLabel(eventType: EventType) {
  if (eventType.code && eventType.name) {
    return `${eventType.code} - ${eventType.name}`;
  }

  return eventType.name ?? eventType.code ?? eventType.description ?? formatTechnicalId(eventType.id);
}

function formatTechnicalId(value: string) {
  if (value.length <= 13) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
