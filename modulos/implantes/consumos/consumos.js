import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc, deleteDoc, writeBatch, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Configuración de Firebase para "consumos"
const firebaseConfigConsumos = {
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
const appConsumos = initializeApp(firebaseConfigConsumos, "consumosApp");
const appUsuarios = initializeApp(firebaseConfigUsuarios, "usuariosApp");

const authUsuarios = getAuth(appUsuarios);
const dbConsumos = getFirestore(appConsumos);
const dbUsuarios = getFirestore(appUsuarios);
const dbPacientes = getFirestore(appConsumos);

// Elementos del DOM
const ingresarBtn = document.getElementById('ingresar-btn');
const limpiarBtn = document.getElementById('limpiar-btn');
const consumosTableBody = document.querySelector('#consumos-table tbody');
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
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const deleteMessage = document.getElementById('delete-message');
const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const filterStatus = document.getElementById('filter-status');
const admisionInput = document.getElementById('admision');
const cotizacionInput = document.getElementById('cotizacion');
const referenciaInput = document.getElementById('referencia');
const cantidadInput = document.getElementById('cantidad');
const textPrevision = document.getElementById('text-prevision');
const textPaciente = document.getElementById('text-paciente');
const textMedico = document.getElementById('text-medico');
const textFechaCx = document.getElementById('text-fecha-cx');
const textProveedor = document.getElementById('text-proveedor');
const textCodigo = document.getElementById('text-codigo');
const textDescripcion = document.getElementById('text-descripcion');
const textCantidad = document.getElementById('text-cantidad');
const textAgrupacion = document.getElementById('text-agrupacion');

// Variables globales
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
    1: 100,  // Estado
    2: 100,  // ID
    3: 100,  // Código
    4: 100,  // Cantidad
    5: 50,  // Venta
    6: 100,  // Referencia
    7: 100,  // Precio
    8: 100,  // N° Cotización
    9: 120,  // Total Cotización
    10: 120, // Total Paciente
    11: 120, // Coincidencia
    12: 100, // Previsión
    13: 100, // Admisión
    14: 200, // Nombre del Paciente
    15: 150, // Médico
    16: 120, // Fecha de Cx
    17: 150, // Proveedor
    18: 100, // Código
    19: 200, // Descripción
    20: 100, // Cantidad
    21: 100, // Precio Sistema
    22: 100, // Agrupación
    23: 120, // Total Item
    24: 120, // Adm/Proveedor
    25: 100, // Margen
    26: 150  // Usuario
};

// Meses y días para filtros
const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const days = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

// Lista de estados posibles
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



// Convertir precio de cadena a número
function parsePriceString(priceStr) {
    if (typeof priceStr !== 'string') return Number(priceStr) || 0;
    return parseFloat(priceStr.replace(/\./g, '')) || 0;
}

// Calcular venta basado en clasificacion
function calculateVenta(totalItem, clasificacion, margen) {
    const total = Number(totalItem) || 0;
    if (clasificacion === 'Consignación') {
        const margenDecimal = parseFloat(margen.replace('%', '')) / 100;
        return total + (total * margenDecimal);
    } else if (clasificacion === 'Cotización') {
        return total * 1.3; // Total Item + (Total Item * 30%)
    }
    return 0;
}

// Sincronizar totalCotizacion desde pacientes basado en admProveedor y admisionEmpresa
async function syncTotalCotizacionFromPacientes() {
    try {
        const consumosSnapshot = await getDocs(query(collection(dbConsumos, 'consumos')));
        const batch = writeBatch(dbConsumos);
        let updateCount = 0;

        for (const consumoDoc of consumosSnapshot.docs) {
            const consumo = consumoDoc.data();
            if (!consumo.admProveedor) continue;

            const q = query(
                collection(dbPacientes, 'pacientes'),
                where('admisionEmpresa', '==', consumo.admProveedor),
                orderBy('createdAt', 'desc')
            );
            const pacientesSnapshot = await getDocs(q);

            if (!pacientesSnapshot.empty) {
                const paciente = pacientesSnapshot.docs[0].data();
                const totalCotizacionStr = String(paciente.totalCotizacion || '');

                if (consumo.totalCotizacion !== totalCotizacionStr) {
                    batch.update(doc(dbConsumos, 'consumos', consumoDoc.id), { totalCotizacion: totalCotizacionStr });
                    updateCount++;
                }
            } else {
                if (consumo.totalCotizacion !== '') {
                    batch.update(doc(dbConsumos, 'consumos', consumoDoc.id), { totalCotizacion: '' });
                    updateCount++;
                }
            }
        }

        if (updateCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error al sincronizar totalCotización:', error);
        showMessage(`Error al sincronizar totalCotización: ${error.message}`, 'error');
    }
}

// Cargar datos de referencia (empresas, previsiones, médicos)
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
        showMessage(`Error al cargar datos de referencia: ${error.message}`, 'error');
    }
}

// Actualizar Total Paciente basado en la suma de Total Item por Adm/Proveedor
async function updateTotalPaciente() {
    try {
        // Obtener todos los consumos
        const consumosSnapshot = await getDocs(query(collection(dbConsumos, 'consumos')));
        const consumos = consumosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Agrupar por admProveedor y sumar totalItem
        const groupedByAdmProveedor = consumos.reduce((acc, consumo) => {
            const key = consumo.admProveedor || '';
            if (!acc[key]) {
                acc[key] = { records: [], totalItemSum: 0 };
            }
            acc[key].records.push({ id: consumo.id, totalItem: Number(consumo.totalItem) || 0 });
            acc[key].totalItemSum += Number(consumo.totalItem) || 0;
            return acc;
        }, {});

        // Actualizar totalPaciente en Firestore
        const batch = writeBatch(dbConsumos);
        let updateCount = 0;

        Object.values(groupedByAdmProveedor).forEach(group => {
            const totalPacienteStr = group.totalItemSum.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            group.records.forEach(record => {
                const consumoRef = doc(dbConsumos, 'consumos', record.id);
                batch.update(consumoRef, { totalPaciente: totalPacienteStr });
                updateCount++;
            });
        });

        if (updateCount > 0) {
            await batch.commit();
    
        }
    } catch (error) {
        console.error('Error al actualizar totalPaciente:', error);
        showMessage(`Error al actualizar Total Paciente: ${error.message}`, 'error');
    }
}

