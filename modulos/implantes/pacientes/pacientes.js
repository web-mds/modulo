import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc, deleteDoc, writeBatch, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase para "pacientes"
const firebaseConfigPacientes = {
    apiKey: "AIzaSyBYKh5o_N9rct-UdD82WVmNCDEu2c57-Ic",
    authDomain: "codigos-552eb.firebaseapp.com",
    projectId: "codigos-552eb",
    storageBucket: "codigos-552eb.firebasestorage.app",
    messagingSenderId: "1068753214299",
    appId: "1:1068753214299:web:4b0d54f71f606112a3d87e",
    measurementId: "G-W3LS1YZY2Q"
};

// Configuración de Firebase para "usuarios"
const firebaseConfigUsuarios = {
    apiKey: "AIzaSyCoJyXiv95_P6Bk9iV892n8FnSNlGEBPDc",
    authDomain: "usuarios-202ed.firebaseapp.com",
    projectId: "usuarios-202ed",
    storageBucket: "usuarios-202ed.firebasestorage.app",
    messagingSenderId: "502953175",
    appId: "1:502953175:web:8eec7ccfa1ca21df09ec92",
    measurementId: "G-YW9XE5PVEV"
};

// Inicializar Firebase apps
const appPacientes = initializeApp(firebaseConfigPacientes, "pacientesApp");
const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");

const authUsuarios = getAuth(appUsuarios);
const dbPacientes = getFirestore(appPacientes);
const dbUsuarios = getFirestore(appUsuarios);
const dbConsumos = getFirestore(appPacientes);

const registrarBtn = document.getElementById('registrar-btn');
const pacientesTableBody = document.querySelector('#pacientes-table tbody');
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
const tableContainer = document.getElementById('table-container');
const editModal = document.getElementById('edit-modal');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteMessage = document.getElementById('delete-message');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const filterStatus = document.getElementById('filter-status');

let currentPage = 1;
const recordsPerPage = 200;
let allRecords = [];
let filteredRecords = [];
let editingRecord = null;
let activeFilters = {};
let activeFilterInputs = {};
let currentUser = null;
let empresas = [];
let previsiones = [];
let medicos = [];
let columnWidths = {
    0: 90,   // Acciones
    1: 120,  // Fecha de Ingreso
    2: 100,  // Atributo
    3: 100,  // Previsión
    4: 100,  // Admisión
    5: 200,  // Nombre del Paciente
    6: 150,  // Médico
    7: 120,  // Fecha de Cirugía
    8: 150,  // Proveedor
    9: 100,  // Estado
    10: 120, // Fecha de Cargo
    11: 200, // Informe
    12: 100, // Total Cotización
    13: 200, // Admisión/Empresa
    14: 250, // Duplicado
    15: 100, // Día
    16: 100, // Semana
    17: 100, // Año
    18: 100, // Mes
    19: 150  // Usuario
};

const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const days = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

function setupDateInputs() {
    const dateInputs = [
        document.getElementById('fecha-cirugia'),
        document.getElementById('fecha-cargo'),
        document.getElementById('edit-fecha-cirugia'),
        document.getElementById('edit-fecha-cargo')
    ];

    dateInputs.forEach(input => {
        if (input) {
            input.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    input.showPicker();
                } catch (error) {
                    input.focus();
                    input.click();
                }
            });
        }
    });
}

// Función actualizada para formatear números con puntos como separadores de miles
function formatNumberWithDots(number) {
    // Convertir a string y eliminar cualquier carácter no numérico
    let numStr = String(number).replace(/[^0-9]/g, '');
    // Insertar puntos como separadores de miles
    let formatted = '';
    for (let i = numStr.length - 1, count = 0; i >= 0; i--) {
        formatted = numStr[i] + formatted;
        count++;
        if (count % 3 === 0 && i > 0) {
            formatted = '.' + formatted;
        }
    }
    return formatted || '';
}

function setupNumberFormatInputs() {
    const totalCotizacionInput = document.getElementById('total-cotizacion');
    const editTotalCotizacionInput = document.getElementById('edit-total-cotizacion');

    function formatNumberInput(input) {
        // Permitir hasta 10 dígitos
        input.setAttribute('maxlength', '14'); // Considera puntos (99.999.999.999)

        input.addEventListener('input', (e) => {
            // Obtener solo los dígitos
            let value = e.target.value.replace(/[^0-9]/g, '');

            // Limitar a 10 dígitos
            if (value.length > 10) {
                value = value.slice(0, 10);
            }

            // Formatear con puntos como separadores de miles
            if (value) {
                e.target.value = formatNumberWithDots(value);
                e.target.dataset.rawValue = value; // Almacenar valor sin formato
            } else {
                e.target.value = '';
                e.target.dataset.rawValue = '';
            }
        });

        input.addEventListener('blur', (e) => {
            let value = e.target.dataset.rawValue || e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                e.target.value = formatNumberWithDots(value);
                e.target.dataset.rawValue = value;
            } else {
                e.target.value = '';
                e.target.dataset.rawValue = '';
            }
        });

        // Almacenar el valor numérico sin formato al cambiar
        input.addEventListener('change', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                e.target.dataset.rawValue = value;
            } else {
                e.target.dataset.rawValue = '';
            }
        });
    }

    if (totalCotizacionInput) formatNumberInput(totalCotizacionInput);
    if (editTotalCotizacionInput) formatNumberInput(editTotalCotizacionInput);
}

