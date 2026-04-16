"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import RequestBuilder from "./components/RequestBuilder";
import ResponseViewer from "./components/ResponseViewer";
import DiffViewer from "./components/DiffViewer";
import ThemeToggle from "./components/ThemeToggle";
import { Logo } from "./components/BrandLogo";
import CollectionsSidebar from "./components/CollectionsSidebar";
import SaveRequestModal from "./components/SaveRequestModal";
import SaveExampleModal from "./components/SaveExampleModal";
import AppSkeleton from "./components/AppSkeleton";
import SettingsPanel from "./components/SettingsPanel";
import { executeRequest, fetchHistory, fetchHistoryEntry, fetchCollections, updateRequestData } from "@/lib/api";
import type { ApiResponse, HistoryEntry, RequestData, Collection, SavedRequest } from "@/lib/api";

interface RequestTab {
  id: string;
  label: string;
  savedName?: string;
  savedRequestId?: string;
  prefill: RequestData | null;
  response: ApiResponse | null;
  currentRequest: RequestData | null;
  isLoading: boolean;
  diffData: { a: { entry: HistoryEntry; response: string }; b: { entry: HistoryEntry; response: string } } | null;
  diffLoading: boolean;
}

let tabCounter = 1;
function newTab(prefill?: RequestData): RequestTab {
  return {
    id: `tab-${Date.now()}-${tabCounter++}`,
    label: prefill ? `${prefill.method} ${prefill.url}`.slice(0, 30) : "New Request",
    prefill: prefill ?? null,
    response: null,
    currentRequest: null,
    isLoading: false,
    diffData: null,
    diffLoading: false,
  };
}