// Nueva función para actualizar el campo Coincidencia
async function updateCoincidencia() {
    try {
        const consumosSnapshot = await getDocs(query(collection(dbConsumos, 'consumos')));
        const batch = writeBatch(dbConsumos);
        let updateCount = 0;

        for (const consumoDoc of consumosSnapshot.docs) {
            const consumo = consumoDoc.data();
            const totalCotizacion = consumo.totalCotizacion ? parsePriceString(consumo.totalCotizacion) : 0;
            const totalPaciente = consumo.totalPaciente ? parsePriceString(consumo.totalPaciente) : 0;
            const coincidencia = totalCotizacion === totalPaciente && totalCotizacion !== 0 ? '✓' : 'X';

            if (consumo.coincidencia !== coincidencia) {
                batch.update(doc(dbConsumos, 'consumos', consumoDoc.id), { coincidencia });
                updateCount++;
            }
        }

        if (updateCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error('Error al actualizar coincidencia:', error);
        showMessage(`Error al actualizar Coincidencia: ${error.message}`, 'error');
    }
}

// Cargar SheetJS dinámicamente
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

// Simular progreso
function simulateProgress(progressElement, callback) {
    let progress = 0;
    const increment = 10;
    const interval = 50;

    function updateProgress() {
        progress += increment;
        if (progress > 100) progress = 100;
        progressElement.textContent = `${Math.floor(progress)}%`;
        const spinnerText = document.querySelector('.spinner-text');
        if (spinnerText && spinnerText.textContent) {
            const baseText = spinnerText.textContent.split('...')[0] || 'Procesando';
            spinnerText.textContent = `${baseText}... ${progressElement.textContent}`;
        }
        if (progress < 100) {
            requestAnimationFrame(() => setTimeout(updateProgress, interval));
        } else {
            callback();
        }
    }

    requestAnimationFrame(() => setTimeout(updateProgress, interval));
}

// Obtener fecha local en formato YYYY-MM-DD
function getLocalDate() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatear fecha a DD-MM-YYYY
function formatDateString(date) {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const formattedDay = String(d.getDate()).padStart(2, '0');
    const formattedMonth = String(d.getMonth() + 1).padStart(2, '0');
    const formattedYear = d.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
}

// Convertir fecha de DD-MM-YYYY a YYYY-MM-DD
function parseDateToFirestoreFormat(dateStr) {
    if (!dateStr || !/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return '';
    const [day, month, year] = dateStr.split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Obtener detalles de la fecha
function getDateDetails(date) {
    if (!date) return { dia: '', semana: '', mes: '', año: '' };
    const d = new Date(date);
    const dia = days[d.getDay()];
    const semana = Math.ceil((d.getDate() + ((7 - d.getDay()) % 7)) / 7);
    const mes = d.getMonth();
    const año = d.getFullYear();
    return { dia, semana, mes, año };
}

// Calcular margen basado en precioNeto
function calculateMargin(precioNeto) {
    const price = parsePriceString(precioNeto);
    if (price < 301) return "500%";
    if (price < 1001) return "400%";
    if (price < 5001) return "300%";
    if (price < 10001) return "250%";
    if (price < 25001) return "200%";
    if (price < 50001) return "160%";
    if (price < 100001) return "140%";
    if (price < 200001) return "80%";
    if (price < 10000000) return "50%";
    return "50%";
}

// Mostrar mensajes
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

// Obtener valores únicos para filtros
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

// Actualizar filtros externos
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

// Actualizar campos de texto
function updateTextFields(record) {
    if ('prevision' in record) textPrevision.textContent = record.prevision || '';
    if ('paciente' in record) textPaciente.textContent = record.paciente || '';
    if ('medico' in record) textMedico.textContent = record.medico || '';
    if ('fechaCx' in record) textFechaCx.textContent = formatDateString(record.fechaCx) || '';
    if ('proveedor' in record) textProveedor.textContent = record.proveedor || '';
    if ('codigo' in record) textCodigo.textContent = record.codigo || '';
    if ('descripcion' in record) textDescripcion.textContent = record.descripcion || '';
    if ('precioNeto' in record) textCantidad.textContent = record.precioNeto || '';
    if ('clasificacion' in record) textAgrupacion.textContent = record.clasificacion || '';
}

// Configurar búsqueda en tiempo real para el campo admision
function setupAdmisionSearch() {
    if (!admisionInput) return;

    admisionInput.addEventListener('input', async () => {
        const admisionValue = admisionInput.value.trim();
        if (!admisionValue) {
            updateTextFields({ prevision: '', paciente: '', medico: '', fechaCx: '' });
            return;
        }

        try {
            const q = query(collection(dbPacientes, 'pacientes'), where('admision', '==', admisionValue));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const patientData = querySnapshot.docs[0].data();
                updateTextFields({
                    prevision: patientData.prevision || '',
                    paciente: patientData.nombrePaciente || '',
                    medico: patientData.medico || '',
                    fechaCx: patientData.fechaCirugia || ''
                });
            } else {
                updateTextFields({ prevision: '', paciente: '', medico: '', fechaCx: '' });
            }
        } catch (error) {
            console.error('Error al buscar paciente:', error);
            showMessage(`Error al buscar paciente: ${error.message}`, 'error');
            updateTextFields({ prevision: '', paciente: '', medico: '', fechaCx: '' });
        }
    });
}

// Configurar búsqueda en tiempo real para el campo referencia
function setupReferenciaSearch() {
    if (!referenciaInput) return;

    referenciaInput.addEventListener('input', async () => {
        const referenciaValue = referenciaInput.value.trim();
        if (!referenciaValue) {
            updateTextFields({ proveedor: '', codigo: '', descripcion: '', precioNeto: '', clasificacion: '' });
            return;
        }

        try {
            const q = query(collection(dbConsumos, 'codigos'), where('referencia', '==', referenciaValue));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const codigoData = querySnapshot.docs[0].data();
                updateTextFields({
                    proveedor: codigoData.proveedor || '',
                    codigo: codigoData.codigo || '',
                    descripcion: codigoData.descripcion || '',
                    precioNeto: codigoData.precioNeto || '',
                    clasificacion: codigoData.clasificacion || ''
                });
            } else {
                updateTextFields({ proveedor: '', codigo: '', descripcion: '', precioNeto: '', clasificacion: '' });
            }
        } catch (error) {
            console.error('Error al buscar código:', error);
            showMessage(`Error al buscar código: ${error.message}`, 'error');
            updateTextFields({ proveedor: '', codigo: '', descripcion: '', precioNeto: '', clasificacion: '' });
        }
    });
}

// Registrar consumo
if (ingresarBtn) {
    ingresarBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showMessage('Debes iniciar sesión para registrar un consumo.', 'error');
            setTimeout(() => window.location.href = 'login.html', 1000);
            return;
        }

        const admision = admisionInput?.value.trim() || '';
        const cotizacion = cotizacionInput?.value.trim() || '';
        const referencia = referenciaInput?.value.trim() || '';
        const cantidad = parseInt(cantidadInput?.value) || 0;
        const fechaIngreso = admision ? getLocalDate() : '';
        const estado = 'Pendiente';
        const { dia, semana, mes, año } = getDateDetails(fechaIngreso);
        const userName = currentUser.nombreCompleto || 'Usuario';

        if (!admision || !cotizacion || !referencia || cantidad <= 0) {
            showMessage('Complete todos los campos obligatorios y asegúrese de que la cantidad sea mayor a 0.', 'error');
            return;
        }

        // Obtener valores de los campos de texto
        const prevision = textPrevision?.textContent?.trim() || '';
        const paciente = textPaciente?.textContent?.trim() || '';
        const medico = textMedico?.textContent?.trim() || '';
        const fechaCxRaw = textFechaCx?.textContent?.trim() || '';
        const fechaCx = parseDateToFirestoreFormat(fechaCxRaw);
        const proveedor = textProveedor?.textContent?.trim() || '';
        const codigo = textCodigo?.textContent?.trim() || '';
        const descripcion = textDescripcion?.textContent?.trim() || '';
        const precioNetoStr = textCantidad?.textContent?.trim() || '';
        const precioNeto = parsePriceString(precioNetoStr);
        const clasificacion = textAgrupacion?.textContent?.trim() || '';

        // Validar que los campos críticos no estén vacíos
        if (!paciente || !medico || !fechaCx || !precioNetoStr) {
            showMessage('Los campos de Nombre del Paciente, Médico, Fecha de Cx y Precio son obligatorios.', 'error');
            return;
        }

/*
// Verificar si ya existe un consumo con el mismo customId (admision)
try {
    const q = query(collection(dbConsumos, 'consumos'), where('customId', '==', admision));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        showMessage(`Ya existe un consumo con la Admisión (ID) ${admision}. Por favor, use un valor único.`, 'error');
        return;
    }
} catch (error) {
    console.error('Error al verificar customId:', error);
    showMessage(`Error al verificar la admisión: ${error.message}`, 'error');
    return;
}
*/

        if (registerModal && registerProgress) {
            registerModal.style.display = 'flex';
            registerProgress.textContent = '0%';
            const spinnerText = document.querySelector('.spinner-text');
            if (spinnerText) spinnerText.textContent = `Ingresando... ${registerProgress.textContent}`;
        }

        try {
            await new Promise(resolve => simulateProgress(registerProgress || { textContent: '' }, resolve));
            const customId = admision;

            const totalItem = cantidad * precioNeto;
            const admProveedor = `${admision}${proveedor}`;
            const margen = calculateMargin(precioNetoStr);
            const venta = calculateVenta(totalItem, clasificacion, margen);

            let totalCotizacionStr = '';
            const q = query(
                collection(dbPacientes, 'pacientes'),
                where('admisionEmpresa', '==', admProveedor),
                orderBy('createdAt', 'desc')
            );
            const pacientesSnapshot = await getDocs(q);
            if (!pacientesSnapshot.empty) {
                totalCotizacionStr = String(pacientesSnapshot.docs[0].data().totalCotizacion || '');
            }

            const newRecord = {
                customId,
                admision,
                cotizacion,
                referencia,
                cantidad,
                prevision,
                paciente,
                medico,
                fechaCx,
                proveedor,
                codigo,
                descripcion,
                precioNeto: precioNetoStr,
                estado,
                fechaIngreso,
                dia,
                semana,
                mes,
                año,
                usuario: userName,
                venta: venta ? Number(venta).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '',
                totalCotizacion: totalCotizacionStr,
                totalPaciente: '',
                coincidencia: '',
                clasificacion,
                totalItem,
                admProveedor,
                margen,
                corporativo: 'Pendiente', // Nuevo campo agregado
                createdAt: new Date()
            };

            await addDoc(collection(dbConsumos, 'consumos'), newRecord);

            // Actualizar totalPaciente y coincidencia después de registrar
            await updateTotalPaciente();
            await updateCoincidencia();

            if (registerModal) registerModal.style.display = 'none';
            showMessage(`Consumo con referencia ${referencia} ingresado exitosamente.`, 'success');

            referenciaInput.value = '';
            cantidadInput.value = '';
            updateTextFields({
                prevision,
                paciente,
                medico,
                fechaCx,
                proveedor: '',
                codigo: '',
                descripcion: '',
                precioNeto: '',
                clasificacion: ''
            });

            await loadTableData();
        } catch (error) {
            console.error('Error al ingresar consumo:', error);
            if (registerModal) registerModal.style.display = 'none';
            showMessage(`Error al ingresar consumo: ${error.message}`, 'error');
        }
    });
}

