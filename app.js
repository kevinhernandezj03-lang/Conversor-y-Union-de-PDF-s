/**
 * Convertidor Local Express
 * Procesamiento 100% local en el navegador
 */

(() => {
  // Estado
  let files = [];          // { id, file, type, action, order }
  let results = [];        // { name, blob, type }
  let isProcessing = false;

  // Elementos DOM
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const filesSection = document.getElementById('files-section');
  const fileList = document.getElementById('file-list');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');
  const processBtn = document.getElementById('process-btn');
  const clearAllBtn = document.getElementById('clear-all');
  const downloadAllBtn = document.getElementById('download-all');
  const statusEl = document.getElementById('status');
  const globalActions = document.getElementById('global-actions');

  // Utilidades
  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function detectType(file) {
    const name = file.name.toLowerCase();
    const mime = (file.type || '').toLowerCase();

    if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
    if (name.endsWith('.webp') || mime === 'image/webp') return 'webp';
    if (name.endsWith('.json') || mime === 'application/json') return 'json';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg') || mime === 'image/jpeg') return 'jpg';
    if (name.endsWith('.png') || mime === 'image/png') return 'png';
    return 'unknown';
  }

  function defaultAction(type) {
    switch (type) {
      case 'webp': return 'webp-to-png';
      case 'json': return 'json-to-csv';
      case 'pdf': return 'merge-pdf'; // se ajustará si hay varios
      case 'jpg':
      case 'png': return 'image-to-pdf';
      default: return 'none';
    }
  }

  function actionLabel(action) {
    const labels = {
      'webp-to-png': 'WebP → PNG',
      'json-to-csv': 'JSON → CSV',
      'pdf-to-jpg': 'PDF → JPG',
      'image-to-pdf': 'Imagen → PDF',
      'merge-pdf': 'Unir PDFs',
      'none': 'No soportado'
    };
    return labels[action] || action;
  }

  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
  }

  function hideStatus() {
    statusEl.classList.add('hidden');
  }

  // Renderizado
  function renderFileList() {
    if (files.length === 0) {
      filesSection.classList.add('hidden');
      processBtn.disabled = true;
      return;
    }

    filesSection.classList.remove('hidden');
    fileList.innerHTML = '';

    // Contar PDFs para decidir acción por defecto de merge
    const pdfCount = files.filter(f => f.type === 'pdf').length;

    files.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.dataset.id = item.id;

      // Si hay varios PDFs y la acción es merge, mostrar controles de orden
      const showOrder = item.type === 'pdf' && pdfCount > 1 && item.action === 'merge-pdf';

      li.innerHTML = `
        <div class="file-info">
          <div class="file-name" title="${item.file.name}">${item.file.name}</div>
          <div class="file-meta">${formatSize(item.file.size)} · ${item.type.toUpperCase()}</div>
        </div>
        <div class="file-actions">
          ${showOrder ? `
            <div class="order-controls">
              <button type="button" data-dir="up" title="Subir">↑</button>
              <button type="button" data-dir="down" title="Bajar">↓</button>
            </div>
          ` : ''}
          <select class="action-select">
            ${getActionOptions(item.type, pdfCount)}
          </select>
          <button type="button" class="btn-icon remove-btn" title="Eliminar">✕</button>
        </div>
      `;

      // Seleccionar acción actual
      const select = li.querySelector('.action-select');
      select.value = item.action;

      // Eventos
      select.addEventListener('change', () => {
        item.action = select.value;
        renderFileList(); // re-render por si cambia orden
        updateProcessButton();
      });

      li.querySelector('.remove-btn').addEventListener('click', () => {
        files = files.filter(f => f.id !== item.id);
        renderFileList();
        updateProcessButton();
      });

      if (showOrder) {
        li.querySelectorAll('.order-controls button').forEach(btn => {
          btn.addEventListener('click', () => {
            const dir = btn.dataset.dir;
            const idx = files.findIndex(f => f.id === item.id);
            if (dir === 'up' && idx > 0) {
              [files[idx - 1], files[idx]] = [files[idx], files[idx - 1]];
            } else if (dir === 'down' && idx < files.length - 1) {
              [files[idx + 1], files[idx]] = [files[idx], files[idx + 1]];
            }
            renderFileList();
          });
        });
      }

      fileList.appendChild(li);
    });

    updateGlobalActions();
    updateProcessButton();
  }

  function getActionOptions(type, pdfCount) {
    let options = '';
    if (type === 'webp') {
      options += `<option value="webp-to-png">WebP → PNG</option>`;
    } else if (type === 'json') {
      options += `<option value="json-to-csv">JSON → CSV</option>`;
    } else if (type === 'pdf') {
      options += `<option value="pdf-to-jpg">PDF → JPG</option>`;
      if (pdfCount > 1) {
        options += `<option value="merge-pdf">Unir PDFs</option>`;
      }
    } else if (type === 'jpg' || type === 'png') {
      options += `<option value="image-to-pdf">Imagen → PDF</option>`;
    } else {
      options += `<option value="none">No soportado</option>`;
    }
    return options;
  }

  function updateGlobalActions() {
    globalActions.innerHTML = '';
    const pdfs = files.filter(f => f.type === 'pdf');
    if (pdfs.length > 1) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-small';
      btn.textContent = 'Unir todos los PDFs';
      btn.addEventListener('click', () => {
        files.forEach(f => {
          if (f.type === 'pdf') f.action = 'merge-pdf';
        });
        renderFileList();
      });
      globalActions.appendChild(btn);
    }
  }

  function updateProcessButton() {
    const hasValid = files.some(f => f.action !== 'none');
    processBtn.disabled = !hasValid || isProcessing;
  }

  function renderResults() {
    if (results.length === 0) {
      resultsSection.classList.add('hidden');
      return;
    }
    resultsSection.classList.remove('hidden');
    resultsList.innerHTML = '';

    results.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = `
        <div class="file-info">
          <div class="file-name">${r.name}</div>
          <div class="file-meta">${formatSize(r.blob.size)}</div>
        </div>
        <button class="btn btn-secondary btn-small download-one">Descargar</button>
      `;
      li.querySelector('.download-one').addEventListener('click', () => {
        downloadBlob(r.blob, r.name);
      });
      resultsList.appendChild(li);
    });
  }

  // Carga de archivos
  function addFiles(fileList) {
    const newFiles = Array.from(fileList).map(file => {
      const type = detectType(file);
      return {
        id: uid(),
        file,
        type,
        action: defaultAction(type)
      };
    });

    // Si hay varios PDFs, poner merge por defecto en todos
    const allPdfs = [...files, ...newFiles].filter(f => f.type === 'pdf');
    if (allPdfs.length > 1) {
      newFiles.forEach(f => {
        if (f.type === 'pdf') f.action = 'merge-pdf';
      });
    }

    files = [...files, ...newFiles];
    renderFileList();
    hideStatus();
  }

  // Eventos de carga
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = '';
  });

  clearAllBtn.addEventListener('click', () => {
    files = [];
    results = [];
    renderFileList();
    renderResults();
    hideStatus();
  });

  // Procesamiento
  processBtn.addEventListener('click', async () => {
    if (isProcessing) return;
    isProcessing = true;
    processBtn.disabled = true;
    results = [];
    renderResults();
    showStatus('Procesando archivos…', 'loading');

    try {
      // Separar acciones de merge de las individuales
      const toMerge = files.filter(f => f.action === 'merge-pdf');
      const individuals = files.filter(f => f.action !== 'merge-pdf' && f.action !== 'none');

      // 1. Unir PDFs si hay
      if (toMerge.length > 0) {
        const mergedBlob = await mergePdfs(toMerge.map(f => f.file));
        results.push({
          name: 'unidos.pdf',
          blob: mergedBlob,
          type: 'pdf'
        });
      }

      // 2. Procesar individuales
      for (const item of individuals) {
        try {
          const result = await processFile(item);
          if (result) results.push(result);
        } catch (err) {
          console.error(err);
          showStatus(`Error con ${item.file.name}: ${err.message}`, 'error');
        }
      }

      if (results.length > 0) {
        showStatus(`Listo: ${results.length} archivo(s) generado(s).`, 'success');
        renderResults();
      } else {
        showStatus('No se generó ningún archivo. Revisa las acciones seleccionadas.', 'error');
      }
    } catch (err) {
      console.error(err);
      showStatus('Error durante el procesamiento: ' + err.message, 'error');
    } finally {
      isProcessing = false;
      updateProcessButton();
    }
  });

  downloadAllBtn.addEventListener('click', async () => {
    if (results.length === 0) return;
    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }
    showStatus('Creando ZIP…', 'loading');
    try {
      const zip = new JSZip();
      results.forEach(r => zip.file(r.name, r.blob));
      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, 'convertidos.zip');
      showStatus('ZIP descargado.', 'success');
    } catch (err) {
      showStatus('Error al crear ZIP: ' + err.message, 'error');
    }
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ——— Conversiones ———

  async function processFile(item) {
    const { file, action } = item;
    switch (action) {
      case 'webp-to-png':
        return await webpToPng(file);
      case 'json-to-csv':
        return await jsonToCsv(file);
      case 'pdf-to-jpg':
        return await pdfToJpg(file);
      case 'image-to-pdf':
        return await imageToPdf(file);
      default:
        return null;
    }
  }

  // WebP → PNG
  async function webpToPng(file) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const name = file.name.replace(/\.webp$/i, '.png');
    return { name, blob, type: 'png' };
  }

  // JSON → CSV
  async function jsonToCsv(file) {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('JSON inválido');
    }

    // Normalizar a array de objetos
    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        data = [data];
      } else {
        throw new Error('El JSON debe ser un objeto o un array de objetos');
      }
    }

    if (data.length === 0) {
      throw new Error('El JSON está vacío');
    }

    // Obtener todas las claves
    const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = keys.map(escape).join(',');
    const rows = data.map(obj => keys.map(k => escape(obj[k])).join(','));
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const name = file.name.replace(/\.json$/i, '.csv');
    return { name, blob, type: 'csv' };
  }

  // Imagen (JPG/PNG) → PDF
  async function imageToPdf(file) {
    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const imgBytes = await file.arrayBuffer();

    let image;
    if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      image = await pdfDoc.embedPng(imgBytes);
    } else {
      image = await pdfDoc.embedJpg(imgBytes);
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const name = file.name.replace(/\.(jpg|jpeg|png)$/i, '.pdf');
    return { name, blob, type: 'pdf' };
  }

  // Unir PDFs
  async function mergePdfs(fileList) {
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();

    for (const file of fileList) {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => merged.addPage(p));
    }

    const pdfBytes = await merged.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  // PDF → JPG (primera página o todas como ZIP interno, pero simplificamos a primera + aviso si varias)
  async function pdfToJpg(file) {
    if (!window.pdfjsLib) {
      throw new Error('pdf.js no está disponible');
    }

    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const numPages = pdf.numPages;

    // Para el MVP: convertimos todas las páginas y las devolvemos como un ZIP de JPGs
    // si hay más de una, o un solo JPG si hay una.
    const images = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      images.push({ blob, page: i });
    }

    if (images.length === 1) {
      const name = file.name.replace(/\.pdf$/i, '.jpg');
      return { name, blob: images[0].blob, type: 'jpg' };
    }

    // Varias páginas → ZIP
    const zip = new JSZip();
    const base = file.name.replace(/\.pdf$/i, '');
    images.forEach(img => {
      zip.file(`${base}_pagina_${img.page}.jpg`, img.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return {
      name: `${base}_paginas.zip`,
      blob: zipBlob,
      type: 'zip'
    };
  }

  // Helper: cargar imagen
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Inicial
  renderFileList();
})();
