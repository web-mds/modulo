import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCoJyXiv95_P6Bk9iV892n8FnSNlGEBPDc",
    authDomain: "usuarios-202ed.firebaseapp.com",
    projectId: "usuarios-202ed",
    storageBucket: "usuarios-202ed.firebasestorage.app",
    messagingSenderId: "502953175",
    appId: "1:502953175:web:8eec7ccfa1ca21df09ec92",
    measurementId: "G-YW9XE5PVEV"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const registrarBtn = document.getElementById('registrar-btn');
const areasClinicasTableBody = document.querySelector('#areas-clinicas-table tbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const exportExcelBtn = document.getElementById('export-excel-btn');
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

let currentPage = 1;
const recordsPerPage = 10;
let allRecords = [];
let filteredRecords = [];
let editingRecord = null;
let activeFilters = {};
let activeFilterInputs = {};
let currentUser = null;

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

// Función para simular porcentaje de progreso (incremento de 10% cada 50ms)
function simulateProgress(progressElement, callback) {
    let progress = 0;
    const increment = 10; // Incremento de 10%
    const interval = 50; // 50ms por incremento

    function updateProgress() {
        progress += increment;
        if (progress > 100) {
            progress = 100;
        }
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

    // Iniciar la actualización
    requestAnimationFrame(() => setTimeout(updateProgress, interval));
}

// Función para obtener la fecha local en formato YYYY-MM-DD
function getLocalDate() {
    const d = new Date();
    // Ajustar explícitamente a la zona horaria local
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    return dateString;
}

// Función para formatear la fecha (de YYYY-MM-DD a DD-MM-YYYY)
function formatDateString(date) {
    if (!date) return '';
    // Dividir la fecha en partes para evitar problemas de zona horaria
    const [year, month, day] = date.split('-').map(Number);
    // Crear una fecha local explícitamente
    const d = new Date(year, month - 1, day);
    const formattedDay = String(d.getDate()).padStart(2, '0');
    const formattedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const formattedYear = d.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
}

// Función para mostrar mensajes de éxito o error
function showMessage(message, type) {
    successMessage.textContent = message;
    successModal.classList.remove('success', 'error');
    successModal.classList.add(type);
    if (successIcon) {
        successIcon.className = `fas fa-${type === 'success' ? 'check-circle' : 'times-circle'}`;
    }
    successModal.style.display = 'flex';
    setTimeout(() => {
        successModal.style.display = 'none';
    }, 3000);
}

// Función para obtener el siguiente ID secuencial
async function getNextId() {
    const querySnapshot = await getDocs(query(collection(db, 'areasClinicas'), orderBy('customId', 'desc')));
    let lastId = 0;
    if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[0].data();
        lastId = lastDoc.customId ? parseInt(lastDoc.customId, 10) : 0;
    }
    return String(lastId + 1).padStart(3, '0');
}

// Función para verificar si el nombre del área clínica ya existe (case-insensitive)
async function isNombreTaken(nombreAreaClinica, excludeDocId = null) {
    const q = query(collection(db, 'areasClinicas'), where('nombreAreaClinicaLower', '==', nombreAreaClinica.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId);
    }
    return !querySnapshot.empty;
}

// Registrar área clínica
registrarBtn.addEventListener('click', async () => {
    const nombreAreaClinica = document.getElementById('nombre-area-clinica').value.trim();
    const userName = currentUser ? currentUser.nombreCompleto : 'Usuario';
    const fechaCreacion = getLocalDate();

    if (!nombreAreaClinica) {
        showMessage('Por favor, ingrese el nombre del área clínica.', 'error');
        return;
    }

    const nombreTaken = await isNombreTaken(nombreAreaClinica);
    if (nombreTaken) {
        showMessage(`El área clínica "${nombreAreaClinica}" ya está registrada.`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));
        const customId = await getNextId();

        await addDoc(collection(db, 'areasClinicas'), {
            customId,
            nombreAreaClinicaDisplay: nombreAreaClinica,
            nombreAreaClinicaLower: nombreAreaClinica.toLowerCase(),
            fechaCreacion,
            usuario: userName,
            createdAt: new Date()
        });

        registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente el área clínica ${nombreAreaClinica}.`, 'success');

        document.querySelectorAll('.form-group input').forEach(input => input.value = '');
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar área clínica:', error);
        registerModal.style.display = 'none';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Función para exportar a Excel
async function exportToExcel() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();

        const data = filteredRecords.map(record => ({
            ID: record.id,
            'Área Clínica': record.nombreAreaClinicaDisplay || '',
            'Fecha de Creación': formatDateString(record.fechaCreacion),
            Usuario: record.usuario || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 10 },
            { wch: 30 },
            { wch: 15 },
            { wch: 20 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'AreasClinicas');
        XLSX.writeFile(workbook, 'areas-clinicas.xlsx');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showMessage('Error al exportar el archivo Excel.', 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', exportToExcel);
}

function applyFilters() {
    filteredRecords = allRecords.filter(record => {
        return Object.keys(activeFilters).every(column => {
            const filterValue = activeFilters[column].toLowerCase();
            let cellValue = '';
            if (column === 'id') cellValue = record.id || '';
            else if (column === 'nombreAreaClinica') cellValue = record.nombreAreaClinicaDisplay || '';
            else if (column === 'fechaCreacion') cellValue = formatDateString(record.fechaCreacion) || '';
            else if (column === 'usuario') cellValue = record.usuario || '';
            return cellValue.toLowerCase().includes(filterValue);
        });
    });
    currentPage = 1;
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

async function loadTableData() {
    allRecords = [];
    filteredRecords = [];
    areasClinicasTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        const querySnapshot = await getDocs(query(collection(db, 'areasClinicas'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                id: data.customId || doc.id,
                docId: doc.id,
                nombreAreaClinicaDisplay: data.nombreAreaClinicaDisplay,
                nombreAreaClinicaLower: data.nombreAreaClinicaLower,
                fechaCreacion: data.fechaCreacion,
                usuario: data.usuario,
                createdAt: data.createdAt
            };
            allRecords.push(record);
        });

        filteredRecords = [...allRecords];

        if (allRecords.length === 0) {
            areasClinicasTableBody.innerHTML = '<tr><td colspan="5">No hay áreas clínicas registradas.</td></tr>';
            return;
        }

        handleFilterIcons();
        renderTable();
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        areasClinicasTableBody.innerHTML = `<tr><td colspan="5">Error al cargar datos: ${error.message}</td></tr>`;
    }
}

function renderTable() {
    areasClinicasTableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        areasClinicasTableBody.innerHTML = '<tr><td colspan="5">No hay áreas clínicas que coincidan con los filtros.</td></tr>';
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

    pageRecords.forEach(record => {
        const row = document.createElement('tr');
        const fechaCreacion = formatDateString(record.fechaCreacion);

        row.innerHTML = `
            <td>${record.id}</td>
            <td>
                <i class="fas fa-edit action-icon" title="Editar"></i>
                <i class="fas fa-trash action-icon" title="Eliminar"></i>
                <i class="fas fa-eye action-icon" title="Visualizar"></i>
            </td>
            <td>${record.nombreAreaClinicaDisplay || ''}</td>
            <td>${fechaCreacion}</td>
            <td>${record.usuario || ''}</td>
        `;
        row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));
        row.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(record));
        areasClinicasTableBody.appendChild(row);
    });

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

function openEditModal(record) {
    editingRecord = record;
    document.getElementById('edit-nombre-area-clinica').value = record.nombreAreaClinicaDisplay || '';
    editModal.style.display = 'flex';
}

saveEditBtn.addEventListener('click', async () => {
    const nombreAreaClinica = document.getElementById('edit-nombre-area-clinica').value.trim();

    if (!nombreAreaClinica) {
        showMessage('Por favor, ingrese el nombre del área clínica.', 'error');
        return;
    }

    if (nombreAreaClinica.toLowerCase() !== editingRecord.nombreAreaClinicaLower) {
        const nombreTaken = await isNombreTaken(nombreAreaClinica, editingRecord.docId);
        if (nombreTaken) {
            showMessage(`El área clínica "${nombreAreaClinica}" ya está registrada.`, 'error');
            return;
        }
    }

    registerModal.style.display = 'flex';
    editModal.style.display = 'none';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Guardando cambios... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));

        const updatedData = {
            nombreAreaClinicaDisplay: nombreAreaClinica,
            nombreAreaClinicaLower: nombreAreaClinica.toLowerCase(),
            updatedAt: new Date()
        };

        const areaClinicaDocRef = doc(db, 'areasClinicas', editingRecord.docId);
        await updateDoc(areaClinicaDocRef, updatedData);

        registerModal.style.display = 'none';
        showMessage(`Se ha actualizado exitosamente el área clínica ${nombreAreaClinica}.`, 'success');
        await loadTableData();
    } catch (error) {
        console.error('Error al actualizar área clínica:', error);
        registerModal.style.display = 'none';
        editModal.style.display = 'flex';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    editingRecord = null;
});

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

async function openDeleteModal(record) {
    const deleteMessage = document.getElementById('delete-message');
    deleteMessage.textContent = `¿Desea eliminar el área clínica ${record.nombreAreaClinicaDisplay}?`;
    document.getElementById('delete-modal').style.display = 'flex';

    document.getElementById('confirm-delete-btn').onclick = async () => {
        try {
            registerModal.style.display = 'flex';
            registerProgress.textContent = '0%';
            const spinnerText = document.querySelector('.spinner-text');
            if (spinnerText) spinnerText.textContent = `Eliminando... ${registerProgress.textContent}`;

            await new Promise(resolve => simulateProgress(registerProgress, resolve));
            await deleteDoc(doc(db, 'areasClinicas', record.docId));

            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Se ha eliminado el área clínica ${record.nombreAreaClinicaDisplay}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al eliminar área clínica:', error);
            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Error: ${error.message}`, 'error');
        }
    };

    document.getElementById('cancel-delete-btn').onclick = () => {
        document.getElementById('delete-modal').style.display = 'none';
    };
}

async function initialize() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showMessage('Debe iniciar sesión para acceder a este módulo.', 'error');
            setTimeout(() => window.location.href = 'login.html', 3000);
            return;
        }

        const q = query(collection(db, 'usuarios'), where('correo', '==', user.email));
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
            await new Promise(resolve => simulateProgress(loadingProgress, resolve));
            await loadTableData();
            loadingModal.style.display = 'none';
            tableContainer.style.display = 'block';
        } catch (error) {
            console.error('Error en initialize:', error);
            loadingModal.style.display = 'none';
            areasClinicasTableBody.innerHTML = `<tr><td colspan="5">Error al inicializar: ${error.message}</td></tr>`;
        }
    });
}

initialize();