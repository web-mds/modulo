import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase para "codigos-552eb"
const firebaseConfigCodigos = {
    apiKey: "AIzaSyBYKh5o_N9rct-UdD82WVmNCDEu2c57-Ic",
    authDomain: "codigos-552eb.firebaseapp.com",
    projectId: "codigos-552eb",
    storageBucket: "codigos-552eb.firebasestorage.app",
    messagingSenderId: "1068753214299",
    appId: "1:1068753214299:web:4b0d54f71f606112a3d87e",
    measurementId: "G-W3LS1YZY2Q"
};

// Configuración de Firebase para "usuarios-202ed" (para autenticación y cargar empresas)
const firebaseConfigUsuarios = {
    apiKey: "AIzaSyCoJyXiv95_P6Bk9iV892n8FnSNlGEBPDc",
    authDomain: "usuarios-202ed.firebaseapp.com",
    projectId: "usuarios-202ed",
    storageBucket: "usuarios-202ed.firebasestorage.app",
    messagingSenderId: "502953175",
    appId: "1:502953175:web:8eec7ccfa1ca21df09ec92",
    measurementId: "G-YW9XE5PVEV"
};

// Inicializar Firebase apps con nombres específicos
const appCodigos = initializeApp(firebaseConfigCodigos, "codigosApp");
const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");

const authUsuarios = getAuth(appUsuarios); // Usar "usuarios-202ed" para autenticación
const dbCodigos = getFirestore(appCodigos); // Para operaciones de "codigos"
const dbUsuarios = getFirestore(appUsuarios); // Para cargar "empresas"

const registrarNuevoBtn = document.getElementById('registrar-nuevo-btn');
const registrarExistenteBtn = document.getElementById('registrar-existente-btn');
const codigosTableBody = document.querySelector('#codigos-table tbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const importExcelBtn = document.getElementById('import-excel-btn');
const downloadFormatBtn = document.getElementById('download-format-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const registerModal = document.getElementById('register-modal');
const successModal = document.getElementById('success-modal');
const successMessage = document.getElementById('success-message');
const successIcon = document.getElementById('success-icon');
const registerProgress = document.getElementById('register-progress');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const importModal = document.getElementById('import-modal');
const importProgress = document.getElementById('import-progress');
const importCurrentRow = document.getElementById('import-current-row');
const importTotalRows = document.getElementById('import-total-rows');
const tableContainer = document.getElementById('table-container');
const editModal = document.getElementById('edit-modal');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const nuevoReferencia = document.getElementById('nuevo-referencia');
const nuevoDetalles = document.getElementById('nuevo-detalles');
const nuevoDescripcion = document.getElementById('nuevo-descripcion');
const viewFilter = document.getElementById('view-filter');

let currentPage = 1;
const recordsPerPage = 200;
let allRecords = [];
let filteredRecords = [];
let editingRecord = null;
let activeFilters = {};
let activeFilterInputs = {};
let currentUser = null;
let empresas = [];
let currentView = 'all'; // Estado inicial de la vista
let columnWidths = {
    0: 80,  // ID
    1: 90,  // Acciones
    2: 200, // Referencia
    3: 100, // Código
    4: 400, // Descripción
    5: 100, // Precio
    6: 300, // Proveedor
    7: 100, // Clasificación
    8: 150, // Usuario
    9: 80   // Fecha de Creación
};

// Manejo de pestañas con radio buttons
const tabRadios = document.querySelectorAll('input[name="tab"]');
const nuevoForm = document.getElementById('nuevo-form');
const existenteForm = document.getElementById('existente-form');

function toggleForms(selectedValue) {
    nuevoForm.style.display = selectedValue === 'nuevo' ? 'block' : 'none';
    existenteForm.style.display = selectedValue === 'existente' ? 'block' : 'none';
}

tabRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            toggleForms(radio.value);
        }
    });
});

