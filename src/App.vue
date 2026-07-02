<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import heroCouple from "../assets/hero-couple.jpg";
import itineraryPhoto from "../assets/IMG_8126.jpg";
import memoryPhoto from "../assets/FullSizeRender.jpg";

const weddingDate = new Date("2026-09-19T17:30:00-06:00");
const youtubeVideoId = "pvStaSjnPAI";
const rsvpEndpoint = String(window.RSVP_SHEETS_URL || "").trim();

const menuOpen = ref(false);
const countdown = reactive({
  days: "000",
  hours: "00",
  minutes: "00",
  seconds: "00",
});
const musicState = ref("Activar audio");
const musicPlaying = ref(false);
const musicReady = ref(false);
const musicLoading = ref(false);
const youtubeHost = ref(null);
const formNote = ref("");
const submitting = ref(false);
const rsvpForm = reactive({
  website: "",
  nombre: "",
  asistencia: "",
  invitados: "",
  cancion: "",
  restriccion: "",
});

let countdownTimer = null;
let youtubePlayer = null;
let pendingMusicStart = false;
let firstInteractionHandler = null;

const itinerary = [
  ["5:30 pm", "Ceremonia"],
  ["8:00 pm", "Recepción"],
  ["8:30 pm", "Entrada de novios"],
  ["9:00 pm", "Cena"],
  ["10:00 pm", "Actividades"],
  ["10:40 pm", "Corte de pastel"],
  ["10:55 pm", "Fotografía con los invitados"],
  ["11:35 pm", "Lanzamiento del ramo y balón"],
  ["12:05 am", "Mini-sorpresa"],
  ["12:30 am", "Fin"],
];

const musicButtonLabel = computed(() => (
  musicPlaying.value ? "Pausar música" : "Reproducir música"
));

function pad(value, size = 2) {
  return String(Math.max(0, value)).padStart(size, "0");
}

function updateCountdown() {
  const distance = weddingDate.getTime() - Date.now();
  const totalSeconds = Math.max(0, Math.floor(distance / 1000));

  countdown.days = pad(Math.floor(totalSeconds / 86400), 3);
  countdown.hours = pad(Math.floor((totalSeconds % 86400) / 3600));
  countdown.minutes = pad(Math.floor((totalSeconds % 3600) / 60));
  countdown.seconds = pad(totalSeconds % 60);
}

function closeMenu() {
  menuOpen.value = false;
}

function loadYoutubeApi() {
  if (window.YT?.Player) {
    createYoutubePlayer();
    return;
  }

  const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  const previousReady = window.onYouTubeIframeAPIReady;

  window.onYouTubeIframeAPIReady = () => {
    previousReady?.();
    createYoutubePlayer();
  };

  if (!existingScript) {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  }
}

function createYoutubePlayer() {
  if (youtubePlayer || !youtubeHost.value || !window.YT?.Player) return;

  youtubePlayer = new window.YT.Player(youtubeHost.value, {
    videoId: youtubeVideoId,
    width: "1",
    height: "1",
    playerVars: {
      autoplay: 0,
      controls: 0,
      loop: 1,
      modestbranding: 1,
      playlist: youtubeVideoId,
      playsinline: 1,
      rel: 0,
    },
    events: {
      onReady: (event) => {
        musicReady.value = true;
        event.target.setVolume(80);
        musicState.value = pendingMusicStart ? "Reproduciendo" : "Activar audio";

        if (pendingMusicStart) {
          pendingMusicStart = false;
          startMusic();
        }
      },
      onStateChange: (event) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
          musicPlaying.value = true;
          musicState.value = "Reproduciendo";
        }

        if (event.data === window.YT.PlayerState.PAUSED) {
          musicPlaying.value = false;
          musicState.value = "Pausada";
        }

        if (event.data === window.YT.PlayerState.ENDED) {
          youtubePlayer.playVideo();
        }
      },
    },
  });
}

function startMusic() {
  if (!musicReady.value || !youtubePlayer) {
    pendingMusicStart = true;
    musicLoading.value = true;
    musicState.value = "Cargando audio";
    loadYoutubeApi();
    return;
  }

  musicLoading.value = false;
  musicPlaying.value = true;
  musicState.value = "Reproduciendo";
  youtubePlayer.unMute();
  youtubePlayer.setVolume(80);
  youtubePlayer.playVideo();
}

function pauseMusic() {
  if (!youtubePlayer) return;

  musicPlaying.value = false;
  musicState.value = "Pausada";
  youtubePlayer.pauseVideo();
}

function toggleMusic() {
  if (musicPlaying.value) {
    pauseMusic();
  } else {
    startMusic();
  }
}

function resetRsvpForm() {
  rsvpForm.website = "";
  rsvpForm.nombre = "";
  rsvpForm.asistencia = "";
  rsvpForm.invitados = "";
  rsvpForm.cancion = "";
  rsvpForm.restriccion = "";
}

