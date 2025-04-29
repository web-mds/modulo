import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, getDocs, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfigPacientes = {
    apiKey: "AIzaSyBYKh5o_N9rct-UdD82WVmNCDEu2c57-Ic",
    authDomain: "codigos-552eb.firebaseapp.com",
    projectId: "codigos-552eb",
    storageBucket: "codigos-552eb.firebasestorage.app",
    messagingSenderId: "1068753214299",
    appId: "1:1068753214299:web:4b0d54f71f606112a3d87e",
    measurementId: "G-W3LS1YZY2Q"
};

const firebaseConfigUsuarios = {
    apiKey: "AIzaSyCoJyXiv95_P6Bk9iV892n8FnSNlGEBPDc",
    authDomain: "usuarios-202ed.firebaseapp.com",
    projectId: "usuarios-202ed",
    storageBucket: "usuarios-202ed.firebasestorage.app",
    messagingSenderId: "502953175",
    appId: "1:502953175:web:8eec7ccfa1ca21df09ec92",
    measurementId: "G-YW9XE5PVEV"
};

const appPacientes = initializeApp(firebaseConfigPacientes, "pacientesApp");
const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");

const authUsuarios = getAuth(appUsuarios);
const dbPacientes = getFirestore(appPacientes);
const dbUsuarios = getFirestore(appUsuarios);

const pacientesTableBody = document.querySelector('#pacientes-table tbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const successModal = document.getElementById('success-modal');
const successMessage = document.getElementById('success-message');
const successIcon = document.getElementById('success-icon');
const loadingModal = document.getElementById('loading-modal');
const loadingProgress = document.getElementById('loading-progress');
const tableContainer = document.getElementById('table-container');
const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const filterStatus = document.getElementById('filter-status');

let currentPage = 1;
const recordsPerPage = 200;
let allRecords = [];
let filteredRecords = [];
let activeFilters = {};
let activeFilterInputs = {};
let currentUser = null;
let empresas = [];
let previsiones = [];
let medicos = [];
let columnWidths = {
    0: 120,  // Fecha de Ingreso
    1: 100,  // Atributo
    2: 100,  // Previsión
    3: 100,  // Admisión
    4: 200,  // Nombre del Paciente
    5: 150,  // Médico
    6: 120,  // Fecha de Cirugía
    7: 150,  // Proveedor
    8: 100,  // Estado
    9: 120,  // Fecha de Cargo
    10: 200, // Informe
    11: 100, // Total Cotización
    12: 100, // Día
    13: 100, // Semana
    14: 100, // Año
    15: 100, // Mes
    16: 150  // Usuario
};

const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const days = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

async function loadReferenceData() {
    try {
        const empresasSnapshot = await getDocs(query(collection(dbUsuarios, 'empresas'), orderBy('nombreEmpresa')));
        empresas = empresasSnapshot.docs.map(doc => doc.data().nombreEmpresa);
        console.log('Empresas cargadas:', empresas);

        const previsionesSnapshot = await getDocs(query(collection(dbUsuarios, 'previsiones'), orderBy('nombrePrevisionDisplay')));
        previsiones = previsionesSnapshot.docs.map(doc => doc.data().nombrePrevisionDisplay);
        console.log('Previsiones cargadas:', previsiones);

        const medicosSnapshot = await getDocs(query(collection(dbUsuarios, 'medicos'), orderBy('nombreMedicoDisplay')));
        medicos = medicosSnapshot.docs.map(doc => doc.data().nombreMedicoDisplay);
        console.log('Médicos cargados:', medicos);
    } catch (error) {
        console.error('Error al cargar datos de referencia:', error);
        showMessage(`Error al cargar empresas, previsiones o médicos: ${error.message}`, 'error');
    }
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
    const dia = days[d.getDay()];
    const semana = Math.ceil((d.getDate() + ((7 - d.getDay()) % 7)) / 7);
    const mes = d.getMonth(); // 0-based
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
        }, 3000);
    } else {
        console.warn('Elementos de mensaje no encontrados, usando alert');
        alert(`${type === 'success' ? 'Éxito' : 'Error'}: ${message}`);
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
        days: Array.from(daysOfWeek).sort(),
        weeks: Array.from(weeks).sort((a, b) => a - b),
        estados: Array.from(estados).sort()
    };

    console.log('Valores de filtro:', result);
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
        const availableMonths = new Set();
        filteredRecords.forEach(record => {
            if (record.fechaCirugia) {
                const { mes, año } = getDateDetails(record.fechaCirugia);
                if (!selectedYear || año.toString() === selectedYear) {
                    availableMonths.add(mes);
                }
            }
        });

        const sortedMonths = Array.from(availableMonths).sort((a, b) => a - b);
        sortedMonths.forEach(monthIndex => {
            const option = document.createElement('option');
            option.value = monthIndex.toString();
            option.textContent = months[monthIndex];
            filterMonth.appendChild(option);
        });

        if (activeFilters['mes'] && sortedMonths.includes(parseInt(activeFilters['mes']))) {
            filterMonth.value = activeFilters['mes'];
        } else {
            delete activeFilters['mes'];
            filterMonth.value = '';
        }
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
            Día: record.dia || '',
            Semana: record.semana || '',
            Año: record.año || '',
            Mes: months[record.mes] || '',
            Usuario: record.usuario || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 }, // Fecha de Ingreso
            { wch: 15 }, // Atributo
            { wch: 15 }, // Previsión
            { wch: 15 }, // Admisión
            { wch: 25 }, // Nombre del Paciente
            { wch: 20 }, // Médico
            { wch: 15 }, // Fecha de Cirugía
            { wch: 20 }, // Proveedor
            { wch: 15 }, // Estado
            { wch: 15 }, // Fecha de Cargo
            { wch: 30 }, // Informe
            { wch: 15 }, // Total Cotización
            { wch: 15 }, // Día
            { wch: 15 }, // Semana
            { wch: 15 }, // Año
            { wch: 15 }, // Mes
            { wch: 20 }  // Usuario
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Ver Pacientes');
        XLSX.writeFile(workbook, 'ver_pacientes.xlsx');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showMessage(`Error al exportar el archivo Excel: ${error.message}`, 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
}

