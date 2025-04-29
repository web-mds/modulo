import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfigUsuarios = {
    apiKey: "AIzaSyCoJyXiv95_P6Bk9iV892n8FnSNlGEBPDc",
    authDomain: "usuarios-202ed.firebaseapp.com",
    projectId: "usuarios-202ed",
    storageBucket: "usuarios-202ed.firebasestorage.app",
    messagingSenderId: "502953175",
    appId: "1:502953175:web:8eec7ccfa1ca21df09ec92",
    measurementId: "G-YW9XE5PVEV"
};

const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");
const authUsuarios = getAuth(appUsuarios);
const dbUsuarios = getFirestore(appUsuarios);

const registrarBtn = document.getElementById('registrar-btn');
const empresasTableBody = document.querySelector('#empresas-table tbody');
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
const recordsPerPage = 50;
let allRecords = [];
let filteredRecords = [];
let editingRecord = null;
let activeFilters = {};
let activeFilterInputs = {};

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
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            callback();
        }
        progressElement.textContent = `${Math.floor(progress)}%`;
    }, 100);
}

function formatDateString(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

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
    }, 1000);
}

async function getNextId() {
    const querySnapshot = await getDocs(query(collection(dbUsuarios, 'empresas'), orderBy('customId', 'desc')));
    let lastId = 0;
    if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[0].data();
        lastId = lastDoc.customId ? parseInt(lastDoc.customId, 10) : 0;
    }
    return String(lastId + 1).padStart(3, '0');
}

async function isRutTaken(rutEmpresa, excludeDocId = null) {
    const q = query(collection(dbUsuarios, 'empresas'), where('rutEmpresa', '==', rutEmpresa));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId && doc.data().rutEmpresa === rutEmpresa);
    }
    return querySnapshot.docs.some(doc => doc.data().rutEmpresa === rutEmpresa);
}

async function isNombreTaken(nombreEmpresa, excludeDocId = null) {
    const q = query(collection(dbUsuarios, 'empresas'), where('nombreEmpresa', '==', nombreEmpresa));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId && doc.data().nombreEmpresa === nombreEmpresa);
    }
    return querySnapshot.docs.some(doc => doc.data().nombreEmpresa === nombreEmpresa);
}

registrarBtn.addEventListener('click', async () => {
    const nombreEmpresa = document.getElementById('nombre-empresa').value.trim();
    const rutEmpresa = document.getElementById('rut-empresa').value.trim();
    const userName = document.getElementById('userName')?.textContent || 'Usuario';
    const fechaCreacion = new Date().toISOString().split('T')[0];

    if (!nombreEmpresa || !rutEmpresa) {
        showMessage('Por favor, complete todos los campos.', 'error');
        return;
    }

    const rutTaken = await isRutTaken(rutEmpresa);
    if (rutTaken) {
        showMessage(`El RUT "${rutEmpresa}" ya está registrado.`, 'error');
        return;
    }

    const nombreTaken = await isNombreTaken(nombreEmpresa);
    if (nombreTaken) {
        showMessage(`El nombre de empresa "${nombreEmpresa}" ya está registrado.`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));
        const customId = await getNextId();

        await addDoc(collection(dbUsuarios, 'empresas'), {
            customId,
            nombreEmpresa,
            rutEmpresa,
            fechaCreacion,
            usuario: userName,
            createdAt: new Date()
        });

        registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente la empresa ${nombreEmpresa}`, 'success');

        document.querySelectorAll('.form-group input').forEach(input => input.value = '');
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar empresa:', error);
        registerModal.style.display = 'none';
        showMessage(`Error: ${error.message}`, 'error');
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
            ID: record.id,
            'Nombre de la Empresa': record.nombreEmpresa || '',
            'RUT de la Empresa': record.rutEmpresa || '',
            'Fecha de Creación': formatDateString(record.fechaCreacion),
            Usuario: record.usuario || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        
        worksheet['!cols'] = [
            { wch: 10 },  // ID
            { wch: 30 },  // Nombre de la Empresa
            { wch: 15 },  // RUT de la Empresa
            { wch: 15 },  // Fecha de Creación
            { wch: 20 }   // Usuario
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

        XLSX.writeFile(workbook, 'empresas.xlsx');
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
            else if (column === 'nombreEmpresa') cellValue = record.nombreEmpresa || '';
            else if (column === 'rutEmpresa') cellValue = record.rutEmpresa || '';
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

    if (!th.contains(container)) {
        console.error(`Failed to append filter input container to th for column: ${column}`);
    }

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
            if (column === 'acciones') {
                return;
            }
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
    empresasTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        const querySnapshot = await getDocs(query(collection(dbUsuarios, 'empresas'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                id: data.customId || doc.id,
                docId: doc.id,
                ...data
            };
            allRecords.push(record);
        });

        filteredRecords = [...allRecords];

        if (allRecords.length === 0) {
            empresasTableBody.innerHTML = '<tr><td colspan="6">No hay empresas registradas.</td></tr>';
            return;
        }

        handleFilterIcons();
        renderTable();
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        empresasTableBody.innerHTML = `<tr><td colspan="6">Error al cargar datos: ${error.message}</td></tr>`;
    }
}

function renderTable() {
    empresasTableBody.innerHTML = '';

    if (filteredRecords.length === 0) {
        empresasTableBody.innerHTML = '<tr><td colspan="6">No hay empresas que coincidan con los filtros.</td></tr>';
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
                <i class="fas fa-eye action-icon" title="Visualizar/Contactos"></i>
            </td>
            <td>${record.nombreEmpresa || ''}</td>
            <td>${record.rutEmpresa || ''}</td>
            <td>${fechaCreacion}</td>
            <td>${record.usuario || ''}</td>
        `;
        row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));
        row.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(record));
        empresasTableBody.appendChild(row);
    });

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

