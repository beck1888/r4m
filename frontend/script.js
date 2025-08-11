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
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = document.getElementById("url-input").value.trim();
  if (!url) {
    setLoadingStatus("Please enter a URL.");
    return;
  }
  runPipeline(url);
});

// Ensure home screen is visible by default
showScreen("home");

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