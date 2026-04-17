export interface RequestData {
  url: string;
  method: string;
  headers: { key: string; value: string }[];
  body: string | null;
  formData?: { key: string; value: string }[];
}

export interface ApiResponse {
  id?: string;
  status: number;
  statusText: string;
  body: unknown;
  timeTaken: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timeTaken: number;
  createdAt: string;
  headers: string;
  body: string | null;
}

export async function executeRequest(requestData: RequestData): Promise<ApiResponse> {
  const headersObj: Record<string, string> = {};
  requestData.headers.forEach(({ key, value }) => {
    if (key.trim()) headersObj[key.trim()] = value;
  });

  const res = await fetch('/api/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: requestData.method,
      url: requestData.url,
      headers: headersObj,
      body: requestData.body,
      formData: requestData.formData,
    }),
  });
  return res.json();
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch('/api/history');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function clearHistory(): Promise<void> {
  await fetch('/api/history', { method: 'DELETE' });
}

export async function fetchHistoryEntry(id: string): Promise<{ response: string } | null> {
  const res = await fetch(`/api/history/${id}`);
  const data = await res.json();
  return data.error ? null : data;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string | null;
  collectionId: string;
  folderId: string | null;
  examples: SavedExample[];
}

export interface Folder {
  id: string;
  name: string;
  collectionId: string;
  requests: SavedRequest[];
}

export interface Collection {
  id: string;
  name: string;
  folders: Folder[];
  requests: SavedRequest[]; // root-level (no folder)
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch('/api/collections');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createCollection(name: string): Promise<Collection> {
  const res = await fetch('/api/collections', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  });
  const data = await res.json();
  return { folders: [], requests: [], ...data };
}

export async function deleteCollection(id: string) {
  await fetch(`/api/collections/${id}`, { method: 'DELETE' });
}

export async function createFolder(collectionId: string, name: string): Promise<Folder> {
  const res = await fetch(`/api/collections/${collectionId}/folders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  });
  const data = await res.json();
  return { requests: [], ...data };
}

export async function deleteFolder(collectionId: string, folderId: string) {
  await fetch(`/api/collections/${collectionId}/folders/${folderId}`, { method: 'DELETE' });
}

export async function saveRequest(data: {
  name: string; method: string; url: string;
  headers: Record<string, string>; body: string | null;
  collectionId: string; folderId?: string;
}): Promise<SavedRequest> {
  const res = await fetch('/api/saved-requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSavedRequest(id: string) {
  await fetch(`/api/saved-requests/${id}`, { method: 'DELETE' });
}

export interface SavedExample {
  id: string;
  savedRequestId: string;
  name: string;
  status: number;
  statusText: string;
  response: string;
  timeTaken: number;
  createdAt: string;
}

export async function fetchExamples(savedRequestId: string): Promise<SavedExample[]> {
  const res = await fetch(`/api/saved-requests/${savedRequestId}/examples`);
  return res.json();
}

export async function saveExample(savedRequestId: string, data: {
  name: string; status: number; statusText: string; response: string; timeTaken: number;
}): Promise<SavedExample> {
  const res = await fetch(`/api/saved-requests/${savedRequestId}/examples`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as SavedExample);
}

export async function deleteExample(savedRequestId: string, exampleId: string) {
  await fetch(`/api/saved-requests/${savedRequestId}/examples/${exampleId}`, { method: 'DELETE' });
}

export async function renameExample(savedRequestId: string, exampleId: string, name: string) {
  await fetch(`/api/saved-requests/${savedRequestId}/examples/${exampleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}

export async function getShareToken(id: string): Promise<string> {
  const res = await fetch(`/api/saved-requests/${id}/share`)
  const data = await res.json()
  return data.token
}

export async function revokeShare(id: string) {
  await fetch(`/api/saved-requests/${id}/share`, { method: 'DELETE' })
}

export async function renameSavedRequest(id: string, name: string) {
  await fetch(`/api/saved-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}

export async function updateRequestData(id: string, data: { method: string; url: string; headers: Record<string, string>; body: string | null }) {
  await fetch(`/api/saved-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function moveRequest(id: string, collectionId: string, folderId: string | null) {
  await fetch(`/api/saved-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collectionId, folderId }) });
}

export async function duplicateRequest(req: SavedRequest): Promise<SavedRequest> {
  const headers: Record<string, string> = {};
  try { Object.assign(headers, JSON.parse(req.headers)); } catch {}
  return saveRequest({ name: `${req.name} (1)`, method: req.method, url: req.url, headers, body: req.body, collectionId: req.collectionId, folderId: req.folderId ?? undefined });
}

export async function renameCollection(id: string, name: string) {
  await fetch(`/api/collections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}

export async function renameFolder(collectionId: string, folderId: string, name: string) {
  await fetch(`/api/collections/${collectionId}/folders/${folderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
}