function applyFilters() {
    console.log('Filtros activos:', activeFilters);
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
                else if (column === 'usuario') cellValue = record.usuario || '';
                return cellValue.toLowerCase().includes(filterValue.toLowerCase());
            }
        });
    });

    console.log('Registros filtrados:', filteredRecords.length);
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
            const availableMonths = selectedYear ? (monthsByYear[selectedYear] || []) : Object.values(monthsByYear).flat().filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
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
        } else if (column === 'semana') {
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
            const value = e.target.value;
            if (value) {
                activeFilters['mes'] = value;
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
        console.log('Datos de pacientes cargados:', querySnapshot.docs.length);

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                docId: doc.id,
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
        pacientesTableBody.innerHTML = `<tr><td colspan="17">Error al cargar datos: ${error.message}</td></tr>`;
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
        pacientesTableBody.innerHTML = '<tr><td colspan="17">No hay pacientes que coincidan con los filtros.</td></tr>';
    } else {
        pageRecords.forEach(record => {
            const row = document.createElement('tr');
            const estadoClass = record.estado ? `estado-${record.estado.toLowerCase().replace(/\s+/g, '-')}` : '';
            row.className = estadoClass;
            const fechaIngreso = formatDateString(record.fechaIngreso);
            const fechaCirugia = formatDateString(record.fechaCirugia);
            const fechaCargo = formatDateString(record.fechaCargo);
            const mesDisplay = record.mes !== undefined ? months[record.mes] : '';

            row.innerHTML = `
                <td style="width: ${columnWidths[0]}px; min-width: ${columnWidths[0]}px" title="${fechaIngreso}">${fechaIngreso}</td>
                <td style="width: ${columnWidths[1]}px; min-width: ${columnWidths[1]}px" title="${record.atributo || ''}">${record.atributo || ''}</td>
                <td style="width: ${columnWidths[2]}px; min-width: ${columnWidths[2]}px" title="${record.prevision || ''}">${record.prevision || ''}</td>
                <td style="width: ${columnWidths[3]}px; min-width: ${columnWidths[3]}px" title="${record.admision || ''}">${record.admision || ''}</td>
                <td style="width: ${columnWidths[4]}px; min-width: ${columnWidths[4]}px" title="${record.nombrePaciente || ''}">${record.nombrePaciente || ''}</td>
                <td style="width: ${columnWidths[5]}px; min-width: ${columnWidths[5]}px" title="${record.medico || ''}">${record.medico || ''}</td>
                <td style="width: ${columnWidths[6]}px; min-width: ${columnWidths[6]}px" title="${fechaCirugia}">${fechaCirugia}</td>
                <td style="width: ${columnWidths[7]}px; min-width: ${columnWidths[7]}px" title="${record.proveedor || ''}">${record.proveedor || ''}</td>
                <td style="width: ${columnWidths[8]}px; min-width: ${columnWidths[8]}px" title="${record.estado || ''}">${record.estado || ''}</td>
                <td style="width: ${columnWidths[9]}px; min-width: ${columnWidths[9]}px" title="${fechaCargo}">${fechaCargo}</td>
                <td style="width: ${columnWidths[10]}px; min-width: ${columnWidths[10]}px" title="${record.informe || ''}">${record.informe || ''}</td>
                <td style="width: ${columnWidths[11]}px; min-width: ${columnWidths[11]}px" title="${record.totalCotizacion || ''}">${record.totalCotizacion ? Number(record.totalCotizacion).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
                <td style="width: ${columnWidths[12]}px; min-width: ${columnWidths[12]}px" title="${record.dia || ''}">${record.dia || ''}</td>
                <td style="width: ${columnWidths[13]}px; min-width: ${columnWidths[13]}px" title="${record.semana || ''}">${record.semana || ''}</td>
                <td style="width: ${columnWidths[14]}px; min-width: ${columnWidths[14]}px" title="${record.año || ''}">${record.año || ''}</td>
                <td style="width: ${columnWidths[15]}px; min-width: ${columnWidths[15]}px" title="${mesDisplay}">${mesDisplay}</td>
                <td style="width: ${columnWidths[16]}px; min-width: ${columnWidths[16]}px" title="${record.usuario || ''}">${record.usuario || ''}</td>
            `;
            pacientesTableBody.appendChild(row);
        });
    }

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
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
    console.log('Estado de autenticación resuelto:', user);

    if (!user) {
        console.log('No hay usuario autenticado, redirigiendo a login.html');
        showMessage('Debe iniciar sesión para acceder a este módulo.', 'error');
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }

    const q = query(collection(dbUsuarios, 'usuarios'), where('correo', '==', user.email));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            currentUser = querySnapshot.docs[0].data();
            console.log('Usuario encontrado:', currentUser);
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