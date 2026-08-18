/* ═══════════════════════════════════════════════════════════════════
   APP.JS — Main application controller
   FlashCard Pro
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── CONFIG ─────────────────────────────────────────────────────────── */
const DECK_ICONS   = ['📚','🧠','🌍','💬','🔢','⚗️','🎨','🎵','💻','📖','🏋️','🌱','⚡','🔬','📐','🗣️','🎯','🏛️'];
const DECK_COLORS  = ['#00ff88','#00cfff','#ff4da6','#ff9f40','#a78bfa','#ffd700','#ff3d5a','#34d399','#f472b6','#60a5fa'];

/* ── APP STATE ──────────────────────────────────────────────────────── */
const App = {
  currentView:    'home',
  currentDeckId:  null,
  currentDeckTab: 'cards',
  settings: {
    dailyNew:    20,
    dailyReview: 100,
    timer:       true,
    autoReveal:  0,
    theme:       'dark',
    fontSize:    'md',
    animations:  true,
    bionicReading: false,
    bionicColor: '',
  },
  deckModal: {
    mode:    'create',   // create | edit
    deckId:  null,
    icon:    '📚',
    color:   '#00ff88',
  },
  cardModal: {
    mode:    'create',
    cardId:  null,
    deckId:  null,
    type:    'basic',
  },
};

/* ── SESSION STATE ──────────────────────────────────────────────────── */
const Session = {
  active:      false,
  deckId:      null,
  queue:       [],
  index:       0,
  flipped:     false,
  timerStart:  0,
  timerVal:    0,
  timerIv:     null,
  autoRevealTm:null,
  data:        null,
  gradeHistory:[],
  // New
  mode:           'srs',
  undoStack:      [],
  timedSec:       30,
  timedIv:        null,
  timedLeft:      30,
  confidence:     0,       // 1-5 chosen before flip
  typedAnswer:    '',      // typed before flip
  spacedReading:  false,   // spaced reading mode toggle
  spacedIv:       null,
  spacedSec:      5,       // seconds to read before flip enabled
};

// Voice recognition
let voiceRecog      = null;
let voiceActive     = false;
let typeAnswerVisible = false;

// Relationship state
const RelState = {
  cardId:   null,
  linked:   [],           // array of cardIds
};

// Quiz state (separate from Session)
const Quiz = {
  active:    false,
  deckId:    null,
  cards:     [],
  index:     0,
  score:     0,
  answered:  false,
};

/* ── DOM CACHE ──────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const D = {
  // Views
  views:             document.querySelectorAll('.view'),
  navItems:          document.querySelectorAll('.nav-item[data-view]'),

  // Sidebar
  sidebar:           $('sidebar'),
  sidebarToggle:     $('sidebarToggle'),
  menuBtn:           $('menuBtn'),
  deckListSidebar:   $('deckListSidebar'),
  globalSearch:      $('globalSearch'),
  themeToggle:       $('themeToggle'),
  breadcrumb:        $('breadcrumb'),
  streakCount:       $('streakCount'),

  // Home
  heroDueCount:      $('heroDueCount'),
  homeTotalCards:    $('homeTotalCards'),
  homeDueToday:      $('homeDueToday'),
  homeReviewed:      $('homeReviewed'),
  homeRetention:     $('homeRetention'),
  homeStreak:        $('homeStreak'),
  homeDeckGrid:      $('homeDeckGrid'),
  homeDeckEmpty:     $('homeDeckEmpty'),
  studyAllBtn:       $('studyAllBtn'),
  newDeckBtnHome:    $('newDeckBtnHome'),
  createFirstDeck:   $('createFirstDeck'),

  // Decks view
  decksGrid:         $('decksGrid'),
  deckFilter:        $('deckFilter'),
  newDeckBtnDecks:   $('newDeckBtnDecks'),
  newDeckBtn:        $('newDeckBtn'),
  importBtn:         $('importBtn'),

  // Deck Detail
  deckDetailHeader:  $('deckDetailHeader'),
  deckDetailIcon:    $('deckDetailIcon'),
  deckDetailName:    $('deckDetailName'),
  deckDetailDesc:    $('deckDetailDesc'),
  editDeckBtn:       $('editDeckBtn'),
  deleteDeckBtn:     $('deleteDeckBtn'),
  exportDeckBtn:     $('exportDeckBtn'),
  studyDeckBtn:      $('studyDeckBtn'),
  deckTabs:          $('deckTabs'),
  cardSearch:        $('cardSearch'),
  addCardBtn:        $('addCardBtn'),
  addCardBtnHeader:  $('addCardBtnHeader'),
  cardDeckSelect:    $('cardDeckSelect'),
  cardList:          $('cardList'),
  srsNew:            $('srsNew'),
  srsLearning:       $('srsLearning'),
  srsReview:         $('srsReview'),
  srsDue:            $('srsDue'),
  srsMature:         $('srsMature'),

  // Browse
  browseTableBody:   $('browseTableBody'),
  browseDeckFilter:  $('browseDeckFilter'),
  browseStateFilter: $('browseStateFilter'),
  browseSearch:      $('browseSearch'),

  // Stats view
  statsStreak:       $('statsStreak'),
  statsTotalReviews: $('statsTotalReviews'),
  statsRetention:    $('statsRetention'),
  statsAvgDay:       $('statsAvgDay'),
  heatmapContainer:  $('heatmapContainer'),

  // Settings
  settingDailyNew:   $('settingDailyNew'),
  settingDailyReview:$('settingDailyReview'),
  settingTimer:      $('settingTimer'),
  settingAutoReveal: $('settingAutoReveal'),
  settingTheme:      $('settingTheme'),
  settingFontSize:   $('settingFontSize'),
  settingAnimations: $('settingAnimations'),
  settingBionicReading: $('settingBionicReading'),
  settingBionicColor: $('settingBionicColor'),
  clearBionicColorBtn: $('clearBionicColorBtn'),
  exportAllBtn:      $('exportAllBtn'),
  importDeckBtn:     $('importDeckBtn'),
  resetAllBtn:       $('resetAllBtn'),

  // Deck modal
  deckModal:         $('deckModal'),
  deckModalTitle:    $('deckModalTitle'),
  deckModalClose:    $('deckModalClose'),
  deckModalCancel:   $('deckModalCancel'),
  deckModalSave:     $('deckModalSave'),
  deckName:          $('deckName'),
  deckDesc:          $('deckDesc'),
  deckDailyNew:      $('deckDailyNew'),
  deckDailyReview:   $('deckDailyReview'),
  iconPicker:        $('iconPicker'),
  colorPicker:       $('colorPicker'),

  // Card modal
  cardModal:         $('cardModal'),
  cardModalTitle:    $('cardModalTitle'),
  cardModalClose:    $('cardModalClose'),
  cardModalCancel:   $('cardModalCancel'),
  cardModalSave:     $('cardModalSave'),
  cardModalSaveAnother: $('cardModalSaveAnother'),
  cardTypeToggle:    $('cardTypeToggle'),
  basicReversedFields: $('basicReversedFields'),
  clozeFields:       $('clozeFields'),
  occlusionFields:   $('occlusionFields'),
  occImgInput:       $('occImgInput'),
  occEditorWrap:     $('occEditorWrap'),
  occEditorImg:      $('occEditorImg'),
  occEditorBoxes:    $('occEditorBoxes'),
  occClearBtn:       $('occClearBtn'),
  cardFrontEditor:   $('cardFrontEditor'),
  cardBackEditor:    $('cardBackEditor'),
  clozeEditor:       $('clozeEditor'),
  cardTags:          $('cardTags'),
  cardModalNotes:    $('cardModalNotes'),

  // Confirm modal
  confirmModal:      $('confirmModal'),
  confirmTitle:      $('confirmTitle'),
  confirmMsg:        $('confirmMsg'),
  confirmClose:      $('confirmClose'),
  confirmCancel:     $('confirmCancel'),
  confirmOk:         $('confirmOk'),

  // Study overlay
  studyOverlay:      $('studyOverlay'),
  studyClose:        $('studyClose'),
  studyDeckName:     $('studyDeckName'),
  studyProgressFill: $('studyProgressFill'),
  studyProgressLabel:$('studyProgressLabel'),
  scNew:             $('scNew'),
  scLearning:        $('scLearning'),
  scReview:          $('scReview'),
  flashcard:         $('flashcard'),
  flashcardInner:    $('flashcardInner'),
  cardFrontContent:  $('cardFrontContent'),
  cardBackContent:   $('cardBackContent'),
  cardFrontTags:     $('cardFrontTags'),
  cardNotesTxt:      $('cardNotes'),
  cardTypeBadge:     $('cardTypeBadge'),
  studyTimer:        $('studyTimer'),
  flipBtn:           $('flipBtn'),
  gradeRow:          $('gradeRow'),
  studyFlagBtn:      $('studyFlagBtn'),
  studySuspendBtn:   $('studySuspendBtn'),
  studyEditBtn:      $('studyEditBtn'),

  // Summary
  summaryOverlay:    $('summaryOverlay'),
  sumTotal:          $('sumTotal'),
  sumDuration:       $('sumDuration'),
  sumAccuracy:       $('sumAccuracy'),
  sumAgain:          $('sumAgain'),
  sumHard:           $('sumHard'),
  sumGood:           $('sumGood'),
  sumEasy:           $('sumEasy'),
  summaryStudyMore:  $('summaryStudyMore'),
  summaryDone:       $('summaryDone'),

  // Misc
  toastContainer:    $('toastContainer'),
  fileInput:         $('fileInput'),

  // Bulk modal
  bulkModal:          $('bulkModal'),
  bulkModalClose:     $('bulkModalClose'),
  bulkModalCancel:    $('bulkModalCancel'),
  bulkModalSave:      $('bulkModalSave'),
  bulkText:           $('bulkText'),
  bulkPreview:        $('bulkPreview'),
  bulkCount:          $('bulkCount'),
  bulkImportBtn:      $('bulkImportBtn'),
  bulkAddBtn:         $('bulkAddBtn'),
  templatePicker:     $('templatePicker'),
  bulkDeckSelect:     $('bulkDeckSelect'),
  bulkDeckLabel:      $('bulkDeckLabel'),
  bulkDeckRow:        $('bulkDeckRow'),
  bulkDeckSelectRow:  $('bulkDeckSelectRow'),
  bulkSeparator:      $('bulkSeparator'),

  // Share modal
  shareModal:        $('shareModal'),
  shareModalClose:   $('shareModalClose'),
  shareModalClose2:  $('shareModalClose2'),
  shareUrl:          $('shareUrl'),
  copyShareUrl:      $('copyShareUrl'),
  shareDeckBtn:      $('shareDeckBtn'),

  // Study mode
  studyModeBadge:    $('studyModeBadge'),
  studyTtsBtn:       $('studyTtsBtn'),
  studyUndoBtn:      $('studyUndoBtn'),
  studyTimedBar:     $('studyTimedBar'),
  timedBarFill:      $('timedBarFill'),
  timedBarLabel:     $('timedBarLabel'),

  // Quiz
  quizOverlay:       $('quizOverlay'),
  quizClose:         $('quizClose'),
  quizDeckName:      $('quizDeckName'),
  quizProgressFill:  $('quizProgressFill'),
  quizProgressLabel: $('quizProgressLabel'),
  quizQuestion:      $('quizQuestion'),
  quizChoices:       $('quizChoices'),
  quizFeedback:      $('quizFeedback'),
  quizScore:         $('quizScore'),

  // Hero mode buttons
  cramAllBtn:        $('cramAllBtn'),
  timedAllBtn:       $('timedAllBtn'),
  quizAllBtn:        $('quizAllBtn'),
  cramDeckBtn:       $('cramDeckBtn'),
  timedDeckBtn:      $('timedDeckBtn'),
  quizDeckBtn:       $('quizDeckBtn'),

  // Preview
  previewFrontContent: $('previewFrontContent'),
  previewBackContent:  $('previewBackContent'),

  // Notify
  notifyBtn:         $('notifyBtn'),

  // Confetti
  confettiCanvas:    $('confettiCanvas'),

  // XP
  xpLevel:           $('xpLevel'),
  xpBarFill:         $('xpBarFill'),
  xpLabel:           $('xpLabel'),

  // Confidence
  confidencePanel:   $('confidencePanel'),

  // Type answer
  typeAnswerWrap:      $('typeAnswerWrap'),
  typeAnswerInput:     $('typeAnswerInput'),
  answerComparison:    $('answerComparison'),
  voiceInputBtn:       $('voiceInputBtn'),
  typeToggleBtn:       $('typeToggleBtn'),
  typeAnswerBelowCard: $('typeAnswerBelowCard'),

  // Spaced reading
  spacedReadingBar:  $('spacedReadingBar'),
  spacedReadingFill: $('spacedReadingFill'),
  spacedReadingLabel:$('spacedReadingLabel'),
  studySpacedBtn:    $('studySpacedBtn'),
  studyScratchpadBtn:$('studyScratchpadBtn'),
  scratchpadClearBtn:$('scratchpadClearBtn'),
  scratchpadCanvas:  $('scratchpadCanvas'),

  // Mistakes view
  mistakesDeckFilter:$('mistakesDeckFilter'),
  mistakesTagFilter: $('mistakesTagFilter'),
  mistakesOverview:  $('mistakesOverview'),
  mistakesList:      $('mistakesList'),
  mistakesCount:     $('mistakesCount'),
  tagWeaknessGrid:   $('tagWeaknessGrid'),

  // Relationships
  relModal:          $('relModal'),
  relModalClose:     $('relModalClose'),
  relModalClose2:    $('relModalClose2'),
  relCurrentCard:    $('relCurrentCard'),
  relSearch:         $('relSearch'),
  relSearchResults:  $('relSearchResults'),
  relLinkedList:     $('relLinkedList'),
  relatedCardsPanel: $('relatedCardsPanel'),
  relatedCardsList:  $('relatedCardsList'),
  studyRelBtn:       $('studyRelBtn'),

  // Pomodoro
  pomoToggle:        $('pomoToggle'),
  pomoTime:          $('pomoTime'),

  // Study new
  studyFocusBtn:     $('studyFocusBtn'),
  focusExitBtn:      $('focusExitBtn'),
  hintBtn:           $('hintBtn'),
  hintText:          $('hintText'),
  leechBadge:        $('leechBadge'),

  // Subdecks
  deckParent:        $('deckParent'),
  subdecksSection:   $('subdecksSection'),
  subdeckGrid:       $('subdeckGrid'),
  addSubdeckBtn:     $('addSubdeckBtn'),
  studyAllSubBtn:    $('studyAllSubBtn'),

  // Card hint field
  cardHint:          $('cardHint'),

  // History modal
  historyModal:      $('historyModal'),
  historyModalClose: $('historyModalClose'),
  historyCardPreview:$('historyCardPreview'),
  historyStatsRow:   $('historyStatsRow'),
  historyTimeline:   $('historyTimeline'),
};

/* ════════════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════════════ */
async function init() {
  await Storage.init();
  await loadSettings();
  applyTheme(App.settings.theme);
  buildIconPicker();
  buildColorPicker();
  setupVoiceInput();
  bindEvents();
  await navigateTo('home');
  await refreshSidebar();
  await refreshStreak();
  await loadXPBar();
  await checkUrlImport();
}

/* ── SETTINGS ────────────────────────────────────────────────────────── */
async function loadSettings() {
  const saved = await Storage.Settings.getAll();
  Object.assign(App.settings, saved);
  D.settingDailyNew.value    = App.settings.dailyNew;
  D.settingDailyReview.value = App.settings.dailyReview;
  D.settingTimer.checked     = App.settings.timer;
  D.settingAutoReveal.value  = App.settings.autoReveal;
  D.settingTheme.value       = App.settings.theme;
  D.settingFontSize.value    = App.settings.fontSize;
  D.settingAnimations.checked= App.settings.animations;
  D.settingBionicReading.checked = App.settings.bionicReading;
  if (App.settings.bionicColor) {
    D.settingBionicColor.value = App.settings.bionicColor;
    document.documentElement.style.setProperty('--bionic-color', App.settings.bionicColor);
  } else {
    D.settingBionicColor.value = '#000000';
    document.documentElement.style.setProperty('--bionic-color', 'inherit');
  }
  D.themeToggle.checked      = App.settings.theme === 'light' || App.settings.theme === 'glass-light';
}

async function saveSetting(key, value) {
  App.settings[key] = value;
  await Storage.Settings.set(key, value);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  D.themeToggle.checked   = theme === 'light' || theme === 'glass-light';
  D.settingTheme.value    = theme;
}

/* ── NAVIGATION ──────────────────────────────────────────────────────── */
async function navigateTo(view, deckId) {
  App.currentView   = view;
  App.currentDeckId = deckId || null;

  // Hide all views
  D.views.forEach(v => v.classList.remove('active'));
  D.navItems.forEach(n => n.classList.remove('active'));

  // Show target
  const viewEl = $(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navEl) navEl.classList.add('active');

  // Update breadcrumb
  updateBreadcrumb(view, deckId);

  // Load view data
  switch(view) {
    case 'home':        await loadHome();            break;
    case 'decks':       await loadDecks();           break;
    case 'deck-detail': await loadDeckDetail(deckId);break;
    case 'stats':       await loadStats();           break;
    case 'browse':      await loadBrowse();          break;
    case 'mistakes':    await loadMistakes();        break;
    case 'settings':    /* already loaded */         break;
  }

  // Mobile: close sidebar
  if (window.innerWidth <= 680) {
    D.sidebar.classList.remove('mobile-open');
  }
}

function updateBreadcrumb(view, deckId) {
  const labels = {
    home:        'Home',
    decks:       'My Decks',
    stats:       'Statistics',
    browse:      'Browse',
    mistakes:    '🎯 Mistakes',
    settings:    'Settings',
    'deck-detail': '…',
  };
  let html = `<span class="bc-item active">${labels[view] || view}</span>`;
  if (view === 'deck-detail' && deckId) {
    html = `<span class="bc-item" style="cursor:pointer" onclick="navigateTo('decks')">My Decks</span>
            <span class="bc-sep">›</span>
            <span class="bc-item active" id="bcDeckName">…</span>`;
  }
  D.breadcrumb.innerHTML = html;
}

/* ── HOME ────────────────────────────────────────────────────────────── */
async function loadHome() {
  const [decks, allCards] = await Promise.all([
    Storage.Decks.getAll(),
    Storage.Cards.getAll(),
  ]);

  const dueCards      = allCards.filter(c => !c.suspended && SRS.isDue(c));
  const reviewedToday = await getReviewedToday();

  // Retention
  const reviewed = allCards.filter(c => c.repetitions > 0);
  const retention = reviewed.length
    ? Math.round(reviewed.reduce((s,c) => s + SRS.retentionRate(c), 0) / reviewed.length * 100)
    : null;

  D.heroDueCount.textContent  = dueCards.length;
  D.homeTotalCards.textContent= allCards.length;
  D.homeDueToday.textContent  = dueCards.length;
  D.homeReviewed.textContent  = reviewedToday;
  D.homeRetention.textContent = retention !== null ? `${retention}%` : '—';

  // Streak
  const streak = await Storage.History.getStreak();
  D.homeStreak.textContent = streak;

  // Deck grid
  const rootDecks = decks.filter(d => !d.parentId);
  const recentDeck = { id: 'recent', name: 'Recent', icon: '🕒', color: '#00cfff', description: 'Recently studied cards' };
  renderDeckGrid(D.homeDeckGrid, [...rootDecks, recentDeck], allCards, D.homeDeckEmpty);
}