function openEditModal(record) {
    editingRecord = record;
    document.getElementById('edit-nombre-empresa').value = record.nombreEmpresa || '';
    document.getElementById('edit-rut-empresa').value = record.rutEmpresa || '';
    editModal.style.display = 'flex';
}

saveEditBtn.addEventListener('click', async () => {
    const nombreEmpresa = document.getElementById('edit-nombre-empresa').value.trim();
    const rutEmpresa = document.getElementById('edit-rut-empresa').value.trim();

    if (!nombreEmpresa || !rutEmpresa) {
        showMessage('Por favor, complete todos los campos requeridos.', 'error');
        return;
    }

    if (nombreEmpresa !== editingRecord.nombreEmpresa) {
        const nombreTaken = await isNombreTaken(nombreEmpresa, editingRecord.docId);
        if (nombreTaken) {
            showMessage(`El nombre de empresa "${nombreEmpresa}" ya está registrado.`, 'error');
            return;
        }
    }

    if (rutEmpresa !== editingRecord.rutEmpresa) {
        const rutTaken = await isRutTaken(rutEmpresa, editingRecord.docId);
        if (rutTaken) {
            showMessage(`El RUT "${rutEmpresa}" ya está registrado.`, 'error');
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
            nombreEmpresa,
            rutEmpresa,
            updatedAt: new Date()
        };

        const empresaDocRef = doc(dbUsuarios, 'empresas', editingRecord.docId);
        await updateDoc(empresaDocRef, updatedData);

        registerModal.style.display = 'none';
        showMessage(`Se ha actualizado exitosamente la empresa ${nombreEmpresa}.`, 'success');
        await loadTableData();
    } catch (error) {
        console.error('Error al actualizar empresa:', error);
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
        setTimeout(() => window.location.href = 'login.html', 1000);
        return;
    }

    console.log('Usuario autenticado:', user.email);

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
        empresasTableBody.innerHTML = `<tr><td colspan="6">Error al inicializar: ${error.message}</td></tr>`;
    }
}

async function openDeleteModal(record) {
    const deleteMessage = document.getElementById('delete-message');
    deleteMessage.textContent = `¿Desea eliminar la empresa ${record.nombreEmpresa} con RUT ${record.rutEmpresa}?`;
    document.getElementById('delete-modal').style.display = 'flex';

    document.getElementById('confirm-delete-btn').onclick = async () => {
        try {
            registerModal.style.display = 'flex';
            registerProgress.textContent = '0%';
            const spinnerText = document.querySelector('.spinner-text');
            if (spinnerText) spinnerText.textContent = `Eliminando... ${registerProgress.textContent}`;

            await new Promise(resolve => simulateProgress(registerProgress, resolve));
            await deleteDoc(doc(dbUsuarios, 'empresas', record.docId));

            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Se ha eliminado la empresa ${record.nombreEmpresa}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al eliminar empresa:', error);
            registerModal.style.display = 'none';
            document.getElementById('delete-modal').style.display = 'none';
            showMessage(`Error: ${error.message}`, 'error');
        }
    };

    document.getElementById('cancel-delete-btn').onclick = () => {
        document.getElementById('delete-modal').style.display = 'none';
    };
}

initialize();