// Limpiar todos los campos
if (limpiarBtn) {
    limpiarBtn.addEventListener('click', () => {
        if (admisionInput) admisionInput.value = '';
        if (cotizacionInput) cotizacionInput.value = '';
        if (referenciaInput) referenciaInput.value = '';
        if (cantidadInput) cantidadInput.value = '';
        updateTextFields({
            prevision: '',
            paciente: '',
            medico: '',
            fechaCx: '',
            proveedor: '',
            codigo: '',
            descripcion: '',
            precioNeto: '',
            clasificacion: ''
        });
    });
}

async function exportPending() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();
        const data = filteredRecords
            .filter(record => record.corporativo === 'Pendiente')
            .map(record => ({
                'Admisión': record.admision || '',
                'Nombre del Paciente': record.paciente || '',
                'Médico': record.medico || '',
                'Fecha de Cx': formatDateString(record.fechaCx) || '',
                'Proveedor': record.proveedor || '',
                'Código': record.codigo || '',
                'Descripción': record.descripcion || '',
                'Cantidad': record.cantidad || '',
                'Precio Sistema': record.precioNeto || '',
                'Agrupación': record.clasificacion || '',
                'OC': '',
                'OC Monto': '',
                'Estado': '',
                'Fecha de Recepción': formatDateString(record.fechaIngreso) || '',
                'Fecha de Cargo': formatDateString(record.fechaCx) || '',
                'Número de Guía': record.cotizacion || '' // Cambiado de nCotizacion a cotizacion
            }));

        if (data.length === 0) {
            showMessage('No hay consumos con estado Pendiente para exportar.', 'error');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 }, // Admisión
            { wch: 25 }, // Nombre del Paciente
            { wch: 20 }, // Médico
            { wch: 15 }, // Fecha de Cx
            { wch: 20 }, // Proveedor
            { wch: 15 }, // Código
            { wch: 30 }, // Descripción
            { wch: 10 }, // Cantidad
            { wch: 15 }, // Precio Sistema
            { wch: 15 }, // Agrupación
            { wch: 10 }, // OC
            { wch: 10 }, // OC Monto
            { wch: 10 }, // Estado
            { wch: 15 }, // Fecha de Recepción
            { wch: 15 }, // Fecha de Cargo
            { wch: 15 }  // Número de Guía
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumos Pendientes');
        XLSX.writeFile(workbook, 'consumos_pendientes.xlsx');
    } catch (error) {
        console.error('Error al exportar Consumos Pendientes:', error);
        showMessage(`Error al exportar Consumos Pendientes: ${error.message}`, 'error');
    }
}