// Actualizar descripción en el formulario nuevo
function updateNuevoDescripcion() {
    const referencia = nuevoReferencia.value.trim().toUpperCase();
    const detalles = nuevoDetalles.value.trim().toUpperCase();
    nuevoDescripcion.value = referencia && detalles ? `${referencia} ${detalles}` : referencia || detalles;
}

nuevoReferencia.addEventListener('input', updateNuevoDescripcion);
nuevoDetalles.addEventListener('input', updateNuevoDescripcion);

// Forzar mayúsculas en los campos de descripción
document.getElementById('existente-descripcion').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});
document.getElementById('edit-descripcion').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
});

// Cargar empresas desde Firestore (del proyecto "usuarios-202ed")
async function loadEmpresas() {
    try {
        const querySnapshot = await getDocs(query(collection(dbUsuarios, 'empresas'), orderBy('nombreEmpresa')));
        empresas = querySnapshot.docs.map(doc => doc.data().nombreEmpresa);
    } catch (error) {
        console.error('Error al cargar empresas:', error);
        showMessage('Error al cargar la lista de empresas.', 'error');
    }
}

// Configurar autocompletado para los campos de proveedor
function setupAutocomplete(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    const icon = input.parentElement.querySelector('.autocomplete-icon');

    function showSuggestions(suggestions) {
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(empresa => {
            const div = document.createElement('div');
            div.textContent = empresa;
            div.addEventListener('click', () => {
                input.value = empresa.toUpperCase();
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(div);
        });
        suggestionsContainer.style.display = suggestions.length > 0 ? 'block' : 'none';
    }

    input.addEventListener('input', () => {
        const value = input.value.trim().toLowerCase();
        if (value.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        const filteredEmpresas = empresas.filter(empresa =>
            empresa.toLowerCase().includes(value)
        );
        showSuggestions(filteredEmpresas);
    });

    icon.addEventListener('click', () => {
        if (suggestionsContainer.style.display === 'block' && suggestionsContainer.innerHTML !== '') {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        } else {
            showSuggestions(empresas);
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.parentElement.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && suggestionsContainer.children.length > 0) {
            const firstSuggestion = suggestionsContainer.children[0].textContent;
            input.value = firstSuggestion.toUpperCase();
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        }
    });
}

// Configurar redimensionamiento de columnas
function setupColumnResizing() {
    const headers = document.querySelectorAll('#codigos-table th');
    const table = document.getElementById('codigos-table');

    headers.forEach((header, index) => {
        const resizeHandle = header.querySelector('.resize-handle');
        if (!resizeHandle) return;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = columnWidths[index];

            const onMouseMove = (moveEvent) => {
                const newWidth = startWidth + (moveEvent.clientX - startX);
                if (newWidth >= 50) { // Ancho mínimo
                    columnWidths[index] = newWidth;

                    // Actualizar solo la columna seleccionada
                    header.style.width = `${newWidth}px`;
                    header.style.minWidth = `${newWidth}px`;
                    document.querySelectorAll(`#codigos-table td:nth-child(${index + 1})`).forEach(cell => {
                        cell.style.width = `${newWidth}px`;
                        cell.style.minWidth = `${newWidth}px`;
                    });

                    // Calcular el ancho total de todas las columnas
                    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
                    table.style.width = `${totalWidth}px`;
                    table.style.minWidth = `${totalWidth}px`;
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// Función para cargar SheetJS dinámicamente
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar SheetJS'));
        document.head.appendChild(script);
    });
}

// Función para simular porcentaje de progreso (para operaciones individuales)
function simulateProgress(progressElement, callback) {
    let progress = 0;
    const increment = 10;
    const interval = 50;

    function updateProgress() {
        progress += increment;
        if (progress > 100) progress = 100;
        progressElement.textContent = `${Math.floor(progress)}%`;
        const spinnerText = document.querySelector('.spinner-text');
        if (spinnerText) {
            spinnerText.textContent = `${spinnerText.textContent.split('...')[0]}... ${progressElement.textContent}`;
        }
        if (progress < 100) {
            requestAnimationFrame(() => setTimeout(updateProgress, interval));
        } else {
            callback();
        }
    }

    requestAnimationFrame(() => setTimeout(updateProgress, interval));
}

// Función para obtener la fecha local en formato YYYY-MM-DD
function getLocalDate() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función para formatear la fecha a DD-MM-YYYY
function formatDateString(date) {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const formattedDay = String(d.getDate()).padStart(2, '0');
    const formattedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const formattedYear = d.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
}

// Función para mostrar mensajes
function showMessage(message, type) {
    successMessage.textContent = message;
    successModal.classList.remove('success', 'error');
    successModal.classList.add(type);
    successIcon.className = `fas fa-${type === 'success' ? 'check-circle' : 'times-circle'}`;
    successModal.style.display = 'flex';
    setTimeout(() => {
        successModal.style.display = 'none';
    }, 3000);
}

// Función para obtener el siguiente ID secuencial
async function getNextId() {
    const querySnapshot = await getDocs(query(collection(dbCodigos, 'codigos'), orderBy('customId', 'desc')));
    let lastId = 0;
    if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[0].data();
        lastId = lastDoc.customId ? parseInt(lastDoc.customId, 10) : 0;
    }
    return String(lastId + 1).padStart(3, '0');
}

// Función para verificar si el código ya existe, permitiendo "0" como excepción
async function isDuplicateCodeExceptZero(codigo, excludeDocId = null) {
    if (codigo.toUpperCase() === "0") {
        return false;
    }
    const q = query(collection(dbCodigos, 'codigos'), where('codigo', '==', codigo.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId);
    }
    return !querySnapshot.empty;
}

// Función para verificar si la referencia ya existe
async function isReferenciaTaken(referencia, excludeDocId = null) {
    const q = query(collection(dbCodigos, 'codigos'), where('referencia', '==', referencia.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId);
    }
    return !querySnapshot.empty;
}

// Registrar código nuevo
registrarNuevoBtn.addEventListener('click', async () => {
    const referencia = nuevoReferencia.value.trim().toUpperCase();
    const detalles = nuevoDetalles.value.trim().toUpperCase();
    const precioNeto = parseFloat(document.getElementById('nuevo-precio-neto').value);
    const codigo = document.getElementById('nuevo-codigo').value.trim().toUpperCase();
    const proveedor = document.getElementById('nuevo-proveedor').value.trim().toUpperCase();
    const descripcion = nuevoDescripcion.value.toUpperCase();
    const clasificacion = document.getElementById('nuevo-clasificacion').value;
    const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';
    const fechaCreacion = getLocalDate();

    if (!referencia || !detalles || !precioNeto || !codigo || !proveedor || !clasificacion) {
        showMessage('Por favor, complete todos los campos.', 'error');
        return;
    }

    if (!empresas.includes(proveedor)) {
        showMessage(`El proveedor "${proveedor}" no está registrado en la lista de empresas.`, 'error');
        return;
    }

    if (await isReferenciaTaken(referencia)) {
        showMessage(`La referencia "${referencia}" ya está registrada.`, 'error');
        return;
    }

    if (await isDuplicateCodeExceptZero(codigo)) {
        showMessage(`El código "${codigo}" ya está registrado. Solo se permite repetir el código "0".`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));
        const customId = await getNextId();

        await addDoc(collection(dbCodigos, 'codigos'), {
            customId,
            referencia,
            precioNeto,
            codigo,
            proveedor,
            descripcion,
            clasificacion,
            usuario: userName,
            fechaCreacion,
            createdAt: new Date()
        });

        registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente el código ${codigo}.`, 'success');
        document.querySelectorAll('#nuevo-form input').forEach(input => input.value = '');
        document.getElementById('nuevo-clasificacion').value = 'Cotización';
        nuevoDescripcion.value = '';
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar código:', error);
        registerModal.style.display = 'none';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Registrar código existente
registrarExistenteBtn.addEventListener('click', async () => {
    const referencia = document.getElementById('existente-referencia').value.trim().toUpperCase();
    const precioNeto = parseFloat(document.getElementById('existente-precio-neto').value);
    const codigo = document.getElementById('existente-codigo').value.trim().toUpperCase();
    const proveedor = document.getElementById('existente-proveedor').value.trim().toUpperCase();
    const descripcion = document.getElementById('existente-descripcion').value.trim().toUpperCase();
    const clasificacion = document.getElementById('existente-clasificacion').value;
    const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';
    const fechaCreacion = getLocalDate();

    if (!referencia || !precioNeto || !codigo || !proveedor || !descripcion || !clasificacion) {
        showMessage('Por favor, complete todos los campos.', 'error');
        return;
    }

    if (!empresas.includes(proveedor)) {
        showMessage(`El proveedor "${proveedor}" no está registrado en la lista de empresas.`, 'error');
        return;
    }

    if (await isReferenciaTaken(referencia)) {
        showMessage(`La referencia "${referencia}" ya está registrada.`, 'error');
        return;
    }

    if (await isDuplicateCodeExceptZero(codigo)) {
        showMessage(`El código "${codigo}" ya está registrado. Solo se permite repetir el código "0".`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));
        const customId = await getNextId();

        await addDoc(collection(dbCodigos, 'codigos'), {
            customId,
            referencia,
            precioNeto,
            codigo,
            proveedor,
            descripcion,
            clasificacion,
            usuario: userName,
            fechaCreacion,
            createdAt: new Date()
        });

        registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente el código ${codigo}.`, 'success');
        document.querySelectorAll('#existente-form input').forEach(input => input.value = '');
        document.getElementById('existente-clasificacion').value = 'Cotización';
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar código:', error);
        registerModal.style.display = 'none';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Exportar a Excel
async function exportToExcel() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();

        const data = filteredRecords.map(record => ({
            ID: record.id,
            Referencia: record.referencia || '',
            Código: record.codigo || '',
            Descripción: record.descripcion || '',
            Precio: record.precioNeto || '',
            Proveedor: record.proveedor || '',
            Clasificación: record.clasificacion || '',
            Usuario: record.usuario || '',
            'Fecha de Creación': formatDateString(record.fechaCreacion)
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 10 },
            { wch: 20 },
            { wch: 15 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Códigos');
        XLSX.writeFile(workbook, 'codigos.xlsx');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showMessage('Error al exportar el archivo Excel.', 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
}

// Importar desde Excel
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) {
        showMessage('Por favor, seleccione un archivo Excel.', 'error');
        return;
    }

    try {
        await loadSheetJS();

        // Mostrar el modal de importación
        importModal.style.display = 'flex';
        importProgress.textContent = '0%';
        importCurrentRow.textContent = '0';
        importTotalRows.textContent = '0';

        // Cargar datos existentes en memoria
        const existingData = await getDocs(collection(dbCodigos, 'codigos'));
        const existingReferences = new Set(existingData.docs.map(doc => doc.data().referencia.toUpperCase()));
        const existingCodes = new Map(existingData.docs.map(doc => [doc.data().codigo.toUpperCase(), doc.id]));
        let lastId = 0;
        if (!existingData.empty) {
            lastId = existingData.docs.reduce((max, doc) => {
                const id = parseInt(doc.data().customId, 10);
                return id > max ? id : max;
            }, 0);
        }

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const totalRows = rows.length;
        importTotalRows.textContent = totalRows;

        if (totalRows === 0) {
            importModal.style.display = 'none';
            showMessage('El archivo Excel está vacío.', 'error');
            return;
        }

        let successfulImports = 0;
        let errors = [];
        const batchSize = 500; // Máximo por lote según límites de Firestore
        let currentId = lastId + 1;

        for (let i = 0; i < totalRows; i += batchSize) {
            const batch = writeBatch(dbCodigos);
            const end = Math.min(i + batchSize, totalRows);
            let batchErrors = [];

            for (let j = i; j < end; j++) {
                const row = rows[j];
                importCurrentRow.textContent = j + 1;
                const percentage = Math.round(((j + 1) / totalRows) * 100);
                importProgress.textContent = `${percentage}%`;

                const referencia = row['Referencia'] ? String(row['Referencia']).trim().toUpperCase() : '';
                const codigo = row['Código'] ? String(row['Código']).trim().toUpperCase() : '';
                const descripcion = row['Descripción'] ? String(row['Descripción']).trim().toUpperCase() : '';
                const precioNeto = row['Precio'] ? parseFloat(row['Precio']) : 0;
                const proveedor = row['Proveedor'] ? String(row['Proveedor']).trim().toUpperCase() : '';
                const clasificacion = row['Clasificación'] ? String(row['Clasificación']).trim() : '';
                const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';
                const fechaCreacion = getLocalDate();

                // Validaciones
                if (!referencia || !codigo || !descripcion || !precioNeto || !proveedor || !clasificacion) {
                    batchErrors.push(`Fila ${j + 1}: Faltan datos requeridos.`);
                    continue;
                }

                if (!empresas.includes(proveedor)) {
                    batchErrors.push(`Fila ${j + 1}: El proveedor "${proveedor}" no está registrado.`);
                    continue;
                }

                if (existingReferences.has(referencia)) {
                    batchErrors.push(`Fila ${j + 1}: La referencia "${referencia}" ya está registrada.`);
                    continue;
                }

                if (codigo !== '0' && existingCodes.has(codigo)) {
                    batchErrors.push(`Fila ${j + 1}: El código "${codigo}" ya está registrado.`);
                    continue;
                }

                // Agregar al lote
                const docRef = doc(collection(dbCodigos, 'codigos'));
                batch.set(docRef, {
                    customId: String(currentId).padStart(3, '0'),
                    referencia,
                    precioNeto,
                    codigo,
                    proveedor,
                    descripcion,
                    clasificacion,
                    usuario: userName,
                    fechaCreacion,
                    createdAt: new Date()
                });

                // Actualizar datos en memoria
                existingReferences.add(referencia);
                if (codigo !== '0') existingCodes.set(codigo, docRef.id);
                currentId++;
                successfulImports++;
            }

            if (batchErrors.length > 0) {
                errors.push(...batchErrors);
            }

            if (successfulImports > 0) {
                try {
                    await batch.commit();
                } catch (error) {
                    errors.push(`Error al guardar lote ${i / batchSize + 1}: ${error.message}`);
                    successfulImports -= (end - i - batchErrors.length);
                }
            }
        }

        importModal.style.display = 'none';
        if (successfulImports === totalRows) {
            showMessage(`Se importaron exitosamente ${successfulImports} registros.`, 'success');
        } else {
            const message = `Se importaron ${successfulImports} de ${totalRows} registros.\nErrores:\n${errors.join('\n')}`;
            showMessage(message, 'error');
        }

        // Limpiar el input file
        importExcelBtn.value = '';
        await loadTableData();
    } catch (error) {
        console.error('Error al importar desde Excel:', error);
        importModal.style.display = 'none';
        importExcelBtn.value = '';
        showMessage(`Error al importar el archivo Excel: ${error.message}`, 'error');
    }
}

if (importExcelBtn) {
    importExcelBtn.addEventListener('change', importFromExcel);
}

// Descargar formato de Excel
async function downloadExcelFormat() {
    try {
        await loadSheetJS();

        const data = [{
            Referencia: '',
            Código: '',
            Descripción: '',
            Precio: '',
            Proveedor: '',
            Clasificación: ''
        }];

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 20 }, // Referencia
            { wch: 15 }, // Código
            { wch: 30 }, // Descripción
            { wch: 15 }, // Precio
            { wch: 20 }, // Proveedor
            { wch: 20 }  // Clasificación
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato');
        XLSX.writeFile(workbook, 'formato_codigos.xlsx');
    } catch (error) {
        console.error('Error al descargar el formato:', error);
        showMessage('Error al generar el formato de Excel.', 'error');
    }
}

if (downloadFormatBtn) {
    downloadFormatBtn.addEventListener('click', downloadExcelFormat);
}

// Aplicar filtros de columna y vista
function applyFilters() {
    let records = allRecords;

    // Filtrar por vista (todos o solo código = 0)
    if (currentView === 'pending') {
        records = records.filter(record => record.codigo.toUpperCase() === '0');
    }

    // Aplicar filtros de columna
    filteredRecords = records.filter(record => {
        return Object.keys(activeFilters).every(column => {
            const filterValue = activeFilters[column].toLowerCase();
            let cellValue = '';
            if (column === 'id') cellValue = record.id || '';
            else if (column === 'referencia') cellValue = record.referencia || '';
            else if (column === 'codigo') cellValue = record.codigo || '';
            else if (column === 'descripcion') cellValue = record.descripcion || '';
            else if (column === 'precioNeto') cellValue = record.precioNeto.toString() || '';
            else if (column === 'proveedor') cellValue = record.proveedor || '';
            else if (column === 'clasificacion') cellValue = record.clasificacion || '';
            else if (column === 'usuario') cellValue = record.usuario || '';
            else if (column === 'fechaCreacion') cellValue = formatDateString(record.fechaCreacion) || '';
            return cellValue.toLowerCase().includes(filterValue);
        });
    });

    currentPage = 1;
    renderTable();
}

// Escuchar cambios en el filtro de vista
viewFilter.addEventListener('change', () => {
    currentView = viewFilter.value;
    applyFilters();
});

// Mostrar input de filtro de columna
function showFilterInput(icon, column, th) {
    if (activeFilterInputs[column]) {
        activeFilterInputs[column].remove();
        delete activeFilterInputs[column];
        icon.classList.remove('active');
        return;
    }

    const container = document.createElement('div');
    container.className = 'filter-input-container';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filtrar...';
    input.value = activeFilters[column] || '';
    container.appendChild(input);
    th.appendChild(container);

    activeFilterInputs[column] = container;
    icon.classList.add('active');

    const thRect = th.getBoundingClientRect();
    container.style.width = `${thRect.width}px`;

    input.focus();
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value) {
            activeFilters[column] = value;
        } else {
            delete activeFilters[column];
            icon.classList.remove('active');
        }
        applyFilters();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            container.remove();
            delete activeFilterInputs[column];
            icon.classList.toggle('active', !!activeFilters[column]);
        }
    });

    const closeOnClickOutside = (e) => {
        if (!container.contains(e.target) && e.target !== icon) {
            container.remove();
            delete activeFilterInputs[column];
            icon.classList.toggle('active', !!activeFilters[column]);
            document.removeEventListener('click', closeOnClickOutside);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeOnClickOutside);
    }, 0);
}

