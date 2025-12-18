// DOM
const inputBox = document.getElementById("userInput");
const currentResponse = document.getElementById("currentResponse");
const historyBox = document.getElementById("historyBox");
const sendBtn = document.getElementById("sendBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
 
// n8n endpoints (same IDs you already use)
const PROD_BASE =
  "https://alvarovargas.app.n8n.cloud/webhook/ac234336-390d-438a-aad6-284a5290743d/chat";
const TEST_BASE =
  "https://alvarovargas.app.n8n.cloud/webhook-test/ac234336-390d-438a-aad6-284a5290743d/chat";
 
function getPreferredEndpoint() {
  const params = new URLSearchParams(window.location.search);
  const env = (params.get("env") || params.get("mode") || "").toLowerCase();
  const base = env === "test" ? TEST_BASE : PROD_BASE;
 
  // We standardize on action=sendMessage for the chat
  const url = new URL(base);
  url.searchParams.set("action", "sendMessage");
  return url.toString();
}
 
function getOrCreateSessionId() {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
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
    "No se recibió respuesta."
  );
}
 
async function sendMessage() {
  const input = inputBox.value.trim();
  if (!input) {
    currentResponse.value = "¿Qué le sirvo primero? (Escriba algo arriba).";
    return;
  }
 
  const previous = localStorage.getItem("chatHistory") || "";
  const sessionId = getOrCreateSessionId();
  const endpoint = getPreferredEndpoint();
 
  currentResponse.value = "Pensando...";
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
    const updatedHistory = `${previous}\n👤 Tú: ${input}\n👵🏻 Tía Selma: ${reply}\n`;
 
    currentResponse.value = reply;
    historyBox.value = updatedHistory;
    localStorage.setItem("chatHistory", updatedHistory);
  } catch (err) {
    const msg = String(err?.message || err || "Error desconocido");
    const fallback = `Hmm... algo no salió bien 🤔 (${msg})`;
 
    const updatedHistory = `${previous}\n👤 Tú: ${input}\n👵🏻 Tía Selma: ${fallback}\n`;
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
3) TiaSelma/styles.css: easiest option
To keep the same visual structure as vacante1/chatbot, simply copy:

vacante1/chatbot/styles.css → TiaSelma/styles.css
You don’t need to delete modal CSS; it won’t apply if there’s no modal in the HTML. The only important thing is: don’t set aria-hidden="true" on #chatApp, because that triggers this dimming rule:

/workspace/vacante1/chatbot/styles.css
Lines 161-165
.chat-app[aria-hidden="true"] {
  opacity: 0.15;
  pointer-events: none;
  user-select: none;
}
Quick test checklist (GitHub Pages friendly)
Open TiaSelma/index.html
Send a message
Test n8n test webhook by visiting TiaSelma/index.html?env=test
If you want, tell me the folder name you prefer (TiaSelma/, tia-selma/, or root), and I’ll tailor the exact GitHub Pages URL and links accordingly.
