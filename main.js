// DOM
const inputBox = document.getElementById("userInput");
const currentResponse = document.getElementById("currentResponse");
const historyBox = document.getElementById("historyBox");
const sendBtn = document.getElementById("sendBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
 
// n8n endpoints (same IDs you already use)
const PROD_URL = "https://alvarovargas.app.n8n.cloud/webhook/TiaSelma";
const TEST_URL = "https://alvarovargas.app.n8n.cloud/webhook-test/TiaSelma";
 
function getPreferredEndpoint() {
  const params = new URLSearchParams(window.location.search);
  const env = (params.get("env") || params.get("mode") || "").toLowerCase();
  const base = env === "test" ? TEST_BASE : PROD_BASE;
 
  // We standardize on action=sendMessage for the chat
  const url = new URL(base);
  url.searchParams.set("action", "sendMessage");
  return url.toString();
}
 
async function postJson(url, payload, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
 
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      mode: "cors",
    });
 
    const raw = await response.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (_) {}
 
    return { response, raw, data };
  } finally {
    clearTimeout(timeoutId);
  }
}
 
function extractReply({ raw, data }) {
  const trimmed = (raw || "").trim();
  if (trimmed) return trimmed;
 
  return (
    data?.respuesta ||
    data?.output ||
    data?.reply ||
    data?.message ||
    data?.text ||
    "Piense bien lo que me va a decir"
  );
}
 
async function sendMessage() {
  const input = inputBox.value.trim();
  if (!input) {
    currentResponse.value = "Ya pue... No sea tímido";
    return;
  }
 
  const previous = localStorage.getItem("chatHistory") || "";
  const sessionId = getOrCreateSessionId();
  const endpoint = getPreferredEndpoint();
 
  currentResponse.value = "Aers...";
  if (sendBtn) sendBtn.disabled = true;
 
  try {
    const payload = {
      chatInput: input,
      sessionId,
      agent: "TiaSelma",
    };
 
    const { response, raw, data } = await postJson(endpoint, payload);
 
    if (!response.ok) {
      const detail = data?.message || raw || `HTTP ${response.status}`;
      throw new Error(detail);
    }
 
    const reply = extractReply({ raw, data });
    const updatedHistory = `${previous}\n👨🏻‍💻 Tú: ${input}\n👵🏻 Tía Selma: ${reply}\n`;
 
    currentResponse.value = reply;
    historyBox.value = updatedHistory;
    localStorage.setItem("chatHistory", updatedHistory);
  } catch (err) {
    const msg = String(err?.message || err || "Error desconocido");
    const fallback = `Ahí si que me pilló 🤔 (${msg})`;
 
    const updatedHistory = `${previous}\n👨🏻‍💻 Tú: ${input}\n👵🏻 Tía Selma: ${fallback}\n`;
    currentResponse.value = fallback;
    historyBox.value = updatedHistory;
    localStorage.setItem("chatHistory", updatedHistory);
  } finally {
    inputBox.value = "";
    if (sendBtn) sendBtn.disabled = false;
  }
}
 
function toggleHistory() {
  const isHidden = !historyBox.classList.contains("show");
  historyBox.classList.toggle("show", isHidden);
  toggleHistoryBtn.textContent = isHidden ? "Ocultar historial" : "Mostrar historial";
}
 
document.addEventListener("DOMContentLoaded", () => {
  historyBox.value = localStorage.getItem("chatHistory") || "";
 
  sendBtn.addEventListener("click", sendMessage);
  toggleHistoryBtn.addEventListener("click", toggleHistory);
 
  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