// Manejar íconos de filtro de columna
function handleFilterIcons() {
    const filterIcons = document.querySelectorAll('.filter-icon');
    filterIcons.forEach(icon => {
        icon.removeEventListener('click', icon._clickHandler);
        icon._clickHandler = () => {
            const column = icon.dataset.column;
            if (column === 'acciones') return;
            const th = icon.closest('th');
            if (!th) {
                console.error('No th element found for filter icon');
                return;
            }
            showFilterInput(icon, column, th);
        };
        icon.addEventListener('click', icon._clickHandler);
    });
}

// Cargar datos de la tabla
async function loadTableData() {
    allRecords = [];
    filteredRecords = [];
    codigosTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        const querySnapshot = await getDocs(query(collection(dbCodigos, 'codigos'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                id: data.customId || doc.id,
                docId: doc.id,
                referencia: data.referencia,
                precioNeto: data.precioNeto,
                codigo: data.codigo,
                proveedor: data.proveedor,
                descripcion: data.descripcion,
                clasificacion: data.clasificacion,
                usuario: data.usuario,
                fechaCreacion: data.fechaCreacion,
                createdAt: data.createdAt
            };
            allRecords.push(record);
        });

        applyFilters();
        handleFilterIcons();
        setupColumnResizing();
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        codigosTableBody.innerHTML = `<tr><td colspan="10">Error al cargar datos: ${error.message}</td></tr>`;
    }
}

