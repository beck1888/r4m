// Set this if your API is on a different origin
const BASE_URL = "http://127.0.0.1:5000";

const $ = (q) => document.querySelector(q);

// Screens
const screenHome = $("#screen-home");
const screenLoading = $("#screen-loading");
const screenResults = $("#screen-results");
const screenError = $("#screen-error");

// Loading UI
const loadingStatusEl = $("#loading-status");
const spinMetadata = $("#spin-metadata");
const spinVideoId = $("#spin-videoid");
const spinTranscript = $("#spin-transcript");
const spinSummary = $("#spin-summary");

// Results UI
const resultThumb = $("#result-thumb");
const resultTitleLink = $("#result-title-link");
const resultTitleLinkText = $("#result-title-link-text");
const resultChannelLink = $("#result-channel-link");
const resultSummaryEl = $("#result-summary");
const printBtn = $("#print-btn");

// Error UI
const errorMessageEl = $("#error-message");
const errorDetailsEl = $("#error-details");

// History UI
const historyListEl = $("#history-list");
const historyEmptyEl = $("#history-empty");
const historyLoadMoreBtn = $("#history-load-more");

// History pagination state
const HISTORY_PAGE_SIZE = 5;
let historyAllRows = [];
let historyRenderedCount = 0;

// IndexedDB helpers
const DB_NAME = "yt-summarizer-db";
const DB_STORE = "summaries";
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;

      // Ensure store exists
      let store;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        store = db.createObjectStore(DB_STORE, { keyPath: "id", autoIncrement: true });
      } else {
        // When upgrading an existing DB, get the store from the upgrade transaction
        store = event.target.transaction.objectStore(DB_STORE);
      }

      // Helper to create indexes idempotently
      const ensureIndex = (name, keyPath, options) => {
        if (!store.indexNames.contains(name)) {
          store.createIndex(name, keyPath, options);
        }
      };

      // Existing + new indexes
      ensureIndex("by_time", "createdAt");
      ensureIndex("by_url", "url");
      ensureIndex("by_videoId", "videoId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAdd(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(DB_STORE);
    store.add(entry);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetByUrl(url) {
  if (!url) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    let index;
    try {
      index = store.index("by_url");
    } catch (_) {
      // Fallback for older DBs without index
      const reqAll = store.getAll();
      reqAll.onsuccess = () => {
        const all = reqAll.result || [];
        const match = all
          .filter((r) => r && r.url === url)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
        resolve(match);
      };
      reqAll.onerror = () => reject(reqAll.error);
      return;
    }
    const req = index.getAll(url);
    req.onsuccess = () => {
      const arr = req.result || [];
      const latest = arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
      resolve(latest);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbFindByVideoId(videoId) {
  if (!videoId) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    let index;
    try {
      index = store.index("by_videoId");
    } catch (_) {
      const reqAll = store.getAll();
      reqAll.onsuccess = () => {
        const all = reqAll.result || [];
        const match = all
          .filter((r) => r && r.videoId === videoId)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
        resolve(match);
      };
      reqAll.onerror = () => reject(reqAll.error);
      return;
    }
    const req = index.getAll(videoId);
    req.onsuccess = () => {
      const arr = req.result || [];
      const latest = arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
      resolve(latest);
    };
    req.onerror = () => reject(req.error);
  });
}

function extractYouTubeId(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg) return seg;
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        if (v) return v;
      }
      const m = u.pathname.match(/^\/(shorts|embed)\/([^/?#]+)/i);
      if (m) return m[2];
    }
  } catch (_) {
    // ignore and try regex fallback
  }
  const rx = /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&/#]|$)/;
  const m = String(raw).match(rx);
  return m ? m[1] : "";
}

function formatWhen(ts) {
  try {
    const t = typeof ts === "number" ? ts : Date.parse(ts);
    if (!Number.isFinite(t)) return "";
    const now = Date.now();
    const diffMs = Math.max(0, now - t);
    const s = diffMs / 1000;
    const m = s / 60;
    const h = m / 60;
    const d = h / 24;
    const w = d / 7;
    const mo = d / 30; // approx months
    const y = d / 365; // approx years

    let value, unit;
    if (y >= 1) {
      value = Math.round(y);
      unit = "year";
    } else if (mo >= 1) {
      value = Math.round(mo);
      unit = "month";
    } else if (w >= 1) {
      value = Math.round(w);
      unit = "week";
    } else if (d >= 1) {
      value = Math.round(d);
      unit = "day";
    } else if (h >= 1) {
      value = Math.round(h);
      unit = "hour";
    } else if (m >= 1) {
      value = Math.round(m);
      unit = "minute";
    } else {
      value = Math.round(s);
      unit = "second";
    }

    const plural = value === 1 ? "" : "s";
    return `${value} ${unit}${plural} ago`;
  } catch {
    return "";
  }
}

