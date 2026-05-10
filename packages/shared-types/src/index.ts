export type ISODateString = string;

export enum UserRoleCode {
  LISTENER = 'listener',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export enum SermonStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  REVIEW_PENDING = 'REVIEW_PENDING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export enum UploadSourceType {
  MANUAL = 'MANUAL',
  YOUTUBE = 'YOUTUBE',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  IMPORT_SOCIAL_SERMON = 'IMPORT_SOCIAL_SERMON',
}

export enum UploadJobStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DOWNLOADING = 'DOWNLOADING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  UPLOADING = 'UPLOADING',
  TRANSCRIBING = 'TRANSCRIBING',
  QUARANTINE = 'QUARANTINE',
  VALIDATING = 'VALIDATING',
  TRANSCODING = 'TRANSCODING',
  AI_PROCESSING = 'AI_PROCESSING',
  INDEXING = 'INDEXING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  hasNextPage?: boolean;
};

export type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
  meta?: ApiMeta;
};

export type ApiError = {
  success: false;
  message: string;
  errorCode: string;
  details?: Record<string, unknown>;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export type PaginatedItems<T> = {
  items: T[];
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresAt: ISODateString;
};

export type EntitlementsSummary = {
  transcriptAccess: boolean;
  downloadAccess: boolean;
  adFree?: boolean;
  enhancedLinking?: boolean;
};

export type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions?: string[];
};

export type SubscriptionSummary = {
  id: string;
  status: string;
  planCode: string;
  planName: string;
  interval: string;
  endsAt?: ISODateString | null;
};

export type PreacherSummary = {
  id: string;
  displayName: string;
  slug?: string;
  profileImageUrl?: string | null;
};

export type ProgramSummary = {
  id: string;
  name: string;
  slug?: string;
  year?: number | null;
  coverImage?: string | null;
};

export type SessionSummary = {
  id: string;
  name: string;
  slug?: string;
};

export type TopicSummary = {
  id: string;
  name: string;
  slug: string;
};

export type SermonSummary = {
  id: string;
  title: string;
  description?: string | null;
  churchName?: string | null;
  datePreached?: ISODateString | null;
  durationSeconds?: number | null;
  publishedAt?: ISODateString | null;
  preacher?: PreacherSummary | null;
  program?: ProgramSummary | null;
  session?: SessionSummary | null;
  topics?: TopicSummary[];
  playbackUrl?: string | null;
  entitlements?: EntitlementsSummary;
};

export type SoundBiteSummary = {
  id: string;
  title: string;
  quoteText?: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  preacher?: PreacherSummary | null;
  sermon?: SermonSummary | null;
  playbackUrl?: string | null;
  durationSeconds?: number | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type RefreshRequest = {
  refreshToken?: string;
};

export type AuthResponseData = {
  user: UserSummary & { permissions: string[] };
  tokens: AuthTokens;
  subscription?: SubscriptionSummary | null;
  entitlements: EntitlementsSummary;
};

export type ProfileResponseData = {
  user: UserSummary & { permissions: string[] };
  subscription?: SubscriptionSummary | null;
  entitlements: EntitlementsSummary;
};

export type HomeFeed = {
  featuredProgram?: ProgramSummary | null;
  continueListening: LibraryHistoryItem[];
  trendingSermons: SermonSummary[];
  featuredTopics: TopicSummary[];
  featuredPrograms: ProgramSummary[];
  featuredPreachers: PreacherSummary[];
  soundBitesPreview: SoundBiteSummary[];
  newlyAddedSermons: SermonSummary[];
};

export type SermonListQuery = {
  topic?: string;
  preacherId?: string;
  programId?: string;
  sessionId?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type SermonDetail = SermonSummary & {
  transcriptPreview?: string | null;
  soundBites?: SoundBiteSummary[];
};

export type SermonTranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type SermonTranscript = {
  sermonId: string;
  language: string;
  durationSeconds?: number | null;
  fullText: string;
  segments: SermonTranscriptSegment[];
  createdAt?: ISODateString;
};

export type PreacherListItem = {
  id: string;
  displayName: string;
  slug: string;
  profileImageUrl?: string | null;
  country?: string | null;
  followerCount?: number;
  ministryName?: string | null;
};

export type PreacherSermonSummary = {
  id: string;
  title: string;
  publishedAt?: ISODateString | null;
  playCount?: number;
};

export type PreacherDetail = {
  id: string;
  displayName: string;
  biography?: string | null;
  profileImageUrl?: string | null;
  country?: string | null;
  followerCount?: number;
  ministryName?: string | null;
  topSermons: PreacherSermonSummary[];
  latestSermons: PreacherSermonSummary[];
  relatedPrograms: ProgramSummary[];
  topTopics: TopicSummary[];
};

export type ProgramListItem = {
  id: string;
  name: string;
  slug?: string;
  year?: number | null;
  theme?: string | null;
  organizer?: string | null;
  programType: string;
  location?: string | null;
  startDate?: ISODateString | null;
  endDate?: ISODateString | null;
  description?: string | null;
  coverImage?: string | null;
};

export type ProgramSession = {
  id: string;
  name: string;
  dayNumber?: number | null;
  sessionLabel: string;
  sessionOrder: number;
  sessionDate?: ISODateString | null;
  startTime?: ISODateString | null;
  endTime?: ISODateString | null;
};

export type ProgramSermonGroup = {
  sessionId?: string | null;
  sessionName?: string | null;
  sermons: Array<{
    id: string;
    title: string;
    preacherName: string | null;
  }>;
};

export type ProgramDetail = ProgramListItem & {
  sessions: ProgramSession[];
  sermonGroups: ProgramSermonGroup[];
  featuredPreachers: PreacherSummary[];
  playAll: {
    sermonCount: number;
  };
};

export type TopicListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isSystem?: boolean;
  isActive?: boolean;
  aliases?: string[];
  sermonCount?: number;
};

export type TopicDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  aliases?: string[];
  topSermons: Array<{
    id: string;
    title: string;
    publishedAt?: ISODateString | null;
  }>;
  featuredPreachers: PreacherSummary[];
  relatedPrograms: ProgramSummary[];
  soundBites: SoundBiteSummary[];
};