export default function Home() {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [tabs, setTabs] = useState<RequestTab[]>([newTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dp_tabs");
      const savedActive = localStorage.getItem("dp_active_tab");
      if (saved) {
        const parsed: RequestTab[] = JSON.parse(saved);
        if (parsed.length > 0) {
          const restored = parsed.map(t => ({ ...t, isLoading: false, diffLoading: false }));
          setTabs(restored);
          const validActive = restored.find(t => t.id === savedActive);
          setActiveTabId(validActive ? savedActive! : restored[0].id);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const importToken = searchParams.get("import");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [saveTarget, setSaveTarget] = useState<{ request: RequestData; defaultName?: string; defaultCollectionId?: string; defaultFolderId?: string } | null>(null);
  const [saveExampleTarget, setSaveExampleTarget] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const updateTab = (id: string, patch: Partial<RequestTab>) =>
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const openInNewTab = (prefill: RequestData, savedName?: string, savedRequestId?: string) => {
    const existing = tabs.find(t =>
      savedRequestId ? t.savedRequestId === savedRequestId
        : t.prefill?.url === prefill.url && t.prefill?.method === prefill.method && !t.savedRequestId
    );
    if (existing) { setActiveTabId(existing.id); return; }
    const tab = { ...newTab(prefill), ...(savedName ? { label: savedName, savedName } : {}), ...(savedRequestId ? { savedRequestId } : {}) };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => {
      if (prev.length === 1) return [newTab()];
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabId) setActiveTabId(next[Math.max(0, prev.findIndex(t => t.id === id) - 1)].id);
      return next;
    });
  };

  const addTab = () => {
    const tab = newTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const loadHistory = useCallback(async () => {
    try { setHistory(await fetchHistory()); }
    catch {} finally { setHistoryLoading(false); }
  }, []);

  const loadCollections = useCallback(async () => {
    try { setCollections(await fetchCollections()); } catch {}
  }, []);

  useEffect(() => { loadHistory(); loadCollections(); }, [loadHistory, loadCollections]);

  useEffect(() => {
    if (!importToken) return;
    fetch(`/api/share/${importToken}`).then(r => r.json()).then(data => {
      if (data.method && data.url) {
        const headers = Object.entries(data.headers ?? {}).map(([key, value]) => ({ key, value: value as string }));
        openInNewTab({ url: data.url, method: data.method, headers, body: data.body ?? null }, data.name);
        window.history.replaceState({}, "", "/");
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importToken]);

  useEffect(() => {
    localStorage.setItem("dp_tabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) localStorage.setItem("dp_active_tab", activeTabId);
  }, [activeTabId]);

  const handleRequestSubmit = async (tabId: string, requestData: RequestData) => {
    updateTab(tabId, { isLoading: true, response: null, currentRequest: requestData, label: tabs.find(t => t.id === tabId)?.savedName ?? `${requestData.method} ${requestData.url}`.slice(0, 30) });
    try {
      const data = await executeRequest(requestData);
      updateTab(tabId, { response: data, isLoading: false });
      loadHistory();
    } catch {
      updateTab(tabId, { response: { status: 0, statusText: "Network Error", body: null, timeTaken: 0, error: "Failed to reach the API server" }, isLoading: false });
    }
  };

  const handleReplay = async (entry: HistoryEntry) => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(entry.headers); } catch {}
    const requestData: RequestData = {
      url: entry.url, method: entry.method,
      headers: Object.entries(parsedHeaders).map(([key, value]) => ({ key, value })),
      body: entry.body,
    };
    setReplayingId(entry.id);
    await handleRequestSubmit(activeTabId, requestData);
    setReplayingId(null);
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(entry.headers); } catch {}
    const prefill: RequestData = {
      url: entry.url, method: entry.method,
      headers: Object.entries(parsedHeaders).map(([key, value]) => ({ key, value })),
      body: entry.body,
    };
    openInNewTab(prefill);
  };

  const handleDiff = async (a: HistoryEntry, b: HistoryEntry) => {
    const id = activeTabId;
    updateTab(id, { diffLoading: true });
    try {
      const [resA, resB] = await Promise.all([fetchHistoryEntry(a.id), fetchHistoryEntry(b.id)]);
      if (!resA || !resB) return;
      updateTab(id, { diffData: { a: { entry: a, response: resA.response }, b: { entry: b, response: resB.response } }, diffLoading: false });
    } catch { updateTab(id, { diffLoading: false }); }
  };

  const handleLoadSaved = (req: SavedRequest) => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(req.headers); } catch {}
    const prefill: RequestData = {
      url: req.url, method: req.method,
      headers: Object.entries(parsedHeaders).map(([key, value]) => ({ key, value })),
      body: req.body,
    };
    openInNewTab(prefill, req.name, req.id);
  };

  const handleLoadExample = (ex: import("@/lib/api").SavedExample) => {
    let body: unknown;
    try { body = JSON.parse(ex.response); } catch { body = ex.response; }
    updateTab(activeTabId, {
      response: { status: ex.status, statusText: ex.statusText, body, timeTaken: ex.timeTaken },
    });
  };

  const handleSaveFromHistory = (entry: HistoryEntry) => {
    let parsedHeaders: Record<string, string> = {};
    try { parsedHeaders = JSON.parse(entry.headers); } catch {}
    setSaveTarget({
      request: { url: entry.url, method: entry.method, headers: Object.entries(parsedHeaders).map(([key, value]) => ({ key, value })), body: entry.body },
      defaultName: `${entry.method} ${entry.url}`.slice(0, 60),
    });
  };

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isResizing = useRef(false);
  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (e: MouseEvent) => { if (!isResizing.current) return; setSidebarWidth(Math.min(480, Math.max(180, startW + e.clientX - startX))); };
    const onUp = () => { isResizing.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const cardStyle = { background: "var(--bg-card)", border: "1px solid var(--border)" };

  if (!hydrated) return <AppSkeleton />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>

      {/* Sidebar */}
      <div className="shrink-0 flex flex-col overflow-hidden relative" style={{ width: sidebarWidth }}>
        <CollectionsSidebar
          collections={collections} history={history} historyLoading={historyLoading} replayingId={replayingId}
          onRefresh={loadCollections} onLoadRequest={handleLoadSaved} onLoadHistory={handleLoadHistory}
          onLoadExample={handleLoadExample}
          onNewRequest={(collectionId, folderId) => setSaveTarget({
            request: { url: "", method: "GET", headers: [], body: null },
            defaultName: "New Request",
            defaultCollectionId: collectionId,
            defaultFolderId: folderId ?? undefined,
          })}
          onReplay={handleReplay} onDiff={handleDiff} onSaveFromHistory={handleSaveFromHistory} onHistoryCleared={loadHistory}
        />
        <div onMouseDown={startResize} className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[var(--accent)] transition-colors" style={{ opacity: 0.4 }} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <Logo nav />
          <div className="flex items-center gap-3">
            {session?.user?.name && (
              <span className="text-xs font-medium px-2 py-1 rounded-lg"
                style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                👤 {session.user.name}
              </span>
            )}
            <ThemeToggle />
            <button onClick={() => setShowSettings(true)} title="Settings"
              className="text-sm px-2.5 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
              ⚙️
            </button>
            <button onClick={() => setShowSignOutConfirm(true)}
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        {hydrated && <div className="flex items-end shrink-0 px-2 pt-2 gap-1"
          style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)", overflowX: "auto", scrollbarWidth: "none" }}>
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer group transition-all duration-150"
                style={{
                  flex: "1 1 0",
                  minWidth: "80px",
                  maxWidth: "180px",
                  background: isActive ? "var(--bg-card)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                  borderBottom: isActive ? "1px solid var(--bg-card)" : "1px solid transparent",
                  marginBottom: isActive ? "-1px" : "0",
                  boxShadow: isActive ? "0 -2px 0 0 var(--accent)" : "none",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "var(--accent)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "var(--text-muted)"; }}>
                <span className="truncate flex-1 transition-colors" style={{ color: isActive ? "var(--accent)" : "inherit" }}>{tab.label}</span>
                <button onClick={(e) => closeTab(tab.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity leading-none rounded px-0.5 hover:bg-red-500/20 hover:text-red-400"
                  style={{ color: "var(--text-muted)" }}>✕</button>
              </div>
            );
          })}
          <button onClick={addTab}
            className="px-2.5 py-1.5 rounded-t-lg text-sm shrink-0 transition-all"
            style={{ color: "var(--text-muted)", border: "1px solid transparent" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--accent) 10%, transparent)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            title="New tab">+</button>
        </div>}

        {/* Tab content */}
        <div key={activeTab.id} className="flex-1 overflow-y-auto p-6 space-y-5">
          <RequestBuilder
            onSubmit={(data) => handleRequestSubmit(activeTab.id, data)}
            isLoading={activeTab.isLoading}
            prefill={activeTab.prefill}
            onSave={async (data) => {
              if (activeTab.savedRequestId) {
                const h: Record<string, string> = {};
                data.headers.forEach(({ key, value }) => { if (key.trim()) h[key] = value; });
                await updateRequestData(activeTab.savedRequestId, { method: data.method, url: data.url, headers: h, body: data.body });
                loadCollections();
              } else {
                setSaveTarget({ request: data });
              }
            }}
          />

          {activeTab.isLoading && (
            <div className="p-6 rounded-xl text-center text-sm animate-pulse" style={cardStyle}>
              <span style={{ color: "var(--text-muted)" }}>⏳ Sending request...</span>
            </div>
          )}

          {activeTab.response && !activeTab.isLoading && <ResponseViewer response={activeTab.response} onSaveResponse={() => setSaveExampleTarget(true)} />}

          {activeTab.diffLoading && (
            <div className="p-4 rounded-xl text-center text-sm animate-pulse" style={cardStyle}>
              <span style={{ color: "var(--text-muted)" }}>⏳ Loading diff...</span>
            </div>
          )}

          {activeTab.diffData && !activeTab.diffLoading && (
            <DiffViewer a={activeTab.diffData.a} b={activeTab.diffData.b}
              onClose={() => updateTab(activeTab.id, { diffData: null })} />
          )}
        </div>
      </div>

      {saveTarget && (
        <SaveRequestModal request={saveTarget.request} defaultName={saveTarget.defaultName}
          defaultCollectionId={saveTarget.defaultCollectionId}
          defaultFolderId={saveTarget.defaultFolderId}
          collections={collections}
          onSaved={(name, saved) => {
            if (saveTarget.defaultCollectionId && saved) {
              // opened from folder context — open as a new tab
              openInNewTab({ url: saved.url, method: saved.method, headers: [], body: saved.body }, name, saved.id);
            } else {
              updateTab(activeTab.id, { label: name, savedName: name });
            }
            loadCollections();
          }}
          onClose={() => setSaveTarget(null)} />
      )}

      {saveExampleTarget && activeTab.response && (
        <SaveExampleModal
          response={activeTab.response}
          savedRequestId={activeTab.savedRequestId ?? null}
          onSaved={loadCollections}
          onClose={() => setSaveExampleTarget(false)} />
      )}

      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="rounded-2xl p-6 w-80 space-y-4 shadow-xl" style={cardStyle}>
            <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Sign out?</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Are you sure you want to sign out of DebugPilot?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSignOutConfirm(false)} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
      {showSettings && <SettingsPanel collections={collections} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