// Renderizar tabla
function renderTable() {
    codigosTableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        codigosTableBody.innerHTML = '<tr><td colspan="10">No hay códigos que coincidan con los filtros.</td></tr>';
        return;
    }

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    totalRecords.textContent = `Total de registros: ${filteredRecords.length}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = filteredRecords.slice(start, end);

    // Aplicar anchos de columnas
    const headers = document.querySelectorAll('#codigos-table th');
    const table = document.getElementById('codigos-table');
    headers.forEach((header, index) => {
        header.style.width = `${columnWidths[index]}px`;
        header.style.minWidth = `${columnWidths[index]}px`;
    });

    // Calcular el ancho total inicial de la tabla
    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = `${totalWidth}px`;

    pageRecords.forEach(record => {
        const row = document.createElement('tr');
        const fechaCreacion = formatDateString(record.fechaCreacion);

        row.innerHTML = `
            <td style="width: ${columnWidths[0]}px; min-width: ${columnWidths[0]}px" title="${record.id}">${record.id}</td>
            <td style="width: ${columnWidths[1]}px; min-width: ${columnWidths[1]}px">
                <i class="fas fa-edit action-icon" title="Editar"></i>
                <i class="fas fa-trash action-icon" title="Eliminar"></i>
                <i class="fas fa-eye action-icon" title="Visualizar"></i>
            </td>
            <td style="width: ${columnWidths[2]}px; min-width: ${columnWidths[2]}px" title="${record.referencia || ''}">${record.referencia || ''}</td>
            <td style="width: ${columnWidths[3]}px; min-width: ${columnWidths[3]}px" title="${record.codigo || ''}">${record.codigo || ''}</td>
            <td style="width: ${columnWidths[4]}px; min-width: ${columnWidths[4]}px" title="${record.descripcion || ''}">${record.descripcion || ''}</td>
            <td style="width: ${columnWidths[5]}px; min-width: ${columnWidths[5]}px" title="${record.precioNeto || ''}">${record.precioNeto ? Number(record.precioNeto).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}</td>
            <td style="width: ${columnWidths[6]}px; min-width: ${columnWidths[6]}px" title="${record.proveedor || ''}">${record.proveedor || ''}</td>
            <td style="width: ${columnWidths[7]}px; min-width: ${columnWidths[7]}px" title="${record.clasificacion || ''}">${record.clasificacion || ''}</td>
            <td style="width: ${columnWidths[8]}px; min-width: ${columnWidths[8]}px" title="${record.usuario || ''}">${record.usuario || ''}</td>
            <td style="width: ${columnWidths[9]}px; min-width: ${columnWidths[9]}px" title="${fechaCreacion}">${fechaCreacion}</td>
        `;
        row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));
        row.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(record));
        codigosTableBody.appendChild(row);
    });

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

// Abrir modal de edición
function openEditModal(record) {
    editingRecord = record;
    document.getElementById('edit-referencia').value = record.referencia || '';
    document.getElementById('edit-precio-neto').value = record.precioNeto || '';
    document.getElementById('edit-codigo').value = record.codigo || '';
    document.getElementById('edit-proveedor').value = record.proveedor || '';
    document.getElementById('edit-descripcion').value = record.descripcion || '';
    document.getElementById('edit-clasificacion').value = record.clasificacion || 'Cotización';
    editModal.style.display = 'flex';
}

// Guardar cambios en edición
saveEditBtn.addEventListener('click', async () => {
    const referencia = document.getElementById('edit-referencia').value.trim().toUpperCase();
    const precioNeto = parseFloat(document.getElementById('edit-precio-neto').value);
    const codigo = document.getElementById('edit-codigo').value.trim().toUpperCase();
    const proveedor = document.getElementById('edit-proveedor').value.trim().toUpperCase();
    const descripcion = document.getElementById('edit-descripcion').value.trim().toUpperCase();
    const clasificacion = document.getElementById('edit-clasificacion').value;

    if (!referencia || !precioNeto || !codigo || !proveedor || !descripcion || !clasificacion) {
        showMessage('Por favor, complete todos los campos.', 'error');
        return;
    }

    if (!empresas.includes(proveedor)) {
        showMessage(`El proveedor "${proveedor}" no está registrado en la lista de empresas.`, 'error');
        return;
    }

    if (referencia !== editingRecord.referencia && await isReferenciaTaken(referencia, editingRecord.docId)) {
        showMessage(`La referencia "${referencia}" ya está registrada.`, 'error');
        return;
    }

    if (codigo !== editingRecord.codigo && await isDuplicateCodeExceptZero(codigo, editingRecord.docId)) {
        showMessage(`El código "${codigo}" ya está registrado. Solo se permite repetir el código "0".`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    editModal.style.display = 'none';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Guardando cambios... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));

        const updatedData = {
            referencia,
            precioNeto,
            codigo,
            proveedor,
            descripcion,
            clasificacion,
            updatedAt: new Date()
        };

        const codigoDocRef = doc(dbCodigos, 'codigos', editingRecord.docId);
        await updateDoc(codigoDocRef, updatedData);

        registerModal.style.display = 'none';
        showMessage(`Se ha actualizado exitosamente el código ${codigo}.`, 'success');
        await loadTableData();
    } catch (error) {
        console.error('Error al actualizar código:', error);
        registerModal.style.display = 'none';
        editModal.style.display = 'flex';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Cancelar edición
cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    editingRecord = null;
});

// Navegación de páginas
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Abrir modal de eliminación
async function openDeleteModal(record) {
    const deleteMessage = document.getElementById('delete-message');
    deleteMessage.textContent = `¿Desea eliminar el código ${record.codigo}?`;
    document.getElementById('delete-modal').style.display = 'flex';

    document.getElementById('confirm-delete-btn').onclick = async () => {
        try {
            registerModal.style.display = 'flex';
            registerProgress.textContent = '0%';
            const spinnerText = document.querySelector('.spinner-text');
            if (spinnerText) spinnerText.textContent = `Eliminando... ${registerProgress.textContent}`;

            await new Promise(resolve => simulateProgress(registerProgress, resolve));
            await deleteDoc(doc(dbCodigos, 'codigos', record.docId));

            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Se ha eliminado el código ${record.codigo}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al eliminar código:', error);
            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Error: ${error.message}`, 'error');
        }
    };

    document.getElementById('cancel-delete-btn').onclick = () => {
        document.getElementById('delete-modal').style.display = 'none';
    };
}

