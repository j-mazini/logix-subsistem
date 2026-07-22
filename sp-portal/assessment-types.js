/**
 * Shared, public-safe assessment types/helpers. Loaded by BOTH the admin page
 * (sp-portal/vetting-admin) and the candidate-facing page (sp-portal/assessment).
 * Contains NO answer key — see vetting-admin/assessment-bank.js for that (admin-only).
 *
 * Firestore's assessments/{token} doc + onSnapshot are adapted to localStorage + the
 * native 'storage' event, which fires in *other* tabs when localStorage changes —
 * a reasonable cross-tab substitute for real-time listeners in a backend-less app.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'assessmentDocs.v1';

  function newAssessmentToken() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID().replace(/-/g, '');
    }
    var bytes = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function saveAll(all) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function getAssessment(token) {
    if (!token) return null;
    return loadAll()[token] || null;
  }

  function saveAssessment(doc) {
    var all = loadAll();
    all[doc.token] = doc;
    saveAll(all);
  }

  function deleteAssessment(token) {
    var all = loadAll();
    delete all[token];
    saveAll(all);
  }

  global.AssessmentStore = {
    STORAGE_KEY: STORAGE_KEY,
    newAssessmentToken: newAssessmentToken,
    getAssessment: getAssessment,
    saveAssessment: saveAssessment,
    deleteAssessment: deleteAssessment
  };
})(window);