async function submitRsvp() {
  const payload = {
    submittedAt: new Date().toISOString(),
    nombre: rsvpForm.nombre.trim(),
    asistencia: rsvpForm.asistencia.trim(),
    invitados: rsvpForm.invitados.trim(),
    cancion: rsvpForm.cancion.trim(),
    restriccion: rsvpForm.restriccion.trim(),
    website: rsvpForm.website.trim(),
    origen: window.location.href,
    userAgent: navigator.userAgent,
  };

  if (payload.website) {
    resetRsvpForm();
    formNote.value = "¡Gracias! Tu confirmación quedó registrada.";
    return;
  }

  if (!rsvpEndpoint) {
    formNote.value = "Falta conectar Google Sheets para registrar respuestas.";
    return;
  }

  submitting.value = true;
  formNote.value = "Guardando tu confirmación...";

  try {
    await fetch(rsvpEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    resetRsvpForm();
    formNote.value = "¡Gracias! Tu confirmación quedó registrada.";
  } catch (error) {
    formNote.value = "No se pudo guardar. Inténtalo de nuevo en unos segundos.";
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  updateCountdown();
  countdownTimer = window.setInterval(updateCountdown, 1000);

  await nextTick();
  loadYoutubeApi();

  firstInteractionHandler = (event) => {
    if (event.target?.closest?.(".music-control")) return;
    startMusic();
  };

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, firstInteractionHandler, { once: true, passive: true });
  });
});

onBeforeUnmount(() => {
  window.clearInterval(countdownTimer);

  if (firstInteractionHandler) {
    ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
      window.removeEventListener(eventName, firstInteractionHandler);
    });
  }

  youtubePlayer?.destroy?.();
});
</script>

