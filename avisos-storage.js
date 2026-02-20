/**
 * Avisos – armazenamento partilhado (localStorage).
 * Avisos são lembretes criados pela DHL; só desaparecem quando a DHL exclui ou a data Expire.
 * Chave: dhl_avisos (array de { id, title, message, expireDate, createdAt, deleted? }).
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

  /** Adiciona um aviso (DHL cria). */
  function addAviso(aviso) {
    var list = loadRaw();
    var id = 'aviso-' + Date.now();
    list.unshift({
      id: id,
      title: (aviso.title || '').trim(),
      message: (aviso.message || '').trim(),
      expireDate: (aviso.expireDate || '').trim(),
      createdAt: new Date().toISOString(),
      deleted: false
    });
    saveRaw(list);
    return id;
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
    deleteAviso: deleteAviso
  };
})(typeof window !== 'undefined' ? window : this);
