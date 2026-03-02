
## Static Gateway Routing (No Dynamic Loading)
- Only three callable gateways are exported: `public`, `client`, `admin`.
- Actions are declared in `src/gateways/actionsSpec.ts`.
- Handlers are bound with static imports in `src/gateways/actionRegistry.ts`.
- No filesystem scanning or dynamic imports are used for routing.

## Media Upload + Thumbnail Flow
1. Client/admin requests `mediaCreateUploadSpec` (or admin variant) to create a `media_assets` row and receive signed upload instructions.
2. Client uploads original file to Firebase Storage path under `/original/`.
3. Client/admin calls `mediaFinalizeUpload` (or admin variant) to mark file uploaded.
4. `storageThumbnails` trigger listens to Storage finalization:
   - image => generate 320px thumbnail, store under `/thumb/`, update `media_assets.thumbnailPath` + status.
   - document => keep without thumbnail and set proper status through finalize flow.

## RBAC
- Admin actions require active admin user + store access + role checks.
- RBAC tables: `admin_users`, `admin_roles`, `admin_store_access`.

## Add a New Action (Static Only)
1. Add action metadata to `src/gateways/actionsSpec.ts`.
2. Add payload validator contract in `src/gateways/contracts/*`.
3. Implement handler in a module under `src/modules/**`.
4. Add static import and map entry in `src/gateways/actionRegistry.ts`.
5. Optionally expose it in list/coverage responses.