async function exportComplete() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();
        const data = filteredRecords
            .filter(record => ['Pendiente', 'Ingresado'].includes(record.corporativo))
            .map(record => ({
                'Admisión': record.admision || '',
                'Nombre del Paciente': record.paciente || '',
                'Médico': record.medico || '',
                'Fecha de Cx': formatDateString(record.fechaCx) || '',
                'Proveedor': record.proveedor || '',
                'Código': record.codigo || '',
                'Descripción': record.descripcion || '',
                'Cantidad': record.cantidad || '',
                'Precio Sistema': record.precioNeto || '',
                'Agrupación': record.clasificacion || '',
                'OC': '',
                'OC Monto': '',
                'Estado': '',
                'Fecha de Recepción': formatDateString(record.fechaIngreso) || '',
                'Fecha de Cargo': formatDateString(record.fechaCx) || '',
                'Número de Guía': record.cotizacion || '' // Cambiado de nCotizacion a cotizacion
            }));

        if (data.length === 0) {
            showMessage('No hay consumos Pendientes o Ingresados para exportar.', 'error');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 30 },
            { wch: 10 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumos Completos');
        XLSX.writeFile(workbook, 'consumos_completos.xlsx');
    } catch (error) {
        console.error('Error al exportar Consumos Completos:', error);
        showMessage(`Error al exportar Consumos Completos: ${error.message}`, 'error');
    }
}

async function exportHistoric() {
    if (filteredRecords.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    try {
        await loadSheetJS();
        const data = filteredRecords.map(record => ({
            'Acciones': '',
            'Corporativo': record.corporativo || '',
            'Estado': record.estado || '',
            'ID': record.customId || '',
            'Código': record.codigo || '',
            'Cantidad': record.cantidad || '',
            'Venta': record.venta || '',
            'Referencia': record.referencia || '',
            'Precio': record.precioNeto || '',
            'N° Cotización': record.cotizacion || '',
            'Total Cotización': record.totalCotizacion || '',
            'Total Paciente': record.totalPaciente || '',
            'Coincidencia': record.coincidencia || '',
            'Previsión': record.prevision || '',
            'Admisión': record.admision || '',
            'Nombre del Paciente': record.paciente || '',
            'Médico': record.medico || '',
            'Fecha de Cx': formatDateString(record.fechaCx) || '',
            'Proveedor': record.proveedor || '',
            'Código (2)': record.codigo || '',
            'Descripción': record.descripcion || '',
            'Cantidad (2)': record.cantidad || '',
            'Precio Sistema': record.precioNeto || '',
            'Agrupación': record.clasificacion || '',
            'Total Item': Number(record.totalItem).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '',
            'Adm/Proveedor': record.admProveedor || '',
            'Margen': record.margen || '',
            'Usuario': record.usuario || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 10 },  // Acciones
            { wch: 15 },  // Corporativo
            { wch: 15 },  // Estado
            { wch: 10 },  // ID
            { wch: 15 },  // Código
            { wch: 10 },  // Cantidad
            { wch: 15 },  // Venta
            { wch: 20 },  // Referencia
            { wch: 15 },  // Precio
            { wch: 15 },  // N° Cotización
            { wch: 15 },  // Total Cotización
            { wch: 15 },  // Total Paciente
            { wch: 15 },  // Coincidencia
            { wch: 15 },  // Previsión
            { wch: 15 },  // Admisión
            { wch: 25 },  // Nombre del Paciente
            { wch: 20 },  // Médico
            { wch: 15 },  // Fecha de Cx
            { wch: 20 },  // Proveedor
            { wch: 15 },  // Código (2)
            { wch: 30 },  // Descripción
            { wch: 10 },  // Cantidad (2)
            { wch: 15 },  // Precio Sistema
            { wch: 15 },  // Agrupación
            { wch: 15 },  // Total Item
            { wch: 15 },  // Adm/Proveedor
            { wch: 15 },  // Margen
            { wch: 20 }   // Usuario
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');
        XLSX.writeFile(workbook, 'consumos_historico.xlsx');
    } catch (error) {
        console.error('Error al exportar Archivo Histórico:', error);
        showMessage(`Error al exportar Archivo Histórico: ${error.message}`, 'error');
    }
}

if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
        const exportOptions = document.getElementById('export-options');
        if (exportOptions) {
            exportOptions.style.display = exportOptions.style.display === 'block' ? 'none' : 'block';
        } else {
            console.error('Elemento #export-options no encontrado');
            showMessage('Error: No se encontró el menú de opciones de exportación.', 'error');
        }
    });
}

const pendingBtn = document.getElementById('export-pending-btn');
if (pendingBtn) {
    pendingBtn.addEventListener('click', () => {
        document.getElementById('export-options').style.display = 'none';
        exportPending();
    });
}

const completeBtn = document.getElementById('export-complete-btn');
if (completeBtn) {
    completeBtn.addEventListener('click', () => {
        document.getElementById('export-options').style.display = 'none';
        exportComplete();
    });
}

const historicBtn = document.getElementById('export-historic-btn');
if (historicBtn) {
    historicBtn.addEventListener('click', () => {
        document.getElementById('export-options').style.display = 'none';
        exportHistoric();
    });
}

document.addEventListener('click', (e) => {
    const exportOptions = document.getElementById('export-options');
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportOptions && !exportOptions.contains(e.target) && e.target !== exportBtn) {
        exportOptions.style.display = 'none';
    }
});

