// DOM
const inputBox = document.getElementById("userInput");
const currentResponse = document.getElementById("currentResponse");
const historyBox = document.getElementById("historyBox");
const sendBtn = document.getElementById("sendBtn");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
 
// n8n endpoints (same IDs you already use)
const PROD_URL = "https://alvarovargas.app.n8n.cloud/webhook/TiaSelma";
const TEST_URL = "https://alvarovargas.app.n8n.cloud/webhook-test/TiaSelma";

const SESSION_ID_KEY = "tiaSelmaSessionId";
 
const sessionId = (() => {
  const existing = localStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
 
  const fresh =
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
 
  localStorage.setItem(SESSION_ID_KEY, fresh);
  return fresh;
})();
 
function getPreferredEndpoint() {
  const params = new URLSearchParams(window.location.search);
  const env = (params.get("env") || params.get("mode") || "").toLowerCase();
  const base = env === "test" ? TEST_URL : PROD_URL;
 
  if (!base) throw new Error("Endpoint base no definido");
 
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new Error(`Endpoint inválido: ${base}`);
  }
 
  url.searchParams.set("action", "sendMessage");
  return url.toString();
}

// ===============================
// POST JSON WITH TIMEOUT
// ===============================
async function postJson(url, payload, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data = null;

    try {
      data = JSON.parse(raw);
    } catch {
      /* backend respondió texto plano */
    }

    return { response, raw, data };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Tiempo de espera agotado");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===============================
// REPLY EXTRACTION (FIXED)
// ===============================
function extractReply({ raw, data }) {
  return (
    data?.respuesta ||
    data?.output ||
    data?.reply ||
    data?.message ||
    data?.text ||
    (raw || "").trim() ||
    "Piense bien lo que me va a decir"
  );
}

// ===============================
// SEND MESSAGE
// ===============================
async function sendMessage() {
  if (sendBtn?.disabled) return;

  const input = inputBox.value.trim();
  if (!input) {
    currentResponse.value = "Ya pue… no sea tímido 😌";
    return;
  }

  const previous = localStorage.getItem("chatHistory") || "";
  let endpoint;

  try {
    endpoint = getPreferredEndpoint();
  } catch (err) {
    currentResponse.value = err.message;
    return;
  }

  currentResponse.value = "Aers… 🤔";
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

    let updatedHistory =
      `${previous}\n👨🏻‍💻 Tú: ${input}\n👵🏻 Tía Selma: ${reply}\n`;

    // Soft cap localStorage (≈8 KB)
    const MAX_CHARS = 8000;
    if (updatedHistory.length > MAX_CHARS) {
      updatedHistory = updatedHistory.slice(-MAX_CHARS);
    }

    currentResponse.value = reply;
    if (historyBox) historyBox.value = localStorage.getItem("chatHistory") || "";
    localStorage.setItem("chatHistory", updatedHistory);
  } catch (err) {
    const msg = String(err?.message || "Error desconocido");
    const fallback = `Ahí sí que me pilló 🤔 (${msg})`;

    let updatedHistory =
      `${previous}\n👨🏻‍💻 Tú: ${input}\n👵🏻 Tía Selma: ${fallback}\n`;

    currentResponse.value = fallback;
    historyBox.value = updatedHistory;
    localStorage.setItem("chatHistory", updatedHistory);
  } finally {
    inputBox.value = "";
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ===============================
// TOGGLE HISTORY
// ===============================
function toggleHistory() {
  if (!historyBox) return;

  const isHidden = !historyBox.classList.contains("show");
  historyBox.classList.toggle("show", isHidden);

  if (toggleHistoryBtn) {
    toggleHistoryBtn.textContent = isHidden
      ? "Ocultar historial"
      : "Mostrar historial";
  }
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  historyBox.value = localStorage.getItem("chatHistory") || "";

  sendBtn?.addEventListener("click", sendMessage);
  toggleHistoryBtn?.addEventListener("click", toggleHistory);

  inputBox?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
