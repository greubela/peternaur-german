const contentEl = document.getElementById('content');
const dualHeader = document.getElementById('dual-header');
const singleHeader = document.getElementById('single-header');
const languageButtons = document.querySelectorAll('.language-button');

const state = {
  mode: 'both',
};

function updateMode(newMode) {
  state.mode = newMode;
  contentEl.dataset.mode = newMode;
  const showBoth = newMode === 'both';
  dualHeader.hidden = !showBoth;
  singleHeader.hidden = showBoth;

  languageButtons.forEach((button) => {
    const lang = button.dataset.lang;
    const isVisible = showBoth || lang === newMode;
    button.classList.toggle('is-muted', !showBoth && !isVisible);
    button.setAttribute('aria-pressed', showBoth ? 'false' : String(isVisible));
  });
}

function handleLanguageClick(lang) {
  if (state.mode === 'both') {
    updateMode(lang === 'da' ? 'de' : 'da');
  } else if (state.mode === lang) {
    updateMode('both');
  } else {
    updateMode('both');
  }
}

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    handleLanguageClick(button.dataset.lang);
  });
});

function createColumn(paragraphs, type, lang) {
  const column = document.createElement('div');
  column.classList.add('language-text', `lang-${lang}`);

  if (type === 'section') {
    const heading = document.createElement('h2');
    heading.innerHTML = paragraphs[0] ?? '';
    column.appendChild(heading);
  } else if (type === 'subsection') {
    const heading = document.createElement('h3');
    heading.innerHTML = paragraphs[0] ?? '';
    column.appendChild(heading);
  } else {
    paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.innerHTML = text;
      column.appendChild(paragraph);
    });
  }

  return column;
}

function renderContent(data) {
  data.forEach((entry) => {
    const pair = document.createElement('article');
    pair.classList.add('paragraph-pair');
    pair.dataset.type = entry.type;

    const danish = createColumn(entry.danish, entry.type, 'da');
    const german = createColumn(entry.german, entry.type, 'de');

    pair.append(danish, german);
    contentEl.appendChild(pair);
  });
}

async function init() {
  try {
    const response = await fetch('translation-data.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
    }
    const data = await response.json();
    renderContent(data);
    updateMode('both');
  } catch (error) {
    const message = document.createElement('p');
    message.textContent = 'Die Inhalte konnten nicht geladen werden.';
    contentEl.appendChild(message);
    console.error(error);
  }
}

init();