// Importar desde Excel
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) {
        showMessage('Por favor, seleccione un archivo Excel.', 'error');
        return;
    }

    if (!currentUser) {
        showMessage('Debes iniciar sesión para importar consumos.', 'error');
        setTimeout(() => window.location.href = 'login.html', 1000);
        return;
    }

    try {
        await loadSheetJS();
        if (registerModal && registerProgress) {
            registerModal.style.display = 'flex';
            registerProgress.textContent = '0%';
            const spinnerText = document.querySelector('.spinner-text');
            if (spinnerText) spinnerText.textContent = `Importando... ${registerProgress.textContent}`;
        }

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            if (registerModal) registerModal.style.display = 'none';
            showMessage('El archivo Excel está vacío.', 'error');
            return;
        }

        let successfulImports = 0;
        let errors = [];
        const batchSize = 500;
        const userName = currentUser.nombreCompleto || 'Usuario';

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = writeBatch(dbConsumos);
            const end = Math.min(i + batchSize, rows.length);
            let batchErrors = [];

            for (let j = i; j < end; j++) {
                const row = rows[j];
                const admision = row['Admisión'] ? String(row['Admisión']).trim() : '';
                const cotizacion = row['N° Cotización'] ? String(row['N° Cotización']).trim() : '';
                const referencia = row['Referencia'] ? String(row['Referencia']).trim() : '';
                const cantidad = row['Cantidad'] ? parseInt(row['Cantidad']) : 0;
                const prevision = row['Previsión'] ? String(row['Previsión']).trim() : '';
                const paciente = row['Nombre del Paciente'] ? String(row['Nombre del Paciente']).trim() : '';
                const medico = row['Médico'] ? String(row['Médico']).trim() : '';
                const fechaCx = row['Fecha de Cx'] ? parseDateToFirestoreFormat(String(row['Fecha de Cx'])) : '';
                const proveedor = row['Proveedor'] ? String(row['Proveedor']).trim() : '';
                const codigo = row['Código'] ? String(row['Código']).trim() : '';
                const descripcion = row['Descripción'] ? String(row['Descripción']).trim() : '';
                const precioNetoStr = row['Precio'] ? String(row['Precio']).trim() : '';
                const precioNeto = parsePriceString(precioNetoStr);
                const totalCotizacionStr = row['Total Cotización'] ? String(row['Total Cotización']).trim() : '';
                const estado = row['Estado'] ? String(row['Estado']).trim() : 'Pendiente';
                const corporativo = row['Corporativo'] ? String(row['Corporativo']).trim() : 'Pendiente'; // Nuevo campo
                const fechaIngreso = admision ? getLocalDate() : '';
                const { dia, semana, mes, año } = getDateDetails(fechaIngreso);
                const clasificacion = row['Agrupación'] ? String(row['Agrupación']).trim() : '';
                const totalItem = cantidad * precioNeto;
                const admProveedor = `${admision}${proveedor}`;
                const margen = calculateMargin(precioNetoStr);
                const venta = calculateVenta(totalItem, clasificacion, margen);

                if (!admision || !cotizacion || !referencia || cantidad <= 0 || !precioNetoStr) {
                    batchErrors.push(`Fila ${j + 2}: Campos obligatorios incompletos, cantidad inválida o precio vacío.`);
                    continue;
                }

                // Verificar si ya existe un consumo con el mismo customId (admision)
                const q = query(collection(dbConsumos, 'consumos'), where('customId', '==', admision));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    batchErrors.push(`Fila ${j + 2}: Ya existe un consumo con la Admisión (ID) ${admision}.`);
                    continue;
                }

                const newRecord = {
                    customId: admision,
                    admision,
                    cotizacion,
                    referencia,
                    cantidad,
                    prevision,
                    paciente,
                    medico,
                    fechaCx,
                    proveedor,
                    codigo,
                    descripcion,
                    precioNeto: precioNetoStr,
                    estado,
                    fechaIngreso,
                    dia,
                    semana,
                    mes,
                    año,
                    usuario: userName,
                    venta: venta ? Number(venta).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '',
                    totalCotizacion: totalCotizacionStr,
                    totalPaciente: '',
                    coincidencia: '',
                    clasificacion,
                    totalItem,
                    admProveedor,
                    margen,
                    corporativo, // Nuevo campo
                    createdAt: new Date()
                };

                const docRef = doc(collection(dbConsumos, 'consumos'));
                batch.set(docRef, newRecord);
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

        // Actualizar totalPaciente y coincidencia después de importar
        await updateTotalPaciente();
        await updateCoincidencia();

        if (registerModal) registerModal.style.display = 'none';
        if (successfulImports === rows.length) {
            showMessage(`Se importaron exitosamente ${successfulImports} consumos.`, 'success');
        } else {
            const message = `Se importaron ${successfulImports} de ${rows.length} consumos.\nErrores:\n${errors.join('\n')}`;
            showMessage(message, 'error');
        }

        if (importExcelBtn) importExcelBtn.value = '';
        await loadTableData();
    } catch (error) {
        console.error('Error al importar desde Excel:', error);
        if (registerModal) registerModal.style.display = 'none';
        if (importExcelBtn) importExcelBtn.value = '';
        showMessage(`Error al importar desde Excel: ${error.message}`, 'error');
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
            'Estado': '',
            'Corporativo': '', // Nuevo campo
            'ID': '',
            'Código': '',
            'Cantidad': '',
            'Venta': '',
            'Referencia': '',
            'Precio': '',
            'N° Cotización': '',
            'Total Cotización': '',
            'Total Paciente': '',
            'Coincidencia': '',
            'Previsión': '',
            'Admisión': '',
            'Nombre del Paciente': '',
            'Médico': '',
            'Fecha de Cx': '',
            'Proveedor': '',
            'Código (2)': '',
            'Descripción': '',
            'Cantidad (2)': '',
            'Precio Sistema': '',
            'Agrupación': '',
            'Total Item': '',
            'Adm/Proveedor': '',
            'Margen': '',
            'Usuario': ''
        }];

        const worksheet = XLSX.utils.json_to_sheet(data);
        worksheet['!cols'] = [
            { wch: 15 },  // Estado
            { wch: 15 },  // Corporativo
            { wch: 10 },  // ID
            { wch: 15 },  // Código
            { wch: 10 },  // Cantidad
            { wch: 15 },  // Venta
            { wch: 20 },  // Referencia
            { wch: 15 },  // Precio
            { wch: 15 },  // N° Cotización
            { wch: 15 },  // Total Cotización
            { wch: 15 },  // Total Paciente
            { wch: 15 },  // Coincidencia
            { wch: 15 },  // Previsión
            { wch: 15 },  // Admisión
            { wch: 25 },  // Nombre del Paciente
            { wch: 20 },  // Médico
            { wch: 15 },  // Fecha de Cx
            { wch: 20 },  // Proveedor
            { wch: 15 },  // Código (repetido)
            { wch: 30 },  // Descripción
            { wch: 10 },  // Cantidad (repetido)
            { wch: 15 },  // Precio Sistema
            { wch: 15 },  // Agrupación
            { wch: 15 },  // Total Item
            { wch: 15 },  // Adm/Proveedor
            { wch: 15 },  // Margen
            { wch: 20 }   // Usuario
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato_Consumos');
        XLSX.writeFile(workbook, 'formato_consumos.xlsx');
    } catch (error) {
        console.error('Error al descargar el formato:', error);
        showMessage(`Error al generar el formato de Excel: ${error.message}`, 'error');
    }
}

if (downloadFormatBtn) {
    downloadFormatBtn.addEventListener('click', downloadExcelFormat);
}

// Aplicar filtros
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

// Configurar filtros externos
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

