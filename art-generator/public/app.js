const form = document.getElementById('generate-form');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('error');
const loadingEl = document.getElementById('loading');
const galleryEl = document.getElementById('gallery');
const historyEl = document.getElementById('history');
const historyTitleEl = document.getElementById('history-title');

const HISTORY_KEY = 'art-generator-history';
const HISTORY_LIMIT = 20;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
}

function createCard(imageSrc, prompt) {
  const card = document.createElement('div');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = prompt;

  const footer = document.createElement('div');
  footer.className = 'card__footer';

  const promptText = document.createElement('span');
  promptText.className = 'card__prompt';
  promptText.title = prompt;
  promptText.textContent = prompt;

  const downloadLink = document.createElement('a');
  downloadLink.href = imageSrc;
  downloadLink.download = 'arte-gerada.png';
  downloadLink.textContent = 'Baixar';

  footer.append(promptText, downloadLink);
  card.append(img, footer);
  return card;
}

function renderHistory() {
  const history = loadHistory();
  historyEl.innerHTML = '';
  historyTitleEl.hidden = history.length === 0;
  history.forEach((item) => historyEl.appendChild(createCard(item.image, item.prompt)));
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');

  const formData = new FormData(form);
  const prompt = formData.get('prompt').trim();
  const size = formData.get('size');
  const quality = formData.get('quality');
  const n = Number(formData.get('n'));

  if (!prompt) {
    showError('Descreva a arte que você quer gerar.');
    return;
  }

  submitBtn.disabled = true;
  loadingEl.hidden = false;
  galleryEl.innerHTML = '';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size, quality, n }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Não foi possível gerar a imagem.');
    }

    const history = loadHistory();
    data.images.forEach((imageSrc) => {
      galleryEl.appendChild(createCard(imageSrc, prompt));
      history.unshift({ image: imageSrc, prompt });
    });
    saveHistory(history);
    renderHistory();
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    loadingEl.hidden = true;
  }
});

renderHistory();
