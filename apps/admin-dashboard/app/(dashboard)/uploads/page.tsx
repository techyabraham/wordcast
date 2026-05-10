'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadDropzone } from '@/components/upload-dropzone';
import { apiClient } from '@/lib/api/client';
import { usePreachers } from '@/lib/hooks/use-preachers';
import { usePrograms } from '@/lib/hooks/use-programs';
import { useSessions } from '@/lib/hooks/use-sessions';

const manualSchema = z.object({
  title: z.string().min(2),
  preacherId: z.string().min(1),
  programId: z.string().optional(),
  sessionId: z.string().optional(),
  churchName: z.string().optional(),
  datePreached: z.string().optional(),
  language: z.string().optional(),
  speakerRole: z.string().optional(),
  notes: z.string().optional(),
});

const youtubeSchema = z.object({
  youtubeUrl: z.string().url(),
  title: z.string().min(2),
  preacherId: z.string().min(1),
  programId: z.string().optional(),
  sessionId: z.string().optional(),
  churchName: z.string().optional(),
  datePreached: z.string().optional(),
  notes: z.string().optional(),
});

const googleDriveSchema = z.object({
  folderUrl: z.string().url(),
  importLabel: z.string().optional(),
  defaultPreacherId: z.string().optional(),
  defaultProgramId: z.string().optional(),
  defaultSessionId: z.string().optional(),
  defaultChurchName: z.string().optional(),
  defaultDatePreached: z.string().optional(),
});

const socialSchema = z.object({
  sourceUrl: z.string().url(),
  preacher: z.string().min(1),
  notes: z.string().optional(),
});

type ManualValues = z.infer<typeof manualSchema>;
type YoutubeValues = z.infer<typeof youtubeSchema>;
type GoogleDriveValues = z.infer<typeof googleDriveSchema>;
type SocialValues = z.infer<typeof socialSchema>;