async function getReviewedToday() {
  const sessions = await Storage.Sessions.getAll();
  const today    = new Date(); today.setHours(0,0,0,0);
  return sessions
    .filter(s => s.date >= today.getTime())
    .reduce((sum, s) => sum + s.cards.length, 0);
}

/* ── DECKS VIEW ──────────────────────────────────────────────────────── */
async function loadDecks() {
  const [decks, allCards] = await Promise.all([
    Storage.Decks.getAll(),
    Storage.Cards.getAll(),
  ]);
  const rootDecks = decks.filter(d => !d.parentId);
  const recentDeck = { id: 'recent', name: 'Recent', icon: '🕒', color: '#00cfff', description: 'Recently studied cards' };
  renderDeckGrid(D.decksGrid, [...rootDecks, recentDeck], allCards, null);
}

/* ── RENDER DECK GRID ────────────────────────────────────────────────── */
function renderDeckGrid(container, decks, allCards, emptyEl) {
  // Clear non-empty children
  Array.from(container.children).forEach(c => {
    if (!c.classList.contains('deck-empty-state')) c.remove();
  });

  if (!decks.length) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // Sort Decks: Recent -> Pinned -> Unpinned (by newest)
  const sortedDecks = [...decks].sort((a, b) => {
    if (a.id === 'recent') return -1;
    if (b.id === 'recent') return 1;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  sortedDecks.forEach(deck => {
    if (deck.id === 'recent') {
      const recentDecksCount = new Set(allCards.filter(c => c.lastReview).map(c => c.deckId)).size;
      const card = document.createElement('div');
      card.className = 'deck-card';
      card.style.setProperty('--deck-color', deck.color);
      card.dataset.deckId = deck.id;
      card.innerHTML = `
        <div class="deck-card-header">
          <div class="deck-card-icon">${deck.icon}</div>
        </div>
        <div class="deck-card-name">${escHtml(deck.name)}</div>
        <div class="deck-card-desc">${escHtml(deck.description || '')}</div>
        <div class="deck-card-srs">
          <span class="srs-tag review" style="background:var(--accent-dim);color:var(--accent)">${recentDecksCount} Active Decks</span>
        </div>
        <div class="deck-card-progress">
          <div class="deck-card-progress-fill" style="width:100%"></div>
        </div>
        <div class="deck-card-footer">
          <span class="deck-card-count">Jump back into recent activity</span>
        </div>`;
      card.addEventListener('click', () => navigateTo('deck-detail', deck.id));
      container.appendChild(card);
      return;
    }

    const deckCards = allCards.filter(c => c.deckId === deck.id);
    const stats     = SRS.deckStats(deckCards);
    const due       = stats.due;
    const pct       = deckCards.length
      ? Math.round((stats.mature / deckCards.length) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'deck-card';
    card.style.setProperty('--deck-color', deck.color);
    card.dataset.deckId = deck.id;
    card.innerHTML = `
      <div class="deck-card-header">
        <div class="deck-card-icon">${deck.icon}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="deck-pin-dot ${deck.pinned ? 'pinned' : ''}" data-pin-deck="${deck.id}" title="Toggle Pin"></div>
          <button class="deck-card-menu" data-deck-menu="${deck.id}" title="Options">⋯</button>
        </div>
      </div>
      <div class="deck-card-name">${escHtml(deck.name)}</div>
      <div class="deck-card-desc">${escHtml(deck.description || 'No description')}</div>
      <div class="deck-card-srs">
        <span class="srs-tag new">${stats.new} new</span>
        <span class="srs-tag learning">${stats.learning} lrn</span>
        <span class="srs-tag review">${stats.review} rev</span>
      </div>
      <div class="deck-card-progress">
        <div class="deck-card-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="deck-card-footer">
        <span class="deck-card-count">${deckCards.length} cards · ${pct}% mature</span>
        <span class="deck-card-due ${due ? '' : 'none'}">${due ? `${due} due` : 'Up to date ✓'}</span>
      </div>`;

    card.addEventListener('click', e => {
      if (e.target.closest('[data-deck-menu]') || e.target.closest('[data-pin-deck]')) return;
      navigateTo('deck-detail', deck.id);
    });

    card.querySelector('[data-pin-deck]').addEventListener('click', async e => {
      e.stopPropagation();
      await Storage.Decks.update(deck.id, { pinned: !deck.pinned });
      if (App.currentView === 'home') loadHome();
      else if (App.currentView === 'decks') loadDecks();
    });

    card.querySelector('[data-deck-menu]').addEventListener('click', e => {
      e.stopPropagation();
      showDeckContextMenu(e, deck);
    });

    container.appendChild(card);
  });
}

/* ── DECK DETAIL ─────────────────────────────────────────────────────── */
async function loadDeckDetail(deckId) {
  if (!deckId) return;

  let deck, cards = [];
  if (deckId === 'recent') {
    deck = { id: 'recent', name: 'Recent Decks', icon: '🕒', color: '#00cfff', description: 'Quick access to your active decks' };
  } else {
    deck = await Storage.Decks.get(deckId);
    cards = await Storage.Cards.getByDeck(deckId);
  }

  if (!deck) return navigateTo('decks');

  App.currentDeckId = deckId;

  if (deckId === 'recent') {
    D.editDeckBtn.style.display = 'none';
    D.deleteDeckBtn.style.display = 'none';
    D.exportDeckBtn.style.display = 'none';
    D.shareDeckBtn.style.display = 'none';
    D.bulkAddBtn.style.display = 'none';
    D.addCardBtn.style.display = 'none';
    D.cramDeckBtn.style.display = 'none';
    D.timedDeckBtn.style.display = 'none';
    D.quizDeckBtn.style.display = 'none';
    D.studyDeckBtn.style.display = 'none';
    D.deckTabs.parentElement.style.display = 'none';
    D.cardList.style.display = 'none';
  } else {
    D.editDeckBtn.style.display = '';
    D.deleteDeckBtn.style.display = '';
    D.exportDeckBtn.style.display = '';
    D.shareDeckBtn.style.display = '';
    D.bulkAddBtn.style.display = '';
    D.addCardBtn.style.display = '';
    D.cramDeckBtn.style.display = '';
    D.timedDeckBtn.style.display = '';
    D.quizDeckBtn.style.display = '';
    D.studyDeckBtn.style.display = '';
    D.deckTabs.parentElement.style.display = 'flex';
    D.cardList.style.display = 'flex';
  }

  // Breadcrumb — show parent if this is a subdeck
  const bcName = $('bcDeckName');
  if (bcName) bcName.textContent = deck.name;
  if (deck.parentId) {
    const parent = await Storage.Decks.get(deck.parentId);
    if (parent) {
      D.breadcrumb.innerHTML = `
        <span class="bc-item bc-parent" onclick="navigateTo('decks')">My Decks</span>
        <span class="bc-sep">›</span>
        <span class="bc-item bc-parent" onclick="navigateTo('deck-detail','${parent.id}')">${parent.icon} ${escHtml(parent.name)}</span>
        <span class="bc-sep">›</span>
        <span class="bc-item active">${deck.icon} ${escHtml(deck.name)}</span>`;
    }
  }

  D.deckDetailIcon.textContent = deck.icon;
  D.deckDetailName.textContent = deck.name;
  D.deckDetailDesc.textContent = deck.description || '';
  D.deckDetailHeader.style.borderTop = `3px solid ${deck.color}`;

  if (deckId === 'recent') {
    D.srsNew.textContent      = '-';
    D.srsLearning.textContent = '-';
    D.srsReview.textContent   = '-';
    D.srsDue.textContent      = '-';
    D.srsMature.textContent   = '-';
  } else {
    const stats = SRS.deckStats(cards);
    D.srsNew.textContent      = stats.new;
    D.srsLearning.textContent = stats.learning;
    D.srsReview.textContent   = stats.review;
    D.srsDue.textContent      = stats.due;
    D.srsMature.textContent   = stats.mature;
  }

  // Render subdecks
  const allCards = await Storage.Cards.getAll();
  await renderSubdeckGrid(deckId, allCards);

  if (deckId !== 'recent') {
    renderCardList(cards);
    setActiveTab('cards');
  }
}

function renderCardList(cards) {
  if (!cards.length) {
    D.cardList.innerHTML = `<div class="deck-empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🃏</div>
      <p>No cards yet. Add your first card!</p>
      <button class="btn-primary" id="addFirstCardBtn" style="margin-top:12px">+ Add Card</button>
    </div>`;
    const firstBtn = $('addFirstCardBtn');
    if (firstBtn) {
      firstBtn.addEventListener('click', () => openCardModal('create', null, App.currentDeckId));
    }
    return;
  }

  D.cardList.innerHTML = cards.map(card => {
    const front = stripHtml(card.type === 'cloze' ? card.cloze : card.front);
    const back  = stripHtml(card.back);
    const intv  = card.repetitions > 0
      ? formatInterval(card.interval, card.dueDate)
      : '—';
    return `
      <div class="card-list-item" data-card-id="${card.id}">
        <span class="cli-front" title="${escHtml(front)}">${escHtml(front) || '<em style="color:var(--text-dim)">Empty</em>'}</span>
        <span class="cli-back" title="${escHtml(back)}">${escHtml(back)}</span>
        <span class="cli-state ${card.state}">${card.state}</span>
        <span class="cli-interval">${intv}</span>
        <div class="cli-actions">
          ${isLeech(card) ? '<span class="cli-leech" title="Leech card">🩸</span>' : ''}
          <button class="cli-btn flag ${card.flagged?'active':''}" data-action="flag" title="Flag">⚑</button>
          <button class="cli-btn suspend ${card.suspended?'active':''}" data-action="suspend" title="Suspend">⊘</button>
          <button class="cli-btn" data-action="history" title="View history">📈</button>
          <button class="cli-btn" data-action="edit" title="Edit">✏️</button>
          <button class="cli-btn" data-action="delete" title="Delete">🗑</button>
        </div>
      </div>`;
  }).join('');

  D.cardList.querySelectorAll('.card-list-item').forEach(row => {
    row.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleCardListAction(btn.dataset.action, row.dataset.cardId, row);
      });
    });
  });
}

async function handleCardListAction(action, cardId, row) {
  switch(action) {
    case 'flag': {
      const card = await Storage.Cards.get(cardId);
      await Storage.Cards.update(cardId, { flagged: !card.flagged });
      const btn = row.querySelector('[data-action="flag"]');
      btn.classList.toggle('active');
      break;
    }
    case 'suspend': {
      const card = await Storage.Cards.get(cardId);
      await Storage.Cards.update(cardId, { suspended: !card.suspended });
      const btn = row.querySelector('[data-action="suspend"]');
      btn.classList.toggle('active');
      toast(card.suspended ? 'Card unsuspended' : 'Card suspended', 'info');
      break;
    }
    case 'history':
      openCardHistory(cardId);
      break;
    case 'edit':
      openCardModal('edit', cardId, App.currentDeckId);
      break;
    case 'delete':
      confirm2('Delete card?', 'This cannot be undone.', async () => {
        await Storage.Cards.delete(cardId);
        row.remove();
        toast('Card deleted', 'info');
        loadDeckDetail(App.currentDeckId);
      });
      break;
  }
}

/* ── DECK DETAIL TABS ────────────────────────────────────────────────── */
function setActiveTab(tab) {
  App.currentDeckTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));

  if (tab === 'stats')    renderDeckStats();
  if (tab === 'forecast') renderDeckForecast();
}

async function renderDeckStats() {
  const cards = await Storage.Cards.getByDeck(App.currentDeckId);
  const stats = SRS.deckStats(cards);

  // Donut
  const donutCvs = $('donutChart');
  const segments = [
    { label: 'New',        value: stats.new,        color: '#00cfff' },
    { label: 'Learning',   value: stats.learning,   color: '#ff9f40' },
    { label: 'Review',     value: stats.review,     color: '#00ff88' },
    { label: 'Relearning', value: stats.relearning, color: '#ff3d5a' },
  ].filter(s => s.value > 0);
  Stats.renderDonut(donutCvs, segments, {
    centerLabel: stats.total,
    centerSub:   'total',
  });
  $('donutLegend').innerHTML = segments.map(s => `
    <div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:${s.color}"></span>
      <span>${s.label}: ${s.value}</span>
    </div>`).join('');

  // Review bar (last 14 days from sessions)
  const sessions = await Storage.Sessions.getByDeck(App.currentDeckId);
  const days14   = getLast14DayLabels();
  const counts   = buildDailyData(sessions, 14);
  Stats.renderBarChart($('reviewBarChart'), days14,
    [{ data: counts, color: '#00ff88' }]);

  // Ease line (computed from FSRS difficulty: 11 - difficulty)
  const eases = cards.filter(c => c.repetitions > 0).map(c => {
    return c.difficulty !== undefined ? Number((11 - c.difficulty).toFixed(2)) : Number((c.easeFactor || 2.5).toFixed(2));
  });
  const easeLabels = eases.map((_, i) => i + 1 < 10 ? `${i+1}` : '');
  Stats.renderLineChart($('easeLineChart'), easeLabels,
    [{ data: eases, color: '#00cfff' }]);
}

async function renderDeckForecast() {
  const cards    = await Storage.Cards.getByDeck(App.currentDeckId);
  const forecast = SRS.forecast(cards, 14);
  const labels   = Array.from({ length: 14 }, (_, i) => i === 0 ? 'Today' : `+${i}d`);
  Stats.renderBarChart($('forecastChart'), labels,
    [{ data: forecast, color: '#a78bfa' }]);
}

/* ── STATS VIEW ──────────────────────────────────────────────────────── */
async function loadStats() {
  const [streak, totalReviews, heatmap, sessions, allCards] = await Promise.all([
    Storage.History.getStreak(),
    Storage.History.getTotalReviews(),
    Storage.History.getHeatmap(),
    Storage.Sessions.getAll(),
    Storage.Cards.getAll(),
  ]);

  D.statsStreak.textContent       = streak;
  D.statsTotalReviews.textContent = totalReviews;

  const reviewed   = allCards.filter(c => c.repetitions > 0);
  const retention  = reviewed.length
    ? Math.round(reviewed.reduce((s,c) => s + SRS.retentionRate(c), 0) / reviewed.length * 100) : 0;
  D.statsRetention.textContent = retention ? `${retention}%` : '—';

  const days   = Math.max(1, Math.ceil((Date.now() - (sessions[0]?.date || Date.now())) / 86400000));
  D.statsAvgDay.textContent = Math.round(totalReviews / days);

  // Heatmap
  Stats.renderHeatmap(D.heatmapContainer, heatmap);

  // Grade donut (all-time)
  let again = 0, hard = 0, good = 0, easy = 0;
  sessions.forEach(s => { again += s.again; hard += s.hard; good += s.good; easy += s.easy; });
  const gradeSegs = [
    { label: 'Again', value: again, color: Stats.C.again },
    { label: 'Hard',  value: hard,  color: Stats.C.hard  },
    { label: 'Good',  value: good,  color: Stats.C.good  },
    { label: 'Easy',  value: easy,  color: Stats.C.easy  },
  ].filter(s => s.value > 0);
  Stats.renderDonut($('statsGradeDonut'), gradeSegs, {
    centerLabel: totalReviews,
    centerSub:   'reviews',
    centerSize:  18,
  });
  $('statsGradeLegend').innerHTML = gradeSegs.map(s => `
    <div class="donut-legend-item">
      <span class="donut-legend-dot" style="background:${s.color}"></span>
      <span>${s.label}: ${s.value}</span>
    </div>`).join('');

  // Daily bar (30 days)
  const labels30 = getLast14DayLabels(30);
  const data30   = buildDailyData(sessions, 30);
  Stats.renderBarChart($('statsDailyBar'), labels30,
    [{ data: data30, color: '#00ff88' }]);
}

/* ── BROWSE VIEW ─────────────────────────────────────────────────────── */
async function loadBrowse() {
  const [decks, cards] = await Promise.all([
    Storage.Decks.getAll(),
    Storage.Cards.getAll(),
  ]);

  // Populate deck filter
  D.browseDeckFilter.innerHTML = '<option value="">All Decks</option>' +
    decks.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');

  renderBrowseTable(cards, decks);
}