async function syncTotalCotizacionToConsumos(admisionEmpresa, totalCotizacion) {
    try {
        const consumosSnapshot = await getDocs(query(collection(dbConsumos, 'consumos'), where('admProveedor', '==', admisionEmpresa)));
        const batch = writeBatch(dbConsumos);
        let updateCount = 0;

        consumosSnapshot.forEach(doc => {
            const consumo = doc.data();
            if (consumo.totalCotizacion !== totalCotizacion) {
                batch.update(doc.ref, { totalCotizacion: totalCotizacion });
                updateCount++;
            }
        });

        if (updateCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error al sincronizar totalCotizacion a consumos:', error);
        showMessage(`Error al sincronizar totalCotización: ${error.message}`, 'error');
    }
}

async function loadReferenceData() {
    try {
        const empresasSnapshot = await getDocs(query(collection(dbUsuarios, 'empresas'), orderBy('nombreEmpresa')));
        empresas = empresasSnapshot.docs.map(doc => doc.data().nombreEmpresa);

        const previsionesSnapshot = await getDocs(query(collection(dbUsuarios, 'previsiones'), orderBy('nombrePrevisionDisplay')));
        previsiones = previsionesSnapshot.docs.map(doc => doc.data().nombrePrevisionDisplay);

        const medicosSnapshot = await getDocs(query(collection(dbUsuarios, 'medicos'), orderBy('nombreMedicoDisplay')));
        medicos = medicosSnapshot.docs.map(doc => doc.data().nombreMedicoDisplay);
    } catch (error) {
        console.error('Error al cargar datos de referencia:', error);
        showMessage(`Error al cargar empresas, previsiones o médicos: ${error.message}`, 'error');
    }
}

function setupAutocomplete(inputId, suggestionsId, dataList) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    if (!input || !suggestionsContainer) return;

    const icon = input.parentElement.querySelector('.autocomplete-icon');
    if (!icon) return;

    function showSuggestions(suggestions) {
        suggestionsContainer.innerHTML = '';
        suggestions.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item;
            div.addEventListener('click', () => {
                input.value = item;
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
        const filteredItems = dataList.filter(item =>
            item.toLowerCase().includes(value)
        );
        showSuggestions(filteredItems);
    });

    icon.addEventListener('click', () => {
        if (suggestionsContainer.style.display === 'block' && suggestionsContainer.innerHTML !== '') {
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        } else {
            showSuggestions(dataList);
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
            input.value = firstSuggestion;
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.innerHTML = '';
        }
    });
}

function setupColumnResizing() {
    const headers = document.querySelectorAll('#pacientes-table th');
    const table = document.getElementById('pacientes-table');

    headers.forEach((header, index) => {
        const resizeHandle = header.querySelector('.resize-handle');
        if (!resizeHandle) return;

        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = columnWidths[index];

            const onMouseMove = (moveEvent) => {
                const newWidth = startWidth + (moveEvent.clientX - startX);
                if (newWidth >= 50) {
                    columnWidths[index] = newWidth;
                    header.style.width = `${newWidth}px`;
                    header.style.minWidth = `${newWidth}px`;
                    document.querySelectorAll(`#pacientes-table td:nth-child(${index + 1})`).forEach(cell => {
                        cell.style.width = `${newWidth}px`;
                        cell.style.minWidth = `${newWidth}px`;
                    });
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

function simulateProgress(progressElement, callback) {
    let progress = 0;
    const increment = 2;
    const interval = 5;

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

function getLocalDate() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateString(date) {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const formattedDay = String(d.getDate()).padStart(2, '0');
    const formattedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const formattedYear = d.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
}

function getDateDetails(date) {
    if (!date) return { dia: '', semana: '', mes: '', año: '' };
    const d = new Date(date);
    const dia = String(d.getDate()).padStart(2, '0'); // Día exacto
    const semana = Math.ceil((d.getDate() + ((7 - d.getDay()) % 7)) / 7);
    const mes = d.getMonth();
    const año = d.getFullYear();
    return { dia, semana, mes, año };
}

function showMessage(message, type) {
    if (successMessage && successModal && successIcon) {
        successMessage.textContent = message;
        successModal.classList.remove('success', 'error');
        successModal.classList.add(type);
        successIcon.className = `fas fa-${type === 'success' ? 'check-circle' : 'times-circle'}`;
        successModal.style.display = 'flex';
        setTimeout(() => {
            successModal.style.display = 'none';
        }, 1000);
    } else {
        console.warn('Elementos de mensaje no encontrados, usando alert');
        alert(`${type === 'success' ? 'Éxito' : 'Error'}: ${message}`);
    }
}

async function getNextId() {
    try {
        const querySnapshot = await getDocs(query(collection(dbPacientes, 'pacientes'), orderBy('customId', 'desc')));
        let lastId = 0;
        if (!querySnapshot.empty) {
            const lastDoc = querySnapshot.docs[0].data();
            lastId = lastDoc.customId ? parseInt(lastDoc.customId, 10) : 0;
        }
        return String(lastId + 1).padStart(3, '0');
    } catch (error) {
        console.error('Error al obtener el siguiente ID:', error);
        throw new Error(`No se pudo obtener el siguiente ID: ${error.message}`);
    }
}

function getUniqueFilterValues(records) {
    const years = new Set();
    const monthsByYear = {};
    const daysOfWeek = new Set();
    const weeks = new Set();
    const estados = new Set();

    records.forEach(record => {
        if (record.fechaCirugia) {
            const { dia, semana, mes, año } = getDateDetails(record.fechaCirugia);
            if (año) {
                years.add(año.toString());
                if (!monthsByYear[año]) {
                    monthsByYear[año] = new Set();
                }
                monthsByYear[año].add(mes);
            }
            if (dia) daysOfWeek.add(dia);
            if (semana) weeks.add(semana);
        }
        if (record.estado) {
            estados.add(record.estado);
        }
    });

    const result = {
        years: Array.from(years).sort(),
        monthsByYear: Object.keys(monthsByYear).reduce((acc, year) => {
            acc[year] = Array.from(monthsByYear[year]).sort((a, b) => a - b);
            return acc;
        }, {}),
        days: Array.from(daysOfWeek).sort((a, b) => parseInt(a) - parseInt(b)),
        weeks: Array.from(weeks).sort((a, b) => a - b),
        estados: Array.from(estados).sort()
    };

    return result;
}

function updateExternalFilters() {
    const { years, monthsByYear, estados } = getUniqueFilterValues(filteredRecords);

    if (filterYear) {
        filterYear.innerHTML = '<option value="">Todos</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filterYear.appendChild(option);
        });
        filterYear.value = activeFilters['año'] || '';
    }

    if (filterMonth) {
        filterMonth.innerHTML = '<option value="">Todos</option>';
        const selectedYear = activeFilters['año'] || '';
        const availableMonths = selectedYear ? (monthsByYear[selectedYear] || []) : months.map((_, i) => i);
        availableMonths.forEach(monthIndex => {
            const option = document.createElement('option');
            option.value = monthIndex.toString();
            option.textContent = months[monthIndex];
            filterMonth.appendChild(option);
        });
        filterMonth.value = activeFilters['mes'] || '';
    }

    if (filterStatus) {
        filterStatus.innerHTML = '<option value="">Todos</option>';
        estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            filterStatus.appendChild(option);
        });
        filterStatus.value = activeFilters['estado'] || '';
    }
}

registrarBtn.addEventListener('click', async () => {
    const atributo = document.getElementById('atributo')?.value || '';
    const prevision = document.getElementById('prevision')?.value.trim() || '';
    const admision = document.getElementById('admision')?.value.trim() || '';
    const nombrePaciente = document.getElementById('nombre-paciente')?.value.trim() || '';
    const medico = document.getElementById('medico')?.value.trim() || '';
    const fechaCirugia = document.getElementById('fecha-cirugia')?.value || '';
    const proveedor = document.getElementById('proveedor')?.value.trim() || '';
    const estado = document.getElementById('estado')?.value || '';
    const fechaCargo = document.getElementById('fecha-cargo')?.value || '';
    const informe = document.getElementById('informe')?.value || '';
    const totalCotizacionInput = document.getElementById('total-cotizacion');
    const totalCotizacion = parseFloat(totalCotizacionInput?.dataset.rawValue || totalCotizacionInput?.value || 0);
    const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';
    const fechaIngreso = admision ? getLocalDate() : '';
    const { dia, semana, mes, año } = getDateDetails(fechaCirugia);
    const admisionEmpresa = [admision, proveedor].filter(Boolean).join('');
    const duplicado = [admision, nombrePaciente, proveedor].filter(Boolean).join('');

    if (proveedor && !empresas.includes(proveedor)) {
        showMessage(`El proveedor "${proveedor}" no está registrado en la lista de empresas.`, 'error');
        return;
    }

    if (registerModal && registerProgress) {
        registerModal.style.display = 'flex';
        registerProgress.textContent = '0%';
        const spinnerText = document.querySelector('.spinner-text');
        if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;
    }

    try {
        await new Promise(resolve => simulateProgress(registerProgress || { textContent: '' }, resolve));
        const customId = await getNextId();

        const newRecord = {
            customId,
            atributo,
            prevision,
            admision,
            nombrePaciente,
            medico,
            fechaCirugia,
            proveedor,
            estado,
            fechaCargo,
            informe,
            totalCotizacion,
            fechaIngreso,
            admisionEmpresa,
            duplicado,
            dia,
            semana,
            mes,
            año,
            usuario: userName,
            createdAt: new Date()
        };

        await addDoc(collection(dbPacientes, 'pacientes'), newRecord);

        if (admisionEmpresa && totalCotizacion) {
            await syncTotalCotizacionToConsumos(admisionEmpresa, totalCotizacion);
        }

        if (registerModal) registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente el paciente ${nombrePaciente || 'sin nombre'}.`, 'success');
        document.querySelectorAll('.form-container input, .form-container select').forEach(input => input.value = '');
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar paciente:', error);
        if (registerModal) registerModal.style.display = 'none';
        showMessage(`Error al registrar paciente: ${error.message}`, 'error');
    }
});

async function exportToExcel() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();

        const data = filteredRecords.map(record => ({
            'Fecha de Ingreso': formatDateString(record.fechaIngreso),
            Atributo: record.atributo || '',
            Previsión: record.prevision || '',
            Admisión: record.admision || '',
            'Nombre del Paciente': record.nombrePaciente || '',
            Médico: record.medico || '',
            'Fecha de Cirugía': formatDateString(record.fechaCirugia),
            Proveedor: record.proveedor || '',
            Estado: record.estado || '',
            'Fecha de Cargo': formatDateString(record.fechaCargo),
            Informe: record.informe || '',
            'Total Cotización': record.totalCotizacion || '',
            'Admisión/Empresa': record.admisionEmpresa || '',
            Duplicado: record.duplicado || '',
            Día: record.dia || '',
            Semana: record.semana || '',
            Año: record.año || '',
            Mes: months[record.mes] || '',
            Usuario: record.usuario || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
            { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pacientes');
        XLSX.writeFile(workbook, 'pacientes.xlsx');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showMessage(`Error al exportar el archivo Excel: ${error.message}`, 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
}

async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) {
        showMessage('Por favor, seleccione un archivo Excel.', 'error');
        return;
    }

    try {
        await loadSheetJS();
        const importModal = document.getElementById('import-modal');
        const importProgress = document.getElementById('import-progress');
        const importCurrentRow = document.getElementById('import-current-row');
        const importTotalRows = document.getElementById('import-total-rows');
        if (importModal && importProgress && importCurrentRow && importTotalRows) {
            importModal.style.display = 'flex';
            importProgress.textContent = '0%';
            importCurrentRow.textContent = '0';
            importTotalRows.textContent = '0';
        }

        const existingData = await getDocs(collection(dbPacientes, 'pacientes'));
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
        if (importModal && importTotalRows) importTotalRows.textContent = totalRows.toString();

        if (totalRows === 0) {
            if (importModal) importModal.style.display = 'none';
            showMessage('El archivo Excel está vacío.', 'error');
            return;
        }

        let successfulImports = 0;
        let errors = [];
        const batchSize = 500;
        let currentId = lastId + 1;

        for (let i = 0; i < totalRows; i += batchSize) {
            const batch = writeBatch(dbPacientes);
            const end = Math.min(i + batchSize, totalRows);
            let batchErrors = [];

            for (let j = i; j < end; j++) {
                const row = rows[j];
                if (importModal && importCurrentRow) importCurrentRow.textContent = (j + 1).toString();
                if (importModal && importProgress) {
                    const percentage = Math.round(((j + 1) / totalRows) * 100);
                    importProgress.textContent = `${percentage}%`;
                }

                const atributo = row['Atributo'] ? String(row['Atributo']).trim() : '';
                const prevision = row['Previsión'] ? String(row['Previsión']).trim() : '';
                const admision = row['Admisión'] ? String(row['Admisión']).trim() : '';
                const nombrePaciente = row['Nombre del Paciente'] ? String(row['Nombre del Paciente']).trim() : '';
                const medico = row['Médico'] ? String(row['Médico']).trim() : '';
                const fechaCirugia = row['Fecha de Cirugía'] ? String(row['Fecha de Cirugía']) : '';
                const proveedor = row['Proveedor'] ? String(row['Proveedor']).trim() : '';
                const estado = row['Estado'] ? String(row['Estado']).trim() : '';
                const fechaCargo = row['Fecha de Cargo'] ? String(row['Fecha de Cargo']) : '';
                const informe = row['Informe'] ? String(row['Informe']).trim() : '';
                const totalCotizacion = row['Total Cotización'] ? parseFloat(row['Total Cotización']) : 0;
                const fechaIngreso = admision ? getLocalDate() : '';
                const { dia, semana, mes, año } = getDateDetails(fechaCirugia);
                const admisionEmpresa = [admision, proveedor].filter(Boolean).join('');
                const duplicado = [admision, nombrePaciente, proveedor].filter(Boolean).join('');
                const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';

                if (proveedor && !empresas.includes(proveedor)) {
                    batchErrors.push(`Fila ${j + 1}: El proveedor "${proveedor}" no está registrado.`);
                    continue;
                }

                const docRef = doc(collection(dbPacientes, 'pacientes'));
                batch.set(docRef, {
                    customId: String(currentId).padStart(3, '0'),
                    atributo,
                    prevision,
                    admision,
                    nombrePaciente,
                    medico,
                    fechaCirugia,
                    proveedor,
                    estado,
                    fechaCargo,
                    informe,
                    totalCotizacion,
                    fechaIngreso,
                    admisionEmpresa,
                    duplicado,
                    dia,
                    semana,
                    mes,
                    año,
                    usuario: userName,
                    createdAt: new Date()
                });

                currentId++;
                successfulImports++;
            }

            if (batchErrors.length > 0) {
                errors.push(...batchErrors);
            }

            if (successfulImports > 0) {
                try {
                    await batch.commit();
                    for (let j = i; j < end; j++) {
                        const row = rows[j];
                        const admision = row['Admisión'] ? String(row['Admisión']).trim() : '';
                        const proveedor = row['Proveedor'] ? String(row['Proveedor']).trim() : '';
                        const totalCotizacion = row['Total Cotización'] ? parseFloat(row['Total Cotización']) : 0;
                        const admisionEmpresa = [admision, proveedor].filter(Boolean).join('');
                        if (admisionEmpresa && totalCotizacion) {
                            await syncTotalCotizacionToConsumos(admisionEmpresa, totalCotizacion);
                        }
                    }
                } catch (error) {
                    errors.push(`Error al guardar lote ${i / batchSize + 1}: ${error.message}`);
                    successfulImports -= (end - i - batchErrors.length);
                }
            }
        }

        if (importModal) importModal.style.display = 'none';
        if (successfulImports === totalRows) {
            showMessage(`Se importaron exitosamente ${successfulImports} registros.`, 'success');
        } else {
            const message = `Se importaron ${successfulImports} de ${totalRows} registros.\nErrores:\n${errors.join('\n')}`;
            showMessage(message, 'error');
        }

        if (importExcelBtn) importExcelBtn.value = '';
        await loadTableData();
    } catch (error) {
        console.error('Error al importar desde Excel:', error);
        if (importModal) importModal.style.display = 'none';
        if (importExcelBtn) importExcelBtn.value = '';
        showMessage(`Error al importar el archivo Excel: ${error.message}`, 'error');
    }
}

if (importExcelBtn) {
    importExcelBtn.addEventListener('change', importFromExcel);
}

async function downloadExcelFormat() {
    try {
        await loadSheetJS();

        const data = [{
            'Fecha de Ingreso': '',
            Atributo: '',
            Previsión: '',
            Admisión: '',
            'Nombre del Paciente': '',
            Médico: '',
            'Fecha de Cirugía': '',
            Proveedor: '',
            Estado: '',
            'Fecha de Cargo': '',
            Informe: '',
            'Total Cotización': '',
            'Admisión/Empresa': '',
            Duplicado: '',
            Día: '',
            Semana: '',
            Año: '',
            Mes: '',
            Usuario: ''
        }];

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 },
            { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato');
        XLSX.writeFile(workbook, 'formato_pacientes.xlsx');
    } catch (error) {
        console.error('Error al descargar el formato:', error);
        showMessage(`Error al generar el formato de Excel: ${error.message}`, 'error');
    }
}

if (downloadFormatBtn) {
    downloadFormatBtn.addEventListener('click', downloadExcelFormat);
}

function applyFilters() {
    filteredRecords = allRecords.filter(record => {
        return Object.keys(activeFilters).every(column => {
            const filterValue = activeFilters[column];
            let cellValue = '';

            if (column === 'año') {
                const { año } = getDateDetails(record.fechaCirugia);
                return filterValue === '' || año.toString() === filterValue;
            } else if (column === 'mes') {
                const { mes } = getDateDetails(record.fechaCirugia);
                return filterValue === '' || mes.toString() === filterValue;
            } else if (column === 'dia') {
                const { dia } = getDateDetails(record.fechaCirugia);
                return filterValue === '' || dia === filterValue;
            } else if (column === 'semana') {
                const { semana } = getDateDetails(record.fechaCirugia);
                return filterValue === '' || semana.toString() === filterValue;
            } else if (column === 'estado') {
                cellValue = record.estado || '';
                return filterValue === '' || cellValue === filterValue;
            } else {
                if (column === 'fechaIngreso') cellValue = formatDateString(record.fechaIngreso) || '';
                else if (column === 'atributo') cellValue = record.atributo || '';
                else if (column === 'prevision') cellValue = record.prevision || '';
                else if (column === 'admision') cellValue = record.admision || '';
                else if (column === 'nombrePaciente') cellValue = record.nombrePaciente || '';
                else if (column === 'medico') cellValue = record.medico || '';
                else if (column === 'fechaCirugia') cellValue = formatDateString(record.fechaCirugia) || '';
                else if (column === 'proveedor') cellValue = record.proveedor || '';
                else if (column === 'fechaCargo') cellValue = formatDateString(record.fechaCargo) || '';
                else if (column === 'informe') cellValue = record.informe || '';
                else if (column === 'totalCotizacion') cellValue = record.totalCotizacion?.toString() || '';
                else if (column === 'admisionEmpresa') cellValue = record.admisionEmpresa || '';
                else if (column === 'duplicado') cellValue = record.duplicado || '';
                else if (column === 'usuario') cellValue = record.usuario || '';
                return cellValue.toLowerCase().includes(filterValue.toLowerCase());
            }
        });
    });

    currentPage = 1;
    updateExternalFilters();
    renderTable();
}

function showFilterInput(icon, column, th) {
    if (activeFilterInputs[column]) {
        activeFilterInputs[column].remove();
        delete activeFilterInputs[column];
        icon.classList.remove('active');
        return;
    }

    const container = document.createElement('div');
    container.className = 'filter-input-container';
    let input;

    if (['año', 'mes', 'dia', 'semana', 'estado'].includes(column)) {
        input = document.createElement('select');
        input.innerHTML = '<option value="">Todos</option>';

        const { years, monthsByYear, days, weeks, estados } = getUniqueFilterValues(filteredRecords);

        if (column === 'año') {
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                input.appendChild(option);
            });
        } else if (column === 'mes') {
            const selectedYear = activeFilters['año'] || '';
            const availableMonths = selectedYear ? (monthsByYear[selectedYear] || []) : months.map((_, i) => i);
            availableMonths.forEach(monthIndex => {
                const option = document.createElement('option');
                option.value = monthIndex.toString();
                option.textContent = months[monthIndex];
                input.appendChild(option);
            });
        } else if (column === 'dia') {
            days.forEach(day => {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day;
                input.appendChild(option);
            });
        } else if (column == 'semana') {
            weeks.forEach(week => {
                const option = document.createElement('option');
                option.value = week;
                option.textContent = week;
                input.appendChild(option);
            });
        } else if (column === 'estado') {
            estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado;
                option.textContent = estado;
                input.appendChild(option);
            });
        }

        input.value = activeFilters[column] || '';
    } else {
        input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Filtrar...';
        input.value = activeFilters[column] || '';
    }

    container.appendChild(input);
    th.appendChild(container);

    activeFilterInputs[column] = container;
    icon.classList.add('active');

    const thRect = th.getBoundingClientRect();
    container.style.width = `${thRect.width}px`;

    input.focus();
    input.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value) {
            activeFilters[column] = value;
        } else {
            delete activeFilters[column];
            icon.classList.remove('active');
        }
        applyFilters();
    });

    if (input.tagName === 'INPUT') {
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
    }

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

function setupExternalFilters() {
    if (filterYear) {
        filterYear.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                activeFilters['año'] = value;
            } else {
                delete activeFilters['año'];
            }
            applyFilters();
        });
    }

    if (filterMonth) {
        filterMonth.addEventListener('change', (e) => {
            const command = e.target.value;
            if (command) {
                activeFilters['mes'] = command;
            } else {
                delete activeFilters['mes'];
            }
            applyFilters();
        });
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                activeFilters['estado'] = value;
            } else {
                delete activeFilters['estado'];
            }
            applyFilters();
        });
    }
}

async function loadTableData() {
    allRecords = [];
    filteredRecords = [];
    pacientesTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        const querySnapshot = await getDocs(query(collection(dbPacientes, 'pacientes'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                docId: doc.id,
                customId: data.customId,
                atributo: data.atributo,
                prevision: data.prevision,
                admision: data.admision,
                nombrePaciente: data.nombrePaciente,
                medico: data.medico,
                fechaCirugia: data.fechaCirugia,
                proveedor: data.proveedor,
                estado: data.estado,
                fechaCargo: data.fechaCargo,
                informe: data.informe,
                totalCotizacion: data.totalCotizacion,
                fechaIngreso: data.fechaIngreso,
                admisionEmpresa: data.admisionEmpresa,
                duplicado: data.duplicado,
                dia: data.dia,
                semana: data.semana,
                mes: data.mes,
                año: data.año,
                usuario: data.usuario,
                createdAt: data.createdAt
            };
            allRecords.push(record);
        });

        filteredRecords = [...allRecords];
        updateExternalFilters();
        renderTable();
        handleFilterIcons();
        setupColumnResizing();
        tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        pacientesTableBody.innerHTML = `<tr><td colspan="20">Error al cargar datos: ${error.message}</td></tr>`;
        tableContainer.style.display = 'block';
        showMessage(`Error al cargar datos: ${error.message}`, 'error');
    }
}

function renderTable() {
    pacientesTableBody.innerHTML = '';

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    totalRecords.textContent = `Total de registros: ${filteredRecords.length}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = filteredRecords.slice(start, end);

    const headers = document.querySelectorAll('#pacientes-table th');
    const table = document.getElementById('pacientes-table');
    headers.forEach((header, index) => {
        header.style.width = `${columnWidths[index]}px`;
        header.style.minWidth = `${columnWidths[index]}px`;
    });

    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    table.style.width = `${totalWidth}px`;
    table.style.minWidth = `${totalWidth}px`;

    if (filteredRecords.length === 0) {
        pacientesTableBody.innerHTML = '<tr><td colspan="20">No hay pacientes que coincidan con los filtros.</td></tr>';
    } else {
        pageRecords.forEach(record => {
            const row = document.createElement('tr');
            const estadoClass = record.estado ? `estado-${record.estado.toLowerCase().replace(/\s+/g, '-')}` : '';
            row.className = estadoClass;

            const fechaIngreso = formatDateString(record.fechaIngreso);
            const fechaCirugia = formatDateString(record.fechaCirugia);
            const fechaCargo = formatDateString(record.fechaCargo);
            const mesDisplay = record.mes !== undefined ? months[record.mes] : '';
            const totalCotizacionFormatted = record.totalCotizacion ? Number(record.totalCotizacion).toLocaleString('es-ES', { minimumFractionDigits: 0 }) : '';

            row.innerHTML = `
                <td style="width: ${columnWidths[0]}px; min-width: ${columnWidths[0]}px">
                    <i class="fas fa-edit action-icon" title="Editar"></i>
                    <i class="fas fa-trash action-icon" title="Eliminar"></i>
                </td>
                <td style="width: ${columnWidths[1]}px; min-width: ${columnWidths[1]}px" title="${fechaIngreso}">${fechaIngreso}</td>
                <td style="width: ${columnWidths[2]}px; min-width: ${columnWidths[2]}px" title="${record.atributo || ''}">${record.atributo || ''}</td>
                <td style="width: ${columnWidths[3]}px; min-width: ${columnWidths[3]}px" title="${record.prevision || ''}">${record.prevision || ''}</td>
                <td style="width: ${columnWidths[4]}px; min-width: ${columnWidths[4]}px" title="${record.admision || ''}">${record.admision || ''}</td>
                <td style="width: ${columnWidths[5]}px; min-width: ${columnWidths[5]}px" title="${record.nombrePaciente || ''}">${record.nombrePaciente || ''}</td>
                <td style="width: ${columnWidths[6]}px; min-width: ${columnWidths[6]}px" title="${record.medico || ''}">${record.medico || ''}</td>
                <td style="width: ${columnWidths[7]}px; min-width: ${columnWidths[7]}px" title="${fechaCirugia}">${fechaCirugia}</td>
                <td style="width: ${columnWidths[8]}px; min-width: ${columnWidths[8]}px" title="${record.proveedor || ''}">${record.proveedor || ''}</td>
                <td style="width: ${columnWidths[9]}px; min-width: ${columnWidths[9]}px" title="${record.estado || ''}">${record.estado || ''}</td>
                <td style="width: ${columnWidths[10]}px; min-width: ${columnWidths[10]}px" title="${fechaCargo}">${fechaCargo}</td>
                <td style="width: ${columnWidths[11]}px; min-width: ${columnWidths[11]}px" title="${record.informe || ''}">${record.informe || ''}</td>
                <td style="width: ${columnWidths[12]}px; min-width: ${columnWidths[12]}px" title="${totalCotizacionFormatted}">${totalCotizacionFormatted}</td>
                <td style="width: ${columnWidths[13]}px; min-width: ${columnWidths[13]}px" title="${record.admisionEmpresa || ''}">${record.admisionEmpresa || ''}</td>
                <td style="width: ${columnWidths[14]}px; min-width: ${columnWidths[14]}px" title="${record.duplicado || ''}">${record.duplicado || ''}</td>
                <td style="width: ${columnWidths[15]}px; min-width: ${columnWidths[15]}px" title="${record.dia || ''}">${record.dia || ''}</td>
                <td style="width: ${columnWidths[16]}px; min-width: ${columnWidths[16]}px" title="${record.semana || ''}">${record.semana || ''}</td>
                <td style="width: ${columnWidths[17]}px; min-width: ${columnWidths[17]}px" title="${record.año || ''}">${record.año || ''}</td>
                <td style="width: ${columnWidths[18]}px; min-width: ${columnWidths[18]}px" title="${mesDisplay}">${mesDisplay}</td>
                <td style="width: ${columnWidths[19]}px; min-width: ${columnWidths[19]}px" title="${record.usuario || ''}">${record.usuario || ''}</td>
            `;
            row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));
            row.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(record));
            pacientesTableBody.appendChild(row);
        });
    }

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

function openEditModal(record) {
    editingRecord = record;
    document.getElementById('edit-atributo').value = record.atributo || '';
    document.getElementById('edit-prevision').value = record.prevision || '';
    document.getElementById('edit-admision').value = record.admision || '';
    document.getElementById('edit-nombre-paciente').value = record.nombrePaciente || '';
    document.getElementById('edit-medico').value = record.medico || '';
    document.getElementById('edit-fecha-cirugia').value = record.fechaCirugia || '';
    document.getElementById('edit-proveedor').value = record.proveedor || '';
    document.getElementById('edit-estado').value = record.estado || '';
    document.getElementById('edit-fecha-cargo').value = record.fechaCargo || '';
    document.getElementById('edit-informe').value = record.informe || '';
    const editTotalCotizacionInput = document.getElementById('edit-total-cotizacion');
    editTotalCotizacionInput.value = record.totalCotizacion ? formatNumberWithDots(record.totalCotizacion) : '';
    editTotalCotizacionInput.dataset.rawValue = record.totalCotizacion || '';
    editModal.style.display = 'flex';
}

saveEditBtn.addEventListener('click', async () => {
    const atributo = document.getElementById('edit-atributo')?.value || '';
    const prevision = document.getElementById('edit-prevision')?.value.trim() || '';
    const admision = document.getElementById('edit-admision')?.value.trim() || '';
    const nombrePaciente = document.getElementById('edit-nombre-paciente')?.value.trim() || '';
    const medico = document.getElementById('edit-medico')?.value.trim() || '';
    const fechaCirugia = document.getElementById('edit-fecha-cirugia')?.value || '';
    const proveedor = document.getElementById('edit-proveedor')?.value.trim() || '';
    const estado = document.getElementById('edit-estado')?.value || '';
    const fechaCargo = document.getElementById('edit-fecha-cargo')?.value || '';
    const informe = document.getElementById('edit-informe')?.value || '';
    const editTotalCotizacionInput = document.getElementById('edit-total-cotizacion');
    const totalCotizacion = parseFloat(editTotalCotizacionInput?.dataset.rawValue || editTotalCotizacionInput?.value || 0);
    let fechaIngreso = editingRecord.fechaIngreso;
    const admisionEmpresa = [admision, proveedor].filter(Boolean).join('');
    const duplicado = [admision, nombrePaciente, proveedor].filter(Boolean).join('');

    if (admision && !editingRecord.admision && !fechaIngreso) {
        fechaIngreso = getLocalDate();
    }

    const { dia, semana, mes, año } = getDateDetails(fechaCirugia);

    if (proveedor && !empresas.includes(proveedor)) {
        showMessage(`El proveedor "${proveedor}" no está registrado en la lista de empresas.`, 'error');
        return;
    }

    if (registerModal && registerProgress) {
        registerModal.style.display = 'flex';
        registerProgress.textContent = '0%';
        const spinnerText = document.querySelector('.spinner-text');
        if (spinnerText) spinnerText.textContent = `Guardando cambios... ${registerProgress.textContent}`;
    }

    try {
        await new Promise(resolve => simulateProgress(registerProgress || { textContent: '' }, resolve));

        const updatedData = {
            atributo,
            prevision,
            admision,
            nombrePaciente,
            medico,
            fechaCirugia,
            proveedor,
            estado,
            fechaCargo,
            informe,
            totalCotizacion,
            fechaIngreso,
            admisionEmpresa,
            duplicado,
            dia,
            semana,
            mes,
            año,
            updatedAt: new Date()
        };

        const pacienteDocRef = doc(dbPacientes, 'pacientes', editingRecord.docId);
        await updateDoc(pacienteDocRef, updatedData);

        if (admisionEmpresa && totalCotizacion) {
            await syncTotalCotizacionToConsumos(admisionEmpresa, totalCotizacion);
        }

        if (registerModal) registerModal.style.display = 'none';
        editModal.style.display = 'none';
        showMessage(`Se ha actualizado exitosamente el paciente ${nombrePaciente || 'sin nombre'}.`, 'success');
        await loadTableData();
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        if (registerModal) registerModal.style.display = 'none';
        editModal.style.display = 'flex';
        showMessage(`Error al actualizar paciente: ${error.message}`, 'error');
    }
});

cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    editingRecord = null;
});

async function openDeleteModal(record) {
    const deleteModal = document.getElementById('delete-modal');
    const deleteMessage = document.getElementById('delete-message');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    if (!deleteModal || !deleteMessage || !confirmDeleteBtn || !cancelDeleteBtn) {
        console.error('Elementos del modal de eliminación no encontrados');
        showMessage('Error: No se encontraron los elementos del modal de eliminación.', 'error');
        return;
    }

    deleteMessage.textContent = `¿Desea eliminar el registro del paciente ${record.nombrePaciente || 'sin nombre'}?`;
    deleteModal.style.display = 'flex';

    confirmDeleteBtn.onclick = async () => {
        try {
            if (registerModal && registerProgress) {
                registerModal.style.display = 'flex';
                registerProgress.textContent = '0%';
                const spinnerText = document.querySelector('.spinner-text');
                if (spinnerText) spinnerText.textContent = `Eliminando... ${registerProgress.textContent}`;
            }

            await new Promise(resolve => simulateProgress(registerProgress || { textContent: '' }, resolve));
            await deleteDoc(doc(dbPacientes, 'pacientes', record.docId));

            const admisionEmpresa = record.admisionEmpresa;
            if (admisionEmpresa) {
                await syncTotalCotizacionToConsumos(admisionEmpresa, 0);
            }

            if (registerModal) registerModal.style.display = 'none';
            deleteModal.style.display = 'none';
            showMessage(`Se ha eliminado el registro del paciente ${record.nombrePaciente || 'sin nombre'}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al eliminar paciente:', error);
            if (registerModal) registerModal.style.display = 'none';
            deleteModal.style.display = 'none';
            showMessage(`Error al eliminar paciente: ${error.message}`, 'error');
        }
    };

    cancelDeleteBtn.onclick = () => {
        deleteModal.style.display = 'none';
    };
}

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

async function initialize() {
    const waitForAuth = new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(authUsuarios, (user) => {
            unsubscribe();
            resolve(user);
        });
    });

    const user = await waitForAuth;

    if (!user) {
        showMessage('Debe iniciar sesión para acceder a este módulo.', 'error');
        setTimeout(() => window.location.href = 'login.html', 1000);
        return;
    }

    const q = query(collection(dbUsuarios, 'usuarios'), where('correo', '==', user.email));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            currentUser = querySnapshot.docs[0].data();
        } else {
            currentUser = { nombreCompleto: 'Usuario' };
            console.warn('No se encontró el documento del usuario en la colección "usuarios"');
        }
    } catch (error) {
        console.error('Error al buscar datos del usuario:', error);
        showMessage(`Error al cargar datos del usuario: ${error.message}`, 'error');
    }

    if (loadingModal && loadingProgress) {
        loadingModal.style.display = 'flex';
        loadingProgress.textContent = '0%';
    }

    try {
        await loadReferenceData();
        setupAutocomplete('proveedor', 'proveedor-suggestions', empresas);
        setupAutocomplete('edit-proveedor', 'edit-proveedor-suggestions', empresas);
        setupAutocomplete('prevision', 'prevision-suggestions', previsiones);
        setupAutocomplete('edit-prevision', 'edit-prevision-suggestions', previsiones);
        setupAutocomplete('medico', 'medico-suggestions', medicos);
        setupAutocomplete('edit-medico', 'edit-medico-suggestions', medicos);
        setupDateInputs();
        setupNumberFormatInputs(); // Llamar a la función actualizada
        setupExternalFilters();
        await new Promise(resolve => simulateProgress(loadingProgress || { textContent: '' }, resolve));
        await loadTableData();
        if (loadingModal) loadingModal.style.display = 'none';
        tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        if (loadingModal) loadingModal.style.display = 'none';
        tableContainer.style.display = 'block';
        showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');
    }
}

initialize();