// Configurar redimensionamiento de columnas
function setupColumnResizing() {
    const headers = document.querySelectorAll('#consumos-table th');
    const table = document.getElementById('consumos-table');

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
                    document.querySelectorAll(`#consumos-table td:nth-child(${index + 1})`).forEach(cell => {
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

// Cargar datos de la tabla
async function loadTableData() {
    allRecords = [];
    filteredRecords = [];
    if (consumosTableBody) consumosTableBody.innerHTML = '';

    Object.values(activeFilterInputs).forEach(container => container.remove());
    activeFilterInputs = {};

    try {
        // Sincronizar totalCotizacion y actualizar totalPaciente y coincidencia
        await syncTotalCotizacionFromPacientes();
        await updateTotalPaciente();
        await updateCoincidencia();

        const querySnapshot = await getDocs(query(collection(dbConsumos, 'consumos'), orderBy('customId')));

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const record = {
                docId: doc.id,
                customId: data.customId,
                estado: data.estado,
                admision: data.admision,
                codigo: data.codigo,
                cantidad: data.cantidad,
                venta: data.venta,
                referencia: data.referencia,
                precioNeto: data.precioNeto,
                cotizacion: data.cotizacion,
                totalCotizacion: data.totalCotizacion,
                totalPaciente: data.totalPaciente,
                coincidencia: data.coincidencia,
                prevision: data.prevision,
                paciente: data.paciente,
                medico: data.medico,
                fechaCx: data.fechaCx,
                proveedor: data.proveedor,
                descripcion: data.descripcion,
                clasificacion: data.clasificacion,
                totalItem: data.totalItem,
                admProveedor: data.admProveedor,
                margen: data.margen,
                usuario: data.usuario,
                fechaIngreso: data.fechaIngreso,
                dia: data.dia,
                semana: data.semana,
                mes: data.mes,
                año: data.año,
                corporativo: data.corporativo || 'Pendiente', // Mantiene el valor de Firestore o usa 'Pendiente' por defecto
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
        if (consumosTableBody) {
            consumosTableBody.innerHTML = `<tr><td colspan="26">Error al cargar datos: ${error.message}</td></tr>`;
        }
        if (tableContainer) tableContainer.style.display = 'block';
        showMessage(`Error al cargar datos: ${error.message}`, 'error');
    }
}

// Renderizar tabla
function renderTable() {
    if (!consumosTableBody) return;

    consumosTableBody.innerHTML = '';

    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    if (totalRecords) totalRecords.textContent = `Total de registros: ${filteredRecords.length}`;

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageRecords = filteredRecords.slice(start, end);

    const headers = document.querySelectorAll('#consumos-table th');
    const table = document.getElementById('consumos-table');
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
        consumosTableBody.innerHTML = '<tr><td colspan="28">No hay consumos que coincidan con los filtros.</td></tr>';
    } else {
        pageRecords.forEach(record => {
            const row = document.createElement('tr');
            const fechaCx = formatDateString(record.fechaCx);
            const mesDisplay = record.mes !== undefined ? months[record.mes] : '';

            if (record.estado) {
                row.classList.add(`estado-${record.estado.toLowerCase().replace(' ', '-')}`);
            }

            // Determinar el estilo inline para la celda de Coincidencia
            const coincidenciaStyle = record.coincidencia === 'X' ? `background-color: ${document.body.classList.contains('dark-mode') ? '#d32f2f' : '#fce4e4'};` : '';

            row.innerHTML = `
                <td style="width: ${columnWidths[0]}px; min-width: ${columnWidths[0]}px">
                    <i class="fas fa-edit action-icon" title="Editar"></i>
                    <i class="fas fa-trash action-icon" title="Eliminar"></i>
                </td>
                <td style="width: ${columnWidths[1]}px; min-width: ${columnWidths[1]}px" title="${record.corporativo || ''}">
                    <input type="checkbox" data-id="${record.docId}" ${record.corporativo === 'Ingresado' ? 'checked' : ''}> ${record.corporativo || 'Pendiente'}
                </td>
                <td class="estado-cell" data-id="${record.docId}" style="width: ${columnWidths[2]}px; min-width: ${columnWidths[2]}px" title="${record.estado || ''}">${record.estado || ''}</td>
                <td class="copyable-cell" style="width: ${columnWidths[3]}px; min-width: ${columnWidths[3]}px" title="${record.customId || ''}">${record.customId || ''}</td>
                <td class="copyable-cell" style="width: ${columnWidths[4]}px; min-width: ${columnWidths[4]}px" title="${record.codigo || ''}">${record.codigo || ''}</td>
                <td style="width: ${columnWidths[5]}px; min-width: ${columnWidths[5]}px" title="${record.cantidad || ''}">${record.cantidad || ''}</td>
                <td class="copyable-cell" style="width: ${columnWidths[6]}px; min-width: ${columnWidths[6]}px" title="${record.venta || ''}">${record.venta || ''}</td>
                <td style="width: ${columnWidths[7]}px; min-width: ${columnWidths[7]}px" title="${record.referencia || ''}">${record.referencia || ''}</td>
                <td style="width: ${columnWidths[8]}px; min-width: ${columnWidths[8]}px" title="${record.precioNeto || ''}">${record.precioNeto || ''}</td>
                <td style="width: ${columnWidths[9]}px; min-width: ${columnWidths[9]}px" title="${record.cotizacion || ''}">${record.cotizacion || ''}</td>
                <td style="width: ${columnWidths[10]}px; min-width: ${columnWidths[10]}px" title="${record.totalCotizacion || ''}">${record.totalCotizacion || ''}</td>
                <td style="width: ${columnWidths[11]}px; min-width: ${columnWidths[11]}px" title="${record.totalPaciente || ''}">${record.totalPaciente || ''}</td>
                <td style="width: ${columnWidths[12]}px; min-width: ${columnWidths[12]}px; ${coincidenciaStyle}" title="${record.coincidencia || ''}">${record.coincidencia || ''}</td>
                <td style="width: ${columnWidths[13]}px; min-width: ${columnWidths[13]}px" title="${record.prevision || ''}">${record.prevision || ''}</td>
                <td style="width: ${columnWidths[14]}px; min-width: ${columnWidths[14]}px" title="${record.admision || ''}">${record.admision || ''}</td>
                <td style="width: ${columnWidths[15]}px; min-width: ${columnWidths[15]}px" title="${record.paciente || ''}">${record.paciente || ''}</td>
                <td style="width: ${columnWidths[16]}px; min-width: ${columnWidths[16]}px" title="${record.medico || ''}">${record.medico || ''}</td>
                <td style="width: ${columnWidths[17]}px; min-width: ${columnWidths[17]}px" title="${fechaCx}">${fechaCx}</td>
                <td style="width: ${columnWidths[18]}px; min-width: ${columnWidths[18]}px" title="${record.proveedor || ''}">${record.proveedor || ''}</td>
                <td style="width: ${columnWidths[19]}px; min-width: ${columnWidths[19]}px" title="${record.codigo || ''}">${record.codigo || ''}</td>
                <td style="width: ${columnWidths[20]}px; min-width: ${columnWidths[20]}px" title="${record.descripcion || ''}">${record.descripcion || ''}</td>
                <td style="width: ${columnWidths[21]}px; min-width: ${columnWidths[21]}px" title="${record.cantidad || ''}">${record.cantidad || ''}</td>
                <td style="width: ${columnWidths[22]}px; min-width: ${columnWidths[22]}px" title="${record.precioNeto || ''}">${record.precioNeto || ''}</td>
                <td style="width: ${columnWidths[23]}px; min-width: ${columnWidths[23]}px" title="${record.clasificacion || ''}">${record.clasificacion || ''}</td>
                <td style="width: ${columnWidths[24]}px; min-width: ${columnWidths[24]}px" title="${record.totalItem || ''}">${record.totalItem ? Number(record.totalItem).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ''}</td>
                <td style="width: ${columnWidths[25]}px; min-width: ${columnWidths[25]}px" title="${record.admProveedor || ''}">${record.admProveedor || ''}</td>
                <td style="width: ${columnWidths[26]}px; min-width: ${columnWidths[26]}px" title="${record.margen || ''}">${record.margen || ''}</td>
                <td style="width: ${columnWidths[27]}px; min-width: ${columnWidths[27]}px" title="${record.usuario || ''}">${record.usuario || ''}</td>
            `;

            // Agregar manejadores de eventos para los checkboxes
            const checkbox = row.querySelector(`input[type="checkbox"][data-id="${record.docId}"]`);
            if (checkbox) {
                checkbox.addEventListener('change', async (e) => {
                    const docId = e.target.dataset.id;
                    const newValue = e.target.checked ? 'Ingresado' : 'Pendiente';
                    try {
                        await updateDoc(doc(dbConsumos, 'consumos', docId), {
                            corporativo: newValue
                        });
                        // Actualizar el registro en memoria
                        const recordIndex = allRecords.findIndex(r => r.docId === docId);
                        if (recordIndex !== -1) {
                            allRecords[recordIndex].corporativo = newValue;
                        }
                        const filteredIndex = filteredRecords.findIndex(r => r.docId === docId);
                        if (filteredIndex !== -1) {
                            filteredRecords[filteredIndex].corporativo = newValue;
                        }
                        // Actualizar el texto en la celda
                        e.target.nextSibling.textContent = ` ${newValue}`;
                        showMessage(`Estado corporativo actualizado a "${newValue}"`, 'success');
                    } catch (error) {
                        console.error('Error al actualizar corporativo:', error);
                        showMessage(`Error al actualizar estado corporativo: ${error.message}`, 'error');
                        // Revertir el cambio en la UI si falla
                        e.target.checked = !e.target.checked;
                    }
                });
            }

            // Evento para el ícono de edición
            row.querySelector('.fa-edit').addEventListener('click', () => openEditModal(record));

            // Evento para el ícono de eliminación
            row.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(record));

            // Evento de doble clic en la celda de estado
            const estadoCell = row.querySelector('.estado-cell');
            estadoCell.addEventListener('dblclick', () => {
                const currentEstado = estadoCell.textContent;
                const select = document.createElement('select');
                select.style.width = '100%';
                select.style.padding = '2px';
                select.style.fontSize = '12px';

                estados.forEach(estado => {
                    const option = document.createElement('option');
                    option.value = estado;
                    option.textContent = estado;
                    if (estado === currentEstado) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });

                estadoCell.innerHTML = '';
                estadoCell.appendChild(select);
                select.focus();

                // Actualizar estado al seleccionar una opción
                select.addEventListener('change', async () => {
                    const newEstado = select.value;
                    const docId = estadoCell.dataset.id;

                    try {
                        const consumoDocRef = doc(dbConsumos, 'consumos', docId);
                        await updateDoc(consumoDocRef, {
                            estado: newEstado,
                            updatedAt: new Date()
                        });

                        // Actualizar el registro en filteredRecords
                        const recordIndex = filteredRecords.findIndex(r => r.docId === docId);
                        if (recordIndex !== -1) {
                            filteredRecords[recordIndex].estado = newEstado;
                        }

                        estadoCell.textContent = newEstado;
                        row.className = ''; // Limpiar clases previas
                        row.classList.add(`estado-${newEstado.toLowerCase().replace(' ', '-')}`);
                        showMessage(`Estado actualizado a "${newEstado}" exitosamente.`, 'success');
                    } catch (error) {
                        console.error('Error al actualizar estado:', error);
                        showMessage('Error al actualizar estado: ' + error.message, 'error');
                        estadoCell.textContent = currentEstado; // Revertir en caso de error
                    }
                });

                // Restaurar texto si el usuario hace clic fuera o presiona Enter
                select.addEventListener('blur', () => {
                    estadoCell.textContent = select.value;
                });
                select.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                        estadoCell.textContent = select.value;
                    }
                });
            });

            // Evento de doble clic para copiar texto en celdas de ID, Código y Venta
            row.querySelectorAll('.copyable-cell').forEach(cell => {
                cell.addEventListener('dblclick', async () => {
                    const textToCopy = cell.textContent.trim();
                    if (textToCopy) {
                        try {
                            await navigator.clipboard.writeText(textToCopy);
                            showMessage(`Texto "${textToCopy}" copiado al portapapeles.`, 'success');
                        } catch (error) {
                            console.error('Error al copiar texto:', error);
                            showMessage('Error al copiar texto: ' + error.message, 'error');
                        }
                    } else {
                        showMessage('No hay texto para copiar.', 'error');
                    }
                });
            });

            consumosTableBody.appendChild(row);
        });
    }

    document.querySelectorAll('.filter-icon').forEach(icon => {
        const column = icon.dataset.column;
        icon.classList.toggle('active', !!activeFilters[column]);
    });
}

