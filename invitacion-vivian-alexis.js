const weddingDate2 = new Date("2026-09-19T17:30:00-06:00");
const countNodes2 = {
  days: document.querySelector('[data-count="days"]'),
  hours: document.querySelector('[data-count="hours"]'),
  minutes: document.querySelector('[data-count="minutes"]'),
  seconds: document.querySelector('[data-count="seconds"]'),
};
const floatingMenu = document.querySelector(".floating-menu");
const menuPanel2 = document.querySelector(".menu-panel");
const musicFrame2 = document.querySelector("#musicFrame2");
const musicToggle2 = document.querySelector("#musicToggle2");
const musicState = document.querySelector("[data-music-state]");
const youtubeUrl2 = "https://www.youtube.com/embed/B2svpqTu3Uo?autoplay=1&loop=1&playlist=B2svpqTu3Uo&controls=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1";
const rsvpEndpoint2 = String(window.RSVP_SHEETS_URL || "").trim();
let musicPlaying = true;
let musicInitialized = false;

function pad2(value, size = 2) {
  return String(Math.max(0, value)).padStart(size, "0");
}

function updateCountdown2() {
  const distance = weddingDate2.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(distance / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  countNodes2.days.textContent = pad2(days, 3);
  countNodes2.hours.textContent = pad2(hours);
  countNodes2.minutes.textContent = pad2(minutes);
  countNodes2.seconds.textContent = pad2(seconds);
}

function sendMusicCommand(command) {
  musicFrame2.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func: command, args: [] }),
    "*"
  );
}

function startMusic2(force = false) {
  if (!musicInitialized || force) {
    musicFrame2.src = `${youtubeUrl2}&start=1&resume=${Date.now()}`;
    musicInitialized = true;
  }
  musicPlaying = true;
  musicToggle2.classList.remove("is-paused");
  musicState.textContent = "Reproduciendo";
  setTimeout(() => sendMusicCommand("playVideo"), 650);
}

function pauseMusic2() {
  musicPlaying = false;
  musicToggle2.classList.add("is-paused");
  musicState.textContent = "Pausada";
  sendMusicCommand("pauseVideo");
}

updateCountdown2();
setInterval(updateCountdown2, 1000);
setTimeout(startMusic2, 500);

["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  window.addEventListener(eventName, () => startMusic2(), { once: true, passive: true });
});

musicToggle2.addEventListener("click", () => {
  if (musicPlaying) {
    pauseMusic2();
  } else {
    startMusic2(true);
  }
});

floatingMenu.addEventListener("click", () => {
  const nextState = floatingMenu.getAttribute("aria-expanded") !== "true";
  floatingMenu.setAttribute("aria-expanded", String(nextState));
  menuPanel2.classList.toggle("is-open", nextState);
});

menuPanel2.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    floatingMenu.setAttribute("aria-expanded", "false");
    menuPanel2.classList.remove("is-open");
  });
});

function buildRsvpPayload2(form) {
  return {
    submittedAt: new Date().toISOString(),
    nombre: String(form.get("nombre") || "").trim(),
    asistencia: String(form.get("asistencia") || "").trim(),
    invitados: String(form.get("invitados") || "").trim(),
    cancion: String(form.get("cancion") || "").trim(),
    restriccion: String(form.get("restriccion") || "").trim(),
    website: String(form.get("website") || "").trim(),
    origen: window.location.href,
    userAgent: navigator.userAgent,
  };
}

async function sendRsvpToSheets2(payload) {
  if (!rsvpEndpoint2) {
    throw new Error("missing_endpoint");
  }

  await fetch(rsvpEndpoint2, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
}

document.querySelector("#rsvpForm2").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const payload = buildRsvpPayload2(form);
  const submitButton = formElement.querySelector(".answer-button");
  const note = document.querySelector("#formNote2");

  if (payload.website) {
    formElement.reset();
    note.textContent = "¡Gracias! Tu confirmación quedó registrada.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";
  note.textContent = "Guardando tu confirmación...";

  try {
    await sendRsvpToSheets2(payload);
    formElement.reset();
    note.textContent = "¡Gracias! Tu confirmación quedó registrada.";
  } catch (error) {
    if (error.message === "missing_endpoint") {
      note.textContent = "Falta conectar Google Sheets para registrar respuestas.";
    } else {
      note.textContent = "No se pudo guardar. Inténtalo de nuevo en unos segundos.";
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Responder ahora";
  }
});