// Inicializar
async function initialize() {
    const waitForAuth = new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(authUsuarios, (user) => {
            unsubscribe();
            resolve(user);
        });
    });

    const user = await waitForAuth;
    console.log('Estado de autenticación resuelto:', user);

    if (!user) {
        console.log('No hay usuario autenticado, redirigiendo a login.html');
        showMessage('Debe iniciar sesión para acceder a este módulo.', 'error');
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }

    // Consultar el usuario en el proyecto "usuarios-202ed"
    const q = query(collection(dbUsuarios, 'usuarios'), where('correo', '==', user.email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        currentUser = querySnapshot.docs[0].data();
    } else {
        currentUser = { nombreCompleto: 'Usuario' };
    }

    loadingModal.style.display = 'flex';
    tableContainer.style.display = 'none';
    loadingProgress.textContent = '0%';

    try {
        await loadEmpresas();
        setupAutocomplete('nuevo-proveedor', 'nuevo-proveedor-suggestions');
        setupAutocomplete('existente-proveedor', 'existente-proveedor-suggestions');
        setupAutocomplete('edit-proveedor', 'edit-proveedor-suggestions');
        await new Promise(resolve => simulateProgress(loadingProgress, resolve));
        await loadTableData();
        loadingModal.style.display = 'none';
        tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error en initialize:', error);
        loadingModal.style.display = 'none';
        codigosTableBody.innerHTML = `<tr><td colspan="10">Error al inicializar: ${error.message}</td></tr>`;
    }
}

initialize();