// Función auxiliar para actualizar los campos de texto basados en admisión y referencia
async function updateEditModalFields(admision, referencia) {
    const editTextPrevision = document.getElementById('edit-text-prevision');
    const editTextPaciente = document.getElementById('edit-text-paciente');
    const editTextMedico = document.getElementById('edit-text-medico');
    const editTextFechaCx = document.getElementById('edit-text-fecha-cx');
    const editTextProveedor = document.getElementById('edit-text-proveedor');
    const editTextCodigo = document.getElementById('edit-text-codigo');
    const editTextDescripcion = document.getElementById('edit-text-descripcion');
    const editTextPrecioDisplay = document.getElementById('edit-text-precio-display');
    const editTextAgrupacion = document.getElementById('edit-text-agrupacion');

    // Limpiar campos inicialmente
    editTextPrevision.textContent = '';
    editTextPaciente.textContent = '';
    editTextMedico.textContent = '';
    editTextFechaCx.textContent = '';
    editTextProveedor.textContent = '';
    editTextCodigo.textContent = '';
    editTextDescripcion.textContent = '';
    editTextPrecioDisplay.textContent = '';
    editTextAgrupacion.textContent = '';

    try {
        // Consultar datos del paciente basado en admisión
        if (admision) {
            const qPaciente = query(collection(dbPacientes, 'pacientes'), where('admision', '==', admision));
            const pacienteSnapshot = await getDocs(qPaciente);
            if (!pacienteSnapshot.empty) {
                const patientData = pacienteSnapshot.docs[0].data();
                editTextPrevision.textContent = patientData.prevision || '';
                editTextPaciente.textContent = patientData.nombrePaciente || '';
                editTextMedico.textContent = patientData.medico || '';
                editTextFechaCx.textContent = formatDateString(patientData.fechaCirugia) || '';
            } else {
                showMessage(`No se encontró un paciente con la admisión ${admision}`, 'error');
            }
        }

        // Consultar datos del código basado en referencia
        if (referencia) {
            const qCodigo = query(collection(dbConsumos, 'codigos'), where('referencia', '==', referencia));
            const codigoSnapshot = await getDocs(qCodigo);
            if (!codigoSnapshot.empty) {
                const codigoData = codigoSnapshot.docs[0].data();
                editTextProveedor.textContent = codigoData.proveedor || '';
                editTextCodigo.textContent = codigoData.codigo || '';
                editTextDescripcion.textContent = codigoData.descripcion || '';
                editTextPrecioDisplay.textContent = codigoData.precioNeto || '';
                editTextAgrupacion.textContent = codigoData.clasificacion || '';
            } else {
                showMessage(`No se encontró un código con la referencia ${referencia}`, 'error');
            }
        }
    } catch (error) {
        console.error('Error al actualizar campos del modal de edición:', error);
        showMessage('Error al obtener datos: ' + error.message, 'error');
    }
}

