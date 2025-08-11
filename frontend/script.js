// Set this if your API is on a different origin
const BASE_URL = "http://127.0.0.1:5000";

const $ = (q) => document.querySelector(q);
const statusEl = $("#status");
const metadataEl = $("#metadata");
const idEl = $("#video-id");
const transcriptEl = $("#transcript");
const summaryEl = $("#summary");
const metaTitleEl = $("#meta-title");
const metaChannelLinkEl = $("#meta-channel-link");

function setStatus(msg) {
  statusEl.textContent = msg;
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
  // Clear old outputs
  metadataEl.textContent = "";
  idEl.textContent = "";
  transcriptEl.textContent = "";
  summaryEl.textContent = "";
  metaTitleEl.textContent = "";
  metaChannelLinkEl.textContent = "";
  metaChannelLinkEl.removeAttribute("href");

  try {
    setStatus("Getting video details...");
    const metadata = await getMetadata(url);
    applyMetadataFields(metadata);
    metadataEl.textContent = pretty(metadata);

    setStatus("Extracting video id...");
    const vid = await getVideoId(url);
    idEl.textContent = vid;

    setStatus("Fetching transcript...");
    const transcript = await getTranscript(vid);
    transcriptEl.textContent = typeof transcript === "string" ? transcript : pretty(transcript);

    const channelName = guessChannelName(metadata);
    setStatus(`Summarizing transcript for ${channelName}...`);
    const summary = await summarize(transcript, channelName);
    summaryEl.textContent = typeof summary === "string" ? summary : pretty(summary);

    setStatus("Done.");
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

// Wire up the form
const form = document.getElementById("url-form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = document.getElementById("url-input").value.trim();
  if (!url) {
    setStatus("Please enter a URL.");
    return;
  }
  setStatus("Starting...");
  runPipeline(url);
});