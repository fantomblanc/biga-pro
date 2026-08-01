# Cloud data layer contract (do not break)

`src/lib/auth.tsx`

```ts
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
export function useAuth(): {
  user: { id: string; email: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

`src/lib/cloud.ts` — all async, all scoped to the signed-in user through RLS.
`SavedRecipe` keeps its existing shape from `src/lib/storage.ts` plus
`isShared?: boolean` and `shareToken?: string`; `photos` holds storage paths
(`<userId>/<recipeId>/<file>`) OR legacy base64 data URLs.

```ts
export async function listRecipes(): Promise<SavedRecipe[]>
export async function getRecipe(id: string): Promise<SavedRecipe | null>
export async function saveRecipe(r: SavedRecipe): Promise<SavedRecipe>   // insert or update by id
export async function removeRecipe(id: string): Promise<void>
export async function shareRecipe(id: string): Promise<string>           // returns absolute share URL
export async function unshareRecipe(id: string): Promise<void>
export async function getSharedRecipe(token: string): Promise<SavedRecipe | null>
export async function uploadPhoto(recipeId: string, file: File): Promise<string> // returns storage path
export async function photoUrl(pathOrDataUrl: string): Promise<string>   // signed URL, passthrough for data: URLs
export async function deletePhoto(path: string): Promise<void>
export async function listBakeLogs(): Promise<BakeLog[]>
export async function saveBakeLog(l: BakeLog): Promise<BakeLog>
export async function removeBakeLog(id: string): Promise<void>
export async function getCloudSettings(): Promise<AppSettings>
export async function saveCloudSettings(s: AppSettings): Promise<void>

export interface BakeLog {
  id?: string;
  recipeId?: string | null;
  recipeName: string;
  recipeSnapshot?: unknown;   // SavedRecipe snapshot for "duplicate / load"
  ratingCrumb?: number | null;
  ratingChew?: number | null;
  ratingCornicione?: number | null;
  comment: string;
  photos: string[];
  bakedAt?: string;
}
```

Active-session id stays local (`loadActiveId` / `setActiveId` / `clearActiveId`
in `src/lib/storage.ts`).