// Abrir modal de edición
function openEditModal(record) {
    editingRecord = record;

    const editAdmision = document.getElementById('edit-admision');
    const editReferencia = document.getElementById('edit-referencia');
    const editCantidad = document.getElementById('edit-cantidad');
    const editPrecio = document.getElementById('edit-precio');
    const editModal = document.getElementById('edit-modal');

    if (!editAdmision || !editReferencia || !editCantidad || !editPrecio || !editModal) {
        console.error('Elementos faltantes:', {
            editAdmision, editReferencia, editCantidad, editPrecio, editModal
        });
        showMessage('Error: No se pudo abrir el modal de edición. Elementos no encontrados.', 'error');
        return;
    }

    // Llenar los campos de entrada con los datos del registro
    editAdmision.value = record.admision || '';
    editReferencia.value = record.referencia || '';
    editCantidad.value = record.cantidad || '';
    editPrecio.value = record.precioNeto || '';

    // Actualizar los campos de texto inicialmente
    updateEditModalFields(editAdmision.value, editReferencia.value);

    // Agregar event listeners para actualizar los campos de texto en tiempo real
    editAdmision.addEventListener('input', () => {
        updateEditModalFields(editAdmision.value, editReferencia.value);
    });

    editReferencia.addEventListener('input', () => {
        updateEditModalFields(editAdmision.value, editReferencia.value);
    });

    editModal.style.display = 'flex';
}

// Guardar cambios en edición
if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
        const admision = document.getElementById('edit-admision')?.value.trim() || '';
        const referencia = document.getElementById('edit-referencia')?.value.trim() || '';
        const cantidad = parseInt(document.getElementById('edit-cantidad')?.value) || 0;
        const precio = document.getElementById('edit-precio')?.value.trim() || '';

        if (!admision || !referencia || cantidad <= 0 || !precio) {
            showMessage('Complete todos los campos obligatorios y asegúrese de que la cantidad sea mayor a 0.', 'error');
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

            const q = query(collection(dbConsumos, 'codigos'), where('referencia', '==', referencia));
            const querySnapshot = await getDocs(q);
            let codigoData = {};
            if (!querySnapshot.empty) {
                codigoData = querySnapshot.docs[0].data();
            } else {
                throw new Error(`No se encontró un código con la referencia ${referencia}`);
            }

            const qPaciente = query(collection(dbPacientes, 'pacientes'), where('admision', '==', admision));
            const pacienteSnapshot = await getDocs(qPaciente);
            let patientData = {};
            if (!pacienteSnapshot.empty) {
                patientData = pacienteSnapshot.docs[0].data();
            } else {
                throw new Error(`No se encontró un paciente con la admisión ${admision}`);
            }

            const admProveedor = `${admision}${codigoData.proveedor || ''}`;
            let totalCotizacionStr = '';
            const qTotal = query(
                collection(dbPacientes, 'pacientes'),
                where('admisionEmpresa', '==', admProveedor),
                orderBy('createdAt', 'desc')
            );
            const totalSnapshot = await getDocs(qTotal);
            if (!totalSnapshot.empty) {
                totalCotizacionStr = String(totalSnapshot.docs[0].data().totalCotizacion || '');
            }

            const precioNeto = parsePriceString(precio);
            const totalItem = cantidad * precioNeto;
            const margen = calculateMargin(precio);
            const venta = calculateVenta(totalItem, codigoData.clasificacion || '', margen);

            const updatedRecord = {
                admision,
                referencia,
                cantidad,
                prevision: patientData.prevision || '',
                paciente: patientData.nombrePaciente || '',
                medico: patientData.medico || '',
                fechaCx: patientData.fechaCirugia || '',
                proveedor: codigoData.proveedor || '',
                codigo: codigoData.codigo || '',
                descripcion: codigoData.descripcion || '',
                precioNeto: precio,
                clasificacion: codigoData.clasificacion || '',
                totalItem,
                admProveedor,
                totalCotizacion: totalCotizacionStr,
                margen,
                venta: venta ? Number(venta).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '',
                updatedAt: new Date()
            };

            const consumoDocRef = doc(dbConsumos, 'consumos', editingRecord.docId);
            await updateDoc(consumoDocRef, updatedRecord);

            await updateTotalPaciente();
            await updateCoincidencia();

            if (registerModal) registerModal.style.display = 'none';
            if (editModal) editModal.style.display = 'none';
            showMessage(`Se ha actualizado exitosamente el consumo con referencia ${referencia}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al actualizar consumo:', error);
            if (registerModal) registerModal.style.display = 'none';
            if (editModal) editModal.style.display = 'flex';
            showMessage(`Error al actualizar consumo: ${error.message}`, 'error');
        }
    });
}

// Cancelar edición
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        if (editModal) editModal.style.display = 'none';
        editingRecord = null;
    });
}

// Abrir modal de eliminación
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

    deleteMessage.textContent = `¿Desea eliminar el consumo con referencia ${record.referencia || 'sin referencia'}?`;
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
            await deleteDoc(doc(dbConsumos, 'consumos', record.docId));

            // Actualizar totalPaciente y coincidencia después de eliminar
            await updateTotalPaciente();
            await updateCoincidencia();

            if (registerModal) registerModal.style.display = 'none';
            deleteModal.style.display = 'none';
            showMessage(`Se ha eliminado el consumo con referencia ${record.referencia || 'sin referencia'}.`, 'success');
            await loadTableData();
        } catch (error) {
            console.error('Error al eliminar consumo:', error);
            if (registerModal) registerModal.style.display = 'none';
            deleteModal.style.display = 'none';
            showMessage(`Error al eliminar consumo: ${error.message}`, 'error');
        }
    };

    cancelDeleteBtn.onclick = () => {
        deleteModal.style.display = 'none';
    };
}

// Navegación de páginas
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

// Inicializar
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

    if (loadingModal && loadingProgress) {
        loadingModal.style.display = 'flex';
        loadingProgress.textContent = '0%';
    }

    try {
        await loadReferenceData();
        await syncTotalCotizacionFromPacientes();
        await updateTotalPaciente();
        await updateCoincidencia();
        setupAdmisionSearch();
        setupReferenciaSearch();
        setupExternalFilters();
        await new Promise(resolve => simulateProgress(loadingProgress || { textContent: '' }, resolve));
        await loadTableData();
        if (loadingModal) loadingModal.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        if (loadingModal) loadingModal.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        showMessage(`Error al inicializar la aplicación: ${error.message}`, 'error');
    }
}

// Ejecutar inicialización
initialize();