export default function UploadsPage() {
  const [activeTab, setActiveTab] = useState('manual');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualJobId, setManualJobId] = useState<string | null>(null);
  const [youtubeJobId, setYoutubeJobId] = useState<string | null>(null);
  const [driveJobId, setDriveJobId] = useState<string | null>(null);
  const [socialJobId, setSocialJobId] = useState<string | null>(null);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [youtubeMessage, setYoutubeMessage] = useState<string | null>(null);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const [socialMessage, setSocialMessage] = useState<string | null>(null);

  const preachersQuery = usePreachers({ page: 1, pageSize: 200 });
  const programsQuery = usePrograms({ page: 1, pageSize: 200 });
  const sessionsQuery = useSessions();

  const manualForm = useForm<ManualValues>({ resolver: zodResolver(manualSchema) });
  const youtubeForm = useForm<YoutubeValues>({ resolver: zodResolver(youtubeSchema) });
  const googleDriveForm = useForm<GoogleDriveValues>({ resolver: zodResolver(googleDriveSchema) });
  const socialForm = useForm<SocialValues>({ resolver: zodResolver(socialSchema) });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash.replace('#', '');
    if (hash === 'manual' || hash === 'youtube' || hash === 'google-drive') {
      setActiveTab(hash);
    }
  }, []);

  const manualMutation = useMutation({
    mutationFn: async (values: ManualValues) => {
      if (!manualFile) {
        throw new Error('Audio file is required');
      }

      const presign = await apiClient.post<any>('/admin/uploads/manual/presign', {
        ...values,
        programId: values.programId || undefined,
        sessionId: values.sessionId || undefined,
        fileName: manualFile.name,
        contentType: manualFile.type || 'audio/mpeg',
        sizeBytes: manualFile.size,
      });

      const uploadJobId = presign.data?.uploadJob?.id;
      const upload = presign.data?.upload;
      if (!uploadJobId || !upload?.url) {
        throw new Error('Signed upload response missing required fields');
      }

      const uploadResponse = await fetch(upload.url, {
        method: upload.method ?? 'PUT',
        headers: upload.headers ?? {},
        body: manualFile,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file to storage');
      }

      await apiClient.post(`/admin/uploads/manual/${uploadJobId}/complete`);
      return uploadJobId;
    },
    onSuccess: (uploadJobId) => {
      setManualJobId(uploadJobId);
      setManualMessage('Manual upload job created and queued for processing.');
      setManualFile(null);
      manualForm.reset();
    },
    onError: (error: any) => setManualMessage(error?.message ?? 'Manual upload failed'),
  });

  const youtubeMutation = useMutation({
    mutationFn: async (values: YoutubeValues) =>
      apiClient.post<any>('/admin/uploads/youtube', {
        ...values,
        programId: values.programId || undefined,
        sessionId: values.sessionId || undefined,
      }),
    onSuccess: (response) => {
      setYoutubeJobId(response.data.id);
      setYoutubeMessage('YouTube import queued.');
      youtubeForm.reset();
    },
    onError: (error: any) => setYoutubeMessage(error?.message ?? 'YouTube import failed'),
  });

  const googleDriveMutation = useMutation({
    mutationFn: async (values: GoogleDriveValues) => apiClient.post<any>('/admin/uploads/google-drive', values),
    onSuccess: (response) => {
      setDriveJobId(response.data.id);
      setDriveMessage('Google Drive import queued.');
      googleDriveForm.reset();
    },
    onError: (error: any) => setDriveMessage(error?.message ?? 'Google Drive import failed'),
  });

  const socialMutation = useMutation({
    mutationFn: async (values: SocialValues) => apiClient.post<any>('/admin/import-sermon', values),
    onSuccess: (response) => {
      setSocialJobId(response.data.id);
      setSocialMessage('Social sermon import queued.');
      socialForm.reset();
    },
    onError: (error: any) => setSocialMessage(error?.message ?? 'Social import failed'),
  });

  const renderJobLink = (jobId: string | null) =>
    jobId ? (
      <Link className="text-brand-300 hover:underline" href={`/upload-jobs/${jobId}`}>
        View upload job
      </Link>
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uploads"
        subtitle="Create manual uploads, YouTube imports, Google Drive batches, and social sermon imports."
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${value}`);
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="manual">Manual Upload</TabsTrigger>
          <TabsTrigger value="youtube">YouTube Import</TabsTrigger>
          <TabsTrigger value="google-drive">Google Drive Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <form
              onSubmit={manualForm.handleSubmit((values) => manualMutation.mutate(values))}
              className="grid grid-cols-2 gap-4"
            >
              <div className="col-span-2">
                <UploadDropzone
                  value={manualFile}
                  onChange={setManualFile}
                  accept="audio/*"
                  helper="Accepted formats: mp3, m4a, wav."
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Title</label>
                <Input {...manualForm.register('title')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Preacher</label>
                <Select onValueChange={(value) => manualForm.setValue('preacherId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {preachersQuery.data?.items.map((preacher) => (
                      <SelectItem key={preacher.id} value={preacher.id}>
                        {preacher.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Program</label>
                <Select onValueChange={(value) => manualForm.setValue('programId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {programsQuery.data?.items.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Session</label>
                <Select onValueChange={(value) => manualForm.setValue('sessionId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsQuery.data?.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Church</label>
                <Input {...manualForm.register('churchName')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Date Preached</label>
                <Input type="date" {...manualForm.register('datePreached')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Language</label>
                <Input {...manualForm.register('language')} placeholder="en" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Speaker Role</label>
                <Input {...manualForm.register('speakerRole')} placeholder="OTHER" />
              </div>
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Notes</label>
                <Textarea rows={3} {...manualForm.register('notes')} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <Button type="submit" disabled={manualMutation.isPending}>
                  {manualMutation.isPending ? 'Uploading...' : 'Create Upload Job'}
                </Button>
                <div className="text-right text-sm text-ink-300">
                  {manualMessage ? <p>{manualMessage}</p> : null}
                  {renderJobLink(manualJobId)}
                </div>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="youtube">
          <Card>
            <form
              onSubmit={youtubeForm.handleSubmit((values) => youtubeMutation.mutate(values))}
              className="grid grid-cols-2 gap-4"
            >
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">YouTube URL</label>
                <Input {...youtubeForm.register('youtubeUrl')} placeholder="https://youtube.com/..." />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Title</label>
                <Input {...youtubeForm.register('title')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Preacher</label>
                <Select onValueChange={(value) => youtubeForm.setValue('preacherId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {preachersQuery.data?.items.map((preacher) => (
                      <SelectItem key={preacher.id} value={preacher.id}>
                        {preacher.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Program</label>
                <Select onValueChange={(value) => youtubeForm.setValue('programId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {programsQuery.data?.items.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Session</label>
                <Select onValueChange={(value) => youtubeForm.setValue('sessionId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsQuery.data?.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Church</label>
                <Input {...youtubeForm.register('churchName')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Date Preached</label>
                <Input type="date" {...youtubeForm.register('datePreached')} />
              </div>
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Notes</label>
                <Textarea rows={3} {...youtubeForm.register('notes')} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <Button type="submit" disabled={youtubeMutation.isPending}>
                  {youtubeMutation.isPending ? 'Queuing...' : 'Queue YouTube Import'}
                </Button>
                <div className="text-right text-sm text-ink-300">
                  {youtubeMessage ? <p>{youtubeMessage}</p> : null}
                  {renderJobLink(youtubeJobId)}
                </div>
              </div>
            </form>
          </Card>

          <Card className="mt-6">
            <h3 className="text-sm font-semibold text-ink-100">Import Social Sermon</h3>
            <form
              onSubmit={socialForm.handleSubmit((values) => socialMutation.mutate(values))}
              className="mt-4 grid grid-cols-2 gap-4"
            >
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Social URL</label>
                <Input {...socialForm.register('sourceUrl')} placeholder="https://x.com/..." />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Preacher</label>
                <Select onValueChange={(value) => socialForm.setValue('preacher', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {preachersQuery.data?.items.map((preacher) => (
                      <SelectItem key={preacher.id} value={preacher.id}>
                        {preacher.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Notes</label>
                <Input {...socialForm.register('notes')} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <Button type="submit" disabled={socialMutation.isPending}>
                  {socialMutation.isPending ? 'Queuing...' : 'Queue Social Import'}
                </Button>
                <div className="text-right text-sm text-ink-300">
                  {socialMessage ? <p>{socialMessage}</p> : null}
                  {renderJobLink(socialJobId)}
                </div>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="google-drive">
          <Card>
            <form
              onSubmit={googleDriveForm.handleSubmit((values) => googleDriveMutation.mutate(values))}
              className="grid grid-cols-2 gap-4"
            >
              <div className="col-span-2">
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Google Drive Folder URL</label>
                <Input {...googleDriveForm.register('folderUrl')} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Import Label</label>
                <Input {...googleDriveForm.register('importLabel')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Default Preacher</label>
                <Select onValueChange={(value) => googleDriveForm.setValue('defaultPreacherId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {preachersQuery.data?.items.map((preacher) => (
                      <SelectItem key={preacher.id} value={preacher.id}>
                        {preacher.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Default Program</label>
                <Select onValueChange={(value) => googleDriveForm.setValue('defaultProgramId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {programsQuery.data?.items.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Default Session</label>
                <Select onValueChange={(value) => googleDriveForm.setValue('defaultSessionId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsQuery.data?.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Default Church</label>
                <Input {...googleDriveForm.register('defaultChurchName')} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-ink-400">Default Date Preached</label>
                <Input type="date" {...googleDriveForm.register('defaultDatePreached')} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <Button type="submit" disabled={googleDriveMutation.isPending}>
                  {googleDriveMutation.isPending ? 'Queuing...' : 'Queue Google Drive Import'}
                </Button>
                <div className="text-right text-sm text-ink-300">
                  {driveMessage ? <p>{driveMessage}</p> : null}
                  {renderJobLink(driveJobId)}
                </div>
              </div>
            </form>
            <div className="mt-6 rounded-lg border border-surface-600 bg-surface-700/60 p-4 text-sm text-ink-300">
              Preview table will appear here when backend file discovery is enabled.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
