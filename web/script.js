const contentEl = document.getElementById('content');
const glossaryEl = document.getElementById('glossary-content');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const tocListEl = document.getElementById('toc-list');
const tocToggleButton = document.getElementById('toc-toggle');
const tocPanel = document.getElementById('toc-panel');
const glossaryToggleButton = document.getElementById('glossary-toggle');
const glossaryPanel = document.getElementById('glossary-panel');
const footnotesEl = document.getElementById('footnotes-content');
const headerEl = document.querySelector('.site-header');

const TOC_LABEL_CLOSED = 'Inhaltsverzeichnis anzeigen';
const TOC_LABEL_OPEN = 'Inhaltsverzeichnis verbergen';
const GLOSSARY_LABEL_CLOSED = 'Glossar anzeigen';
const GLOSSARY_LABEL_OPEN = 'Glossar verbergen';

const state = {
  mode: 'both',
  footnotes: {},
};

function updateHeaderHeight() {
  if (!headerEl) return;
  const height = headerEl.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-height', `${height}px`);
}

function toggleCollapsible(button, panel, labelWhenClosed, labelWhenOpen) {
  const isOpen = panel.classList.toggle('is-open');
  button.setAttribute('aria-expanded', isOpen.toString());
  button.textContent = isOpen ? labelWhenOpen : labelWhenClosed;
}

function setCollapsibleState(button, panel, shouldOpen, labelWhenClosed, labelWhenOpen) {
  panel.classList.toggle('is-open', shouldOpen);
  button.setAttribute('aria-expanded', shouldOpen.toString());
  button.textContent = shouldOpen ? labelWhenOpen : labelWhenClosed;
}
function syncToggleLabel(button, panel, labelWhenClosed, labelWhenOpen) {
  const isOpen = panel.classList.contains('is-open');
  button.setAttribute('aria-expanded', isOpen.toString());
  button.textContent = isOpen ? labelWhenOpen : labelWhenClosed;
}

function updateMode(newMode) {
  state.mode = newMode;
  contentEl.dataset.mode = newMode;

  modeRadios.forEach((radio) => {
    radio.checked = radio.value === newMode;
  });

  buildTableOfContents();
}

modeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    updateMode(radio.value);
  });
});

function stripHtml(text) {
  const temp = document.createElement('div');
  temp.innerHTML = text;
  return temp.textContent || '';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 80);
}

function attachAnchor(pair, entry, index) {
  if (entry.type !== 'section' && entry.type !== 'subsection') {
    return;
  }

  const anchorSource = entry.german?.[0] || entry.danish?.[0] || `abschnitt-${index}`;
  const anchorId = `${slugify(stripHtml(anchorSource)) || `abschnitt-${index}`}-${index}`;
  pair.id = anchorId;
}

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
  entries.forEach((entry, index) => {
    const pair = document.createElement('article');
    pair.classList.add('paragraph-pair');
    pair.dataset.type = entry.type;

    attachAnchor(pair, entry, index);

    const danish = createColumn(entry.danish, entry.type, 'da');
    const german = createColumn(entry.german, entry.type, 'de');

    pair.append(danish, german);
    contentEl.appendChild(pair);
  });
}

function renderGlossary(glossaryHtml) {
  glossaryEl.innerHTML = glossaryHtml;
}

function renderFootnotes(footnotes) {
  footnotesEl.innerHTML = '';
  state.footnotes = {};

  footnotes.forEach((note) => {
    state.footnotes[note.id] = note;
    const entry = document.createElement('article');
    entry.classList.add('footnote-entry');
    entry.id = `footnote-${note.id}`;

    const label = document.createElement('div');
    label.classList.add('footnote-label');
    label.textContent = note.id;

    const danish = document.createElement('div');
    danish.classList.add('language-text', 'lang-da');
    danish.innerHTML = `<p>${note.danish}</p>`;

    const german = document.createElement('div');
    german.classList.add('language-text', 'lang-de');
    german.innerHTML = `<p>${note.german}</p>`;

    entry.append(label, danish, german);
    footnotesEl.appendChild(entry);
  });
}

function enhanceFootnoteRefs() {
  const refs = contentEl.querySelectorAll('.footnote-ref');
  refs.forEach((ref) => {
    const id = ref.dataset.footnoteId;
    const note = state.footnotes[id];
    if (!note) return;

    ref.setAttribute('title', note.german || note.danish);
    ref.dataset.footnoteText = note.german || note.danish;
    ref.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById(`footnote-${id}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function buildTableOfContents() {
  if (!tocListEl) return;
  tocListEl.innerHTML = '';
  const items = Array.from(
    contentEl.querySelectorAll('.paragraph-pair[data-type="section"], .paragraph-pair[data-type="subsection"]'),
  );

  items.forEach((pair) => {
    const heading =
      pair.querySelector(
        state.mode === 'da'
          ? '.lang-da h2, .lang-da h3'
          : state.mode === 'de'
            ? '.lang-de h2, .lang-de h3'
            : '.lang-de h2, .lang-de h3',
      ) ||
      pair.querySelector('.lang-de h2, .lang-de h3') ||
      pair.querySelector('.lang-da h2, .lang-da h3') ||
      pair.querySelector('h2, h3');

    const text = heading ? heading.textContent?.trim() : 'Abschnitt';
    if (!pair.id) return;

    const listItem = document.createElement('li');
    listItem.classList.add(pair.dataset.type === 'subsection' ? 'is-subsection' : 'is-section');

    const link = document.createElement('a');
    link.href = `#${pair.id}`;
    link.textContent = text || 'Abschnitt';

    listItem.appendChild(link);
    tocListEl.appendChild(listItem);
  });
}

async function init() {
  try {
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    const response = await fetch('translation-data.json');
    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
    }
    const data = await response.json();
    renderGlossary(data.glossary);
    renderFootnotes(data.footnotes || []);
    renderContent(data.entries);
    updateMode('both');
    enhanceFootnoteRefs();
    buildTableOfContents();
    if (glossaryToggleButton && glossaryPanel) {
      syncToggleLabel(glossaryToggleButton, glossaryPanel, GLOSSARY_LABEL_CLOSED, GLOSSARY_LABEL_OPEN);
      glossaryToggleButton.addEventListener('click', () =>
        toggleCollapsible(glossaryToggleButton, glossaryPanel, GLOSSARY_LABEL_CLOSED, GLOSSARY_LABEL_OPEN),
      );
    }
    if (tocToggleButton && tocPanel) {
      syncToggleLabel(tocToggleButton, tocPanel, TOC_LABEL_CLOSED, TOC_LABEL_OPEN);
      tocToggleButton.addEventListener('click', () =>
        toggleCollapsible(tocToggleButton, tocPanel, TOC_LABEL_CLOSED, TOC_LABEL_OPEN),
      );

      tocListEl?.addEventListener('click', (event) => {
        if (!(event.target instanceof HTMLElement)) return;
        if (event.target.closest('a')) {
          setCollapsibleState(tocToggleButton, tocPanel, false, TOC_LABEL_CLOSED, TOC_LABEL_OPEN);
        }
      });
    }
  } catch (error) {
    const message = document.createElement('p');
    message.textContent = 'Die Inhalte konnten nicht geladen werden.';
    contentEl.appendChild(message);
    console.error(error);
  }
}

init();