function appendHistoryItems(from, count) {
  const slice = historyAllRows.slice(from, from + count);
  for (const r of slice) {
    const div = document.createElement("div");
    div.className = "history-item";
    const thumb = document.createElement("img");
    thumb.className = "history-item-thumb";
    if (r.videoId) thumb.src = `https://img.youtube.com/vi/${encodeURIComponent(r.videoId)}/hqdefault.jpg`;
    const main = document.createElement("div");
    main.className = "history-item-main";
    const title = document.createElement("div");
    title.className = "history-item-title";
    title.textContent = r.metadata?.title || "Untitled";
    const meta = document.createElement("div");
    meta.className = "history-item-meta";
    meta.textContent = r.metadata?.uploader || r.metadata?.channel || "Unknown";
    const time = document.createElement("div");
    time.className = "history-item-time";
    time.textContent = formatWhen(r.createdAt);
    main.appendChild(title);
    main.appendChild(meta);
    div.appendChild(thumb);
    div.appendChild(main);
    div.appendChild(time);
    div.addEventListener("click", () => {
      populateResults({ url: r.url, metadata: r.metadata, vid: r.videoId, summary: r.summary });
      showScreen("results");
    });
    historyListEl.appendChild(div);
  }
  historyRenderedCount += slice.length;
  const hasMore = historyRenderedCount < historyAllRows.length;
  if (historyLoadMoreBtn) {
    if (hasMore) historyLoadMoreBtn.classList.remove("hidden");
    else historyLoadMoreBtn.classList.add("hidden");
  }
}

async function renderHistory() {
  if (!historyListEl || !historyEmptyEl) return;
  const rows = await dbGetAll();
  // sort newest first
  rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  historyAllRows = rows;
  historyListEl.innerHTML = "";
  historyRenderedCount = 0;
  if (!rows.length) {
    historyEmptyEl.classList.remove("hidden");
    if (historyLoadMoreBtn) historyLoadMoreBtn.classList.add("hidden");
    return;
  }
  historyEmptyEl.classList.add("hidden");
  appendHistoryItems(0, HISTORY_PAGE_SIZE);
}

if (historyLoadMoreBtn) {
  historyLoadMoreBtn.addEventListener("click", () => {
    appendHistoryItems(historyRenderedCount, HISTORY_PAGE_SIZE);
  });
}

function showScreen(name) {
  const map = { home: screenHome, loading: screenLoading, results: screenResults, error: screenError };
  Object.values(map).forEach((el) => el && el.classList.add("hidden"));
  map[name]?.classList.remove("hidden");
}

function setLoadingStatus(msg) {
  if (loadingStatusEl) loadingStatusEl.textContent = msg || "";
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

async function getMetadata(url) {
  const res = await fetch(`${BASE_URL}/get-metadata?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`get-metadata failed (${res.status})`);
  return await res.json();
}

async function getVideoId(url) {
  const res = await fetch(`${BASE_URL}/get-video-id?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `get-video-id failed (${res.status})`);
  return data.video_id;
}

async function getTranscript(id) {
  const res = await fetch(`${BASE_URL}/fetch-transcript?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `fetch-transcript failed (${res.status})`);
  return data.transcript;
}

async function summarize(transcript, channelName) {
  const res = await fetch(`${BASE_URL}/summarize-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, channel_uploader: channelName || "Unknown" })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `summarize-video failed (${res.status})`);
  return data.summary;
}

function applyMetadataFields(metadata) {
  // Your API returns:
  // { title, uploader, channel_url, ... }
  metaTitleEl.textContent = metadata?.title || "Unknown";
  metaChannelLinkEl.textContent = metadata?.uploader || "Unknown";
  metaChannelLinkEl.href = metadata?.channel_url || "#";
}

function guessChannelName(metadata) {
  // For summarize step
  return metadata?.uploader || "Unknown";
}