function renderBrowseTable(cards, decks) {
  const deckMap = Object.fromEntries((decks||[]).map(d => [d.id, d]));
  if (!cards.length) {
    D.browseTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-dim)">No cards found</td></tr>`;
    return;
  }
  D.browseTableBody.innerHTML = cards.map(c => {
    const deck  = deckMap[c.deckId];
    const front = stripHtml(c.type === 'cloze' ? c.cloze : c.front);
    const back  = stripHtml(c.back);
    const due   = c.dueDate ? new Date(c.dueDate).toLocaleDateString() : '—';
    return `<tr>
      <td title="${escHtml(front)}">${escHtml(front.slice(0, 60))}</td>
      <td title="${escHtml(back)}">${escHtml(back.slice(0, 60))}</td>
      <td>${deck ? escHtml(deck.name) : '?'}</td>
      <td><span class="cli-state ${c.state}">${c.state}</span></td>
      <td>${due}</td>
      <td>${formatInterval(c.interval, c.dueDate)}</td>
      <td>${(c.easeFactor||2.5).toFixed(2)}</td>
      <td>
        <button class="cli-btn" onclick="openCardModal('edit','${c.id}','${c.deckId}')">✏️</button>
        <button class="cli-btn" onclick="deleteCardFromBrowse('${c.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function deleteCardFromBrowse(cardId) {
  confirm2('Delete card?', 'This cannot be undone.', async () => {
    await Storage.Cards.delete(cardId);
    toast('Card deleted', 'info');
    loadBrowse();
  });
}

async function filterBrowse() {
  const deckId = D.browseDeckFilter.value;
  const state  = D.browseStateFilter.value;
  const query  = D.browseSearch.value.trim();

  let cards = await Storage.Cards.getAll();
  const decks = await Storage.Decks.getAll();

  if (deckId) cards = cards.filter(c => c.deckId === deckId);
  if (state)  cards = cards.filter(c => c.state  === state);
  if (query)  cards = cards.filter(c =>
    (c.front + c.back + c.cloze + (c.tags||[]).join(' ')).toLowerCase().includes(query.toLowerCase())
  );
  renderBrowseTable(cards, decks);
}

/* ── SIDEBAR ─────────────────────────────────────────────────────────── */
async function refreshSidebar() {
  await refreshSidebarWithTree();
}

async function refreshStreak() {
  const streak = await Storage.History.getStreak();
  D.streakCount.textContent   = streak;
  D.homeStreak && (D.homeStreak.textContent = streak);
}

/* ── DECK MODAL ──────────────────────────────────────────────────────── */
function openDeckModal(mode, deckId) {
  App.deckModal.mode   = mode;
  App.deckModal.deckId = deckId || null;
  D.deckModalTitle.textContent = mode === 'edit' ? 'Edit Deck' : 'New Deck';

  if (mode === 'create') {
    D.deckName.value        = '';
    D.deckDesc.value        = '';
    D.deckDailyNew.value    = App.settings.dailyNew;
    D.deckDailyReview.value = App.settings.dailyReview;
    selectIcon('📚');
    selectColor('#00ff88');
    populateParentSelector(null).then(() => {
      // Pre-select parent if we're inside a deck detail
      if (App.currentDeckId) D.deckParent.value = App.currentDeckId;
    });
  } else {
    Storage.Decks.get(deckId).then(deck => {
      D.deckName.value        = deck.name;
      D.deckDesc.value        = deck.description || '';
      D.deckDailyNew.value    = deck.dailyNew;
      D.deckDailyReview.value = deck.dailyReview;
      selectIcon(deck.icon);
      selectColor(deck.color);
      populateParentSelector(deckId).then(() => {
        D.deckParent.value = deck.parentId || '';
      });
    });
  }
  D.deckModal.classList.remove('hidden');
  D.deckName.focus();
}

function closeDeckModal() { D.deckModal.classList.add('hidden'); }

async function saveDeckModal() {
  const name = D.deckName.value.trim();
  if (!name) { toast('Deck name is required', 'error'); return; }

  const data = {
    name:        name,
    desc:        D.deckDesc.value.trim(),
    icon:        App.deckModal.icon,
    color:       App.deckModal.color,
    dailyNew:    parseInt(D.deckDailyNew.value)    || 20,
    dailyReview: parseInt(D.deckDailyReview.value) || 100,
    parentId:    D.deckParent.value || null,
  };

  if (App.deckModal.mode === 'create') {
    const deck = await Storage.Decks.create(data);
    toast(`Deck "${deck.name}" created!`, 'success');
    navigateTo('deck-detail', deck.id);
  } else {
    await Storage.Decks.update(App.deckModal.deckId, {
      name:        data.name,
      description: data.desc,
      icon:        data.icon,
      color:       data.color,
      dailyNew:    data.dailyNew,
      dailyReview: data.dailyReview,
      parentId:    data.parentId,
    });
    toast('Deck updated!', 'success');
    loadDeckDetail(App.deckModal.deckId);
  }

  closeDeckModal();
  refreshSidebar();
  loadDecks();
}

function buildIconPicker() {
  D.iconPicker.innerHTML = DECK_ICONS.map(icon =>
    `<div class="icon-opt" data-icon="${icon}">${icon}</div>`
  ).join('');
  D.iconPicker.querySelectorAll('.icon-opt').forEach(el => {
    el.addEventListener('click', () => selectIcon(el.dataset.icon));
  });
}

function buildColorPicker() {
  D.colorPicker.innerHTML = DECK_COLORS.map(color =>
    `<div class="color-opt" data-color="${color}" style="background:${color}"></div>`
  ).join('');
  D.colorPicker.querySelectorAll('.color-opt').forEach(el => {
    el.addEventListener('click', () => selectColor(el.dataset.color));
  });
}

function selectIcon(icon) {
  App.deckModal.icon = icon;
  D.iconPicker.querySelectorAll('.icon-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.icon === icon));
}

function selectColor(color) {
  App.deckModal.color = color;
  D.colorPicker.querySelectorAll('.color-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.color === color));
}

/* ── CARD MODAL ──────────────────────────────────────────────────────── */
async function openCardModal(mode, cardId, deckId) {
  App.cardModal.mode   = mode;
  App.cardModal.cardId = cardId || null;
  const targetDeckId   = deckId || App.currentDeckId;
  App.cardModal.deckId = targetDeckId;

  D.cardModalTitle.textContent = mode === 'edit' ? 'Edit Card' : 'New Card';
  clearCardModal();

  // Populate deck selector
  if (D.cardDeckSelect) {
    const allDecks = await Storage.Decks.getAll();
    D.cardDeckSelect.innerHTML = allDecks.map(d =>
      `<option value="${d.id}" ${d.id === targetDeckId ? 'selected' : ''}>${d.icon} ${escHtml(d.name)}</option>`
    ).join('');
    if (!targetDeckId && allDecks.length) {
      App.cardModal.deckId = allDecks[0].id;
    }
    D.cardDeckSelect.onchange = () => {
      App.cardModal.deckId = D.cardDeckSelect.value;
    };
  }

  if (mode === 'edit' && cardId) {
    const card = await Storage.Cards.get(cardId);
    if (card) {
      if (D.cardDeckSelect && card.deckId) D.cardDeckSelect.value = card.deckId;
      App.cardModal.deckId = card.deckId;
      setCardType(card.type || 'basic');
      if (card.type === 'cloze') {
        D.clozeEditor.value = card.cloze || '';
      } else if (card.type === 'occlusion') {
        occBase64 = card.occImage;
        occBoxesData = card.occBoxes || [];
        if (D.occEditorImg) D.occEditorImg.src = occBase64 || '';
        if (typeof renderOccBoxes === 'function') renderOccBoxes();
      } else {
        D.cardFrontEditor.innerHTML = card.front || '';
        D.cardBackEditor.innerHTML  = card.back || '';
      }
      D.cardTags.value       = (card.tags || []).join(', ');
      D.cardHint.value       = card.hint || '';
      D.cardModalNotes.value = card.notes || '';
    }
  } else {
    setCardType('basic');
  }

  D.cardModal.classList.remove('hidden');
  setTimeout(() => {
    if (D.cardFrontEditor) D.cardFrontEditor.focus();
  }, 100);
}

function clearCardModal() {
  if (D.cardFrontEditor) D.cardFrontEditor.innerHTML = '';
  if (D.cardBackEditor)  D.cardBackEditor.innerHTML  = '';
  if (D.clozeEditor)     D.clozeEditor.value         = '';
  if (D.cardTags)        D.cardTags.value            = '';
  if (D.cardHint)        D.cardHint.value            = '';
  if (D.cardModalNotes)  D.cardModalNotes.value      = '';

  if (D.occEditorImg)    D.occEditorImg.src = '';
  if (D.occEditorBoxes)  D.occEditorBoxes.innerHTML = '';
  occBoxesData = [];
  occBase64 = null;
}

function closeCardModal() { D.cardModal.classList.add('hidden'); }


function setCardType(type) {
  App.cardModal.type = type;
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === type));

  D.basicReversedFields.classList.toggle('hidden', type !== 'basic' && type !== 'reversed');
  D.clozeFields.classList.toggle('hidden', type !== 'cloze');
  if (D.occlusionFields) D.occlusionFields.classList.toggle('hidden', type !== 'occlusion');
}

async function saveCardModal(andAnother = false) {
  const type = App.cardModal.type;
  let front = '', back = '', cloze = '';

  if (type === 'cloze') {
    cloze = D.clozeEditor.value.trim();
    if (!cloze) { toast('Cloze text is required', 'error'); return; }
  } else if (type === 'occlusion') {
    if (!occBase64 || !occBoxesData.length) { toast('Image and at least one box required', 'error'); return; }
  } else {
    front = D.cardFrontEditor.innerHTML.trim();
    back  = D.cardBackEditor.innerHTML.trim();
    if (!front) { toast('Front is required', 'error'); return; }
  }

  const tags   = D.cardTags.value.split(',').map(t => t.trim()).filter(Boolean);
  const hint   = D.cardHint.value.trim();
  const notes  = D.cardModalNotes.value.trim();
  const deckId = App.cardModal.deckId;

  if (App.cardModal.mode === 'create') {
    if (type === 'occlusion') {
      for (let i = 0; i < occBoxesData.length; i++) {
        await Storage.Cards.create({ deckId, type, front:'', back:'', occImage: occBase64, occBoxes: occBoxesData, occTarget: i, tags, hint, notes });
      }
      toast(`${occBoxesData.length} Occlusion cards added!`, 'success');
    } else {
      await Storage.Cards.create({ deckId, type, front, back, cloze, tags, hint, notes });
      toast('Card added!', 'success');
    }
  } else {
    if (type === 'occlusion') {
       await Storage.Cards.update(App.cardModal.cardId, { occImage: occBase64, occBoxes: occBoxesData, tags, hint, notes });
    } else {
       await Storage.Cards.update(App.cardModal.cardId, { type, front, back, cloze, tags, hint, notes });
    }
    toast('Card updated!', 'success');
  }

  if (andAnother) {
    clearCardModal();
    App.cardModal.mode   = 'create';
    App.cardModal.cardId = null;
    D.cardModalTitle.textContent = 'New Card';
    D.cardFrontEditor.focus();
  } else {
    closeCardModal();
  }

  if (App.currentView === 'deck-detail') loadDeckDetail(deckId);
  if (App.currentView === 'browse')      loadBrowse();

  // If studying, immediately update the card on screen
  if (Session.active && App.cardModal.mode === 'edit' && App.cardModal.cardId) {
    const qIndex = Session.queue.findIndex(c => c.id === App.cardModal.cardId);
    if (qIndex !== -1) {
      Session.queue[qIndex] = await Storage.Cards.get(App.cardModal.cardId);
      if (qIndex === Session.index) {
        const c = Session.queue[qIndex];
        if (c.type === 'cloze') {
          D.cardFrontContent.innerHTML = renderClozeHidden(c.cloze);
          D.cardBackContent.innerHTML  = renderClozeRevealed(c.cloze);
        } else if (c.type === 'occlusion') {
          const renderOcc = (rev) => {
             let html = `<div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;">
                <img src="${c.occImage}" style="max-width:100%;display:block;">`;
             (c.occBoxes||[]).forEach((b, i) => {
                const isT = i === c.occTarget;
                if (rev && isT) return;
                const cls = isT ? 'target' : 'covered';
                html += `<div class="occ-box-study ${cls}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"></div>`;
             });
             html += `</div>`;
             return html;
          };
          D.cardFrontContent.innerHTML = renderOcc(false);
          D.cardBackContent.innerHTML  = renderOcc(true);
        } else if (c.type === 'reversed') {
          D.cardFrontContent.innerHTML = renderMarkdown(c.back || '');
          D.cardBackContent.innerHTML  = renderMarkdown(c.front || '');
        } else {
          D.cardFrontContent.innerHTML = renderMarkdown(c.front || '');
          D.cardBackContent.innerHTML  = renderMarkdown(c.back || '');
        }

        if (c.hint || c.notes) {
          D.hintBtn.classList.remove('hidden');
          if (D.hintText && !D.hintText.classList.contains('hidden')) D.hintText.textContent = c.hint || c.notes;
        } else {
          D.hintBtn.classList.add('hidden');
          if (D.hintText) D.hintText.classList.add('hidden');
        }

        D.cardFrontTags.innerHTML = (c.tags || []).map(t => `<span class="card-tag">${escHtml(t)}</span>`).join('');
        const notesEl = document.querySelector('.card-notes');
        if (notesEl) notesEl.textContent = c.notes || '';
      }
    }
  }
}

/* ── RICH EDITOR TOOLBAR ─────────────────────────────────────────────── */
function bindToolbar(toolbarId, editorId) {
  const toolbar = $(toolbarId);
  const editor  = $(editorId);
  if (!toolbar || !editor) return;

  toolbar.querySelectorAll('.rtb-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      editor.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === 'code') {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const code  = document.createElement('code');
          range.surroundContents(code);
        }
      } else if (cmd === 'clear') {
        document.execCommand('removeFormat', false, null);
      } else {
        document.execCommand(cmd, false, btn.dataset.val || null);
      }
    });
  });
}

/* ── CONFIRM MODAL ───────────────────────────────────────────────────── */
let _confirmCb = null;
function confirm2(title, msg, cb) {
  D.confirmTitle.textContent = title;
  D.confirmMsg.textContent   = msg;
  _confirmCb = cb;
  D.confirmModal.classList.remove('hidden');
}
function closeConfirm() { D.confirmModal.classList.add('hidden'); _confirmCb = null; }

/* ── CONTEXT MENU ────────────────────────────────────────────────────── */
function showDeckContextMenu(e, deck) {
  // Simple inline menu using a floating div
  const existing = document.querySelector('.ctx-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.cssText = `
    position:fixed; z-index:9000;
    background:var(--bg2); border:1px solid var(--border);
    border-radius:var(--radius-sm); box-shadow:var(--shadow);
    padding:6px; min-width:160px;
    animation:fadeIn 0.15s ease;
  `;
  const items = [
    { icon:'▶', label:'Study',    fn: () => startStudy(deck.id) },
    { icon:'✏️', label:'Edit',     fn: () => openDeckModal('edit', deck.id) },
    { icon:'⬇', label:'Export',   fn: () => exportDeck(deck.id) },
    { icon:'🗑', label:'Delete',   fn: () => deleteDeck(deck.id), danger: true },
  ];
  items.forEach(item => {
    const el = document.createElement('button');
    el.style.cssText = `
      display:flex; align-items:center; gap:8px; width:100%;
      padding:8px 10px; border:none; border-radius:4px;
      background:none; color:${item.danger ? 'var(--danger)' : 'var(--text)'};
      font-size:0.84rem; cursor:pointer; text-align:left;
    `;
    el.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
    el.addEventListener('click', () => { item.fn(); closeMenu(); });
    el.addEventListener('mouseover', () => { el.style.background = 'var(--bg3)'; });
    el.addEventListener('mouseout',  () => { el.style.background = 'none'; });
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  const rect = e.currentTarget.getBoundingClientRect();
  const menuWidth = menu.offsetWidth || 160;
  const menuHeight = menu.offsetHeight || 150;
  const pad = 10;

  // Align from the right of the button so it opens inward on mobile
  let left = rect.right - menuWidth;
  if (left + menuWidth > window.innerWidth - pad) {
    left = window.innerWidth - menuWidth - pad;
  }
  if (left < pad) left = pad;

  // Flip upward if near the bottom of the screen
  let top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - menuHeight - 4);
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  // Auto-dismiss cleanly on click outside, scroll, or orientation change
  const closeMenu = () => {
    menu.remove();
    document.removeEventListener('click', closeMenu);
    window.removeEventListener('scroll', closeMenu, true);
    window.removeEventListener('resize', closeMenu);
  };

  setTimeout(() => {
    document.addEventListener('click', closeMenu, { once: true });
    window.addEventListener('scroll', closeMenu, { capture: true, once: true });
    window.addEventListener('resize', closeMenu, { once: true });
  }, 0);
}

async function deleteDeck(deckId) {
  const deck = await Storage.Decks.get(deckId);
  confirm2('Delete Deck', `Delete "${deck.name}" and all its cards?`, async () => {
    await Storage.Decks.deleteWithCards(deckId);
    toast('Deck deleted', 'info');
    if (App.currentView === 'deck-detail') navigateTo('decks');
    else { loadDecks(); loadHome(); }
    refreshSidebar();
  });
}

/* ── EXPORT / IMPORT ─────────────────────────────────────────────────── */
async function exportDeck(deckId) {
  const json     = await Storage.IO.exportDeck(deckId);
  const deck     = await Storage.Decks.get(deckId);
  downloadJson(json, `${deck.name.replace(/\s+/g,'_')}_flashcards.json`);
  toast('Deck exported!', 'success');
}

async function exportAll() {
  const json = await Storage.IO.exportAll();
  downloadJson(json, 'flashcard_pro_backup.json');
  toast('All data exported!', 'success');
}

function downloadJson(json, filename) {
  // Ensure .json extension
  if (!filename.endsWith('.json')) filename += '.json';
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function triggerImport() {
  D.fileInput.value = '';
  D.fileInput.click();
}

D.fileInput.addEventListener('change', async () => {
  const file = D.fileInput.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const deck = await Storage.IO.importDeck(text);
    toast(`Imported "${deck.name}"!`, 'success');
    refreshSidebar();
    loadDecks();
    loadHome();
  } catch(e) {
    toast('Import failed: ' + e.message, 'error');
  }
});

/* ══════════════════════════════════════════════════════════════════════
   STUDY SESSION
   ══════════════════════════════════════════════════════════════════════ */
async function startStudy(deckId) {
  deckId = deckId || App.currentDeckId;
  if (!deckId) {
    // Study all due
    return startStudyAll();
  }

  let deck, cards;
  if (deckId === 'recent') {
    deck = { id: 'recent', name: 'Recent', dailyNew: 999, dailyReview: 999 };
    const allCards = await Storage.Cards.getAll();
    cards = allCards.filter(c => c.lastReview).sort((a,b) => b.lastReview - a.lastReview).slice(0, 100);
  } else {
    deck  = await Storage.Decks.get(deckId);
    cards = await Storage.Cards.getByDeck(deckId);
  }

  const queue = SRS.buildQueue(cards, {
    newLimit:    deck.dailyNew,
    reviewLimit: deck.dailyReview,
  });

  if (!queue.length) {
    toast('No cards due! Come back later 🎉', 'info');
    return;
  }

  Session.deckId   = deckId;
  Session.queue    = queue;
  Session.data     = Storage.Sessions.create(deckId);
  launchStudy(deck.name);
}

async function startStudyAll() {
  const decks   = await Storage.Decks.getAll();
  const allCards = await Storage.Cards.getAll();
  const queue   = SRS.buildQueue(allCards.filter(c => !c.suspended));

  if (!queue.length) {
    toast('No cards due across all decks! 🎉', 'info');
    return;
  }

  Session.deckId = null;
  Session.queue  = queue;
  Session.data   = Storage.Sessions.create(null);
  launchStudy('All Decks');
}

function launchStudy(deckName, mode = 'srs') {
  Session.index        = 0;
  Session.active       = true;
  Session.gradeHistory = [];
  Session.undoStack    = [];
  Session.mode         = mode;
  D.studyDeckName.textContent = deckName;
  D.studyOverlay.classList.remove('hidden');
  D.summaryOverlay.classList.add('hidden');

  // Mode badge
  const badges = { srs: 'SRS', cram: '⚡ CRAM', timed: '⏱ TIMED' };
  D.studyModeBadge.textContent = badges[mode] || 'SRS';

  // Timed bar visibility
  D.studyTimedBar.classList.toggle('hidden', mode !== 'timed');

  // Ensure type answer block and confidence strip are visible from first card
  if (D.typeAnswerBelowCard) D.typeAnswerBelowCard.style.display = 'block';
  const confRow = document.getElementById('confidenceStripRow');
  if (confRow) confRow.style.display = 'flex';

  // Reset type answer toggle state
  D.typeAnswerWrap.style.display = typeAnswerVisible ? 'block' : 'none';
  D.typeToggleBtn.classList.toggle('active', typeAnswerVisible);
  D.typeToggleBtn.textContent = typeAnswerVisible ? '⌨️ Hide Input' : '⌨️ Type Answer';

  showCard();
  updateStudyCounters();
}

function showCard() {
  // Skip cards that are requeued but not yet due (Hard=1min, Good=10min)
  // Scan forward to find a ready card; if none ready, wait and retry
  let found = -1;
  for (let i = Session.index; i < Session.queue.length; i++) {
    const c = Session.queue[i];
    // Cards with no dueDate set, interval>0, or dueDate already passed are ready
    const isReady = !c.dueDate || c.interval > 0 || c.dueDate <= Date.now();
    if (isReady) { found = i; break; }
  }

  if (found === -1) {
    // If all overdue cards are completed, proceed immediately with remaining intra-session learning steps
    if (Session.index < Session.queue.length) {
      found = Session.index;
    } else {
      return endStudy();
    }
  }

  // Swap found card to current index position if needed
  if (found !== Session.index) {
    [Session.queue[Session.index], Session.queue[found]] =
    [Session.queue[found],         Session.queue[Session.index]];
  }

  if (Session.index >= Session.queue.length) return endStudy();

  const card = Session.queue[Session.index];
  Session.flipped    = false;
  Session.timerStart = Date.now();

  // Restore pre-flip UI controls
  D.flipBtn.classList.remove('hidden');
  D.gradeRow.classList.add('hidden');
  if (D.typeAnswerBelowCard) D.typeAnswerBelowCard.style.display = 'block';
  if (D.typeToggleBtn) {
    D.typeToggleBtn.classList.remove('hidden');
    D.typeToggleBtn.textContent = typeAnswerVisible ? '⌨️ Hide Input' : '⌨️ Type Answer';
  }
  const confRow = document.getElementById('confidenceStripRow');
  if (confRow) confRow.style.display = 'flex';

  // Reset flip
  D.flashcard.classList.remove('flipped');
  D.flipBtn.classList.remove('hidden');
  D.gradeRow.classList.add('hidden');

  // Reset per-card UI
  resetHint();
  resetConfidence();
  resetTypeAnswer();
  stopSpacedReading();
  if (typeof clearScratchpad === 'function') clearScratchpad();

  // Start spaced reading countdown
  startSpacedReading();

  // Leech detection
  if (isLeech(card)) {
    D.leechBadge.classList.remove('hidden');
  } else {
    D.leechBadge.classList.add('hidden');
  }

  // Render front with markdown
  if (card.type === 'cloze') {
    D.cardFrontContent.innerHTML = renderClozeHidden(card.cloze);
    D.cardBackContent.innerHTML  = renderClozeRevealed(card.cloze);
    D.cardTypeBadge.textContent  = 'CLOZE';
  } else if (card.type === 'occlusion') {
    const renderOcc = (rev) => {
       let html = `<div style="position:relative;display:inline-block;max-width:100%;border-radius:8px;overflow:hidden;">
          <img src="${card.occImage}" style="max-width:100%;display:block;">`;
       (card.occBoxes||[]).forEach((b, i) => {
          const isT = i === card.occTarget;
          if (rev && isT) return;
          const cls = isT ? 'target' : 'covered';
          html += `<div class="occ-box-study ${cls}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%"></div>`;
       });
       html += `</div>`;
       return html;
    };
    D.cardFrontContent.innerHTML = renderOcc(false);
    D.cardBackContent.innerHTML  = renderOcc(true);
    D.cardTypeBadge.textContent  = 'OCCLUSION';
  } else if (card.type === 'reversed') {
    D.cardFrontContent.innerHTML = renderMarkdown(card.back  || '');
    D.cardBackContent.innerHTML  = renderMarkdown(card.front || '');
    D.cardTypeBadge.textContent  = 'REVERSED';
  } else {
    D.cardFrontContent.innerHTML = renderMarkdown(card.front || '');
    D.cardBackContent.innerHTML  = renderMarkdown(card.back  || '');
    D.cardTypeBadge.textContent  = 'FRONT';
  }

  // Show hint button if card has a hint
  if (card.hint || card.notes) {
    D.hintBtn.classList.remove('hidden');
  }

  // Tags
  const tags = (card.tags || []).map(t => `<span class="card-tag">${escHtml(t)}</span>`).join('');
  D.cardFrontTags.innerHTML = tags;

  // Notes (shown on back)
  const notesEl = document.querySelector('.card-notes');
  if (notesEl) notesEl.textContent = card.notes || '';

  // Font size
  const fs = App.settings.fontSize;
  D.cardFrontContent.className = `card-content ${fs}-font`;
  D.cardBackContent.className  = `card-content ${fs}-font`;

  // Progress
  const pct = Math.round((Session.index / Session.queue.length) * 100);
  D.studyProgressFill.style.width  = `${pct}%`;
  D.studyProgressLabel.textContent = `${Session.index} / ${Session.queue.length}`;

  // Timer
  startCardTimer();

  // Preview intervals
  updateGradeIntervals(card);

  // Auto-reveal
  clearTimeout(Session.autoRevealTm);
  if (App.settings.autoReveal > 0) {
    Session.autoRevealTm = setTimeout(flipCard, App.settings.autoReveal);
  }

  // Timed mode countdown
  if (Session.mode === 'timed') startTimedCountdown();

  // Auto TTS — speak front of new card (mask cloze brackets to prevent answer spoiler)
  const shownCard = Session.queue[Session.index];
  if (shownCard) {
    const frontText = shownCard.type === 'cloze'
      ? stripHtml(shownCard.cloze.replace(/\{\{c\d+::([^}]+)\}\}/g, 'blank'))
      : stripHtml(shownCard.front);
    ttsSpeak(frontText);
  }
}

function flipCard() {
  if (Session.flipped) return;
  Session.flipped = true;
  D.flashcard.classList.add('flipped');
  D.flipBtn.classList.add('hidden');
  D.gradeRow.classList.remove('hidden');
  clearTimeout(Session.autoRevealTm);

  // Stop timer so seconds freeze on flip
  stopCardTimer();

  stopSpacedReading();

  // Hide type answer area and confidence strip after flip
  if (D.typeAnswerBelowCard) D.typeAnswerBelowCard.style.display = 'none';
  const confRow = document.getElementById('confidenceStripRow');
  if (confRow) confRow.style.display = 'none';

  // Stop voice capture cleanly on flip
  if (voiceActive && voiceRecog) {
    try { voiceRecog.stop(); } catch(e) {}
    voiceActive = false;
    D.voiceInputBtn.classList.remove('voice-active');
    D.voiceInputBtn.textContent = '🎤';
  }

  const card = Session.queue[Session.index];
  if (card) {
    Session.typedAnswer = D.typeAnswerInput.value;

    // Show comparison below grade buttons (typed answer + match % only)
    if (Session.typedAnswer.trim()) {
      const correctText = card.type === 'cloze'
        ? stripHtml(card.cloze)
        : stripHtml(card.back);
      setTimeout(() => compareAnswers(Session.typedAnswer, correctText), 300);
    }

    // Show related cards on back
    setTimeout(() => showRelatedCards(card), 350);

    // Auto TTS — speak back
    const backText = card.type === 'cloze'
      ? stripHtml(card.cloze.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1'))
      : stripHtml(card.back);
    setTimeout(() => ttsSpeak(backText), 400);
  }
}

function formatInterval(interval, dueDate) {
  const now = Date.now();
  // Minute-level: interval is 0 but dueDate is set in the future
  if (interval === 0 && dueDate && dueDate > now) {
    const diffMs  = dueDate - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffMs / 60000);
    if (diffSec < 60)       return '<1m';
    if (diffMin < 60)       return `${diffMin}m`;
    return `${Math.round(diffMin / 60)}h`;
  }
  // Day-level intervals
  if (!interval || interval <= 0) return '<1m';
  if (interval < 7)               return `${interval}d`;
  if (interval < 30)              return `${Math.round(interval / 7)}w`;
  return `${Math.round(interval / 30)}mo`;
}

function updateGradeIntervals(card) {
  [0, 1, 2, 3].forEach(g => {
    const el = $(`gi-${g}`);
    if (!el) return;
    const preview    = SRS.schedule(card, g);
    el.textContent   = formatInterval(preview.interval, preview.dueDate);
  });
}

async function gradeCard(grade) {
  const card      = Session.queue[Session.index];
  const timeMs    = Date.now() - Session.timerStart;
  const wasNew    = SRS.isNew(card);
  const snapshot  = { ...card };  // save for undo

  stopCardTimer();
  stopTimedCountdown();
  Session.gradeHistory.push(grade);

  // Push undo snapshot (keep last 3)
  Session.undoStack.push({ cardId: card.id, snapshot });
  if (Session.undoStack.length > 3) Session.undoStack.shift();

  // Award XP
  addXP(grade);

  // Confidence feedback analysis
  logConfidenceResult(grade);

  // Apply SRS — skip in cram mode
  if (Session.mode !== 'cram') {
    await Storage.Cards.applyReview(card.id, grade);
  }

  // Record in session
  Session.data = Storage.Sessions.recordReview(Session.data, card.id, grade, timeMs, wasNew);

  // Auto-save session to prevent data loss if user closes tab
  await Storage.Sessions.save(Session.data);

  // Requeue logic for intra-session learning steps
  const updatedCard = await Storage.Cards.get(card.id);

  if (grade === 0) {
    // Again (failed recall) — requeue so the user can reinforce it before session ends
    const insertIdx = Math.min(Session.queue.length, Session.index + 3);
    Session.queue.splice(insertIdx, 0, { ...updatedCard });
  }
  // Hard (1), Good (2), and Easy (3) are saved with their future due dates and finish their turn

  Session.index++;
  updateStudyCounters();

  // Animate card exit
  if (App.settings.animations) {
    D.flashcard.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    D.flashcard.style.transform  = 'translateX(40px)';
    D.flashcard.style.opacity    = '0';
    setTimeout(() => {
      D.flashcard.style.transition = '';
      D.flashcard.style.transform  = '';
      D.flashcard.style.opacity    = '';
      showCard();
    }, 220);
  } else {
    showCard();
  }
}

function updateStudyCounters() {
  const remaining = Session.queue.slice(Session.index);
  D.scNew.textContent      = remaining.filter(c => SRS.isNew(c)).length;
  D.scLearning.textContent = remaining.filter(c => c.state === 'learning').length;
  D.scReview.textContent   = remaining.filter(c => c.state === 'review').length;
}

/* ── TIMER ───────────────────────────────────────────────────────────── */
function startCardTimer() {
  clearInterval(Session.timerIv);
  if (!App.settings.timer) { D.studyTimer.textContent = ''; return; }
  Session.timerVal = 0;
  D.studyTimer.textContent = '0s';
  Session.timerIv = setInterval(() => {
    Session.timerVal++;
    D.studyTimer.textContent = Session.timerVal < 60
      ? `${Session.timerVal}s`
      : `${Math.floor(Session.timerVal/60)}m${Session.timerVal%60}s`;
  }, 1000);
}

function stopCardTimer() { clearInterval(Session.timerIv); }

/* ── END STUDY ───────────────────────────────────────────────────────── */
async function endStudy() {
  stopCardTimer();
  stopTimedCountdown();
  Session.active = false;
  // Reset TTS, focus mode, spaced reading, voice
  if (ttsEnabled)  toggleTts();
  if (focusMode)   toggleFocusMode();
  if (spacedModeOn) toggleSpacedMode();
  if (voiceActive) { voiceRecog?.stop(); voiceActive = false; }
  stopSpacedReading();
  window.speechSynthesis.cancel();

  await Storage.Sessions.finish(Session.data);
  await checkStreakCelebration();

  // Show summary
  const s = Session.data;
  const total    = s.cards.length;
  const correct  = s.good + s.easy;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  D.sumTotal.textContent    = total;
  D.sumDuration.textContent = Stats.formatDuration(s.duration);
  D.sumAccuracy.textContent = `${accuracy}%`;
  D.sumAgain.textContent    = s.again;
  D.sumHard.textContent     = s.hard;
  D.sumGood.textContent     = s.good;
  D.sumEasy.textContent     = s.easy;

  // Sparkline of grade per card
  Stats.renderSparkline($('summarySparkline'), Session.gradeHistory,
    accuracy >= 70 ? '#00ff88' : '#ff9f40');

  D.studyOverlay.classList.add('hidden');
  D.summaryOverlay.classList.remove('hidden');

  refreshSidebar();
  refreshStreak();
}

/* ── CLOZE RENDERING ─────────────────────────────────────────────────── */
function renderClozeHidden(text) {
  const html = text.replace(/\{\{c\d+::([^}]+)\}\}/g,
    (_, w) => `<span class="cloze-blank">${'_'.repeat(Math.max(4, w.length))}</span>`);
  return applyBionic(html);
}

function renderClozeRevealed(text) {
  const html = text.replace(/\{\{c\d+::([^}]+)\}\}/g,
    (_, w) => `<span class="cloze-blank revealed">${escHtml(w)}</span>`);
  return applyBionic(html);
}

/* ══════════════════════════════════════════════════════════════════════
   CONFIDENCE RATING
   ══════════════════════════════════════════════════════════════════════ */
function resetConfidence() {
  Session.confidence = 0;
  document.querySelectorAll('.conf-btn').forEach(b => b.classList.remove('selected'));
}

function selectConfidence(val) {
  Session.confidence = val;
  document.querySelectorAll('.conf-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.conf) === val);
  });
}

// After grading, log confidence vs actual grade mismatch for analysis
function logConfidenceResult(grade) {
  if (!Session.confidence) return;
  const wasCorrect  = grade >= 2;
  const wasConfident = Session.confidence >= 4;
  // Dunning-Kruger moments: confident but wrong
  if (wasConfident && !wasCorrect) {
    toast('⚠️ You were confident but got it wrong — pay extra attention!', 'info', 3500);
  }
  // Good calibration: uncertain and got it wrong — reinforce
  if (!wasConfident && !wasCorrect) {
    toast('💡 Trust your instincts — you sensed you weren\'t sure!', 'info', 2500);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   TYPE ANSWER + CHARACTER COMPARISON
   ══════════════════════════════════════════════════════════════════════ */
function toggleTypeAnswer() {
  typeAnswerVisible = !typeAnswerVisible;
  D.typeAnswerWrap.style.display = typeAnswerVisible ? 'block' : 'none';
  D.typeToggleBtn.classList.toggle('active', typeAnswerVisible);
  D.typeToggleBtn.textContent = typeAnswerVisible ? '⌨️ Hide Input' : '⌨️ Type Answer';
  if (typeAnswerVisible) {
    D.typeAnswerInput.focus();
  }
}

function resetTypeAnswer() {
  Session.typedAnswer = '';
  voiceTranscriptFinal = '';
  D.typeAnswerInput.value = '';
  D.typeAnswerInput.classList.remove('correct-border', 'wrong-border');
  D.answerComparison.classList.add('hidden');
  D.answerComparison.innerHTML = '';

  // Restore the user's preferred type-answer visibility
  D.typeAnswerWrap.style.display = typeAnswerVisible ? 'block' : 'none';
  D.typeToggleBtn.classList.toggle('active', typeAnswerVisible);
  D.typeToggleBtn.textContent = typeAnswerVisible ? '⌨️ Hide Input' : '⌨️ Type Answer';
}

function compareAnswers(typed, correct) {
  // Strip HTML and normalize
  const t = typed.trim().toLowerCase();
  const c = stripHtml(correct).trim().toLowerCase();

  if (!t) return;

  // Character-level diff using Levenshtein alignment
  const tChars = typed.trim().split('');
  const cChars = stripHtml(correct).trim().split('');

  // Build alignment using simple LCS
  const matchRate = calcMatchRate(t, c);

  // Highlight typed answer char by char against correct
  let typedHtml   = '';
  let correctHtml = '';

  const maxLen = Math.max(tChars.length, cChars.length);
  for (let i = 0; i < maxLen; i++) {
    const tc = tChars[i];
    const cc = cChars[i];
    if (tc === undefined) {
      correctHtml += `<span class="answer-char missing">${escHtml(cc)}</span>`;
    } else if (cc === undefined) {
      typedHtml += `<span class="answer-char wrong">${escHtml(tc)}</span>`;
    } else if (tc.toLowerCase() === cc.toLowerCase()) {
      typedHtml   += `<span class="answer-char correct">${escHtml(tc)}</span>`;
      correctHtml += `<span class="answer-char correct">${escHtml(cc)}</span>`;
    } else {
      typedHtml   += `<span class="answer-char wrong">${escHtml(tc)}</span>`;
      correctHtml += `<span class="answer-char missing">${escHtml(cc)}</span>`;
    }
  }

  const rateClass = matchRate >= 90 ? 'high' : matchRate >= 60 ? 'medium' : 'low';
  const rateEmoji = matchRate >= 90 ? '🎉' : matchRate >= 60 ? '👍' : '❌';

  // Collapsible comparison — match rate shown inline in header
  // Body shows char-by-char typed answer (original already on card back)
  const headerId = 'acHeader';
  const bodyId   = 'acBody';
  const iconId   = 'acIcon';

  D.answerComparison.innerHTML = `
    <div class="answer-comparison-header" id="${headerId}">
      <div class="answer-comparison-header-left">
        <span class="answer-comparison-label">YOUR ANSWER</span>
        <span class="match-rate ${rateClass}" style="padding:2px 8px;font-size:0.7rem">${rateEmoji} ${matchRate}%</span>
      </div>
      <span class="answer-comparison-collapse-icon" id="${iconId}">▾</span>
    </div>
    <div class="answer-comparison-body" id="${bodyId}">
      ${typedHtml || '<span style="color:var(--text-dim)">—</span>'}
    </div>`;

  D.answerComparison.classList.remove('hidden');

  // Wire toggle
  const headerEl = document.getElementById(headerId);
  const bodyEl   = document.getElementById(bodyId);
  const iconEl   = document.getElementById(iconId);

  headerEl.addEventListener('click', () => {
    const isOpen = bodyEl.classList.toggle('open');
    iconEl.classList.toggle('open', isOpen);
    headerEl.classList.toggle('open', isOpen);
  });

  // Color input border
  D.typeAnswerInput.classList.toggle('correct-border', matchRate >= 85);
  D.typeAnswerInput.classList.toggle('wrong-border',   matchRate < 85);
}

function calcMatchRate(a, b) {
  if (!a || !b) return 0;
  if (a === b)  return 100;
  // Levenshtein distance
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  const dist = dp[m][n];
  return Math.round((1 - dist / Math.max(m, n)) * 100);
}

/* ══════════════════════════════════════════════════════════════════════
   VOICE INPUT
   ══════════════════════════════════════════════════════════════════════ */
let voiceTranscriptFinal = '';

function setupVoiceInput() {
  if (voiceRecog) return voiceRecog;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Voice input not supported in this browser', 'info');
    return null;
  }

  voiceRecog = new SR();
  voiceRecog.continuous = true;
  voiceRecog.interimResults = true;
  voiceRecog.lang = 'en-US';
  voiceRecog.maxAlternatives = 1;

  voiceRecog.onstart = () => {
    voiceActive = true;
    voiceTranscriptFinal = D.typeAnswerInput.value?.trim() || '';
    D.voiceInputBtn.classList.add('voice-active');
    D.voiceInputBtn.textContent = '⏹';
  };

  voiceRecog.onresult = e => {
    let interim = '';
    let finalText = voiceTranscriptFinal;

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const text = e.results[i][0].transcript.trim();
      if (e.results[i].isFinal) {
        finalText = `${finalText} ${text}`.trim();
      } else {
        interim += `${text} `;
      }
    }

    voiceTranscriptFinal = finalText.trim();
    const combined = `${voiceTranscriptFinal} ${interim.trim()}`.trim();

    D.typeAnswerInput.value = combined;
    Session.typedAnswer = combined;
  };

  voiceRecog.onend = () => {
    voiceActive = false;
    D.voiceInputBtn.classList.remove('voice-active');
    D.voiceInputBtn.textContent = '🎤';
  };

  voiceRecog.onerror = e => {
    voiceActive = false;
    D.voiceInputBtn.classList.remove('voice-active');
    D.voiceInputBtn.textContent = '🎤';

    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      toast('Microphone permission denied. Please allow mic access in your browser.', 'error', 4000);
    } else if (e.error === 'no-speech') {
      toast('No speech detected. Try again and speak clearly.', 'info', 2500);
    } else if (e.error !== 'aborted') {
      toast(`Voice input error: ${e.error}`, 'error', 3000);
    }
  };

  return voiceRecog;
}

async function toggleVoiceInput() {
  const recog = setupVoiceInput();
  if (!recog) return;

  if (D.typeAnswerWrap.style.display === 'none') {
    toggleTypeAnswer();
  }

  if (voiceActive) {
    recog.stop();
    voiceActive = false;
    D.voiceInputBtn.classList.remove('voice-active');
    D.voiceInputBtn.textContent = '🎤';
    return;
  }

  try {
    voiceTranscriptFinal = D.typeAnswerInput.value?.trim() || '';
    recog.start();
    toast('🎤 Listening… speak your answer', 'info', 1800);
  } catch (err) {
    // Prevent duplicate "start" errors if browser thinks it is already running
    if (!String(err?.message || '').toLowerCase().includes('already started')) {
      toast('Could not start voice input.', 'error', 2500);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SPACED READING MODE
   ══════════════════════════════════════════════════════════════════════ */
let spacedModeOn = false;

function toggleSpacedMode() {
  spacedModeOn = !spacedModeOn;
  D.studySpacedBtn.classList.toggle('spaced-active', spacedModeOn);
  D.studySpacedBtn.title = spacedModeOn ? 'Spaced reading ON — click to disable' : 'Spaced reading mode';
  toast(spacedModeOn ? '👁 Spaced reading ON — read for 5s before flipping' : '👁 Spaced reading OFF', 'info', 2000);
}

function startSpacedReading() {
  if (!spacedModeOn) return;
  clearInterval(Session.spacedIv);

  let sec = Session.spacedSec;
  D.spacedReadingBar.classList.remove('hidden');
  D.spacedReadingFill.style.width    = '100%';
  D.spacedReadingFill.style.transition = 'none';
  D.spacedReadingLabel.textContent   = `Reading… ${sec}s`;
  D.flipBtn.disabled = true;
  D.flipBtn.style.opacity = '0.4';

  setTimeout(() => {
    D.spacedReadingFill.style.transition = `width ${sec}s linear`;
    D.spacedReadingFill.style.width      = '0%';
  }, 50);

  Session.spacedIv = setInterval(() => {
    sec--;
    D.spacedReadingLabel.textContent = sec > 0 ? `Reading… ${sec}s` : 'Ready!';
    if (sec <= 0) {
      clearInterval(Session.spacedIv);
      D.flipBtn.disabled      = false;
      D.flipBtn.style.opacity = '1';
      D.spacedReadingBar.classList.add('hidden');
    }
  }, 1000);
}

function stopSpacedReading() {
  clearInterval(Session.spacedIv);
  D.spacedReadingBar.classList.add('hidden');
  D.flipBtn.disabled      = false;
  D.flipBtn.style.opacity = '1';
}

/* ══════════════════════════════════════════════════════════════════════
   MISTAKE ANALYSIS
   ══════════════════════════════════════════════════════════════════════ */
async function loadMistakes() {
  const [allCards, allDecks] = await Promise.all([
    Storage.Cards.getAll(),
    Storage.Decks.getAll(),
  ]);

  const deckMap    = Object.fromEntries(allDecks.map(d => [d.id, d]));
  const deckFilter = D.mistakesDeckFilter.value;
  const tagFilter  = D.mistakesTagFilter.value;

  // Populate deck filter
  D.mistakesDeckFilter.innerHTML = '<option value="">All Decks</option>' +
    allDecks.map(d => `<option value="${d.id}" ${deckFilter===d.id?'selected':''}>${escHtml(d.name)}</option>`).join('');

  // Get all unique tags
  const allTags = [...new Set(allCards.flatMap(c => c.tags || []))].sort();
  D.mistakesTagFilter.innerHTML = '<option value="">All Tags</option>' +
    allTags.map(t => `<option value="${t}" ${tagFilter===t?'selected':''}>${escHtml(t)}</option>`).join('');

  let cards = allCards.filter(c => c.repetitions > 0);
  if (deckFilter) cards = cards.filter(c => c.deckId === deckFilter);
  if (tagFilter)  cards = cards.filter(c => (c.tags||[]).includes(tagFilter));

  // Sort by lapse count descending
  const sorted   = [...cards].sort((a,b) => (b.lapses||0) - (a.lapses||0));
  const leeches  = sorted.filter(c => isLeech(c));
  const withLaps = sorted.filter(c => (c.lapses||0) > 0);
  const totalRev = cards.reduce((s,c) => s + (c.history||[]).length, 0);
  const totalAgain = cards.reduce((s,c) =>
    s + (c.history||[]).filter(h => h.grade === 0).length, 0);
  const avgAccuracy = cards.length
    ? Math.round(cards.reduce((s,c) => {
        const h = c.history||[];
        return s + (h.length ? (h.filter(x=>x.grade>=2).length/h.length) : 1);
      }, 0) / cards.length * 100) : 0;

  // Overview stats
  D.mistakesOverview.innerHTML = `
    <div class="mistake-stat-card">
      <div class="mistake-stat-val danger">${leeches.length}</div>
      <div class="mistake-stat-lbl">🩸 Leeches</div>
    </div>
    <div class="mistake-stat-card">
      <div class="mistake-stat-val warn">${withLaps.length}</div>
      <div class="mistake-stat-lbl">Cards with lapses</div>
    </div>
    <div class="mistake-stat-card">
      <div class="mistake-stat-val danger">${totalAgain}</div>
      <div class="mistake-stat-lbl">Total "Again" presses</div>
    </div>
    <div class="mistake-stat-card">
      <div class="mistake-stat-val ${avgAccuracy>=80?'good':'warn'}">${avgAccuracy}%</div>
      <div class="mistake-stat-lbl">Avg accuracy</div>
    </div>
    <div class="mistake-stat-card">
      <div class="mistake-stat-val good">${totalRev}</div>
      <div class="mistake-stat-lbl">Total reviews</div>
    </div>`;

  // Hardest cards list (top 20)
  const top20 = withLaps.slice(0, 20);
  D.mistakesCount.textContent = `${withLaps.length} card${withLaps.length!==1?'s':''} with at least 1 lapse`;

  if (!top20.length) {
    D.mistakesList.innerHTML = `<div style="color:var(--text-dim);padding:20px;text-align:center">
      🎉 No mistakes yet — keep studying!
    </div>`;
  } else {
    D.mistakesList.innerHTML = top20.map(card => {
      const front   = escHtml(stripHtml(card.type==='cloze'?card.cloze:card.front).slice(0,80));
      const deck    = deckMap[card.deckId];
      const history = card.history || [];
      const acc     = history.length
        ? Math.round(history.filter(h=>h.grade>=2).length/history.length*100) : 0;
      const next    = formatInterval(card.interval, card.dueDate);
      return `
        <div class="mistake-card">
          <div class="mistake-bar-wrap">
            <div class="mistake-front">${front}</div>
            <div class="mistake-meta">
              <span>📚 ${deck ? escHtml(deck.name) : '?'}</span>
              <span>✅ ${acc}% accuracy</span>
              <span>📅 Next: ${next}</span>
              <span>🔁 ${history.length} reviews</span>
              ${isLeech(card)?'<span style="color:var(--danger)">🩸 Leech</span>':''}
            </div>
          </div>
          <span class="mistake-lapse-badge">${card.lapses||0} lapses</span>
          <div class="mistake-actions">
            <button class="cli-btn" onclick="startStudySingleCard('${card.id}')" title="Study now">▶</button>
            <button class="cli-btn" onclick="openCardHistory('${card.id}')" title="History">📈</button>
            <button class="cli-btn" onclick="openCardModal('edit','${card.id}','${card.deckId}')" title="Edit">✏️</button>
          </div>
        </div>`;
    }).join('');
  }

  // Tag weakness analysis
  const tagStats = {};
  cards.forEach(card => {
    (card.tags||[]).forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
      const h = card.history || [];
      tagStats[tag].total   += h.length;
      tagStats[tag].correct += h.filter(x => x.grade >= 2).length;
    });
  });

  const tagArr = Object.entries(tagStats)
    .filter(([,s]) => s.total >= 3)
    .map(([tag,s]) => ({ tag, acc: Math.round(s.correct/s.total*100), total: s.total }))
    .sort((a,b) => a.acc - b.acc);

  if (!tagArr.length) {
    D.tagWeaknessGrid.innerHTML = `<span style="color:var(--text-dim);font-size:0.82rem">Not enough data yet — tag your cards for analysis</span>`;
  } else {
    D.tagWeaknessGrid.innerHTML = tagArr.map(({ tag, acc, total }) => {
      const cls = acc < 60 ? 'bad' : acc < 80 ? 'medium' : 'ok';
      const emoji = acc < 60 ? '⚠️' : acc < 80 ? '📊' : '✅';
      return `<span class="tag-weakness-pill ${cls}" onclick="filterMistakesByTag('${escHtml(tag)}')" title="${total} reviews">
        ${emoji} ${escHtml(tag)} <strong>${acc}%</strong>
      </span>`;
    }).join('');
  }
}

function filterMistakesByTag(tag) {
  D.mistakesTagFilter.value = tag;
  loadMistakes();
}

async function startStudySingleCard(cardId) {
  const card = await Storage.Cards.get(cardId);
  if (!card) return;
  Session.deckId = card.deckId;
  Session.queue  = [card];
  Session.data   = Storage.Sessions.create(card.deckId);
  const deck     = await Storage.Decks.get(card.deckId);
  launchStudy(deck ? deck.name : 'Single Card', 'srs');
}

/* ══════════════════════════════════════════════════════════════════════
   CARD RELATIONSHIPS
   ══════════════════════════════════════════════════════════════════════ */
async function openRelModal(cardId) {
  if (!cardId) return;
  RelState.cardId = cardId;

  const card = await Storage.Cards.get(cardId);
  if (!card) return;

  RelState.linked = card.relatedCards || [];

  const front = stripHtml(card.type==='cloze' ? card.cloze : card.front);
  D.relCurrentCard.textContent = front.slice(0, 100) || 'This card';
  D.relSearch.value            = '';
  D.relSearchResults.innerHTML = '';

  await renderRelLinkedList();
  D.relModal.classList.remove('hidden');
  D.relSearch.focus();
}

async function renderRelLinkedList() {
  if (!RelState.linked.length) {
    D.relLinkedList.innerHTML = `<span style="color:var(--text-dim);font-size:0.82rem">No linked cards yet</span>`;
    return;
  }
  const items = await Promise.all(RelState.linked.map(id => Storage.Cards.get(id)));
  D.relLinkedList.innerHTML = items.filter(Boolean).map(c => {
    const front = escHtml(stripHtml(c.type==='cloze'?c.cloze:c.front).slice(0,80));
    return `<div class="rel-linked-item">
      <span>${front}</span>
      <button class="cli-btn" onclick="unlinkCard('${c.id}')" title="Remove link">✕</button>
    </div>`;
  }).join('');
}

async function searchRelCards(query) {
  if (!query.trim()) { D.relSearchResults.innerHTML = ''; return; }
  const cards = await Storage.Cards.getAll();
  const q     = query.toLowerCase();
  const results = cards
    .filter(c => c.id !== RelState.cardId && !RelState.linked.includes(c.id))
    .filter(c =>
      stripHtml(c.front).toLowerCase().includes(q) ||
      stripHtml(c.back).toLowerCase().includes(q)  ||
      (c.cloze||'').toLowerCase().includes(q))
    .slice(0, 10);

  if (!results.length) {
    D.relSearchResults.innerHTML = `<div style="padding:12px;color:var(--text-dim);font-size:0.82rem;text-align:center">No cards found</div>`;
    return;
  }
  D.relSearchResults.innerHTML = results.map(c => {
    const front = escHtml(stripHtml(c.type==='cloze'?c.cloze:c.front).slice(0,80));
    const back  = escHtml(stripHtml(c.back).slice(0,40));
    return `<div class="rel-result-item" onclick="linkCard('${c.id}')">
      <span>${front} <span style="color:var(--text-dim)">→ ${back}</span></span>
      <button class="btn-sm" style="font-size:0.7rem">+ Link</button>
    </div>`;
  }).join('');
}

async function linkCard(targetId) {
  if (RelState.linked.includes(targetId)) return;
  RelState.linked.push(targetId);

  // Save bidirectionally
  await Storage.Cards.update(RelState.cardId, { relatedCards: RelState.linked });
  const target        = await Storage.Cards.get(targetId);
  const targetLinked  = [...(target.relatedCards||[])];
  if (!targetLinked.includes(RelState.cardId)) {
    targetLinked.push(RelState.cardId);
    await Storage.Cards.update(targetId, { relatedCards: targetLinked });
  }

  D.relSearch.value            = '';
  D.relSearchResults.innerHTML = '';
  await renderRelLinkedList();
  toast('🔗 Cards linked!', 'success', 1500);
}

async function unlinkCard(targetId) {
  RelState.linked = RelState.linked.filter(id => id !== targetId);
  await Storage.Cards.update(RelState.cardId, { relatedCards: RelState.linked });
  // Remove back-link too
  const target       = await Storage.Cards.get(targetId);
  const targetLinked = (target.relatedCards||[]).filter(id => id !== RelState.cardId);
  await Storage.Cards.update(targetId, { relatedCards: targetLinked });
  await renderRelLinkedList();
}

function closeRelModal() { D.relModal.classList.add('hidden'); }

async function showRelatedCards(card) {
  const related = card.relatedCards || [];
  if (!related.length) {
    D.relatedCardsPanel.classList.add('hidden');
    return;
  }
  const cards = await Promise.all(related.map(id => Storage.Cards.get(id)));
  const chips  = cards.filter(Boolean).map(c => {
    const front = escHtml(stripHtml(c.type==='cloze'?c.cloze:c.front).slice(0,35));
    return `<span class="related-card-chip" onclick="openCardHistory('${c.id}')" title="${front}">🔗 ${front}</span>`;
  }).join('');
  D.relatedCardsList.innerHTML = chips;
  D.relatedCardsPanel.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════════════════
   XP / LEVELLING SYSTEM
   ══════════════════════════════════════════════════════════════════════ */
const XP_PER_GRADE = { 0: 1, 1: 2, 2: 5, 3: 10 };
const XP_TABLE     = [100,200,350,550,800,1100,1500,2000,2600,3300]; // XP needed per level

async function getXP() {
  const xp  = (await Storage.Settings.get('xp',    0)) || 0;
  const lvl = (await Storage.Settings.get('level', 1)) || 1;
  return { xp, lvl };
}

async function addXP(grade) {
  let { xp, lvl } = await getXP();
  const earned     = XP_PER_GRADE[grade] || 1;
  xp              += earned;
  const needed     = XP_TABLE[Math.min(lvl - 1, XP_TABLE.length - 1)];

  if (xp >= needed) {
    xp  -= needed;
    lvl += 1;
    toast(`🎉 Level Up! You are now Level ${lvl}!`, 'success', 4000);
    launchConfetti(2500);
  }

  await Storage.Settings.set('xp',    xp);
  await Storage.Settings.set('level', lvl);
  updateXPBar(xp, lvl);
}

function updateXPBar(xp, lvl) {
  const needed = XP_TABLE[Math.min(lvl - 1, XP_TABLE.length - 1)];
  const pct    = Math.min(100, Math.round((xp / needed) * 100));
  D.xpLevel.textContent    = `Lv ${lvl}`;
  D.xpBarFill.style.width  = `${pct}%`;
  D.xpLabel.textContent    = `${xp} / ${needed} XP`;
}

async function loadXPBar() {
  const { xp, lvl } = await getXP();
  updateXPBar(xp, lvl);
}

/* ══════════════════════════════════════════════════════════════════════
   POMODORO TIMER
   ══════════════════════════════════════════════════════════════════════ */
const Pomo = {
  active:   false,
  isBreak:  false,
  seconds:  25 * 60,
  interval: null,
};

function togglePomodoro() {
  if (Pomo.active) {
    stopPomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  Pomo.active  = true;
  Pomo.isBreak = false;
  Pomo.seconds = 25 * 60;
  D.pomoTime.classList.remove('hidden', 'break');
  D.pomoToggle.textContent = '⏹';
  updatePomoDisplay();

  Pomo.interval = setInterval(() => {
    Pomo.seconds--;
    updatePomoDisplay();

    if (Pomo.seconds <= 0) {
      if (!Pomo.isBreak) {
        // Work session done
        Pomo.isBreak = true;
        Pomo.seconds = 5 * 60;
        D.pomoTime.classList.add('break');
        toast('🍅 Pomodoro done! Take a 5 min break.', 'success', 6000);
        if (Notification.permission === 'granted') {
          new Notification('FlashCard Pro 🍅', { body: 'Pomodoro complete! Time for a break.' });
        }
      } else {
        // Break done
        Pomo.isBreak = false;
        Pomo.seconds = 25 * 60;
        D.pomoTime.classList.remove('break');
        toast('☕ Break over! Back to studying.', 'info', 4000);
        if (Notification.permission === 'granted') {
          new Notification('FlashCard Pro ☕', { body: 'Break is over! Ready to study?' });
        }
      }
    }
  }, 1000);
}

function stopPomodoro() {
  Pomo.active = false;
  clearInterval(Pomo.interval);
  D.pomoToggle.textContent = '🍅';
  D.pomoTime.classList.add('hidden');
  D.pomoTime.classList.remove('break');
}

function updatePomoDisplay() {
  const m = Math.floor(Pomo.seconds / 60).toString().padStart(2, '0');
  const s = (Pomo.seconds % 60).toString().padStart(2, '0');
  D.pomoTime.textContent = `${m}:${s}`;
  if (Pomo.seconds <= 60 && !Pomo.isBreak) {
    D.pomoTime.style.color = 'var(--danger)';
  } else {
    D.pomoTime.style.color = Pomo.isBreak ? 'var(--c-good)' : 'var(--warn)';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   FOCUS MODE
   ══════════════════════════════════════════════════════════════════════ */
let focusMode = false;
function toggleFocusMode() {
  focusMode = !focusMode;
  D.studyOverlay.classList.toggle('focus-mode', focusMode);
  D.studyFocusBtn.classList.toggle('focus-active', focusMode);
  D.studyFocusBtn.title = focusMode ? 'Exit focus mode' : 'Focus mode';
}

function exitFocusMode() {
  if (focusMode) toggleFocusMode();
}

/* ══════════════════════════════════════════════════════════════════════
   BIONIC READING PROCESSOR
   ══════════════════════════════════════════════════════════════════════ */
function applyBionic(html) {
  if (!App.settings.bionicReading) return html;
  const div = document.createElement('div');
  div.innerHTML = html;

  function process(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue;
      if (!text.trim()) return;

      const parts = text.split(/([a-zA-Z0-9À-ÿ]+)/);
      const newHtml = parts.map(part => {
        if (!/^[a-zA-Z0-9À-ÿ]+$/.test(part)) return escHtml(part);
        const boldLen = Math.ceil(part.length / 2);
        return `<b class="bionic">${escHtml(part.substring(0, boldLen))}</b>${escHtml(part.substring(boldLen))}`;
      }).join('');

      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      while (temp.firstChild) node.parentNode.insertBefore(temp.firstChild, node);
      node.parentNode.removeChild(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'CODE' || node.classList.contains('bionic')) return;
      Array.from(node.childNodes).forEach(process);
    }
  }

  Array.from(div.childNodes).forEach(process);
  return div.innerHTML;
}

/* ══════════════════════════════════════════════════════════════════════
   MARKDOWN RENDERER
   ══════════════════════════════════════════════════════════════════════ */
function renderMarkdown(text) {
  if (!text) return '';
  // Preserve rich HTML formatting (colors, bold, etc.) from the editor
  const raw = text.trim() || text;

  const html = raw
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Unordered list
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g,   '<br>');

  return applyBionic(html);
}

/* ══════════════════════════════════════════════════════════════════════
   LEECH DETECTION
   ══════════════════════════════════════════════════════════════════════ */
const LEECH_THRESHOLD = 4;

function isLeech(card) {
  return (card.lapses || 0) >= LEECH_THRESHOLD;
}

async function flagLeeches(deckId) {
  const cards   = await Storage.Cards.getByDeck(deckId);
  const leeches = cards.filter(isLeech);
  return leeches;
}

/* ══════════════════════════════════════════════════════════════════════
   HINT SYSTEM
   ══════════════════════════════════════════════════════════════════════ */
function showHint(card) {
  const hint = card.hint || card.notes || '';
  if (!hint) return;
  D.hintBtn.classList.add('hidden');
  D.hintText.textContent = hint;
  D.hintText.classList.remove('hidden');
}

function resetHint() {
  D.hintBtn.classList.add('hidden');
  D.hintText.classList.add('hidden');
  D.hintText.textContent = '';
}

/* ══════════════════════════════════════════════════════════════════════
   CARD HISTORY MODAL
   ══════════════════════════════════════════════════════════════════════ */
async function openCardHistory(cardId) {
  const card = await Storage.Cards.get(cardId);
  if (!card) return;

  // Preview
  const front = card.type === 'cloze' ? card.cloze : stripHtml(card.front);
  const back  = stripHtml(card.back);
  D.historyCardPreview.innerHTML = `
    <div style="margin-bottom:6px">
      <strong style="color:var(--accent)">Q:</strong> ${escHtml(front.slice(0,120))}
    </div>
    <div style="margin-bottom:8px">
      <strong style="color:var(--accent2)">A:</strong> ${escHtml(back.slice(0,120))}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <span class="cli-state ${card.state || 'new'}">${card.state || 'new'}</span>
      ${card.flagged   ? '<span style="color:var(--warn);font-size:0.75rem">⚑ Flagged</span>'    : ''}
      ${card.suspended ? '<span style="color:var(--danger);font-size:0.75rem">⊘ Suspended</span>' : ''}
      ${isLeech(card)  ? '<span style="color:var(--danger);font-size:0.75rem">🩸 Leech</span>'    : ''}
    </div>`;

  // Stats — use formatInterval for correct display
  const history    = card.history || [];
  const correct    = history.filter(h => h.grade >= 2).length;
  const accuracy   = history.length ? Math.round((correct / history.length) * 100) : 0;
  const nextReview = card.dueDate
    ? (SRS.isDue(card) ? 'Now' : formatInterval(card.interval, card.dueDate))
    : '—';
  const retention  = Math.round(SRS.retentionRate(card) * 100);

  D.historyStatsRow.innerHTML = `
    <div class="history-stat">
      <div class="history-stat-val">${history.length}</div>
      <div class="history-stat-lbl">Reviews</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${accuracy}%</div>
      <div class="history-stat-lbl">Accuracy</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${card.lapses || 0}</div>
      <div class="history-stat-lbl">Lapses</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${formatInterval(card.interval, card.dueDate)}</div>
      <div class="history-stat-lbl">Interval</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${nextReview}</div>
      <div class="history-stat-lbl">Next Due</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${(card.difficulty !== undefined ? (11 - card.difficulty) : (card.easeFactor || 2.5)).toFixed(2)}</div>
      <div class="history-stat-lbl">Ease</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${card.repetitions || 0}</div>
      <div class="history-stat-lbl">Reps</div>
    </div>
    <div class="history-stat">
      <div class="history-stat-val">${retention}%</div>
      <div class="history-stat-lbl">Retention</div>
    </div>`;

  // Timeline
  const gradeLabels = ['Again', 'Hard', 'Good', 'Easy'];
  if (!history.length) {
    D.historyTimeline.innerHTML = `
      <div style="color:var(--text-dim);text-align:center;padding:20px">
        No review history yet — study this card to see data here
      </div>`;
  } else {
    D.historyTimeline.innerHTML = [...history].reverse().map((h, i) => {
      const d      = new Date(h.date);
      const date   = d.toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' });
      const time   = d.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' });
      // Use formatInterval for history entry interval too
      const intStr = formatInterval(h.interval || 0, h.interval > 0 ? h.date + (h.interval * 86400000) : null);
      const arrow  = h.interval > 0 ? `→ ${intStr}` : '→ requeue';
      return `
        <div class="history-row">
          <span class="history-row-grade g${h.grade}">${gradeLabels[h.grade]}</span>
          <span class="history-row-date">${date} at ${time}</span>
          <span class="history-row-interval">${arrow}</span>
        </div>`;
    }).join('');
  }

  D.historyModal.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════════════════
   SUBDECKS
   ══════════════════════════════════════════════════════════════════════ */

async function populateParentSelector(excludeId) {
  const decks = await Storage.Decks.getAll();
  D.deckParent.innerHTML = '<option value="">— None (Root Deck) —</option>';
  // Only allow root decks as parents (one level of nesting is clean)
  const roots = decks.filter(d => !d.parentId && d.id !== excludeId);
  roots.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = `${d.icon} ${d.name}`;
    D.deckParent.appendChild(opt);
  });
}

async function renderSubdeckGrid(parentId, allCards) {
  let children = [];
  const titleSpan = D.subdecksSection.querySelector('.subdecks-title span:nth-child(2)');

  if (parentId === 'recent') {
    const allDecks = await Storage.Decks.getAll();
    const deckLastReview = {};
    allCards.forEach(c => {
      if (c.lastReview) {
        deckLastReview[c.deckId] = Math.max(deckLastReview[c.deckId] || 0, c.lastReview);
      }
    });
    children = allDecks
      .filter(d => deckLastReview[d.id])
      .sort((a,b) => deckLastReview[b.id] - deckLastReview[a.id])
      .slice(0, 12);

    if (titleSpan) titleSpan.textContent = 'Recently Studied Decks';
    D.addSubdeckBtn.style.display = 'none';
  } else {
    children = await Storage.Decks.getChildren(parentId);
    children.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    if (titleSpan) titleSpan.textContent = 'Subdecks';
    D.addSubdeckBtn.style.display = 'inline-flex';
  }

  if (!children.length) {
    if (parentId === 'recent') {
      D.subdecksSection.style.display = 'block';
      D.subdeckGrid.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center;">No recent decks found. Study some cards!</div>';
    } else {
      D.subdecksSection.style.display = 'none';
    }
    D.studyAllSubBtn.style.display  = 'none';
    return;
  }

  D.subdecksSection.style.display = 'block';
  D.studyAllSubBtn.style.display  = parentId === 'recent' ? 'none' : 'inline-flex';
  D.subdeckGrid.innerHTML = '';

  children.forEach(deck => {
    const deckCards = allCards.filter(c => c.deckId === deck.id);
    const stats     = SRS.deckStats(deckCards);
    const due       = stats.due;
    const pct       = deckCards.length
      ? Math.round((stats.mature / deckCards.length) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'subdeck-card';
    card.style.setProperty('--subdeck-color', deck.color);
    card.innerHTML = `
      <div class="subdeck-card-header">
        <span class="subdeck-card-icon">${deck.icon}</span>
        <span class="subdeck-card-name">${escHtml(deck.name)}</span>
        <div class="deck-pin-dot ${deck.pinned ? 'pinned' : ''}" data-sd-action="pin" title="Toggle Pin"></div>
        <div class="subdeck-card-actions">
          <button class="cli-btn" data-sd-action="study"  title="Study">▶</button>
          <button class="cli-btn" data-sd-action="edit"   title="Edit">✏️</button>
          <button class="cli-btn" data-sd-action="delete" title="Delete">🗑</button>
        </div>
      </div>
      <div class="subdeck-card-srs">
        <span class="srs-tag new">${stats.new} new</span>
        <span class="srs-tag learning">${stats.learning} lrn</span>
        <span class="srs-tag review">${stats.review} rev</span>
      </div>
      <div class="subdeck-card-footer">
        <span>${deckCards.length} cards · ${pct}% mature</span>
        <span class="subdeck-due ${due ? '' : 'none'}">${due ? `${due} due` : '✓'}</span>
      </div>`;

    // Click card body → open subdeck detail
    card.addEventListener('click', e => {
      if (e.target.closest('[data-sd-action]')) return;
      navigateTo('deck-detail', deck.id);
    });

    // Action buttons
    card.querySelectorAll('[data-sd-action]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const action = btn.dataset.sdAction;
        if (action === 'pin') {
          await Storage.Decks.update(deck.id, { pinned: !deck.pinned });
          loadDeckDetail(App.currentDeckId);
        }
        if (action === 'study')  startStudy(deck.id);
        if (action === 'edit')   openDeckModal('edit', deck.id);
        if (action === 'delete') deleteDeck(deck.id);
      });
    });

    D.subdeckGrid.appendChild(card);
  });
}

// Study a deck AND all its subdecks combined
async function studyDeckFamily(deckId) {
  const family   = await Storage.Decks.getFamily(deckId);
  const allCards = [];
  for (const d of family) {
    const cards = await Storage.Cards.getByDeck(d.id);
    allCards.push(...cards);
  }
  const filtered = allCards.filter(c => !c.suspended);
  const queue    = SRS.buildQueue(filtered);

  if (!queue.length) { toast('No cards due in this deck or its subdecks 🎉', 'info'); return; }

  const deck    = await Storage.Decks.get(deckId);
  Session.deckId = deckId;
  Session.queue  = queue;
  Session.data   = Storage.Sessions.create(deckId);
  launchStudy(`${deck.icon} ${deck.name} (All)`, 'srs');
}

// Track which deck groups are collapsed (by deckId)
const collapsedGroups = new Set();

async function refreshSidebarWithTree() {
  const allDecks = await Storage.Decks.getAll();
  const allCards = await Storage.Cards.getAll();
  const roots    = allDecks.filter(d => !d.parentId);

  D.deckListSidebar.innerHTML = '';

  roots.forEach(deck => {
    const children = allDecks.filter(d => d.parentId === deck.id);
    const dueCount = allCards.filter(c => c.deckId === deck.id && !c.suspended && SRS.isDue(c)).length;
    const childDue = children.reduce((sum, ch) =>
      sum + allCards.filter(c => c.deckId === ch.id && !c.suspended && SRS.isDue(c)).length, 0);
    const totalDue    = dueCount + childDue;
    const isCollapsed = collapsedGroups.has(deck.id);
    const hasChildren = children.length > 0;

    // Root row wrapper
    const groupWrap = document.createElement('div');

    // Root deck row
    const rootRow = document.createElement('div');
    rootRow.style.cssText = 'display:flex;align-items:center;gap:0';

    // Collapse toggle (only if has children)
    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.className = `sdeck-toggle${isCollapsed ? ' collapsed' : ''}`;
      toggle.textContent = '▾';
      toggle.title = isCollapsed ? 'Expand' : 'Collapse';
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        if (collapsedGroups.has(deck.id)) {
          collapsedGroups.delete(deck.id);
        } else {
          collapsedGroups.add(deck.id);
        }
        refreshSidebarWithTree();
      });
      rootRow.appendChild(toggle);
    } else {
      // Spacer so alignment stays consistent
      const spacer = document.createElement('span');
      spacer.style.cssText = 'width:14px;flex-shrink:0';
      rootRow.appendChild(spacer);
    }

    const rootItem = document.createElement('div');
    rootItem.className = `sidebar-deck-item ${App.currentDeckId === deck.id ? 'active' : ''}`;
    rootItem.style.cssText = 'flex:1;min-width:0';
    rootItem.innerHTML = `
      <span class="sdeck-dot" style="background:${deck.color}"></span>
      <span class="sdeck-name">${escHtml(deck.name)}</span>
      ${totalDue ? `<span class="sdeck-count">${totalDue}</span>` : ''}`;
    rootItem.addEventListener('click', () => navigateTo('deck-detail', deck.id));
    rootRow.appendChild(rootItem);
    groupWrap.appendChild(rootRow);

    // Children tree
    if (hasChildren) {
      const childWrap = document.createElement('div');
      childWrap.className = `sdeck-children${isCollapsed ? ' collapsed' : ''}`;
      childWrap.style.maxHeight = isCollapsed ? '0' : `${children.length * 44}px`;
      childWrap.style.cssText  += ';border-left:1px solid var(--border);margin-left:22px;overflow:hidden;transition:max-height 0.3s ease';

      children.forEach(child => {
        const childDueCount = allCards.filter(c =>
          c.deckId === child.id && !c.suspended && SRS.isDue(c)).length;
        const childEl       = document.createElement('div');
        childEl.className   = `sidebar-subdeck-item ${App.currentDeckId === child.id ? 'active' : ''}`;
        childEl.innerHTML   = `
          <span style="color:var(--text-dim);font-size:0.65rem;flex-shrink:0">└</span>
          <span class="sdeck-dot" style="background:${child.color};width:6px;height:6px;flex-shrink:0"></span>
          <span class="sdeck-name">${escHtml(child.name)}</span>
          ${childDueCount ? `<span class="sdeck-count">${childDueCount}</span>` : ''}`;
        childEl.addEventListener('click', () => navigateTo('deck-detail', child.id));
        childWrap.appendChild(childEl);
      });

      groupWrap.appendChild(childWrap);
    }

    D.deckListSidebar.appendChild(groupWrap);
  });
}

/* ══════════════════════════════════════════════════════════════════════
   BULK IMPORT
   ══════════════════════════════════════════════════════════════════════ */
const TEMPLATES = {
  blank:   '',
  language:'Hello,Hola,spanish\nGoodbye,Adiós,spanish\nThank you,Gracias,spanish',
  math:    'What is the derivative of x²?,2x,calculus\nWhat is ∫x dx?,x²/2 + C,calculus\nPythagorean theorem?,a²+b²=c²,geometry',
  science: 'What is the speed of light?,299,792,458 m/s,physics\nWhat is H₂O?,Water,chemistry\nDNA stands for?,Deoxyribonucleic acid,biology',
  history: 'When did WW2 end?,1945,history\nWho was the first US president?,George Washington,history\nWhen did the Berlin Wall fall?,1989,history',
};

async function openBulkModal(deckId) {
  const targetId = deckId || App.currentDeckId;
  App.cardModal.deckId = targetId;

  D.bulkText.value        = '';
  D.bulkPreview.innerHTML = '';
  D.bulkCount.textContent = '0 cards ready';
  if (D.bulkSeparator) D.bulkSeparator.value = '';

  if (targetId) {
    // Inside a deck — show label, hide selector
    const deck = await Storage.Decks.get(targetId);
    D.bulkDeckLabel.innerHTML = deck
      ? `<span>${deck.icon}</span><span>${escHtml(deck.name)}</span>`
      : '<span>Unknown deck</span>';
    D.bulkDeckRow.style.display       = 'block';
    D.bulkDeckSelectRow.style.display = 'none';
  } else {
    // Global — show deck selector
    D.bulkDeckRow.style.display       = 'none';
    D.bulkDeckSelectRow.style.display = 'block';
    const allDecks = await Storage.Decks.getAll();
    D.bulkDeckSelect.innerHTML = allDecks.length
      ? allDecks.map(d => `<option value="${d.id}">${d.icon} ${escHtml(d.name)}</option>`).join('')
      : '<option value="">No decks yet</option>';
    App.cardModal.deckId = allDecks[0]?.id || null;
    D.bulkDeckSelect.addEventListener('change', () => {
      App.cardModal.deckId = D.bulkDeckSelect.value;
    });
  }

  D.bulkModal.classList.remove('hidden');
}

function closeBulkModal() { D.bulkModal.classList.add('hidden'); }

function parseBulkText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const customSep = D.bulkSeparator ? D.bulkSeparator.value : '';
  return lines.map(line => {
    // Support custom, comma or tab separator
    const sep   = customSep || (line.includes('\t') ? '\t' : ',');
    const parts = line.split(sep).map(p => p.trim());
    return {
      front: parts[0] || '',
      back:  parts[1] || '',
      tags:  parts[2] ? parts[2].split(' ').map(t => t.trim()).filter(Boolean) : [],
    };
  }).filter(c => c.front && c.back);
}

function updateBulkPreview() {
  const cards = parseBulkText(D.bulkText.value);
  D.bulkCount.textContent = `${cards.length} card${cards.length !== 1 ? 's' : ''} ready`;
  D.bulkPreview.innerHTML = cards.slice(0, 12).map((c, i) => `
    <div class="bulk-preview-row">
      <span>${i + 1}</span>
      <span class="bulk-preview-front">${escHtml(c.front.slice(0, 40))}</span>
      <span class="bulk-preview-back">${escHtml(c.back.slice(0, 40))}</span>
    </div>`).join('') + (cards.length > 12
      ? `<div style="color:var(--text-dim);padding:4px 6px">…and ${cards.length - 12} more</div>` : '');
}

async function saveBulkImport() {
  const cards  = parseBulkText(D.bulkText.value);
  const deckId = App.cardModal.deckId;
  if (!cards.length) { toast('No valid cards found', 'error'); return; }
  if (!deckId) { toast('No deck selected', 'error'); return; }

  for (const c of cards) {
    await Storage.Cards.create({ deckId, type: 'basic', front: c.front, back: c.back, tags: c.tags, notes: '' });
  }
  toast(`✅ Imported ${cards.length} cards!`, 'success');
  closeBulkModal();
  if (App.currentView === 'deck-detail') loadDeckDetail(deckId);
}

/* ══════════════════════════════════════════════════════════════════════
   SHARE DECK VIA URL
   ══════════════════════════════════════════════════════════════════════ */
async function shareDeck(deckId) {
  const deck  = await Storage.Decks.get(deckId);
  const cards = await Storage.Cards.getByDeck(deckId);

  const payload = JSON.stringify({
    deck:  { name: deck.name, icon: deck.icon, color: deck.color, description: deck.description },
    cards: cards.map(c => ({ type: c.type, front: c.front, back: c.back, cloze: c.cloze, tags: c.tags })),
  });

  // Compress using btoa (base64) — works for reasonable deck sizes
  try {
    const encoded = btoa(encodeURIComponent(payload));
    const url     = `${location.origin}${location.pathname}?import=${encoded}`;
    D.shareUrl.value = url;
    D.shareModal.classList.remove('hidden');
  } catch(e) {
    toast('Deck too large to share via URL. Use Export instead.', 'error');
  }
}

function closeShareModal() { D.shareModal.classList.add('hidden'); }

async function checkUrlImport() {
  const params  = new URLSearchParams(location.search);
  const encoded = params.get('import');
  if (!encoded) return;
  try {
    const json = decodeURIComponent(atob(encoded));
    const data = JSON.parse(json);
    const deck = await Storage.Decks.create({
      name:  data.deck.name,
      desc:  data.deck.description || '',
      icon:  data.deck.icon  || '📚',
      color: data.deck.color || '#00ff88',
    });
    for (const c of data.cards) {
      await Storage.Cards.create({ deckId: deck.id, type: c.type || 'basic', front: c.front, back: c.back, cloze: c.cloze || '', tags: c.tags || [] });
    }
    toast(`📥 Imported shared deck "${deck.name}"!`, 'success');
    history.replaceState({}, '', location.pathname);
    refreshSidebar();
    navigateTo('deck-detail', deck.id);
  } catch(e) {
    toast('Failed to import shared deck', 'error');
  }
}

/* ══════════════════════════════════════════════════════════════════════
   TEXT-TO-SPEECH
   ══════════════════════════════════════════════════════════════════════ */
function speakText(text) {
  if (!window.speechSynthesis) return;
  const clean = stripHtml(text);
  if (!clean.trim()) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(clean);
  utt.rate   = 0.95;
  utt.pitch  = 1;
  window.speechSynthesis.speak(utt);
}

let ttsEnabled = false;

function toggleTts() {
  ttsEnabled = !ttsEnabled;
  D.studyTtsBtn.style.color      = ttsEnabled ? 'var(--accent)' : '';
  D.studyTtsBtn.style.background = ttsEnabled ? 'var(--accent-dim)' : '';
  D.studyTtsBtn.title            = ttsEnabled ? 'TTS ON — click to disable' : 'Read aloud';
  if (!ttsEnabled) window.speechSynthesis.cancel();
}

function ttsSpeak(text) {
  if (!ttsEnabled) return;
  speakText(text);
}

function ttsCurrentCard() {
  // Manual tap — toggle TTS on/off
  toggleTts();
  // If just enabled, speak current side immediately
  if (ttsEnabled) {
    const card = Session.queue[Session.index];
    if (!card) return;
    const text = Session.flipped
      ? (card.type === 'cloze' ? stripHtml(card.cloze.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1')) : stripHtml(card.back))
      : (card.type === 'cloze' ? stripHtml(card.cloze.replace(/\{\{c\d+::([^}]+)\}\}/g, 'blank')) : stripHtml(card.front));
    speakText(text);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   UNDO LAST GRADE
   ══════════════════════════════════════════════════════════════════════ */
async function undoLastGrade() {
  if (!Session.undoStack.length) { toast('Nothing to undo', 'info'); return; }
  const { cardId, snapshot } = Session.undoStack.pop();

  // Restore card SRS state
  await Storage.Cards.save({ ...snapshot });

  // Step back in queue
  Session.index = Math.max(0, Session.index - 1);

  // Remove last session record
  if (Session.data.cards.length) {
    const last = Session.data.cards.pop();
    const labels = ['again','hard','good','easy'];
    Session.data[labels[last.grade]]--;
    Session.data.duration -= last.timeMs;
    if (last.wasNew) Session.data.newCount--;
    else             Session.data.reviewCount--;
  }

  await Storage.Sessions.save(Session.data);

  D.studyUndoBtn.classList.add('undo-flash');
  setTimeout(() => D.studyUndoBtn.classList.remove('undo-flash'), 400);
  toast('↩ Undone', 'info', 1500);
  showCard();
  updateStudyCounters();
}

/* ══════════════════════════════════════════════════════════════════════
   CRAM MODE
   ══════════════════════════════════════════════════════════════════════ */
async function startCram(deckId) {
  deckId = deckId || App.currentDeckId;
  let deck, cards;
  if (deckId === 'recent') {
    deck = { id: 'recent', name: 'Recent' };
    const allCards = await Storage.Cards.getAll();
    cards = allCards.filter(c => c.lastReview).sort((a,b) => b.lastReview - a.lastReview).slice(0, 100);
  } else {
    deck  = deckId ? await Storage.Decks.get(deckId) : null;
    cards = deckId
      ? await Storage.Cards.getByDeck(deckId)
      : await Storage.Cards.getAll();
  }
  cards = cards.filter(c => !c.suspended);

  if (!cards.length) { toast('No cards in this deck', 'info'); return; }

  // Shuffle all cards regardless of SRS state
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  Session.deckId = deckId;
  Session.queue  = cards;
  Session.data   = Storage.Sessions.create(deckId);
  Session.mode   = 'cram';
  launchStudy(deck ? deck.name : 'All Decks', 'cram');
}

/* ══════════════════════════════════════════════════════════════════════
   TIMED MODE
   ══════════════════════════════════════════════════════════════════════ */
async function startTimed(deckId) {
  deckId = deckId || App.currentDeckId;
  let deck, cards;
  if (deckId === 'recent') {
    deck = { id: 'recent', name: 'Recent' };
    const allCards = await Storage.Cards.getAll();
    cards = allCards.filter(c => c.lastReview).sort((a,b) => b.lastReview - a.lastReview).slice(0, 100);
  } else {
    deck  = deckId ? await Storage.Decks.get(deckId) : null;
    cards = deckId
      ? await Storage.Cards.getByDeck(deckId)
      : await Storage.Cards.getAll();
  }
  cards = cards.filter(c => !c.suspended);

  if (!cards.length) { toast('No cards in this deck', 'info'); return; }

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  Session.deckId   = deckId;
  Session.queue    = cards;
  Session.data     = Storage.Sessions.create(deckId);
  Session.mode     = 'timed';
  Session.timedSec = 30;
  launchStudy(deck ? deck.name : 'All Decks', 'timed');
}

function startTimedCountdown() {
  clearInterval(Session.timedIv);
  Session.timedLeft = Session.timedSec;
  D.studyTimedBar.classList.remove('hidden');
  updateTimedBar();

  Session.timedIv = setInterval(() => {
    Session.timedLeft--;
    updateTimedBar();
    if (Session.timedLeft <= 0) {
      clearInterval(Session.timedIv);
      // Auto-grade as 'Again' on timeout
      if (Session.flipped) gradeCard(0);
      else { flipCard(); setTimeout(() => gradeCard(0), 400); }
    }
  }, 1000);
}

function updateTimedBar() {
  const pct = (Session.timedLeft / Session.timedSec) * 100;
  D.timedBarFill.style.width = `${pct}%`;
  D.timedBarLabel.textContent = `${Session.timedLeft}s`;
  D.timedBarFill.classList.toggle('warning', Session.timedLeft <= 8);
}

function stopTimedCountdown() { clearInterval(Session.timedIv); }

/* ══════════════════════════════════════════════════════════════════════
   QUIZ MODE
   ══════════════════════════════════════════════════════════════════════ */
async function startQuiz(deckId) {
  deckId = deckId || App.currentDeckId;
  let deck, cards;
  if (deckId === 'recent') {
    deck = { id: 'recent', name: 'Recent' };
    const allCards = await Storage.Cards.getAll();
    cards = allCards.filter(c => c.lastReview).sort((a,b) => b.lastReview - a.lastReview).slice(0, 100);
  } else {
    deck  = deckId ? await Storage.Decks.get(deckId) : null;
    cards = deckId
      ? await Storage.Cards.getByDeck(deckId)
      : await Storage.Cards.getAll();
  }
  cards = cards.filter(c => !c.suspended && (c.front || c.cloze) && c.back);

  if (cards.length < 4) { toast('Need at least 4 cards for Quiz mode', 'info'); return; }

  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  Quiz.active  = true;
  Quiz.deckId  = deckId;
  Quiz.cards   = cards;
  Quiz.index   = 0;
  Quiz.score   = 0;
  Quiz.answered = false;

  D.quizDeckName.textContent = deck ? deck.name : 'All Decks';
  D.quizOverlay.classList.remove('hidden');
  showQuizCard();
}

function showQuizCard() {
  if (Quiz.index >= Quiz.cards.length) return endQuiz();

  const card    = Quiz.cards[Quiz.index];
  Quiz.answered = false;

  // Question
  const question = card.type === 'cloze'
    ? renderClozeHidden(card.cloze)
    : card.front;
  D.quizQuestion.innerHTML = question;

  // Progress
  const pct = Math.round((Quiz.index / Quiz.cards.length) * 100);
  D.quizProgressFill.style.width  = `${pct}%`;
  D.quizProgressLabel.textContent = `${Quiz.index + 1} / ${Quiz.cards.length}`;
  D.quizScore.textContent         = `${Quiz.score} pts`;
  D.quizFeedback.classList.add('hidden');

  // Generate choices — 1 correct + 3 random wrongs
  const correct    = stripHtml(card.back);
  const otherCards = Quiz.cards.filter((_, i) => i !== Quiz.index);
  const wrongs     = shuffle3(otherCards).slice(0, 3).map(c => stripHtml(c.back));
  const choices    = shuffle3([correct, ...wrongs]);

  D.quizChoices.innerHTML = choices.map((ch, i) => `
    <button class="quiz-choice" data-answer="${escHtml(ch)}" data-correct="${ch === correct}">
      <span style="font-weight:700;margin-right:8px;color:var(--text-dim)">${['A','B','C','D'][i]}</span>
      ${escHtml(ch.slice(0, 120))}
    </button>`).join('');

  D.quizChoices.querySelectorAll('.quiz-choice').forEach(btn => {
    btn.addEventListener('click', () => handleQuizAnswer(btn, correct));
  });
}

function handleQuizAnswer(btn, correct) {
  if (Quiz.answered) return;
  Quiz.answered = true;

  const isCorrect = btn.dataset.correct === 'true';

  // Highlight all choices
  D.quizChoices.querySelectorAll('.quiz-choice').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
    else if (b === btn && !isCorrect) b.classList.add('wrong');
  });

  // Feedback
  D.quizFeedback.classList.remove('hidden', 'correct', 'wrong');
  if (isCorrect) {
    Quiz.score += 10;
    D.quizFeedback.textContent = '✅ Correct! +10 pts';
    D.quizFeedback.classList.add('correct');
    speakText('Correct!');
  } else {
    D.quizFeedback.textContent = `❌ Wrong. Correct answer: ${correct}`;
    D.quizFeedback.classList.add('wrong');
  }

  D.quizScore.textContent = `${Quiz.score} pts`;
  Quiz.index++;
  setTimeout(showQuizCard, 1600);
}

function shuffle3(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function endQuiz() {
  Quiz.active = false;
  D.quizOverlay.classList.add('hidden');
  toast(`🎯 Quiz done! Score: ${Quiz.score} / ${Quiz.cards.length * 10}`, 'success', 5000);
  if (Quiz.score === Quiz.cards.length * 10) launchConfetti();
}

/* ══════════════════════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════════════════════ */
function launchConfetti(duration = 3000) {
  const canvas = D.confettiCanvas;
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const COLORS  = ['#00ff88','#00cfff','#ff4da6','#ffd700','#a78bfa','#ff9f40'];
  const pieces  = Array.from({ length: 120 }, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height - canvas.height,
    w:    Math.random() * 10 + 6,
    h:    Math.random() * 6  + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot:  Math.random() * Math.PI * 2,
    vx:   (Math.random() - 0.5) * 3,
    vy:   Math.random() * 4 + 2,
    vr:   (Math.random() - 0.5) * 0.2,
    opacity: 1,
  }));

  const end  = Date.now() + duration;
  let   rafId;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();

    pieces.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.vr;
      p.vy  += 0.08;
      if (now > end - 800) p.opacity = Math.max(0, p.opacity - 0.02);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha  = p.opacity;
      ctx.fillStyle    = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (now < end) {
      rafId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }
  rafId = requestAnimationFrame(draw);
}

/* ══════════════════════════════════════════════════════════════════════
   STREAK CELEBRATION
   ══════════════════════════════════════════════════════════════════════ */
async function checkStreakCelebration() {
  const streak    = await Storage.History.getStreak();
  const milestones = [7, 14, 30, 60, 100, 365];
  if (milestones.includes(streak)) {
    launchConfetti(4000);
    toast(`🔥 ${streak}-day streak! Amazing!`, 'success', 5000);
    D.streakCount.parentElement.classList.add('streak-celebrate');
    setTimeout(() => D.streakCount.parentElement.classList.remove('streak-celebrate'), 700);
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SCRATCHPAD
   ══════════════════════════════════════════════════════════════════════ */
let spActive = false, spDrawing = false, spCtx = null;
function toggleScratchpad() {
  spActive = !spActive;
  if(D.studyScratchpadBtn) D.studyScratchpadBtn.classList.toggle('active', spActive);
  if(D.scratchpadClearBtn) D.scratchpadClearBtn.classList.toggle('hidden', !spActive);
  if(D.scratchpadCanvas) D.scratchpadCanvas.classList.toggle('active', spActive);

  if(spActive && !spCtx && D.scratchpadCanvas) {
     spCtx = D.scratchpadCanvas.getContext('2d');
     resizeScratchpad();
     window.addEventListener('resize', resizeScratchpad);
  }
}
function resizeScratchpad() {
  if(!D.scratchpadCanvas) return;
  D.scratchpadCanvas.width = D.scratchpadCanvas.offsetWidth;
  D.scratchpadCanvas.height = D.scratchpadCanvas.offsetHeight;
}
function clearScratchpad() { if(spCtx && D.scratchpadCanvas) spCtx.clearRect(0,0, D.scratchpadCanvas.width, D.scratchpadCanvas.height); }

if (D.scratchpadCanvas) {
  D.scratchpadCanvas.addEventListener('pointerdown', e => { spDrawing = true; spCtx.beginPath(); spCtx.moveTo(e.offsetX, e.offsetY); });
  D.scratchpadCanvas.addEventListener('pointermove', e => {
    if (spDrawing && spCtx) {
      spCtx.lineTo(e.offsetX, e.offsetY);
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff88';
      spCtx.strokeStyle = accentColor;
      spCtx.lineWidth = 4;
      spCtx.lineCap = 'round';
      spCtx.stroke();
    }
  });
  D.scratchpadCanvas.addEventListener('pointerup', () => spDrawing = false);
  D.scratchpadCanvas.addEventListener('pointerout', () => spDrawing = false);
}

/* ══════════════════════════════════════════════════════════════════════
   IMAGE OCCLUSION
   ══════════════════════════════════════════════════════════════════════ */
let occBase64 = null;
let occBoxesData = [];
let occStart = null;
let occTempDiv = null;

function renderOccBoxes() {
  if(!D.occEditorBoxes) return;
  D.occEditorBoxes.innerHTML = occBoxesData.map((b,i) => `<div class="occ-box" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%" title="Box ${i}"></div>`).join('');
}

if (D.occImgInput) {
  D.occImgInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { occBase64 = ev.target.result; D.occEditorImg.src = occBase64; occBoxesData = []; renderOccBoxes(); };
    reader.readAsDataURL(file);
  });

  D.occEditorWrap.addEventListener('pointerdown', e => {
    if(!occBase64) return;
    const rect = D.occEditorWrap.getBoundingClientRect();
    occStart = { x: ((e.clientX - rect.left)/rect.width)*100, y: ((e.clientY - rect.top)/rect.height)*100 };
    occTempDiv = document.createElement('div');
    occTempDiv.className = 'occ-box';
    occTempDiv.style.left = occStart.x + '%';
    occTempDiv.style.top = occStart.y + '%';
    D.occEditorWrap.appendChild(occTempDiv);
    e.preventDefault();
  });

  D.occEditorWrap.addEventListener('pointermove', e => {
    if(!occStart || !occTempDiv) return;
    const rect = D.occEditorWrap.getBoundingClientRect();
    const currX = Math.max(0, Math.min(100, ((e.clientX - rect.left)/rect.width)*100));
    const currY = Math.max(0, Math.min(100, ((e.clientY - rect.top)/rect.height)*100));
    const x = Math.min(occStart.x, currX), y = Math.min(occStart.y, currY);
    const w = Math.abs(currX - occStart.x), h = Math.abs(currY - occStart.y);
    occTempDiv.style.left = x + '%'; occTempDiv.style.top = y + '%';
    occTempDiv.style.width = w + '%'; occTempDiv.style.height = h + '%';
  });

  D.occEditorWrap.addEventListener('pointerup', e => {
    if(!occStart || !occTempDiv) return;
    const rect = D.occEditorWrap.getBoundingClientRect();
    const currX = Math.max(0, Math.min(100, ((e.clientX - rect.left)/rect.width)*100));
    const currY = Math.max(0, Math.min(100, ((e.clientY - rect.top)/rect.height)*100));
    const x = Math.min(occStart.x, currX), y = Math.min(occStart.y, currY);
    const w = Math.abs(currX - occStart.x), h = Math.abs(currY - occStart.y);
    occTempDiv.remove(); occTempDiv = null; occStart = null;
    if(w > 2 && h > 2) { occBoxesData.push({ x, y, w, h }); renderOccBoxes(); }
  });

  D.occClearBtn.addEventListener('click', () => { occBoxesData = []; renderOccBoxes(); });
}

