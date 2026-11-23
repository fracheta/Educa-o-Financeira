# Security Specification — Controle Financeiro

## Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`origins`, `categories`, `transactions`) belongs strictly to `userId` (`request.auth.uid == userId`).
2. Every user write requires an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`).
3. Every document ID (`userId`, `originId`, `categoryId`, `transactionId`) must pass `isValidId()` (`^[a-zA-Z0-9_-]+$`, max 128 chars).
4. Timestamps (`createdAt`, `updatedAt`) must match `request.time` on creation, and `createdAt` and `userId`/`uid` are immutable on update.
5. Numeric amounts (`amount`) must be strictly positive numbers (`> 0` and `<= 1000000000`).
6. All string fields enforce explicit `.size()` bounds matching `firebase-blueprint.json`.

## Dirty Dozen Adversarial Payloads
1. Unauthenticated read/write on `/users/u1/transactions/t1` -> PERMISSION_DENIED
2. Cross-user read/list/write by `u2` on `/users/u1/transactions` -> PERMISSION_DENIED
3. Unverified email user (`email_verified: false`) creating transaction -> PERMISSION_DENIED
4. Identity spoofing: `u1` creates transaction with `userId: "u2"` -> PERMISSION_DENIED
5. Shadow field injection: `u1` creates transaction with extra `isAdmin: true` -> PERMISSION_DENIED
6. Negative or zero amount: `amount: -50` or `amount: 0` -> PERMISSION_DENIED
7. Invalid type enum: `type: "transfer"` -> PERMISSION_DENIED
8. Invalid status enum: `status: "Cancelada"` -> PERMISSION_DENIED
9. Invalid date format: `date: "23/11/2026"` instead of `YYYY-MM-DD` -> PERMISSION_DENIED
10. Resource poisoning: `description` > 120 chars or `originId` with invalid chars/length -> PERMISSION_DENIED
11. Timestamp tampering: `createdAt` set to past date instead of `request.time` -> PERMISSION_DENIED
12. Immutable field mutation: updating `userId` or `createdAt` on an existing transaction -> PERMISSION_DENIED
