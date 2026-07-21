/**
 * Avisos – armazenamento partilhado (localStorage).
 * Avisos são lembretes criados pela DHL; só desaparecem quando a DHL exclui ou a data Expire.
 * Chave: dhl_avisos (array de { id, title, message, expireDate, createdAt, deleted? }).
 * Campos opcionais (usados pela página de Announcements, ignorados pelos demais
 * consumidores que só leem title/message/expireDate): type, urgency, audience, publishDate.
 */
(function (global) {
  'use strict';
  var STORAGE_KEY = 'dhl_avisos';

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadRaw() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRaw(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  /** Lista todos os avisos (para DHL: inclui deletados se precisar). */
  function getAllAvisos() {
    return loadRaw();
  }

  /** Lista apenas avisos ativos: não deletados e expireDate >= hoje. */
  function getActiveAvisos() {
    var today = todayStr();
    return loadRaw().filter(function (a) {
      return !a.deleted && a.expireDate && a.expireDate >= today;
    });
  }

  /** Adiciona um aviso (DHL cria). Aceita metadados opcionais (type/urgency/audience/publishDate). */
  function addAviso(aviso) {
    var list = loadRaw();
    var id = 'aviso-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var record = {
      id: id,
      title: (aviso.title || '').trim(),
      message: (aviso.message || '').trim(),
      expireDate: (aviso.expireDate || '').trim(),
      createdAt: new Date().toISOString(),
      deleted: false
    };
    if (aviso.publishDate) record.publishDate = String(aviso.publishDate).trim();
    if (aviso.type) record.type = aviso.type;
    if (aviso.urgency) record.urgency = aviso.urgency;
    if (Array.isArray(aviso.audience)) record.audience = aviso.audience;
    list.unshift(record);
    saveRaw(list);
    return id;
  }

  /** Atualiza campos de um aviso existente (edição). Retorna false se o id não existir. */
  function updateAviso(id, patch) {
    var list = loadRaw();
    var found = false;
    list = list.map(function (a) {
      if (a.id !== id) return a;
      found = true;
      return Object.assign({}, a, patch, { id: a.id });
    });
    if (found) saveRaw(list);
    return found;
  }

  /** Marca aviso como excluído pela DHL. */
  function deleteAviso(id) {
    var list = loadRaw();
    var found = list.some(function (a, i) {
      if (a.id === id) {
        list[i] = Object.assign({}, a, { deleted: true });
        return true;
      }
      return false;
    });
    if (found) saveRaw(list);
    return found;
  }

  global.AvisosStorage = {
    getActiveAvisos: getActiveAvisos,
    getAllAvisos: getAllAvisos,
    addAviso: addAviso,
    updateAviso: updateAviso,
    deleteAviso: deleteAviso
  };
})(typeof window !== 'undefined' ? window : this);
