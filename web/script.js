const contentEl = document.getElementById('content');
const glossaryEl = document.getElementById('glossary-content');
const modeRadios = document.querySelectorAll('input[name="mode"]');

const state = {
  mode: 'both',
};

function updateMode(newMode) {
  state.mode = newMode;
  contentEl.dataset.mode = newMode;

  modeRadios.forEach((radio) => {
    radio.checked = radio.value === newMode;
  });
}

modeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    updateMode(radio.value);
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

function renderContent(entries) {
  entries.forEach((entry) => {
    const pair = document.createElement('article');
    pair.classList.add('paragraph-pair');
    pair.dataset.type = entry.type;

    const danish = createColumn(entry.danish, entry.type, 'da');
    const german = createColumn(entry.german, entry.type, 'de');

    pair.append(danish, german);
    contentEl.appendChild(pair);
  });
}

function renderGlossary(glossaryHtml) {
  glossaryEl.innerHTML = glossaryHtml;
}

async function init() {
  try {
    const response = await fetch('translation-data.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
    }
    const data = await response.json();
    renderGlossary(data.glossary);
    renderContent(data.entries);
    updateMode('both');
  } catch (error) {
    const message = document.createElement('p');
    message.textContent = 'Die Inhalte konnten nicht geladen werden.';
    contentEl.appendChild(message);
    console.error(error);
  }
}

init();
