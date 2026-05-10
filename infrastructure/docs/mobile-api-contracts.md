# Wordcast Mobile API Contracts

Base path: `/api/v1`

This document defines the mobile-facing REST contract for the Flutter app and the response conventions implemented in the API layer.

## Response Envelope

Successful responses:

```ts
type ApiSuccess<T> = {
  success: true;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNextPage?: boolean;
  };
};
```

Error responses:

```ts
type ApiError = {
  success: false;
  message: string;
  errorCode: string;
  details?: Record<string, unknown>;
};
```

## Auth Flow

- `POST /auth/register`: create listener account.
- `POST /auth/login`: returns user summary, tokens, subscription summary, and entitlement summary.
- `POST /auth/refresh`: rotates access token using refresh token.
- `POST /auth/logout`: invalidates current auth session.
- `GET /auth/me`: returns authenticated user summary plus subscription and entitlement state.

Bearer token usage:

- Mobile should send `Authorization: Bearer <access-token>` on protected endpoints.
- Refresh token should be stored securely and only sent to refresh/logout flows.
- UI gating should rely on entitlement flags returned by the API, not on plan code alone.

## Pagination

List endpoints accept:

- `page`
- `limit`

List responses return:

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "hasNextPage": true
  }
}
```

## Error Handling Guidance

- Use `errorCode` for stable client branching.
- Use `message` for user-safe display.
- Treat `details` as diagnostic-only.
- Do not assume validation messages are always singular.

Common error codes:

- `HTTP_400`
- `HTTP_401`
- `HTTP_403`
- `HTTP_404`
- `INTERNAL_SERVER_ERROR`

## Premium Entitlement Guidance

The mobile app should use entitlement flags returned in auth, sermon, and subscription responses:

- `transcriptAccess`
- `downloadAccess`
- `adFree`
- `enhancedLinking`

Rules:

- transcript UI should stay locked if `transcriptAccess` is false
- download actions should stay hidden or disabled if `downloadAccess` is false
- sermon detail should use returned entitlement flags instead of duplicating plan logic

## Endpoint Summary

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Request DTOs:

- register: `email`, `password`, `displayName`
- login: `email`, `password`
- refresh: `refreshToken` when not cookie-backed

Response DTOs:

- `user`
- `tokens`
- `subscription`
- `entitlements`

Example login request:

```json
{
  "email": "listener@wordcast.app",
  "password": "StrongPassword123"
}
```

Example login response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "listener@wordcast.app",
      "displayName": "Wordcast Listener",
      "roles": ["listener"],
      "permissions": []
    },
    "tokens": {
      "accessToken": "jwt-access",
      "refreshToken": "jwt-refresh",
      "accessTokenExpiresIn": "15m",
      "refreshTokenExpiresAt": "2026-03-28T10:00:00.000Z"
    },
    "subscription": null,
    "entitlements": {
      "transcriptAccess": false,
      "downloadAccess": false,
      "adFree": false,
      "enhancedLinking": false
    }
  }
}
```

### Home

- `GET /home`

Returns one aggregated payload for mobile startup:

- `featuredProgram`
- `continueListening`
- `trendingSermons`
- `featuredTopics`
- `featuredPrograms`
- `featuredPreachers`
- `soundBitesPreview`
- `newlyAddedSermons`

### Sermons

- `GET /sermons`
- `GET /sermons/:id`
- `GET /sermons/:id/related`
- `POST /sermons/:id/play`
- `POST /sermons/:id/share`
- `GET /sermons/:id/transcript`
- `GET /sermons/:id/download`

List filters:

- `topic`
- `preacherId`
- `programId`
- `sessionId`
- `search`
- `sort`
- `page`
- `limit`

Detail contract includes:

- title and metadata
- preacher, program, and session summaries
- topics
- playback URL
- transcript preview
- sound bites
- entitlement flags

Example sermon detail response:

```json
{
  "success": true,
  "data": {
    "id": "ser_123",
    "title": "Faith For The Narrow Season",
    "description": "A sermon on conviction under pressure.",
    "churchName": "Word Assembly",
    "datePreached": "2026-03-01T00:00:00.000Z",
    "durationSeconds": 3180,
    "publishedAt": "2026-03-04T09:45:00.000Z",
    "preacher": {
      "id": "pre_1",
      "displayName": "Pastor John Doe",
      "slug": "pastor-john-doe",
      "profileImageUrl": null
    },
    "program": {
      "id": "pro_1",
      "name": "Word Conference",
      "slug": "word-conference",
      "year": 2026,
      "coverImage": null
    },
    "session": {
      "id": "ses_1",
      "name": "Morning Charge",
      "slug": "morning-charge"
    },
    "topics": [
      {
        "id": "top_1",
        "name": "Faith",
        "slug": "faith"
      }
    ],
    "playbackUrl": "https://cdn.wordcast.app/audio/ser_123/main.mp3",
    "transcriptPreview": "Faith does not deny facts...",
    "soundBites": [],
    "entitlements": {
      "transcriptAccess": true,
      "downloadAccess": true,
      "adFree": true,
      "enhancedLinking": true
    }
  }
}
```

### Preachers

- `GET /preachers`
- `GET /preachers/:id`
- `POST /preachers/:id/follow`
- `DELETE /preachers/:id/follow`

Detail contract includes:

- profile
- top sermons
- latest sermons
- related programs
- top topics

### Programs

- `GET /programs`
- `GET /programs/:id`

Detail contract includes:

- summary metadata
- ordered sessions
- sermon groups by session
- featured preachers
- `playAll` summary

### Topics

- `GET /topics`
- `GET /topics/:slug`

Detail contract includes:

- summary
- top sermons
- featured preachers
- related programs
- sound bites

### Sound Bites

- `GET /sound-bites`
- `GET /sound-bites/:id`
- `POST /sound-bites/:id/play`
- `POST /sound-bites/:id/share`

Uses feed-style pagination.

Each item includes:

- identity
- quote text
- start and end seconds
- preacher summary
- sermon summary
- playback URL

### Library

- `GET /library`
- `POST /library/save-sermon`
- `DELETE /library/save-sermon/:sermonId`
- `GET /library/history`
- `POST /library/history`
- `GET /library/downloads`

Overview bundles:

- saved sermons
- playlists
- listening history
- downloads

### Playlists

- `GET /playlists`
- `POST /playlists`
- `GET /playlists/:id`
- `PATCH /playlists/:id`
- `DELETE /playlists/:id`
- `POST /playlists/:id/sermons`
- `DELETE /playlists/:id/sermons/:sermonId`

Playlist detail includes:

- playlist summary
- owner summary
- private/public flag
- sermon items with positions

### Search

- `GET /search`
- `GET /search/suggestions`

Query params:

- `q`
- `page`
- `limit`
- `types`

Returns grouped results:

- `sermons`
- `preachers`
- `programs`
- `topics`

### Subscriptions

- `GET /subscriptions/plans`
- `POST /subscriptions/initialize`
- `POST /subscriptions/verify`
- `GET /subscriptions/me`
- `POST /subscriptions/cancel`

Contracts return:

- available plans
- checkout initialization payload
- current subscription state
- entitlement summary

## Flutter Integration Notes

- Generate models against the stable envelope rather than individual raw payloads.
- Model `meta` as optional because detail endpoints omit it.
- Keep enum parsing defensive and default unknown values safely.
- Treat dates as ISO 8601 strings and parse in the app layer.
- Cache `GET /home` aggressively for startup, then refresh sections opportunistically.
- Cache `GET /subscriptions/me` and `GET /auth/me` together to keep entitlement gates consistent.
