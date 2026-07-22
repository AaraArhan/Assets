/* ═══════════════════════════════════════════════════════════════════
   SRS.JS — FSRS (Free Spaced Repetition Scheduler) v4 Algorithm
   State of the art memory modeling
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

const SRS = (() => {

  /* ── CONSTANTS ─────────────────────────────────────────────────── */
  const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

  // FSRS v4 default weights — optimized matrix for difficulty & stability calculation
  const W = [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14,
    0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
  ];
  
  const REQUEST_RETENTION = 0.90; // 90% target retention

  /* ── HELPERS ───────────────────────────────────────────────────── */
  function today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function daysFromNow(n) {
    return today() + n * 86400000;
  }

  function daysBetween(a, b) {
    return Math.max(0, Math.round((b - a) / 86400000));
  }

  /* ── NEW CARD DEFAULTS ─────────────────────────────────────────── */
  function newCardData() {
    return {
      interval:    0,
      difficulty:  0,
      stability:   0,
      repetitions: 0,
      dueDate:     today(),
      lastReview:  null,
      lapses:      0,
      state:       'new',      // new | learning | review | relearning
      history:     [],         // [{ date, grade, interval }]
    };
  }

  /* ── CORE SCHEDULER ────────────────────────────────────────────── */
  function schedule(card, grade) {
    const srs = { ...card };
    const now = Date.now();
    
    // Normalize grade (0: Again, 1: Hard, 2: Good, 3: Easy)
    const g = Math.max(0, Math.min(3, grade));
    const fsrsGrade = g + 1; // FSRS uses 1, 2, 3, 4

    // Fallback logic for transitioning old SM-2 cards seamlessly
    if (srs.difficulty === undefined || srs.difficulty === 0) {
      srs.difficulty = 5;
      srs.stability = Math.max(srs.interval || 0.1, 0.1);
    }

    if (isNew(srs)) {
      // First Review S & D Calculation
      srs.difficulty = Math.max(1, Math.min(10, W[4] - Math.exp(W[5] * (fsrsGrade - 1)) + 1));
      srs.stability = W[fsrsGrade - 1];
      srs.state = (fsrsGrade === 4) ? 'review' : 'learning';
      srs.repetitions = 1;
      srs._step = (fsrsGrade === 3) ? 2 : (fsrsGrade === 2 ? 1 : 0);
    } else {
      // Calculate Retrievability (R)
      const elapsedDays = Math.max(0, (now - (srs.lastReview || now)) / 86400000);
      const R = Math.exp(Math.log(0.9) * elapsedDays / srs.stability);

      // Next Difficulty
      let nextD = srs.difficulty - W[6] * (srs.difficulty - 3);
      nextD += W[7] * (fsrsGrade - 3);
      srs.difficulty = Math.max(1, Math.min(10, nextD));

      if (fsrsGrade === 1) {
        // Lapse (Again)
        srs.lapses = (srs.lapses || 0) + 1;
        srs.stability = W[11] * Math.pow(srs.difficulty, -W[12]) * Math.pow(srs.stability, W[13]) * Math.exp((1 - R) * W[14]);
        srs.state = 'relearning';
        srs.repetitions = 0;
      } else {
        // Success (Hard, Good, Easy)
        const diffCalc = (11 - srs.difficulty);
        const S = srs.stability;
        if (fsrsGrade === 2) {
          srs.stability = S * Math.exp(W[15] * diffCalc * Math.pow(S, -W[9]) * (Math.exp((1-R)*W[10]) - 1));
        } else if (fsrsGrade === 3) {
          srs.stability = S * (1 + Math.exp(W[8]) * diffCalc * Math.pow(S, -W[9]) * (Math.exp((1-R)*W[10]) - 1));
        } else {
          srs.stability = S * Math.exp(W[16] * diffCalc * Math.pow(S, -W[9]) * (Math.exp((1-R)*W[10]) - 1));
        }
        
        // Graduate to review if Easy(4) or Good(3) on 2nd step
        if (srs.state === 'learning' || srs.state === 'relearning') {
          if (fsrsGrade === 4) {
            srs.state = 'review';
          } else if (fsrsGrade === 3) {
            if (srs._step >= 2) srs.state = 'review';
            else { srs.state = 'learning'; srs._step = 2; }
          } else if (fsrsGrade === 2) {
            srs.state = 'learning'; srs._step = 1;
          } else {
            srs.state = 'learning'; srs._step = 0;
          }
        } else {
          srs.state = 'review';
        }
        srs.repetitions++;
      }
    }

    // Interval Calculation based on target retention
    let nextInterval;
    if (srs.state === 'learning' || srs.state === 'relearning') {
        nextInterval = 0;
        if (fsrsGrade === 1) {
            srs.dueDate = now; // Again: immediately
        } else if (fsrsGrade === 2) {
            srs.dueDate = now + 10 * 60000; // Hard: 10 minutes
        } else if (fsrsGrade === 3) {
            srs.dueDate = now + 60 * 60000; // Good: 1 hour
        } else {
            srs.dueDate = now + 86400000; // Easy: 1 day
        }
    } else {
        nextInterval = Math.max(1, Math.round(srs.stability * 9 * (1/REQUEST_RETENTION - 1)));
        // Enforce 1 day interval for brand new graduates to avoid massive jumps
        if ((isNew(card) || card.state === 'learning' || card.state === 'relearning') && (fsrsGrade === 3 || fsrsGrade === 4)) {
            nextInterval = 1;
        }
        srs.dueDate = now + nextInterval * 86400000;
    }

    srs.interval = nextInterval;
    srs.lastReview = now;
    srs.history = [...(srs.history || []), { date: now, grade: g, interval: nextInterval }];

    return srs;
  }

  /* ── DUE CHECK ─────────────────────────────────────────────────── */
  function isDue(card) {
    return !card.dueDate || card.dueDate <= Date.now();
  }

  function isNew(card) {
    return card.state === 'new' || card.repetitions === 0;
  }

  function daysUntilDue(card) {
    if (isDue(card)) return 0;
    return daysBetween(today(), card.dueDate);
  }

  /* ── RETENTION ESTIMATE ─────────────────────────────────────────── */
  function retentionRate(card) {
    if (!card.lastReview || !card.stability) return 1;
    const elapsed = daysBetween(card.lastReview, Date.now());
    return Math.exp(Math.log(0.9) * elapsed / card.stability);
  }

  /* ── STUDY QUEUE SORTER ─────────────────────────────────────────── */
  function buildQueue(cards, opts = {}) {
    const { newLimit = 20, reviewLimit = 100 } = opts;
    const t = today();

    const failed     = [];
    const learning   = [];
    const newCards   = [];
    const reviews    = [];

    cards.forEach(card => {
      if (!isDue(card)) return;
      switch(card.state) {
        case 'relearning': failed.push(card);   break;
        case 'learning':   learning.push(card); break;
        case 'new':        newCards.push(card); break;
        default:           reviews.push(card);  break;
      }
    });

    // FSRS best practice: sort reviews by lowest stability first
    reviews.sort((a, b) => (a.stability || 0) - (b.stability || 0));

    // Shuffle new cards
    for (let i = newCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }

    return [
      ...failed,
      ...learning,
      ...newCards.slice(0, newLimit),
      ...reviews.slice(0, reviewLimit),
    ];
  }

  /* ── STATISTICS ────────────────────────────────────────────────── */
  function deckStats(cards) {
    const stats = {
      total:      cards.length,
      new:        0,
      learning:   0,
      review:     0,
      relearning: 0,
      due:        0,
      mature:     0,
      avgEase:    0,
      avgInterval:0,
      retention:  0,
    };

    let diffSum = 0, intervalSum = 0, retentionSum = 0, reviewedCount = 0;

    cards.forEach(c => {
      if (c.state === 'new' || !c.repetitions)    stats.new++;
      else if (c.state === 'learning')             stats.learning++;
      else if (c.state === 'relearning')           stats.relearning++;
      else                                         stats.review++;

      if (isDue(c)) stats.due++;
      if (c.interval >= 21) stats.mature++;

      if (c.repetitions > 0) {
        diffSum      += (11 - (c.difficulty || 5)); // Reverse proxy to act like Ease for UI stats
        intervalSum  += c.interval;
        retentionSum += retentionRate(c);
        reviewedCount++;
      }
    });

    if (reviewedCount > 0) {
      stats.avgEase     = (diffSum / reviewedCount).toFixed(2);
      stats.avgInterval = Math.round(intervalSum / reviewedCount);
      stats.retention   = Math.round((retentionSum / reviewedCount) * 100);
    }

    return stats;
  }

  /* ── FORECAST ───────────────────────────────────────────────────── */
  function forecast(cards, days = 14) {
    const result = Array(days).fill(0);
    const t      = today();

    cards.forEach(card => {
      if (card.state === 'new' || !card.dueDate) return;
      const d = daysBetween(t, card.dueDate);
      if (d >= 0 && d < days) result[d]++;
    });

    return result;
  }

  /* ── PUBLIC API ────────────────────────────────────────────────── */
  return {
    GRADE,
    newCardData,
    schedule,
    isDue,
    isNew,
    daysUntilDue,
    retentionRate,
    buildQueue,
    deckStats,
    forecast,
    today,
  };

})();