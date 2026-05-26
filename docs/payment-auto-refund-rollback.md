# Payment Auto Refund And Rollback

## 1. Data Flow

```mermaid
sequenceDiagram
  autonumber
  participant U as User Browser
  participant FE as Next.js Frontend
  participant API as Worker /api/billing
  participant PG as PG Confirm/Cancel API
  participant DB as MongoDB
  participant CRON as Worker Scheduled Task

  FE->>API: POST /checkout (create pending payment)
  API->>DB: insert payments(status=pending)
  FE->>PG: open payment window
  PG-->>FE: payment success token(impUid)
  FE->>API: POST /confirm
  API->>PG: verify/confirm payment
  API->>DB: update payments(status=success)

  FE->>API: POST /coin-gate (deduct coins)
  API->>DB: point_history(kind=deduct)

  FE->>API: POST /executions/start
  API->>DB: service_execution(status=pending, timeoutAt)

  alt report generation success
    FE->>API: POST /executions/complete
    API->>DB: service_execution(status=success)
  else client disconnect/error
    FE->>API: POST /executions/fail (or sendBeacon)
    API->>DB: find pending execution
    API->>DB: refund points + create point_history(kind=refund)
    API->>PG: cancel payment (optional when cancelEligible=true)
    API->>DB: service_execution(status=refunded)
  end

  CRON->>API: scheduled sweep
  API->>DB: find pending timeout executions
  API->>DB: auto refund / rollback retry with lock
```

## 2. Mongoose Schema (Summary)

- collection: `serviceexecutiontransactions`
- key fields:
  - `status`: `pending | success | failed | refunded | cancelled`
  - `executionKey`: per-user idempotency key
  - `timeoutAt`: pending timeout detection
  - `nextRetryAt`, `retryCount`, `maxRetries`: async retry control
  - `lock.token`, `lock.until`: cleanup worker lock
  - `sourceTransactionId`: coin deduction history id for rollback
  - `paymentRef`: optional PG cancel reference
  - `retentionUntil`: TTL cleanup

## 3. Backend APIs

- `POST /api/billing/executions/start`
  - create pending service execution row (idempotent by userId + executionKey)
- `POST /api/billing/executions/heartbeat`
  - extend `timeoutAt` while long running work is in progress
- `POST /api/billing/executions/complete`
  - mark success and release lock state
- `POST /api/billing/executions/fail`
  - attempt immediate compensation (refund/cancel) and mark refunded/failed

## 4. Automatic Cleanup Worker

- scheduled task: `runServiceExecutionTimeoutTask`
- behavior:
  - lock one pending timeout row at a time (`findOneAndUpdate` lock)
  - run compensation
  - on transient failure, backoff retry by `nextRetryAt`
  - stop retries at `maxRetries` and mark `failed`

## 5. Frontend Guard

- hook: `useServiceExecutionGuard`
- behaviors:
  - heartbeat every N seconds
  - `beforeunload` sendBeacon fail report
  - optional `visibilitychange` fail signal
  - explicit `markCompleted()` to suppress disconnect fail
