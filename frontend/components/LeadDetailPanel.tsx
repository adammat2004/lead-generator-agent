'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Copy, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLeadDetail } from '@/hooks/useLeadDetail';
import {
  useAddMessageMutation,
  useAddNoteMutation,
  useGenerateFollowUpMessageMutation,
  useGenerateMessageMutation,
  useMarkLeadContactedMutation,
  useMarkLeadInterestedMutation,
  useMarkLeadNotInterestedMutation,
  useMarkLeadRepliedMutation,
  useScheduleFollowUpMutation,
} from '@/hooks/useMutations';
import { statusDisplay } from '@/lib/leadDisplay';
import type { MessageType, OutreachTone } from '@/lib/types';
import { useEffect, useState } from 'react';

const noteSchema = z.object({
  content: z.string().min(1, 'Note is required'),
});

const messageSchema = z.object({
  type: z.enum(['INITIAL', 'FOLLOW_UP'] as const),
  content: z.string().min(1, 'Message is required'),
});

type NoteForm = z.infer<typeof noteSchema>;
type MessageForm = z.infer<typeof messageSchema>;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type Props = {
  leadId: string;
  onClose: () => void;
};

function mutationErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const m = data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function LeadDetailPanel({ leadId, onClose }: Props) {
  const { data: lead, isLoading, isError, error } = useLeadDetail(leadId);

  const [outreachTone, setOutreachTone] = useState<OutreachTone>('professional');
  const [outreachInstruction, setOutreachInstruction] = useState('');

  const addNote = useAddNoteMutation(leadId);
  const addMessage = useAddMessageMutation(leadId);
  const generateMessage = useGenerateMessageMutation(leadId);
  const generateFollowUpMessage = useGenerateFollowUpMessageMutation(leadId);
  const scheduleFollowUp = useScheduleFollowUpMutation(leadId);
  const markContacted = useMarkLeadContactedMutation(leadId);
  const markReplied = useMarkLeadRepliedMutation(leadId);
  const markInterested = useMarkLeadInterestedMutation(leadId);
  const markNotInterested = useMarkLeadNotInterestedMutation(leadId);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [followUpAt, setFollowUpAt] = useState('');

  const noteForm = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: '' },
  });

  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { type: 'INITIAL', content: '' },
  });

  useEffect(() => {
    noteForm.reset();
    messageForm.reset({ type: 'INITIAL', content: '' });
    setOutreachTone('professional');
    setOutreachInstruction('');
    generateMessage.reset();
    markContacted.reset();
    markReplied.reset();
    markInterested.reset();
    markNotInterested.reset();
    generateFollowUpMessage.reset();
    scheduleFollowUp.reset();
    setActionSuccess(null);
    setFollowUpAt('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset forms when switching lead
  }, [leadId]);

  const onSubmitNote = noteForm.handleSubmit(async (values) => {
    await addNote.mutateAsync({ content: values.content });
    noteForm.reset();
  });

  const onSubmitMessage = messageForm.handleSubmit(async (values) => {
    await addMessage.mutateAsync({
      type: values.type as MessageType,
      content: values.content,
    });
    messageForm.reset({ type: values.type, content: '' });
  });

  const handleGenerateOutreach = () => {
    const trimmed = outreachInstruction.trim();
    generateMessage.mutate({
      tone: outreachTone,
      ...(trimmed ? { instruction: trimmed } : {}),
    });
  };

  const handleGenerateFollowUp = () => {
    const trimmed = outreachInstruction.trim();
    generateFollowUpMessage.mutate({
      tone: outreachTone,
      ...(trimmed ? { instruction: trimmed } : {}),
    });
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpAt) {
      return;
    }

    const parsed = new Date(followUpAt);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    await scheduleFollowUp.mutateAsync(parsed.toISOString());
    setActionSuccess('Follow-up scheduled.');
  };

  const generatedPreview = generateMessage.data?.content ?? '';
  const generatedFollowUpPreview = generateFollowUpMessage.data?.content ?? '';
  const actionPending =
    markContacted.isPending ||
    markReplied.isPending ||
    markInterested.isPending ||
    markNotInterested.isPending;

  const st = lead ? statusDisplay[lead.status] : null;

  const runStatusAction = async (
    action:
      | typeof markContacted
      | typeof markReplied
      | typeof markInterested
      | typeof markNotInterested,
    successMessage: string,
  ) => {
    await action.mutateAsync();
    setActionSuccess(successMessage);
  };

  return (
    <aside className="flex h-full w-full max-w-xl shrink-0 flex-col border-l border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Lead detail</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading && (
          <p className="text-sm text-gray-500">Loading lead…</p>
        )}
        {isError && (
          <p className="text-sm text-red-600">
            {(error as Error)?.message ?? 'Failed to load lead.'}
          </p>
        )}
        {lead && st && (
          <div className="space-y-6">
            <header className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {lead.businessName}
              </h3>
              <p className="text-sm text-gray-600">
                {lead.serviceType} · {lead.area}
              </p>
              <span
                className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${st.className}`}
              >
                {st.label}
              </span>
            </header>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </h4>
              <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                {lead.status === 'NEW' && (
                  <button
                    type="button"
                    disabled={actionPending}
                    onClick={() =>
                      void runStatusAction(markContacted, 'Lead marked as contacted.')
                    }
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>
                )}

                {lead.status === 'CONTACTED' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() =>
                        void runStatusAction(markReplied, 'Lead marked as replied.')
                      }
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      Mark Replied
                    </button>
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() =>
                        void runStatusAction(
                          markInterested,
                          'Lead marked as interested.',
                        )
                      }
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark Interested
                    </button>
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() =>
                        void runStatusAction(
                          markNotInterested,
                          'Lead marked as not interested.',
                        )
                      }
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Mark Not Interested
                    </button>
                  </div>
                )}

                {lead.status === 'REPLIED' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() =>
                        void runStatusAction(
                          markInterested,
                          'Lead marked as interested.',
                        )
                      }
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark Interested
                    </button>
                    <button
                      type="button"
                      disabled={actionPending}
                      onClick={() =>
                        void runStatusAction(
                          markNotInterested,
                          'Lead marked as not interested.',
                        )
                      }
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Mark Not Interested
                    </button>
                  </div>
                )}

                {(lead.status === 'INTERESTED' || lead.status === 'NOT_INTERESTED') && (
                  <p className="text-sm text-gray-500">
                    No status action needed right now.
                  </p>
                )}

                <p className="text-sm text-gray-600">
                  <span className="font-medium">Next action:</span>{' '}
                  {lead.nextAction ?? '—'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Last contacted:</span>{' '}
                  {lead.lastContactedAt ? formatDate(lead.lastContactedAt) : '—'}
                </p>
                {actionSuccess ? (
                  <p className="text-xs font-medium text-green-700">{actionSuccess}</p>
                ) : null}
                {[markContacted, markReplied, markInterested, markNotInterested].some(
                  (action) => action.isError,
                ) ? (
                  <p className="text-xs text-red-600">
                    {mutationErrorMessage(
                      markContacted.error ??
                        markReplied.error ??
                        markInterested.error ??
                        markNotInterested.error,
                    )}
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Follow-up
              </h4>
              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Scheduled follow-up:</span>{' '}
                  {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : '—'}
                </p>

                <div>
                  <label
                    htmlFor="follow-up-at"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Next follow-up date/time
                  </label>
                  <input
                    id="follow-up-at"
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  disabled={!followUpAt || scheduleFollowUp.isPending}
                  onClick={() => void handleScheduleFollowUp()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {scheduleFollowUp.isPending
                    ? 'Scheduling...'
                    : 'Schedule Follow-up'}
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateFollowUp}
                    disabled={generateFollowUpMessage.isPending}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {generateFollowUpMessage.isPending
                      ? 'Generating...'
                      : 'Generate Follow-up Message'}
                  </button>
                </div>

                {(scheduleFollowUp.isError || generateFollowUpMessage.isError) && (
                  <p className="text-xs text-red-600">
                    {mutationErrorMessage(
                      scheduleFollowUp.error ?? generateFollowUpMessage.error,
                    )}
                  </p>
                )}

                {generatedFollowUpPreview ? (
                  <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    {generatedFollowUpPreview}
                  </div>
                ) : null}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Contact
              </h4>
              <div className="space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <p>
                  <span className="text-gray-500">Phone: </span>
                  {lead.phone ? (
                    <a
                      className="text-blue-600 underline"
                      href={`tel:${lead.phone}`}
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
                <p>
                  <span className="text-gray-500">Email: </span>
                  {lead.email ? (
                    <a
                      className="text-blue-600 underline"
                      href={`mailto:${lead.email}`}
                    >
                      {lead.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
                <p>
                  <span className="text-gray-500">Website: </span>
                  {lead.website ? (
                    <a
                      className="text-blue-600 underline"
                      href={
                        lead.website.startsWith('http')
                          ? lead.website
                          : `https://${lead.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {lead.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </h4>
              <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                {lead.notes.length === 0 && (
                  <li className="text-gray-400">No notes yet.</li>
                )}
                {lead.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md border border-gray-100 bg-white px-3 py-2"
                  >
                    <p className="text-gray-800">{n.content}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              <form onSubmit={onSubmitNote} className="space-y-2">
                <textarea
                  {...noteForm.register('content')}
                  rows={3}
                  placeholder="Add a note…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {noteForm.formState.errors.content && (
                  <p className="text-xs text-red-600">
                    {noteForm.formState.errors.content.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={addNote.isPending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addNote.isPending ? 'Saving…' : 'Add note'}
                </button>
              </form>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Outreach
              </h4>
              <p className="mb-3 text-xs text-gray-500">
                Generate a first-contact message from this lead. Each run saves
                as an initial message below.
              </p>
              <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div>
                  <label
                    htmlFor="outreach-tone"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Tone
                  </label>
                  <select
                    id="outreach-tone"
                    value={outreachTone}
                    onChange={(e) =>
                      setOutreachTone(e.target.value as OutreachTone)
                    }
                    disabled={generateMessage.isPending}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                  >
                    <option value="casual">Casual</option>
                    <option value="professional">Professional</option>
                    <option value="direct">Direct</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="outreach-instruction"
                    className="mb-1 block text-xs font-medium text-gray-600"
                  >
                    Instruction{' '}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="outreach-instruction"
                    value={outreachInstruction}
                    onChange={(e) => setOutreachInstruction(e.target.value)}
                    rows={2}
                    placeholder="e.g. Mention we’re local to their area…"
                    disabled={generateMessage.isPending}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateOutreach}
                    disabled={generateMessage.isPending}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generateMessage.isPending ? 'Generating…' : 'Generate message'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateOutreach}
                    disabled={generateMessage.isPending}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                </div>
                {generateMessage.isError && (
                  <p className="text-xs text-red-600">
                    {mutationErrorMessage(generateMessage.error)}
                  </p>
                )}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-600">
                      Message
                    </span>
                    {generatedPreview ? (
                      <button
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(generatedPreview)
                        }
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    ) : null}
                  </div>
                  <div className="min-h-[4.5rem] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    {generatedPreview ? (
                      generatedPreview
                    ) : (
                      <span className="text-gray-400">
                        Generated text appears here after you run generate.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Messages
              </h4>
              <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                {lead.messages.length === 0 && (
                  <li className="text-gray-400">No messages yet.</li>
                )}
                {lead.messages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-gray-100 bg-white px-3 py-2"
                  >
                    <p className="text-xs font-medium text-gray-500">
                      {m.type}
                    </p>
                    <p className="text-gray-800">{m.content}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(m.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              <form onSubmit={onSubmitMessage} className="space-y-2">
                <select
                  {...messageForm.register('type')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="INITIAL">Initial</option>
                  <option value="FOLLOW_UP">Follow up</option>
                </select>
                <textarea
                  {...messageForm.register('content')}
                  rows={3}
                  placeholder="Message content…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {messageForm.formState.errors.content && (
                  <p className="text-xs text-red-600">
                    {messageForm.formState.errors.content.message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={addMessage.isPending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {addMessage.isPending ? 'Sending…' : 'Add message'}
                </button>
              </form>
            </section>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Activity
              </h4>
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {lead.activities.length === 0 && (
                  <li className="text-gray-400">No activity yet.</li>
                )}
                {lead.activities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <p className="font-medium text-gray-800">{a.type}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(a.createdAt)}
                    </p>
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                      <pre className="mt-1 overflow-x-auto text-xs text-gray-600">
                        {JSON.stringify(a.metadata, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