/* ══════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ══════════════════════════════════════════════════════════════════════ */
async function setupNotifications() {
  if (!('Notification' in window)) {
    toast('Notifications not supported in this browser', 'info');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    toast('🔔 Reminders enabled!', 'success');
    D.notifyBtn.classList.add('notify-on');
    D.notifyBtn.title = 'Reminders enabled';
    scheduleNotificationCheck();
  } else {
    toast('Notification permission denied', 'error');
  }
}

function scheduleNotificationCheck() {
  // Check every hour if there are due cards
  setInterval(async () => {
    if (Notification.permission !== 'granted') return;
    const cards = await Storage.Cards.getAll();
    const due   = cards.filter(c => !c.suspended && SRS.isDue(c)).length;
    if (due > 0) {
      new Notification('FlashCard Pro ⚡', {
        body: `You have ${due} card${due > 1 ? 's' : ''} due for review!`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text y="32" font-size="32">⚡</text></svg>',
      });
    }
  }, 60 * 60 * 1000);
}

/* ══════════════════════════════════════════════════════════════════════
   CARD LIVE PREVIEW
   ══════════════════════════════════════════════════════════════════════ */
function bindCardPreview() {
  const update = () => {
    const type = App.cardModal.type;
    if (type === 'cloze') {
      D.previewFrontContent.innerHTML = renderClozeHidden(D.clozeEditor.value);
      D.previewBackContent.innerHTML  = renderClozeRevealed(D.clozeEditor.value);
    } else {
      D.previewFrontContent.innerHTML = D.cardFrontEditor.innerHTML;
      D.previewBackContent.innerHTML  = D.cardBackEditor.innerHTML;
    }
  };
  D.cardFrontEditor.addEventListener('input', update);
  D.cardBackEditor.addEventListener('input',  update);
  D.clozeEditor.addEventListener('input',     update);
}