async function runPipeline(url) {
  // Go to loading screen
  showScreen("loading");
  setLoadingStatus("Starting...");
  // Reset spinners
  [spinMetadata, spinVideoId, spinTranscript, spinSummary].forEach((el) => {
    el.classList.remove("done", "error", "active");
  });

  let metadata, vid, transcript, summary;

  try {
  setLoadingStatus("Getting video details...");
  spinMetadata.classList.add("active");
  metadata = await getMetadata(url);
  spinMetadata.classList.remove("active");
  spinMetadata.classList.add("done");

  setLoadingStatus("Extracting video id...");
  spinVideoId.classList.add("active");
  vid = await getVideoId(url);
  spinVideoId.classList.remove("active");
  spinVideoId.classList.add("done");

  setLoadingStatus("Fetching transcript...");
  spinTranscript.classList.add("active");
  transcript = await getTranscript(vid);
  spinTranscript.classList.remove("active");
  spinTranscript.classList.add("done");

    const channelName = guessChannelName(metadata);
  setLoadingStatus(`Summarizing transcript for ${channelName}...`);
  spinSummary.classList.add("active");
  summary = await summarize(transcript, channelName);
  spinSummary.classList.remove("active");
  spinSummary.classList.add("done");

    // Populate results screen
    populateResults({ url, metadata, vid, summary });
    // Save to history
    try {
      await dbAdd({
        url,
        videoId: vid,
        metadata,
        summary,
        createdAt: Date.now()
      });
      renderHistory();
    } catch (_) {
      // non-fatal
    }
    setLoadingStatus("Done.");
    showScreen("results");
  } catch (err) {
    console.error(err);
    setLoadingStatus(`Error: ${err.message}`);
    // mark last active spinner as error
    [spinMetadata, spinVideoId, spinTranscript, spinSummary]
      .reverse()
      .find((el) => {
        if (!el.classList.contains("done")) {
          el.classList.remove("active");
          el.classList.add("error");
          return true;
        }
        return false;
      });
  // Show error screen with clear message and details
  const userMsg = "We couldn’t complete the request. Please check the URL or try again later.";
  errorMessageEl.textContent = userMsg;
  const details = err && (err.stack || err.message || String(err));
  errorDetailsEl.textContent = details;
  showScreen("error");
  }
}

function populateResults({ url, metadata, vid, summary }) {
  // Thumbnail: https://img.youtube.com/vi/<id>/hqdefault.jpg
  const thumbUrl = vid ? `https://img.youtube.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg` : "";
  if (thumbUrl) {
    resultThumb.src = thumbUrl;
  } else {
    resultThumb.removeAttribute("src");
  }

  // Title and links
  const videoLink = metadata?.webpage_url || url || "#";
  resultTitleLink.href = videoLink;
  resultTitleLinkText.href = videoLink;
  resultTitleLinkText.textContent = metadata?.title || "Untitled";

  resultChannelLink.href = metadata?.channel_url || metadata?.channel || metadata?.uploader_url || "#";
  resultChannelLink.textContent = metadata?.uploader || metadata?.channel || "Unknown";

  // Summary as plain text (do not render markdown)
  resultSummaryEl.textContent = typeof summary === "string" ? summary : pretty(summary);
}

// Wire up the form
const form = document.getElementById("url-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = document.getElementById("url-input").value.trim();
  if (!url) {
    setLoadingStatus("Please enter a URL.");
    return;
  }

  // 1) Try to find an exact URL match in cache
  try {
    let cached = await dbGetByUrl(url);
    // 2) If not found, try by parsed video ID to catch alternate URL forms
    if (!cached) {
      const vid = extractYouTubeId(url);
      if (vid) {
        cached = await dbFindByVideoId(vid);
      }
    }

    if (cached) {
      populateResults({ url: cached.url, metadata: cached.metadata, vid: cached.videoId, summary: cached.summary });
      showScreen("results");
      return;
    }
  } catch (_) {
    // On any cache error, fall back to pipeline
  }

  // Not cached, run full pipeline
  runPipeline(url);
});

// Ensure home screen is visible by default
showScreen("home");
renderHistory();

// Printing: show summary only
function triggerPrintSummary() {
  if (!resultSummaryEl || screenResults.classList.contains("hidden")) return;
  window.print();
}

if (printBtn) {
  printBtn.addEventListener("click", triggerPrintSummary);
}

// Cmd/Ctrl + P to print summary
window.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const isPrint = (isMac && e.metaKey && e.key.toLowerCase() === "p") || (!isMac && e.ctrlKey && e.key.toLowerCase() === "p");
  if (isPrint) {
    e.preventDefault();
    triggerPrintSummary();
  }
});