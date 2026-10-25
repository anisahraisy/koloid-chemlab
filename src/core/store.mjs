/**
 * @file store.mjs
 * Reactive state store and persistent progress tracking for Colloid & Surface Chemistry.
 */

import { safeJSONParse } from './security.mjs';

const STORAGE_KEY = 'aici_colloid_chem_progress_v1';

class Store {
  constructor() {
    this.listeners = new Map();
    this.state = {
      activeRoute: '#/matrix',
      completedCases: {},
      caseScores: {},
      totalScore: 0,
      userPreferences: {
        soundEffects: false,
        theme: 'editorial-paper'
      }
    };
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = safeJSONParse(saved, null);
        if (parsed && typeof parsed === 'object') {
          this.state.completedCases = parsed.completedCases || {};
          this.state.caseScores = parsed.caseScores || {};
          this.recalculateTotalScore();
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completedCases: this.state.completedCases,
        caseScores: this.state.caseScores,
        updatedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  }

  recalculateTotalScore() {
    let sum = 0;
    for (const s of Object.values(this.state.caseScores)) {
      if (typeof s === 'number') sum += s;
    }
    this.state.totalScore = sum;
  }

  get(key) {
    return this.state[key];
  }

  set(key, val) {
    this.state[key] = val;
    this.emit(key, val);
  }

  saveCaseResult(caseId, score, isPassed, details = {}) {
    this.state.completedCases[caseId] = isPassed;
    this.state.caseScores[caseId] = score;
    this.recalculateTotalScore();
    this.saveToStorage();
    this.emit('cases_updated', {
      caseId,
      score,
      isPassed,
      totalScore: this.state.totalScore,
      completedCount: Object.values(this.state.completedCases).filter(Boolean).length
    });
  }

  resetProgress() {
    this.state.completedCases = {};
    this.state.caseScores = {};
    this.state.totalScore = 0;
    this.saveToStorage();
    this.emit('cases_updated', { reset: true, totalScore: 0, completedCount: 0 });
  }

  on(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.off(key, callback);
  }

  off(key, callback) {
    const set = this.listeners.get(key);
    if (set) {
      set.delete(callback);
    }
  }

  emit(key, data) {
    const set = this.listeners.get(key);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error(`Store listener error on [${key}]:`, err);
        }
      }
    }
  }
}

export const store = new Store();