/* ═══════════════════════════════════════════════════════════════════════
   EVENT BINDINGS
   ═══════════════════════════════════════════════════════════════════════ */
function bindEvents() {

  /* ── SIDEBAR & NAV ─── */
  D.sidebarToggle.addEventListener('click', () => {
    if (window.innerWidth <= 680) {
      D.sidebar.classList.remove('mobile-open');
      D.sidebar.classList.remove('collapsed');
    } else {
      D.sidebar.classList.toggle('collapsed');
    }
  });
  D.menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    D.sidebar.classList.toggle('mobile-open');
  });

  document.addEventListener('click', e => {
    if (window.innerWidth <= 680 && D.sidebar.classList.contains('mobile-open')) {
      if (!D.sidebar.contains(e.target)) {
        D.sidebar.classList.remove('mobile-open');
      }
    }
  });

  D.navItems.forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  D.themeToggle.addEventListener('change', () => {
    const isLight = D.themeToggle.checked;
    const current = App.settings.theme || 'dark';
    let theme = isLight ? 'light' : 'dark';
    if (current.includes('glass')) {
      theme = isLight ? 'glass-light' : 'glass-dark';
    }
    applyTheme(theme);
    saveSetting('theme', theme);
  });

  D.globalSearch.addEventListener('input', debounce(async () => {
    const q = D.globalSearch.value.trim();

    if (!q) {
      // Restore sidebar to normal on clear
      await refreshSidebarWithTree();
      return;
    }

    const [allCards, allDecks] = await Promise.all([
      Storage.Cards.getAll(),
      Storage.Decks.getAll(),
    ]);

    const ql = q.toLowerCase();

    // Search cards
    const matchedCards = allCards.filter(c =>
      stripHtml(c.front).toLowerCase().includes(ql)  ||
      stripHtml(c.back).toLowerCase().includes(ql)   ||
      (c.cloze  || '').toLowerCase().includes(ql)    ||
      (c.tags   || []).some(t => t.toLowerCase().includes(ql)) ||
      (c.notes  || '').toLowerCase().includes(ql)    ||
      (c.hint   || '').toLowerCase().includes(ql)
    );

    // Search decks — highlight matching decks in sidebar
    const matchedDeckIds = new Set(
      allDecks
        .filter(d => d.name.toLowerCase().includes(ql))
        .map(d => d.id)
    );

    // Filter sidebar visually
    D.deckListSidebar.querySelectorAll('.sidebar-deck-item, .sidebar-subdeck-item').forEach(el => {
      const name = el.querySelector('.sdeck-name')?.textContent?.toLowerCase() || '';
      el.style.opacity = name.includes(ql) ? '1' : '0.35';
    });

    // Navigate to browse and show results
    await navigateTo('browse');
    renderBrowseTable(matchedCards, allDecks);

    // Show search result count
    toast(`Found ${matchedCards.length} card${matchedCards.length !== 1 ? 's' : ''} matching "${q}"`, 'info', 2500);
  }, 350));

  /* ── HOME ─── */
  D.studyAllBtn.addEventListener('click',     () => startStudy(null));
  D.cramAllBtn.addEventListener('click',      () => startCram(null));
  D.timedAllBtn.addEventListener('click',     () => startTimed(null));
  D.quizAllBtn.addEventListener('click',      () => startQuiz(null));
  D.newDeckBtnHome.addEventListener('click',  () => openDeckModal('create'));
  D.createFirstDeck.addEventListener('click', () => openDeckModal('create'));

  /* ── DECKS ─── */
  D.newDeckBtn.addEventListener('click',      () => openDeckModal('create'));
  D.newDeckBtnDecks.addEventListener('click', () => openDeckModal('create'));
  D.deckFilter.addEventListener('input', debounce(async () => {
    const q = D.deckFilter.value.toLowerCase();
    const [decks, cards] = await Promise.all([Storage.Decks.getAll(), Storage.Cards.getAll()]);
    const rootDecks = decks.filter(d => !d.parentId && d.name.toLowerCase().includes(q));
    const recentDeck = { id: 'recent', name: 'Recent', icon: '🕒', color: '#00cfff', description: 'Recently studied cards' };
    const displayDecks = ('recent'.includes(q)) ? [...rootDecks, recentDeck] : rootDecks;
    renderDeckGrid(D.decksGrid, displayDecks, cards, null);
  }, 250));

  D.importBtn.addEventListener('click',      triggerImport);

  /* ── DECK DETAIL ─── */
  D.studyDeckBtn.addEventListener('click',    () => startStudy(App.currentDeckId));
  D.cramDeckBtn.addEventListener('click',     () => startCram(App.currentDeckId));
  D.timedDeckBtn.addEventListener('click',    () => startTimed(App.currentDeckId));
  D.quizDeckBtn.addEventListener('click',     () => startQuiz(App.currentDeckId));
  D.studyAllSubBtn.addEventListener('click',  () => studyDeckFamily(App.currentDeckId));
  D.addSubdeckBtn.addEventListener('click',   () => openDeckModal('create'));
  if (D.addCardBtnHeader) D.addCardBtnHeader.addEventListener('click', () => openCardModal('create', null, App.currentDeckId));
  D.addCardBtn.addEventListener('click',      () => openCardModal('create', null, App.currentDeckId));
  D.editDeckBtn.addEventListener('click',     () => openDeckModal('edit', App.currentDeckId));
  D.deleteDeckBtn.addEventListener('click',   () => deleteDeck(App.currentDeckId));
  D.exportDeckBtn.addEventListener('click',   () => exportDeck(App.currentDeckId));
  D.shareDeckBtn.addEventListener('click',    () => shareDeck(App.currentDeckId));
  D.bulkAddBtn.addEventListener('click',      () => openBulkModal(App.currentDeckId));
  D.deckTabs.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));
  D.cardSearch.addEventListener('input', debounce(async () => {
    const q     = D.cardSearch.value.toLowerCase();
    const cards = await Storage.Cards.getByDeck(App.currentDeckId);
    renderCardList(cards.filter(c =>
      (c.front + c.back + c.cloze + (c.tags||[]).join(' ')).toLowerCase().includes(q)));
  }, 250));

  /* ── DECK MODAL ─── */
  D.deckModalClose.addEventListener('click',  closeDeckModal);
  D.deckModalCancel.addEventListener('click', closeDeckModal);
  D.deckModalSave.addEventListener('click',   saveDeckModal);
  D.deckModal.addEventListener('click', e => { if (e.target === D.deckModal) closeDeckModal(); });
  D.deckName.addEventListener('keydown', e => { if (e.key === 'Enter') saveDeckModal(); });

  /* ── CARD MODAL ─── */
  D.cardModalClose.addEventListener('click',       closeCardModal);
  D.cardModalCancel.addEventListener('click',      closeCardModal);
  D.cardModalSave.addEventListener('click',        () => saveCardModal(false));
  D.cardModalSaveAnother.addEventListener('click', () => saveCardModal(true));
  D.cardModal.addEventListener('click', e => { if (e.target === D.cardModal) closeCardModal(); });
  D.cardTypeToggle.querySelectorAll('.type-btn').forEach(btn =>
    btn.addEventListener('click', () => setCardType(btn.dataset.type)));
  bindToolbar('frontToolbar', 'cardFrontEditor');
  bindToolbar('backToolbar', 'cardBackEditor');

  /* ── CONFIRM MODAL ─── */
  D.confirmClose.addEventListener('click',  closeConfirm);
  D.confirmCancel.addEventListener('click', closeConfirm);
  D.confirmOk.addEventListener('click', () => {
    if (_confirmCb) _confirmCb();
    closeConfirm();
  });
  D.confirmModal.addEventListener('click', e => { if (e.target === D.confirmModal) closeConfirm(); });

  /* ── STUDY ─── */
  D.studyClose.addEventListener('click', () => {
    confirm2('End Session?', 'Your progress so far will be saved.', () => {
      endStudy();
    });
  });

  if(D.studyScratchpadBtn) D.studyScratchpadBtn.addEventListener('click', toggleScratchpad);
  if(D.scratchpadClearBtn) D.scratchpadClearBtn.addEventListener('click', clearScratchpad);

  D.flipBtn.addEventListener('click', flipCard);
  D.flashcard.addEventListener('click', () => { if (!Session.flipped) flipCard(); });

  D.gradeRow.querySelectorAll('.grade-btn').forEach(btn => {
    btn.addEventListener('click', () => gradeCard(parseInt(btn.dataset.grade)));
  });

  D.studyTtsBtn.addEventListener('click',  ttsCurrentCard);
  D.studyUndoBtn.addEventListener('click', undoLastGrade);
  D.quizClose.addEventListener('click',    () => { Quiz.active = false; D.quizOverlay.classList.add('hidden'); });

  D.studyFlagBtn.addEventListener('click', async () => {
    if (!Session.active) return;
    const card = Session.queue[Session.index];
    if (!card) return;
    await Storage.Cards.update(card.id, { flagged: !card.flagged });
    D.studyFlagBtn.style.color = card.flagged ? '' : 'var(--warn)';
    toast(card.flagged ? 'Flag removed' : 'Card flagged ⚑', 'info');
  });

  D.studySuspendBtn.addEventListener('click', async () => {
    if (!Session.active) return;
    const card = Session.queue[Session.index];
    if (!card) return;
    await Storage.Cards.update(card.id, { suspended: true });
    toast('Card suspended', 'info');
    Session.index++;
    showCard();
  });

  D.studyEditBtn.addEventListener('click', () => {
    if (!Session.active) return;
    const card = Session.queue[Session.index];
    if (card) openCardModal('edit', card.id, card.deckId);
  });

  /* ── SUMMARY ─── */
  D.summaryStudyMore.addEventListener('click', () => {
    D.summaryOverlay.classList.add('hidden');
    startStudy(Session.deckId);
  });
  D.summaryDone.addEventListener('click', () => {
    D.summaryOverlay.classList.add('hidden');
    navigateTo('home');
  });

  /* ── MISTAKES ─── */
  D.mistakesDeckFilter.addEventListener('change', loadMistakes);
  D.mistakesTagFilter.addEventListener('change',  loadMistakes);

  /* ── BROWSE ─── */
  D.browseDeckFilter.addEventListener('change', filterBrowse);
  D.browseStateFilter.addEventListener('change', filterBrowse);
  D.browseSearch.addEventListener('input', debounce(filterBrowse, 250));

  /* ── BULK MODAL ─── */
  D.bulkModalClose.addEventListener('click',  closeBulkModal);
  D.bulkModalCancel.addEventListener('click', closeBulkModal);
  D.bulkModalSave.addEventListener('click',   saveBulkImport);
  D.bulkImportBtn.addEventListener('click', () => {
    // From topbar — only auto-select if we're in a deck detail view
    const id = App.currentView === 'deck-detail' ? App.currentDeckId : null;
    openBulkModal(id);
  });
  D.bulkText.addEventListener('input', debounce(updateBulkPreview, 200));
  if (D.bulkSeparator) D.bulkSeparator.addEventListener('input', debounce(updateBulkPreview, 200));
  D.bulkModal.addEventListener('click', e => { if (e.target === D.bulkModal) closeBulkModal(); });
  D.templatePicker.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      D.templatePicker.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      D.bulkText.value = TEMPLATES[btn.dataset.tpl] || '';
      updateBulkPreview();
    });
  });

  /* ── SHARE MODAL ─── */
  D.shareModalClose.addEventListener('click',  closeShareModal);
  D.shareModalClose2.addEventListener('click', closeShareModal);
  D.shareModal.addEventListener('click', e => { if (e.target === D.shareModal) closeShareModal(); });
  D.copyShareUrl.addEventListener('click', () => {
    D.shareUrl.select();
    document.execCommand('copy');
    toast('🔗 Link copied!', 'success', 2000);
  });

  /* ── CONFIDENCE RATING ─── */
  document.querySelectorAll('.conf-btn').forEach(btn => {
    btn.addEventListener('click', () => selectConfidence(parseInt(btn.dataset.conf)));
  });

  /* ── TYPE ANSWER ─── */
  D.typeToggleBtn.addEventListener('click', toggleTypeAnswer);
  D.typeAnswerInput.addEventListener('input', e => {
    Session.typedAnswer = e.target.value;
  });
  D.typeAnswerInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !Session.flipped) flipCard();
  });

  /* ── VOICE INPUT ─── */
  D.voiceInputBtn.addEventListener('click', toggleVoiceInput);

  /* ── SPACED READING ─── */
  D.studySpacedBtn.addEventListener('click', toggleSpacedMode);

  /* ── FOCUS MODE ─── */
  D.studyFocusBtn.addEventListener('click', toggleFocusMode);
  D.focusExitBtn.addEventListener('click',  exitFocusMode);

  /* ── RELATIONSHIPS ─── */
  D.studyRelBtn.addEventListener('click', () => {
    const card = Session.queue[Session.index];
    if (card) openRelModal(card.id);
  });
  D.relModalClose.addEventListener('click',  closeRelModal);
  D.relModalClose2.addEventListener('click', closeRelModal);
  D.relModal.addEventListener('click', e => { if (e.target === D.relModal) closeRelModal(); });
  D.relSearch.addEventListener('input', debounce(e => searchRelCards(e.target.value), 250));

  /* ── HINT ─── */
  D.hintBtn.addEventListener('click', () => {
    const card = Session.queue[Session.index];
    if (card) showHint(card);
  });

  /* ── POMODORO ─── */
  D.pomoToggle.addEventListener('click', togglePomodoro);

  /* ── HISTORY MODAL ─── */
  D.historyModalClose.addEventListener('click', () => D.historyModal.classList.add('hidden'));
  D.historyModal.addEventListener('click', e => { if (e.target === D.historyModal) D.historyModal.classList.add('hidden'); });

  /* ── NOTIFY ─── */
  D.notifyBtn.addEventListener('click', setupNotifications);

  /* ── CARD PREVIEW ─── */
  bindCardPreview();

  /* ── SETTINGS ─── */
  D.settingDailyNew.addEventListener('change',   () => saveSetting('dailyNew',    parseInt(D.settingDailyNew.value)));
  D.settingDailyReview.addEventListener('change',() => saveSetting('dailyReview', parseInt(D.settingDailyReview.value)));
  D.settingTimer.addEventListener('change',      () => saveSetting('timer',        D.settingTimer.checked));
  D.settingAutoReveal.addEventListener('change', () => saveSetting('autoReveal',  parseInt(D.settingAutoReveal.value)));
  D.settingTheme.addEventListener('change',      () => { applyTheme(D.settingTheme.value); saveSetting('theme', D.settingTheme.value); });
  D.settingFontSize.addEventListener('change',   () => saveSetting('fontSize',    D.settingFontSize.value));
  D.settingAnimations.addEventListener('change', () => saveSetting('animations',  D.settingAnimations.checked));

  if (D.settingBionicReading) D.settingBionicReading.addEventListener('change', () => saveSetting('bionicReading', D.settingBionicReading.checked));
  if (D.settingBionicColor) D.settingBionicColor.addEventListener('input', () => {
    saveSetting('bionicColor', D.settingBionicColor.value);
    document.documentElement.style.setProperty('--bionic-color', D.settingBionicColor.value);
  });
  if (D.clearBionicColorBtn) D.clearBionicColorBtn.addEventListener('click', () => {
    saveSetting('bionicColor', '');
    document.documentElement.style.setProperty('--bionic-color', 'inherit');
    D.settingBionicColor.value = '#000000';
  });

  D.exportAllBtn.addEventListener('click',  exportAll);
  D.importDeckBtn.addEventListener('click', triggerImport);
  D.resetAllBtn.addEventListener('click',   () => {
    confirm2('Reset All Data', 'This will delete ALL decks, cards and history. Are you sure?', async () => {
      await indexedDB.deleteDatabase('FlashCardAppDB');
      toast('All data reset. Reloading…', 'info');
      setTimeout(() => location.reload(), 1200);
    });
  });

  /* ── KEYBOARD SHORTCUTS ─── */
  document.addEventListener('keydown', e => {
    // Don't fire in inputs
    if (e.target.matches('input,textarea,[contenteditable]')) return;

    if (Session.active && !D.studyOverlay.classList.contains('hidden')) {
      switch(e.key) {
        case ' ': case 'Enter': e.preventDefault(); if (!Session.flipped) flipCard(); break;
        case '1': if (Session.flipped) gradeCard(0); break;
        case '2': if (Session.flipped) gradeCard(1); break;
        case '3': if (Session.flipped) gradeCard(2); break;
        case '4': if (Session.flipped) gradeCard(3); break;
        case 'e': case 'E': D.studyEditBtn.click(); break;
        case 'f': case 'F': D.studyFlagBtn.click(); break;
        case 's': case 'S': D.studySuspendBtn.click(); break;
        case 'u': case 'U': undoLastGrade(); break;
        case 't': case 'T': ttsCurrentCard(); break;
        case 'Escape': D.studyClose.click(); break;
      }
      return;
    }

    // Global shortcuts
    switch(e.key) {
      case 'n': case 'N': openDeckModal('create'); break;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
function toast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${escHtml(msg)}</span>`;
  D.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastIn 0.25s ease reverse';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function getLast14DayLabels(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  });
}

function buildDailyData(sessions, days) {
  const counts = Array(days).fill(0);
  const now    = Date.now();
  sessions.forEach(s => {
    const ago = Math.floor((now - s.date) / 86400000);
    if (ago >= 0 && ago < days) counts[days - 1 - ago] += s.cards.length;
  });
  return counts;
}

/* ── BOOT ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);