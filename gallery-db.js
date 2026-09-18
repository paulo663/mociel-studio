// Shared IndexedDB wrapper — used by admin.html and app.js
const GalleryDB = (() => {
  const DB_NAME = 'monciel-gallery', VER = 1, STORE = 'images';

  const open = () => new Promise((ok, fail) => {
    const r = indexedDB.open(DB_NAME, VER);
    r.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    r.onsuccess = e => ok(e.target.result);
    r.onerror   = e => fail(e.target.error);
  });

  const getAll = async () => {
    const db = await open();
    return new Promise((ok, fail) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      r.onsuccess = e => ok(e.target.result);
      r.onerror   = e => fail(e.target.error);
    });
  };

  const add = (file, category, label, size) => new Promise((ok, fail) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const db = await open();
        const r = db.transaction(STORE, 'readwrite').objectStore(STORE)
          .add({ name: file.name, data: e.target.result, category, label, size, date: Date.now() });
        r.onsuccess = () => ok(r.result);
        r.onerror   = ev => fail(ev.target.error);
      } catch (err) { fail(err); }
    };
    reader.onerror = () => fail(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });

  const remove = async id => {
    const db = await open();
    return new Promise((ok, fail) => {
      const r = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      r.onsuccess = () => ok();
      r.onerror   = e => fail(e.target.error);
    });
  };

  return { getAll, add, remove };
})();
