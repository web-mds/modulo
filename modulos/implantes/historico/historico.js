import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, getDocs, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfigConsumos = {
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

const appConsumos = initializeApp(firebaseConfigConsumos, "consumosApp");
const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");

const authUsuarios = getAuth(appUsuarios);
const dbConsumos = getFirestore(appConsumos);
const dbUsuarios = getFirestore(appUsuarios);

const historicoTableBody = document.querySelector('#historico-table tbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
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
let columnWidths = {
    0: 100,
    1: 100,
    2: 100,
    3: 200,
    4: 150,
    5: 120,
    6: 150,
    7: 100,
    8: 200,
    9: 100,
    10: 100,
    11: 120
};

const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const estados = [
    'Pendiente',
    'Cargado',
    'Cargo Pendiente',
    'Cerrada',
    'Crear Código',
    'Modificar precio',
    'Regularización',
    'Solicitado'
];

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
    const semana = Math.ceil((d.getDate() + ((7 - d.getDay()) % 7)) / 7);
    const mes = d.getMonth();
    const año = d.getFullYear();
    return { dia: '', semana, mes, año };
}

function showMessage(message, type) {
    alert(`${type === 'success' ? 'Éxito' : 'Error'}: ${message}`);
}

function getUniqueFilterValues(records) {
    const years = new Set();
    const monthsByYear = {};
    const estados = new Set();

    records.forEach(record => {
        if (record.fechaCx) {
            const { mes, año } = getDateDetails(record.fechaCx);
            if (año) {
                years.add(año.toString());
                if (!monthsByYear[año]) {
                    monthsByYear[año] = new Set();
                }
                monthsByYear[año].add(mes);
            }
        }
        if (record.estado) {
            estados.add(record.estado);
        }
    });

    return {
        years: Array.from(years).sort(),
        monthsByYear: Object.keys(monthsByYear).reduce((acc, year) => {
            acc[year] = Array.from(monthsByYear[year]).sort((a, b) => a - b);
            return acc;
        }, {}),
        estados: Array.from(estados).sort()
    };
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

async function exportToExcel() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();
        const data = filteredRecords.map(record => ({
            'Estado': record.estado || '',
            'Previsión': record.prevision || '',
            'Admisión': record.admision || '',
            'Nombre del Paciente': record.paciente || '',
            'Médico': record.medico || '',
            'Fecha de Cx': formatDateString(record.fechaCx) || '',
            'Proveedor': record.proveedor || '',
            'Código': record.codigo || '',
            'Descripción': record.descripcion || '',
            'Cantidad': record.cantidad || '',
            'Precio Sistema': record.precioNeto || '',
            'Agrupación': record.clasificacion || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 30 },
            { wch: 15 },
            { wch: 70 },
            { wch: 10 },
            { wch: 15 },
            { wch: 15 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');
        XLSX.writeFile(workbook, 'historico_consumos.xlsx');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showMessage(`Error al exportar a Excel: ${error.message}`, 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
}

function applyFilters() {
    filteredRecords = allRecords.filter(record => {
        return Object.keys(activeFilters).every(column => {
            const filterValue = activeFilters[column];
            if (column === 'año') {
                const { año } = getDateDetails(record.fechaCx);
                return filterValue === '' || año.toString() === filterValue;
            } else if (column === 'mes') {
                const { mes } = getDateDetails(record.fechaCx);
                return filterValue === '' || mes.toString() === filterValue;
            } else if (column === 'estado') {
                return filterValue === '' || record.estado === filterValue;
            } else {
                const cellValue = record[column] ? record[column].toString() : '';
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

    if (['año', 'mes', 'estado'].includes(column)) {
        input = document.createElement('select');
        input.innerHTML = '<option value="">Todos</option>';

        const { years, monthsByYear, estados } = getUniqueFilterValues(filteredRecords);

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

function setupColumnResizing() {
    const headers = document.querySelectorAll('#historico-table th');
    const table = document.getElementById('historico-table');

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
                    document.querySelectorAll(`#historico-table td:nth-child(${index + 1})`).forEach(cell => {
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

async function loadTableData() {
    allRecords = [];
    filteredRecords = [];
    if (historicoTableBody) historicoTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        const querySnapshot = await getDocs(query(collection(dbConsumos, 'consumos'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                docId: doc.id,
                estado: data.estado,
                prevision: data.prevision,
                admision: data.admision,
                paciente: data.paciente,
                medico: data.medico,
                fechaCx: data.fechaCx,
                proveedor: data.proveedor,
                codigo: data.codigo,
                descripcion: data.descripcion,
                cantidad: data.cantidad,
                precioNeto: data.precioNeto,
                clasificacion: data.clasificacion,
                fechaIngreso: data.fechaIngreso,
                mes: data.mes,
                año: data.año,
                createdAt: data.createdAt
            };
            allRecords.push(record);
        });

        filteredRecords = [...allRecords];
        updateExternalFilters();
        renderTable();
        handleFilterIcons();
        setupColumnResizing();
        if (tableContainer) tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        if (historicoTableBody) {
            historicoTableBody.innerHTML = `<tr><td colspan="12">Error al cargar datos: ${error.message}</td></tr>`;
        }
        if (tableContainer) tableContainer.style.display = 'block';
        showMessage(`Error al cargar datos desde Firestore: ${error.message}`, 'error');
    }
}

function renderTable() {
    if (!historicoTableBody) return;

    historicoTableBody.innerHTML = '';

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (pageInfo && totalPages >= 0) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (totalRecords) totalRecords.textContent = `Total de registros: ${filteredRecords.length}`;

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = filteredRecords.slice(start, end);

    const headers = document.querySelectorAll('#historico-table th');
    const table = document.getElementById('historico-table');
    headers.forEach((header, index) => {
        header.style.width = `${columnWidths[index]}px`;
        header.style.minWidth = `${columnWidths[index]}px`;
    });

    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    if (table) {
        table.style.width = `${totalWidth}px`;
        table.style.minWidth = `${totalWidth}px`;
    }

    if (filteredRecords.length === 0) {
        historicoTableBody.innerHTML = '<tr><td colspan="12">No hay consumos que coincidan con los filtros.</td></tr>';
    } else {
        pageRecords.forEach(record => {
            const row = document.createElement('tr');
            const fechaCx = formatDateString(record.fechaCx);

            if (record.estado) {
                row.classList.add(`estado-${record.estado.toLowerCase().replace(/\s+/g, '-')}`);
            }

            row.innerHTML = `
                <td style="width: ${columnWidths[0]}px; min-width: ${columnWidths[0]}px" title="${record.estado || ''}">${record.estado || ''}</td>
                <td style="width: ${columnWidths[1]}px; min-width: ${columnWidths[1]}px" title="${record.prevision || ''}">${record.prevision || ''}</td>
                <td style="width: ${columnWidths[2]}px; min-width: ${columnWidths[2]}px" title="${record.admision || ''}">${record.admision || ''}</td>
                <td style="width: ${columnWidths[3]}px; min-width: ${columnWidths[3]}px" title="${record.paciente || ''}">${record.paciente || ''}</td>
                <td style="width: ${columnWidths[4]}px; min-width: ${columnWidths[4]}px" title="${record.medico || ''}">${record.medico || ''}</td>
                <td style="width: ${columnWidths[5]}px; min-width: ${columnWidths[5]}px" title="${fechaCx}">${fechaCx}</td>
                <td style="width: ${columnWidths[6]}px; min-width: ${columnWidths[6]}px" title="${record.proveedor || ''}">${record.proveedor || ''}</td>
                <td style="width: ${columnWidths[7]}px; min-width: ${columnWidths[7]}px" title="${record.codigo || ''}">${record.codigo || ''}</td>
                <td style="width: ${columnWidths[8]}px; min-width: ${columnWidths[8]}px" title="${record.descripcion || ''}">${record.descripcion || ''}</td>
                <td style="width: ${columnWidths[9]}px; min-width: ${columnWidths[9]}px" title="${record.cantidad || ''}">${record.cantidad || ''}</td>
                <td style="width: ${columnWidths[10]}px; min-width: ${columnWidths[10]}px" title="${record.precioNeto || ''}">${record.precioNeto || ''}</td>
                <td style="width: ${columnWidths[11]}px; min-width: ${columnWidths[11]}px" title="${record.clasificacion || ''}">${record.clasificacion || ''}</td>
            `;

            historicoTableBody.appendChild(row);
        });
    }

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
}

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
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }

    const q = query(collection(dbUsuarios, 'usuarios'), where('correo', '==', user.email));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            currentUser = querySnapshot.docs[0].data();
        } else {
            currentUser = { nombreCompleto: 'Usuario' };
            console.warn(`No se encontró un documento en la colección "usuarios" para el correo: ${user.email}`);
        }
    } catch (error) {
        console.error('Error al buscar datos del usuario:', error);
        currentUser = { nombreCompleto: 'Usuario' };
        showMessage(`Error al cargar datos del usuario: ${error.message}`, 'error');
    }

    try {
        setupExternalFilters();
        await loadTableData();
        if (tableContainer) tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        if (tableContainer) tableContainer.style.display = 'block';
        showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');
    }
}

initialize();