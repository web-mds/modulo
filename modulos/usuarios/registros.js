
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, updateEmail, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const registrosTableBody = document.querySelector('#registros-table tbody');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
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
let editingRecord = null;

// Función para simular porcentaje de progreso
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

// Función para formatear la fecha (de YYYY-MM-DD a DD-MM-YYYY)
function formatDateString(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
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
    const querySnapshot = await getDocs(query(collection(db, 'usuarios'), orderBy('customId', 'desc')));
    let lastId = 0;
    if (!querySnapshot.empty) {
        const lastDoc = querySnapshot.docs[0].data();
        lastId = lastDoc.customId ? parseInt(lastDoc.customId, 10) : 0;
    }
    return String(lastId + 1).padStart(3, '0');
}

// Función para verificar si el nombre de usuario ya existe
async function isUsernameTaken(nombreUsuario, excludeDocId = null) {
    const q = query(collection(db, 'usuarios'), where('nombreUsuario', '==', nombreUsuario.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (excludeDocId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeDocId);
    }
    return !querySnapshot.empty;
}

// Registrar usuario
registrarBtn.addEventListener('click', async () => {
    const nombreCompleto = document.getElementById('nombre-completo').value;
    const rut = document.getElementById('rut').value;
    const correo = document.getElementById('correo').value;
    const identidad = document.getElementById('identidad').value;
    const nombreUsuario = document.getElementById('nombre-usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const rol = document.getElementById('rol').value;
    const fechaNacimiento = document.getElementById('fecha-nacimiento').value;

    if (!nombreCompleto || !rut || !correo || !identidad || !nombreUsuario || !contrasena || !rol || !fechaNacimiento) {
        showMessage('Por favor, complete todos los campos.', 'error');
        return;
    }

    const usernameTaken = await isUsernameTaken(nombreUsuario);
    if (usernameTaken) {
        showMessage(`El nombre de usuario "${nombreUsuario}" ya está registrado.`, 'error');
        return;
    }

    registerModal.style.display = 'flex';
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Registrando... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));
        const customId = await getNextId();
        const userCredential = await createUserWithEmailAndPassword(auth, correo, contrasena);
        const user = userCredential.user;

        await addDoc(collection(db, 'usuarios'), {
            uid: user.uid,
            customId,
            nombreCompleto,
            rut,
            correo,
            identidad,
            nombreUsuario: nombreUsuario.toLowerCase(),
            contrasena,
            rol,
            fechaNacimiento,
            createdAt: new Date()
        });

        registerModal.style.display = 'none';
        showMessage(`Se ha registrado exitosamente a ${nombreCompleto} con el usuario ${nombreUsuario}`, 'success');

        document.querySelectorAll('.form-group input, .form-group select').forEach(input => input.value = '');
        await loadTableData();
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        registerModal.style.display = 'none';
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Cargar datos en la tabla
async function loadTableData() {
    allRecords = [];
    registrosTableBody.innerHTML = '';

    try {
        const querySnapshot = await getDocs(query(collection(db, 'usuarios'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                id: data.customId || doc.id,
                docId: doc.id,
                ...data
            };
            allRecords.push(record);
        });

        if (allRecords.length === 0) {
            registrosTableBody.innerHTML = '<tr><td colspan="11">No hay usuarios registrados.</td></tr>';
            return;
        }

        const totalPages = Math.ceil(allRecords.length / recordsPerPage);
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        totalRecords.textContent = `Total de registros: ${allRecords.length}`;

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        const pageRecords = allRecords.slice(start, end);

        pageRecords.forEach(record => {
            const row = document.createElement('tr');
            const iconClass = {
                hombre: 'fa-male',
                mujer: 'fa-female',
                otro: 'fa-genderless'
            }[record.identidad] || 'fa-genderless';

            const fechaNacimiento = formatDateString(record.fechaNacimiento);

            row.innerHTML = `
                <td>${record.id}</td>
                <td>
                    <i class="fas fa-edit action-icon" title="Editar"></i>
                    <i class="fas fa-trash action-icon" title="Eliminar"></i>
                </td>
                <td>${record.nombreCompleto || ''}</td>
                <td>${record.rut || ''}</td>
                <td>${record.correo || ''}</td>
                <td>${record.identidad || ''}</td>
                <td><i class="fas ${iconClass}"></i></td>
                <td>${record.nombreUsuario || ''}</td>
                <td>${record.contrasena || ''}</td>
                <td>${record.rol || ''}</td>
                <td>${fechaNacimiento}</td>
            `;
            row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));
            registrosTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error al cargar datos desde Firestore:', error);
        registrosTableBody.innerHTML = `<tr><td colspan="11">Error al cargar datos: ${error.message}</td></tr>`;
    }
}

// Abrir modal de edición
function openEditModal(record) {
    editingRecord = record;
    document.getElementById('edit-nombre-completo').value = record.nombreCompleto || '';
    document.getElementById('edit-rut').value = record.rut || '';
    document.getElementById('edit-correo').value = record.correo || '';
    document.getElementById('edit-identidad').value = record.identidad || 'otro';
    document.getElementById('edit-nombre-usuario').value = record.nombreUsuario || '';
    document.getElementById('edit-contrasena').value = '';
    document.getElementById('edit-rol').value = record.rol || 'colaborador';
    document.getElementById('edit-fecha-nacimiento').value = record.fechaNacimiento || '';
    editModal.style.display = 'flex';
}

// Guardar cambios
saveEditBtn.addEventListener('click', async () => {
    const nombreCompleto = document.getElementById('edit-nombre-completo').value;
    const rut = document.getElementById('edit-rut').value;
    const correo = document.getElementById('edit-correo').value;
    const identidad = document.getElementById('edit-identidad').value;
    const nombreUsuario = document.getElementById('edit-nombre-usuario').value;
    const contrasena = document.getElementById('edit-contrasena').value;
    const rol = document.getElementById('edit-rol').value;
    const fechaNacimiento = document.getElementById('edit-fecha-nacimiento').value;

    if (!nombreCompleto || !rut || !correo || !identidad || !nombreUsuario || !rol || !fechaNacimiento) {
        showMessage('Por favor, complete todos los campos requeridos.', 'error');
        return;
    }

    if (nombreUsuario.toLowerCase() !== editingRecord.nombreUsuario) {
        const usernameTaken = await isUsernameTaken(nombreUsuario, editingRecord.docId);
        if (usernameTaken) {
            showMessage(`El nombre de usuario "${nombreUsuario}" ya está registrado.`, 'error');
            return;
        }
    }

    // Mostrar spinner y ocultar edit-modal
    registerModal.style.display = 'flex';
    editModal.style.display = 'none'; // Ocultar el modal de edición
    registerProgress.textContent = '0%';
    const spinnerText = document.querySelector('.spinner-text');
    if (spinnerText) spinnerText.textContent = `Guardando cambios... ${registerProgress.textContent}`;

    try {
        await new Promise(resolve => simulateProgress(registerProgress, resolve));

        const updatedData = {
            nombreCompleto,
            rut,
            correo,
            identidad,
            nombreUsuario: nombreUsuario.toLowerCase(),
            rol,
            fechaNacimiento,
            updatedAt: new Date()
        };

        if (contrasena) {
            updatedData.contrasena = contrasena;
        }

        const userDocRef = doc(db, 'usuarios', editingRecord.docId);
        await updateDoc(userDocRef, updatedData);

        if (correo !== editingRecord.correo) {
            try {
                await signInWithEmailAndPassword(auth, editingRecord.correo, editingRecord.contrasena);
                const user = auth.currentUser;
                await updateEmail(user, correo);
            } catch (authError) {
                throw new Error('Error al actualizar el correo en Authentication: ' + authError.message);
            }
        }

        registerModal.style.display = 'none';
        showMessage(`Se ha actualizado exitosamente a ${nombreCompleto}.`, 'success');
        await loadTableData();
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        registerModal.style.display = 'none';
        editModal.style.display = 'flex'; // Mostrar nuevamente el edit-modal en caso de error
        showMessage(`Error: ${error.message}`, 'error');
    }
});

// Cerrar modal de edición
cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    editingRecord = null;
});

// Paginación
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadTableData();
    }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(allRecords.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        loadTableData();
    }
});

// Verificar autenticación y cargar datos iniciales
async function initialize() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showMessage('Debe iniciar sesión para acceder a este módulo.', 'error');
            setTimeout(() => window.location.href = 'login.html', 3000);
            return;
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
            registrosTableBody.innerHTML = `<tr><td colspan="11">Error al inicializar: ${error.message}</td></tr>`;
        }
    });
}

initialize();