<template>
  <div class="invite-shell">
    <button
      class="floating-menu"
      :class="{ 'is-open': menuOpen }"
      type="button"
      :aria-label="menuOpen ? 'Cerrar menu' : 'Abrir menu'"
      :aria-expanded="String(menuOpen)"
      @click="menuOpen = !menuOpen"
    >
      <span class="menu-dot" aria-hidden="true"></span>
      <span class="menu-lines" aria-hidden="true">
        <span></span>
        <span></span>
      </span>
    </button>

    <nav class="menu-panel" :class="{ 'is-open': menuOpen }" aria-label="Secciones">
      <a href="#inicio" @click="closeMenu">Inicio</a>
      <a href="#fecha" @click="closeMenu">Fecha</a>
      <a href="#ubicacion" @click="closeMenu">Ubicación</a>
      <a href="#itinerario" @click="closeMenu">Itinerario</a>
      <a href="#detalles" @click="closeMenu">Detalles</a>
      <a href="#confirmar" @click="closeMenu">Confirmar</a>
    </nav>

    <main>
      <section id="inicio" class="cover-panel lavender-panel">
        <img class="cover-bg" :src="heroCouple" alt="">
        <div class="invitation-card">
          <div class="card-top">
            <p class="initials">V<span></span>A</p>
            <p class="names-small">Vivian & Alexis</p>
          </div>
          <div class="card-fold"></div>
          <div class="card-bottom">
            <p>Tenemos el honor de invitarte a nuestra boda</p>
            <time>19.09.2026</time>
            <span class="down-arrow">↓</span>
          </div>
        </div>
      </section>

      <section class="photo-panel">
        <img :src="heroCouple" alt="Vivian y Alexis caminando juntos">
        <blockquote>
          Más valen dos que uno, porque obtienen más fruto de su esfuerzo.
        </blockquote>
        <cite>Eclesiastés 4:9-12</cite>
      </section>

      <section class="music-panel">
        <p>Sube el volumen de tu dispositivo para escuchar mejor la canción</p>
        <div class="music-control">
          <button
            id="musicToggle2"
            type="button"
            :aria-label="musicButtonLabel"
            :class="{ 'is-paused': !musicPlaying }"
            @click="toggleMusic"
          >
            <span class="pause-icon"></span>
          </button>
          <div class="music-line"><span></span></div>
          <span data-music-state>{{ musicState }}</span>
        </div>
        <div id="youtubePlayer2" ref="youtubeHost" class="music-frame" title="Música de fondo"></div>
      </section>

      <section id="fecha" class="date-panel lavender-panel">
        <p class="small-title">El gran día</p>
        <div class="date-grid">
          <span>Septiembre</span>
          <strong>19</strong>
          <span>2026</span>
        </div>
        <p class="small-title">Faltan</p>
        <div class="countdown" aria-label="Cuenta regresiva para la boda">
          <div><strong>{{ countdown.days }}</strong><span>Días</span></div>
          <div><strong>{{ countdown.hours }}</strong><span>Horas</span></div>
          <div><strong>{{ countdown.minutes }}</strong><span>Min</span></div>
          <div><strong>{{ countdown.seconds }}</strong><span>Seg</span></div>
        </div>
      </section>

      <section id="ubicacion" class="location-panel paper-panel">
        <article>
          <span class="line-icon">⛪︎</span>
          <h2>Ceremonia religiosa</h2>
          <p>Iglesia Nazareth</p>
          <p class="address">Benito Juárez 2521_O BODEGA, Guadalupe Victoria, 67185 Guadalupe, N.L., México</p>
          <a
            class="outline-button"
            href="https://maps.app.goo.gl/mAJFZohFNTKjge837"
            target="_blank"
            rel="noreferrer"
          >
            Ver ubicación
          </a>
        </article>
      </section>

      <section id="ubicacion" class="location-panel paper-panel">
        <article>
          <span class="line-icon">⌂</span>
          <h2>Recepción</h2>
          <p>Olimpo Eventos Vista Hermosa</p>
          <p class="address">1a Avenida 207, Cumbres 1er sector, 64610 Monterrey, N.L., México</p>
          <a
            class="outline-button"
            href="https://maps.app.goo.gl/Ebvgo4FTQY6mZW8y5"
            target="_blank"
            rel="noreferrer"
          >
            Ver ubicación
          </a>
        </article>
      </section>

      <section id="itinerario" class="itinerary-panel paper-panel">
        <h2>Itinerario de actividades</h2>
        <div class="timeline">
          <article v-for="[time, label] in itinerary" :key="`${time}-${label}`">
            <time>{{ time }}</time>
            <span></span>
            <p>{{ label }}</p>
          </article>
        </div>
        <img :src="itineraryPhoto" alt="Vivian y Alexis tomados de la mano">
      </section>

      <section class="memory-panel paper-panel">
        <img :src="memoryPhoto" alt="Vivian y Alexis en el jardín">
      </section>

      <section id="detalles" class="details-panel paper-panel">
        <h2>Código de vestimenta</h2>
        <p class="dress-subtitle">Formal</p>
        <div class="dress-code">
          <p><strong>Mujeres:</strong> vestido largo, no blanco ni gama De Color Morado.</p>
          <p><strong>Hombres:</strong> No trajes de Color Gris Oscuro.</p>
        </div>

        <div class="recommendations">
          <h3>Evento Sin niños</h3>
          <p>Aunque amamos a los niños, nuestra celebración será exclusiva para adultos.</p>
        </div>
      </section>

      <section class="gift-panel lavender-panel">
        <span class="gift-icon">𖠩</span>
        <h2>Sugerencia de regalo</h2>
        <p>Tu compañía es lo más importante. Si desean hacernos un obsequio, lo recibiremos con mucho cariño.</p>
        <a
          class="light-button"
          href="https://www.amazon.com.mx/wedding/guest-view/2BV6GEGBGD031"
          target="_blank"
          rel="noreferrer"
        >
          Mesa Amazon
        </a>
        <div class="envelope-note">
          <strong>Efectivo</strong>
          <span>Encontrarás nuestro Buzón de sobres el día del evento.</span>
        </div>
      </section>

      <section id="confirmar" class="confirm-panel lavender-panel">
        <span class="calendar-icon">♡</span>
        <h2>Confirmación</h2>
        <p>Agradecemos que confirmes tu asistencia.</p>

        <form id="rsvpForm2" @submit.prevent="submitRsvp">
          <label class="honeypot-field" aria-hidden="true">
            No llenar este campo
            <input v-model="rsvpForm.website" name="website" tabindex="-1" autocomplete="off">
          </label>
          <label>
            Tu nombre*
            <input v-model="rsvpForm.nombre" name="nombre" required autocomplete="name">
          </label>
          <fieldset>
            <legend>¿Asistirás?*</legend>
            <label class="radio-card">
              <input
                v-model="rsvpForm.asistencia"
                type="radio"
                name="asistencia"
                value="¡Absolutamente! No me lo perdería."
                required
              >
              <span>¡Absolutamente! No me lo perdería.</span>
            </label>
            <label class="radio-card">
              <input
                v-model="rsvpForm.asistencia"
                type="radio"
                name="asistencia"
                value="No podré asistir esta vez."
              >
              <span>No podré asistir esta vez.</span>
            </label>
          </fieldset>
          <label>
            Número de invitados que asistirán. <br>(Por favor, ingresa el número exacto de lugares Reservados en tu Invitación. <br> No será posible Registrar un Número mayor.)*
            <input v-model="rsvpForm.invitados" name="invitados" inputmode="numeric" required>
          </label>
          <label>
            Nomina una canción para nuestra Playlist
            <input v-model="rsvpForm.cancion" name="cancion">
          </label>
          <label>
            Tienes alguna restricción alimentaria?
            <textarea v-model="rsvpForm.restriccion" name="restriccion" rows="4"></textarea>
          </label>
          <button class="light-button answer-button" type="submit" :disabled="submitting">
            {{ submitting ? "Enviando..." : "Responder ahora" }}
          </button>

          <p><strong>Fecha Limite de Registro: <br>16 de Agosto del 2026</strong></p>
          <p class="privacy-note">
            Solo se Compartiran los Datos Solicitados del formulario, No agregues información no deseada, ni Datos Sensibles.
          </p>
        </form>
        <p id="formNote2" class="form-note" aria-live="polite">{{ formNote }}</p>
      </section>

      <footer class="site-signature">
        <span>This website was made by</span>
        <strong>Alexis Roman</strong>
      </footer>
    </main>
  </div>
</template>
