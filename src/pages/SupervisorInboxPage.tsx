import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useS3Connection } from '../hooks/useS3Connection';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { USER_ROLES } from '../constants/roles';
import { SUBMISSION_STATUS } from '../constants/workflowStorage';
import type { SubmissionRecord, WorkflowNotification } from '../types/workflow';
import { SubmissionStagingFileList } from '../components/SubmissionStagingFileList';
import {
  approveSubmission,
  approveSubmissionFile,
  deleteNotification,
  getSubmission,
  listSubmissionsForUser,
  listSupervisorNotifications,
  markNotificationRead,
  rejectSubmissionFile,
  rejectSubmission,
} from '../services/submissionWorkflowService';
import type { StagingFileItem } from '../services/submissionWorkflowService';

export function SupervisorInboxPage() {
  const { user } = useAuth();
  const permissions = useRolePermissions();
  const { s3Conn, loading: s3Loading, error: s3Error } = useS3Connection();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileActionBusyKey, setFileActionBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isPendingLike = (submission: SubmissionRecord): boolean => {
    if (submission.status === SUBMISSION_STATUS.PENDING_REVIEW) {
      return true;
    }
    return Boolean(
      submission.submittedAt &&
        !submission.reviewedAt &&
        submission.status !== SUBMISSION_STATUS.APPROVED &&
        submission.status !== SUBMISSION_STATUS.REJECTED
    );
  };

  const refresh = useCallback(async () => {
    if (!s3Conn || !user) {
      return;
    }
    const listRole =
      user.role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.SUPERVISOR;
    const [subs, notifs] = await Promise.all([
      listSubmissionsForUser(s3Conn, { role: listRole, username: user.username }),
      listSupervisorNotifications(s3Conn, user.username),
    ]);

    const byId = new Map(subs.map((submission) => [submission.id, submission]));
    const notificationSubmissionIds = Array.from(
      new Set(notifs.map((notification) => notification.submissionId))
    );
    const fromNotifications = await Promise.all(
      notificationSubmissionIds.map((submissionId) => getSubmission(s3Conn, submissionId))
    );

    for (const submission of fromNotifications) {
      if (!submission) {
        continue;
      }
      if (submission.supervisorUsername !== user.username && user.role !== USER_ROLES.ADMIN) {
        continue;
      }
      if (!byId.has(submission.id)) {
        byId.set(submission.id, submission);
      }
    }

    const mergedSubmissions = Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setSubmissions(mergedSubmissions);
    setNotifications(notifs);
  }, [s3Conn, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pending = submissions.filter((s) => isPendingLike(s));
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (pending.length === 0) {
      setExpandedReviewId(null);
      return;
    }
    if (!expandedReviewId || !pending.some((s) => s.id === expandedReviewId)) {
      setExpandedReviewId(pending[0].id);
    }
  }, [pending, expandedReviewId]);

  const handleApprove = async (submissionId: string) => {
    if (!s3Conn || !user) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await approveSubmission(s3Conn, submissionId, user.username);
      setMessage('Envío aprobado y copiado a la zona definitiva (approved).');
      setExpandedReviewId(null);
      setRejectingId(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!s3Conn || !user) {
      return;
    }
    if (!rejectReason.trim()) {
      setError('Indica un motivo de rechazo');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await rejectSubmission(s3Conn, submissionId, user.username, rejectReason);
      setMessage('Envío rechazado. El analista puede corregir y reenviar.');
      setRejectReason('');
      setExpandedReviewId(null);
      setRejectingId(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al rechazar');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveFile = async (submissionId: string, file: StagingFileItem) => {
    if (!s3Conn || !user) {
      return;
    }
    setFileActionBusyKey(file.key);
    setError('');
    try {
      await approveSubmissionFile(s3Conn, submissionId, user.username, file.key);
      setMessage(`Archivo aprobado: ${file.name}`);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aprobar archivo');
    } finally {
      setFileActionBusyKey(null);
    }
  };

  const handleRejectFile = async (submissionId: string, file: StagingFileItem) => {
    if (!s3Conn || !user) {
      return;
    }
    setFileActionBusyKey(file.key);
    setError('');
    try {
      await rejectSubmissionFile(s3Conn, submissionId, user.username, file.key);
      setMessage(`Archivo rechazado: ${file.name}`);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al rechazar archivo');
    } finally {
      setFileActionBusyKey(null);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    if (!s3Conn || !user) {
      return;
    }
    await markNotificationRead(s3Conn, user.username, notificationId);
    await refresh();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!s3Conn || !user) {
      return;
    }
    await deleteNotification(s3Conn, user.username, notificationId);
    await refresh();
  };

  const handleDeleteReadNotifications = async () => {
    if (!s3Conn || !user) {
      return;
    }
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0) {
      return;
    }
    await Promise.all(readIds.map((id) => deleteNotification(s3Conn, user.username, id)));
    await refresh();
  };

  if (!permissions.approveSubmissions) {
    return (
      <div className="brand-card py-12 text-center text-terra-deep/70">
        Tu rol no permite aprobar envíos (custom:role = SUPERVISOR o ADMIN).
      </div>
    );
  }

  if (s3Loading) {
    return <div className="brand-card py-12 text-center">Cargando bandeja…</div>;
  }

  if (!s3Conn) {
    return (
      <div className="brand-card py-12 text-center">
        <p>{s3Error || 'Sin conexión S3'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="brand-card p-6 md:p-8">
        <p className="brand-kicker">Supervisor</p>
        <h1 className="brand-page-title mt-3">Bandeja de revisión</h1>
        <p className="mt-3 text-sm text-terra-deep/75">
          Revisa los archivos que subió cada analista en staging antes de aprobar o rechazar. Al
          aprobar, pasan a la zona definitiva{' '}
          <code className="text-xs bg-terra-cream px-1 rounded">approved</code>.
        </p>
        <p className="mt-2 text-sm font-medium text-terra-primary">
          Pendientes: {pending.length} · Notificaciones sin leer: {unreadCount}
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-terra-moss/30 bg-terra-moss/10 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="brand-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-terra-deep">Notificaciones</h2>
          <button
            type="button"
            onClick={() => void handleDeleteReadNotifications()}
            className="brand-button-secondary text-sm"
            disabled={!notifications.some((n) => n.read)}
          >
            Limpiar leídas
          </button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-terra-deep/70">No hay notificaciones.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-4 ${
                  n.read ? 'border-terra-moss/20 bg-white/50' : 'border-terra-primary/40 bg-terra-sand/20'
                }`}
              >
                <p className="text-sm text-terra-deep">{n.message}</p>
                <p className="text-xs text-terra-deep/60 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
                {!n.read && (
                  <button
                    type="button"
                    className="mt-2 text-sm text-terra-primary underline"
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    Marcar como leída
                  </button>
                )}
                <button
                  type="button"
                  className="ml-4 mt-2 text-sm text-red-700 underline"
                  onClick={() => void handleDeleteNotification(n.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="brand-card p-6">
        <h2 className="text-lg font-semibold text-terra-deep mb-4">Envíos pendientes de aval</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-terra-deep/70">No hay envíos pendientes.</p>
        ) : (
          <ul className="space-y-6">
            {pending.map((s) => {
              const isExpanded = expandedReviewId === s.id;
              return (
                <li
                  key={s.id}
                  className={`overflow-hidden rounded-2xl border bg-white/80 transition ${
                    isExpanded
                      ? 'border-terra-moss/40 shadow-brand'
                      : 'border-terra-moss/25'
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left md:p-5"
                    onClick={() => setExpandedReviewId(isExpanded ? null : s.id)}
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <p className="font-semibold text-terra-deep">
                        {s.projectId}
                        <span className="font-normal text-terra-deep/60"> · </span>
                        {s.analystUsername}
                      </p>
                      <p className="mt-1 text-xs text-terra-deep/65">
                        Enviado:{' '}
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                      </p>
                      <p className="mt-1 text-sm text-terra-deep/75">
                        {s.fileCount} archivo{s.fileCount === 1 ? '' : 's'} en staging
                      </p>
                    </div>
                    <span className="text-xs font-medium text-terra-moss">
                      {isExpanded ? 'Ocultar' : 'Ver archivos'}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-terra-moss/20 bg-terra-cream/25 px-4 pb-5 pt-4 md:px-5">
                      <p className="brand-kicker mb-3">Contenido a revisar</p>
                      <SubmissionStagingFileList
                        s3Conn={s3Conn}
                        stagingPrefix={s.stagingPrefix}
                        actionBusyKey={fileActionBusyKey}
                        onApproveFile={(file) => handleApproveFile(s.id, file)}
                        onRejectFile={(file) => handleRejectFile(s.id, file)}
                      />

                      <div className="mt-6 flex flex-wrap gap-3 border-t border-terra-moss/15 pt-5">
                        <button
                          type="button"
                          disabled={busy}
                          className="brand-button-primary text-sm min-w-[140px]"
                          onClick={() => void handleApprove(s.id)}
                        >
                          Aprobar envío
                        </button>
                        <button
                          type="button"
                          className="brand-button-secondary text-sm"
                          onClick={() =>
                            setRejectingId(rejectingId === s.id ? null : s.id)
                          }
                        >
                          Rechazar…
                        </button>
                      </div>

                      {rejectingId === s.id ? (
                        <div className="mt-4 space-y-2 rounded-2xl border border-red-200/60 bg-red-50/50 p-4">
                          <label className="brand-label" htmlFor={`reject-${s.id}`}>
                            Motivo del rechazo
                          </label>
                          <textarea
                            id={`reject-${s.id}`}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="brand-input min-h-[80px]"
                            rows={3}
                          />
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                            onClick={() => void handleReject(s.id)}
                          >
                            Confirmar rechazo
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="brand-panel p-6">
        <h2 className="text-lg font-semibold text-terra-deep mb-3">Historial</h2>
        <ul className="text-sm space-y-2 text-terra-deep/80 max-h-64 overflow-y-auto">
          {submissions
            .filter((s) => s.status !== SUBMISSION_STATUS.PENDING_REVIEW)
            .map((s) => (
              <li key={s.id}>
                {s.projectId} · {s.analystUsername} · {s.status}
                {s.reviewedAt ? ` · ${new Date(s.reviewedAt).toLocaleDateString()}` : ''}
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
