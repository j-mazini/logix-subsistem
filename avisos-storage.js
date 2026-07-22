/**
 * Avisos – armazenamento partilhado (localStorage).
 * Avisos criados pela DHL (source: 'DHL', o default) são visíveis em todo o
 * sistema — DHL e todos os SPs. Avisos criados por um Service Partner
 * (source: 'SP', com spName do autor) só são visíveis dentro do próprio
 * portal daquele SP: em qualquer outra página (DHL, ou o portal de outro SP)
 * eles são filtrados automaticamente por getAllAvisos()/getActiveAvisos(),
 * usando window.SpHeaderIdentity (presente só nas páginas do sp-portal) para
 * saber "quem está olhando". Isso evita que o aviso interno de um SP vaze
 * para o painel da DHL ou para o portal de outro SP sem precisar que cada
 * consumidor (dashboard da DHL, dashboard do SP, telas de Announcements)
 * reimplemente esse filtro.
 * Chave: dhl_avisos (array de { id, title, message, expireDate, createdAt,
 * deleted?, source?, spName? }).
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

  /** SP dono da página atual, ou null se estivermos no lado DHL. */
  function currentSpContext() {
    try {
      return (global.SpHeaderIdentity && global.SpHeaderIdentity.getCurrentSp()) || null;
    } catch (e) {
      return null;
    }
  }

  /** Um aviso 'SP' só é visível no portal do SP que o criou; avisos 'DHL' são globais. */
  function isVisibleTo(aviso, sp) {
    if (aviso.source !== 'SP') return true;
    return !!sp && aviso.spName === sp;
  }

  /** Lista todos os avisos visíveis para quem está olhando (para DHL: inclui deletados se precisar). */
  function getAllAvisos() {
    var sp = currentSpContext();
    return loadRaw().filter(function (a) { return isVisibleTo(a, sp); });
  }

  /** Lista apenas avisos ativos e visíveis: não deletados e expireDate >= hoje. */
  function getActiveAvisos() {
    var today = todayStr();
    var sp = currentSpContext();
    return loadRaw().filter(function (a) {
      return !a.deleted && a.expireDate && a.expireDate >= today && isVisibleTo(a, sp);
    });
  }

  /**
   * Adiciona um aviso. Por padrão é da DHL (source: 'DHL', visível a todos).
   * Uma tela de SP passa { source: 'SP', spName: <sp atual> } para criar um
   * aviso próprio, visível só no portal daquele SP.
   */
  function addAviso(aviso) {
    var list = loadRaw();
    var id = 'aviso-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var record = {
      id: id,
      title: (aviso.title || '').trim(),
      message: (aviso.message || '').trim(),
      expireDate: (aviso.expireDate || '').trim(),
      createdAt: new Date().toISOString(),
      deleted: false,
      source: aviso.source === 'SP' ? 'SP' : 'DHL'
    };
    if (record.source === 'SP') record.spName = aviso.spName || currentSpContext() || '';
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