export type LibraryHistoryItem = SermonSummary & {
  historyId: string;
  progressSeconds: number;
  completed: boolean;
  listenedAt: ISODateString;
};

export type LibraryDownloadItem = SermonSummary & {
  downloadUrl?: string | null;
};

export type LibraryOverview = {
  savedSermons: SermonSummary[];
  playlists: PlaylistSummary[];
  listeningHistory: LibraryHistoryItem[];
  downloads: LibraryDownloadItem[];
};

export type SaveSermonRequest = {
  sermonId: string;
};

export type SaveHistoryRequest = {
  sermonId: string;
  progressSeconds: number;
  completed: boolean;
};

export type PlaylistOwner = {
  id: string;
  displayName: string;
};

export type PlaylistSermonItem = {
  id: string;
  title: string;
  status?: string;
  preacher?: PreacherSummary | null;
  playbackUrl?: string | null;
  addedAt?: ISODateString;
  position?: number;
};

export type PlaylistSummary = {
  id: string;
  name: string;
  description?: string | null;
  sermonCount: number;
  owner: PlaylistOwner;
  isPrivate: boolean;
  updatedAt?: ISODateString;
};

export type PlaylistDetail = PlaylistSummary & {
  sermons: PlaylistSermonItem[];
};

export type CreatePlaylistRequest = {
  name: string;
  description?: string;
  isPrivate?: boolean;
};

export type UpdatePlaylistRequest = {
  name?: string;
  description?: string | null;
  isPrivate?: boolean;
};

export type AddPlaylistSermonRequest = {
  sermonId: string;
};

export type SearchQuery = {
  q: string;
  page?: number;
  limit?: number;
  types?: Array<'sermons' | 'preachers' | 'programs' | 'topics'>;
};

export type SearchResults = {
  sermons: SermonSummary[];
  preachers: PreacherSummary[];
  programs: ProgramSummary[];
  topics: TopicSummary[];
};

export type SubscriptionPlan = {
  code: string;
  name: string;
  description?: string | null;
  amountKobo: number;
  currency: string;
  interval: string;
  transcriptAccess: boolean;
  downloadAccess: boolean;
  adFree: boolean;
  enhancedLinking: boolean;
};

export type SubscriptionInitializeRequest = {
  planCode: string;
};

export type SubscriptionInitializeResponseData = {
  reference: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
};

export type SubscriptionVerifyRequest = {
  reference: string;
};

export type SubscriptionVerifyResponseData = {
  subscriptionId: string;
  status: string;
  planCode: string;
  planName: string;
};

export type SubscriptionState = {
  subscription: SubscriptionSummary | null;
  entitlements: EntitlementsSummary;
};

export type ActionOkResponse = {
  ok: boolean;
  status?: string;
};
