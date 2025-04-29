import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const app = initializeApp(firebaseConfig, "usuariosApp");
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar la persistencia de la sesión
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        // Persistencia configurada
    })
    .catch((error) => {
        console.error('Error al configurar la persistencia:', error);
    });

// Verificar estado de autenticación
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Set initial HTML with loading modal
        document.body.innerHTML = `
            <div class="loading-modal" id="loadingScreen">
                <div class="loading-content">
                    <span class="loader"></span>
                    <p class="loading-text">Cargando aplicación web MDS</p>
                    <p class="loading-percentage" id="loadingPercentage">0%</p>
                </div>
            </div>
            <header>
                <div class="header-container">
                    <img src="img/logo-empresa.png" alt="Logo" class="logo">
                    <span class="header-text">MDS</span>
                    <span class="header-date"></span>
                </div>
                <div class="header-container">
                    <span class="header-title">Panel de Control</span>
                </div>
                <div class="header-container">
                    <i class="fas fa-bell notification-icon"></i>
                    <i class="fas fa-moon dark-mode-toggle" id="darkModeToggle" title="Cambiar modo"></i>
                    <img src="img/icono-otro.png" alt="User Logo" class="user-logo" id="userLogo">
                    <span class="user-name" id="userName">Cargando...</span>
                    <div class="user-dropdown" id="userDropdown" style="display: none;">
                        <ul class="dropdown-menu">
                            <li class="dropdown-item" data-action="personal-data">Datos Personales</li>
                            <li class="dropdown-item" data-action="change-password">Cambiar Contraseña</li>
                            <li class="dropdown-item" data-action="logout">Cerrar Sesión</li>
                        </ul>
                    </div>
                </div>
            </header>
            <div class="container">
                <nav class="sidebar">
                    <div class="sidebar-container sidebar-container-1">
                        <div class="sidebar-title">
                            <i class="fas fa-th-large sidebar-icon"></i>
                            <span class="sidebar-text">Módulos</span>
                        </div>
                    </div>
                    <div class="sidebar-container sidebar-container-2">
                        <ul class="sidebar-menu">
                            <li class="sidebar-menu-item" data-section="Implantes">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Implantes</span>
                            </li>
                            <li class="sidebar-menu-item" data-section="Consignación">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Consignación</span>
                            </li>
                            <li class="sidebar-menu-item" data-section="Corporativo">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Corporativo</span>
                            </li>
                            <li class="sidebar-menu-item" data-section="Laboratorio">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Laboratorio</span>
                            </li>
                            <li class="sidebar-menu-item" data-section="Prestaciones">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Prestaciones</span>
                            </li>
                            <li class="sidebar-menu-item" data-section="Usuarios">
                                <i class="far fa-circle-check sidebar-icon"></i>
                                <span class="sidebar-text">Usuarios</span>
                            </li>
                        </ul>
                        <div class="submenu-container" style="display: none;">
                            <div class="submenu-title">
                                <i class="fas fa-arrow-left submenu-icon"></i>
                                <span class="submenu-text"></span>
                            </div>
                            <ul class="submenu"></ul>
                        </div>
                    </div>
                    <div class="sidebar-container sidebar-container-3"></div>
                    <div class="sidebar-container sidebar-container-4">
                        <div class="sidebar-version">
                            <p class="version-text">Versión 1.00.1</p>
                            <p class="version-date">21-Abril-2025</p>
                        </div>
                    </div>
                </nav>
                <main class="content"></main>
            </div>
            <div class="modal" id="logoutModal" style="display: none;">
                <div class="modal-content">
                    <p>¿Estás seguro de que deseas cerrar sesión?</p>
                    <div class="modal-buttons">
                        <button id="confirmLogout">Sí</button>
                        <button id="cancelLogout">No</button>
                    </div>
                </div>
            </div>
        `;

        // Start loading percentage animation
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingPercentage = document.getElementById('loadingPercentage');
        let percentage = 0;
        const progressInterval = setInterval(() => {
            percentage += 5;
            if (percentage > 100) percentage = 100;
            loadingPercentage.textContent = `${percentage}%`;
            if (percentage === 100) {
                clearInterval(progressInterval);
            }
        }, 30);

        // Fetch user data
        let userData = { nombreCompleto: user.displayName || user.email || 'Usuario', identidad: 'otro' };
        try {
            const q = query(collection(db, 'usuarios'), where('correo', '==', user.email), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                userData = querySnapshot.docs[0].data();
            } else {
                console.warn(`No se encontró un usuario con correo: ${user.email} en la colección "usuarios"`);
            }
        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
            console.warn(`Usando nombre predeterminado: ${userData.nombreCompleto}`);
        }

        // Actualizar UI con datos del usuario
        const userNameElement = document.querySelector('.user-name');
        userNameElement.textContent = userData.nombreCompleto || 'Usuario';
        const userLogo = document.getElementById('userLogo');
        const iconSrc = {
            hombre: 'img/icono-hombre.png',
            mujer: 'img/icono-mujer.png',
            otro: 'img/icono-otro.png'
        }[userData.identidad] || 'img/icono-otro.png';
        userLogo.src = iconSrc;
        userLogo.alt = `Icono ${userData.identidad || 'otro'}`;

        // Initialize page
        initializePage();

        // Set session timeout
        const sessionTimeout = 5 * 60 * 60 * 1000; // 5 horas
        setTimeout(async () => {
            try {
                await signOut(auth);
                localStorage.removeItem('darkMode');
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error al cerrar sesión automáticamente:', error);
            }
        }, sessionTimeout);

        // Fade out loading screen
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 500);
    } catch (error) {
        console.error('Error general al inicializar:', error);
        const userNameElement = document.querySelector('.user-name');
        userNameElement.textContent = user.displayName || user.email || 'Usuario';
        initializePage();
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
});

// Función para inicializar la funcionalidad de la página
function initializePage() {
    function updateDate() {
        const dateElement = document.querySelector('.header-date');
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = now.toLocaleDateString('es-ES', options);
    }

    updateDate();
    setInterval(updateDate, 24 * 60 * 60 * 1000);

    const darkModeToggle = document.getElementById('darkModeToggle');
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.classList.toggle('fa-moon', !isDarkMode);
        darkModeToggle.classList.toggle('fa-sun', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode);
    }

    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.classList.remove('fa-moon');
        darkModeToggle.classList.add('fa-sun');
    }

    darkModeToggle.addEventListener('click', toggleDarkMode);

    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    const sidebarMenu = document.querySelector('.sidebar-menu');
    const submenuContainer = document.querySelector('.submenu-container');
    const submenuTitle = document.querySelector('.submenu-text');
    const submenuList = document.querySelector('.submenu');
    const submenuTitleContainer = document.querySelector('.submenu-title');
    const contentArea = document.querySelector('.content');
    const modulesTitle = document.querySelector('.sidebar-title');

    const subOptions = {
        'Implantes': ['Consumos', 'Pacientes', 'Códigos', 'Carpetas', 'Formulario', 'Consignado', 'Histórico', 'Ver Pacientes'],
        'Consignación': ['Ingresos', 'Historial', 'Guía (L/FV)'],
        'Corporativo': ['Planilla 2024', 'Planilla 2025', 'Ver 2024', 'Ver 2025'],
        'Laboratorio': ['Ingresos', 'Resumen', 'Órdenes de Compra', 'Tabla de Ingresos'],
        'Prestaciones': ['Médicos', 'Previsiones', 'Empresas', 'Áreas Clínicas', 'Cts Proveedores', 'Cts Clínicos'],
        'Usuarios': ['Registros']
    };
    
    const subOptionFiles = {
        'Consumos': { html: 'modulos/implantes/consumos/consumos.html', css: 'modulos/implantes/consumos/consumos.css', js: 'modulos/implantes/consumos/consumos.js' },
        'Pacientes': { html: 'modulos/implantes/pacientes/pacientes.html', css: 'modulos/implantes/pacientes/pacientes.css', js: 'modulos/implantes/pacientes/pacientes.js' },
        'Códigos': { html: 'modulos/prestaciones/codigos/codigos.html', css: 'modulos/prestaciones/codigos/codigos.css', js: 'modulos/prestaciones/codigos/codigos.js' },
        'Carpetas': { html: 'modulos/implantes/carpetas/carpetas.html', css: 'modulos/implantes/carpetas/carpetas.css', js: 'modulos/implantes/carpetas/carpetas.js' },
        'Formulario': { html: 'modulos/implantes/formulario/formulario.html', css: 'modulos/implantes/formulario/formulario.css', js: 'modulos/implantes/formulario/formulario.js' },
        'Consignado': { html: 'modulos/implantes/consignado/consignado.html', css: 'modulos/implantes/consignado/consignado.css', js: 'modulos/implantes/consignado/consignado.js' },
        'Histórico': { html: 'modulos/implantes/historico/historico.html', css: 'modulos/implantes/historico/historico.css', js: 'modulos/implantes/historico/historico.js' },
        'Ver Pacientes': { html: 'modulos/implantes/ver-pacientes/ver-pacientes.html', css: 'modulos/implantes/ver-pacientes/ver-pacientes.css', js: 'modulos/implantes/ver-pacientes/ver-pacientes.js' },
        'Ingresos': { html: 'modulos/consignacion/ingresos/ingresos.html', css: 'modulos/consignacion/ingresos/ingresos.css', js: 'modulos/consignacion/ingresos/ingresos.js' },
        'Historial': { html: 'modulos/consignacion/historial/historial.html', css: 'modulos/consignacion/histarial.css', js: 'modulos/consignacion/historial/histarial.js' },
        'Guía (L/FV)': { html: 'modulos/consignacion/guia-lfv/guia-lfv.html', css: 'modulos/consignacion/guia-lfv/guia-lfv.css', js: 'modulos/consignacion/guia-lfv/guia-lfv.js' },
        'Planilla 2024': { html: 'modulos/corporativo/planilla-2024/planilla-2024.html', css: 'modulos/corporativo/planilla-2024/planilla-2024.css', js: 'modulos/corporativo/planilla-2024/planilla-2024.js' },
        'Planilla 2025': { html: 'modulos/corporativo/planilla-2025/planilla-2025.html', css: 'modulos/corporativo/planilla-2025/planilla-2025.css', js: 'modulos/corporativo/planilla-2025/planilla-2025.js' },
        'Ver 2024': { html: 'modulos/corporativo/ver-2024/ver-2024.html', css: 'modulos/corporativo/ver-2024/ver-2024.css', js: 'modulos/corporativo/ver-2024/ver-2024.js' },
        'Ver 2025': { html: 'modulos/corporativo/ver-2025/ver-2025.html', css: 'modulos/corporativo/ver-2025/ver-2025.css', js: 'modulos/corporativo/ver-2025/ver-2025.js' },
        'Ingresos': { html: 'modulos/laboratorio/ingresos/ingresos.html', css: 'modulos/laboratorio/ingresos/ingresos.css', js: 'modulos/laboratorio/ingresos/ingresos.js' },
        'Resumen': { 
            html: 'modulos/laboratorio/resumen/resumen.html', 
            css: ['modulos/laboratorio/resumen/resumen.css', 'modulos/laboratorio/resumen/resumen-extra.css'], 
            js: ['modulos/laboratorio/resumen/resumen-part1.js', 'modulos/laboratorio/resumen/resumen-part2.js', 'modulos/laboratorio/resumen/resumen-part3.js']
        },
        'Órdenes de Compra': { html: 'modulos/laboratorio/ordenes-de-compra/ordenes-de-compra.html', css: 'modulos/laboratorio/ordenes-de-compra/ordenes-de-compra.css', js: 'modulos/laboratorio/ordenes-de-compra/ordenes-de-compra.js' },
        'Tabla de Ingresos': { html: 'modulos/laboratorio/tabla-de-ingresos/tabla-de-ingresos.html', css: 'modulos/laboratorio/tabla-de-ingresos/tabla-de-ingresos.css', js: 'modulos/laboratorio/tabla-de-ingresos/tabla-de-ingresos.js' },
        'Médicos': { html: 'modulos/prestaciones/medicos/medicos.html', css: 'modulos/prestaciones/medicos/medicos.css', js: 'modulos/prestaciones/medicos/medicos.js' },
        'Previsiones': { html: 'modulos/prestaciones/previsiones/previsiones.html', css: 'modulos/prestaciones/previsiones/previsiones.css', js: 'modulos/prestaciones/previsiones/previsiones.js' },
        'Empresas': { html: 'modulos/prestaciones/empresas/empresas.html', css: 'modulos/prestaciones/empresas/empresas.css', js: 'modulos/prestaciones/empresas/empresas.js' },
        'Áreas Clínicas': { html: 'modulos/prestaciones/areas-clinicas/areas-clinicas.html', css: 'modulos/prestaciones/areas-clinicas/areas-clinicas.css', js: 'modulos/prestaciones/areas-clinicas/areas-clinicas.js' },
        'Cts Proveedores': { html: 'modulos/prestaciones/contactos-de-proveedores/contactos-de-proveedores.html', css: 'modulos/prestaciones/contactos-de-proveedores/contactos-de-proveedores.css', js: 'modulos/prestaciones/contactos-de-proveedores/contactos-de-proveedores.js' },
        'Cts Clínicos': { html: 'modulos/prestaciones/contactos-clinicos/contactos-clinicos.html', css: 'modulos/prestaciones/contactos-clinicos/contactos-clinicos.css', js: 'modulos/prestaciones/contactos-clinicos/contactos-clinicos.js' },
        'Registros': { html: 'modulos/usuarios/registros.html', css: 'modulos/usuarios/registros.css', js: 'modulos/usuarios/registros.js' },
        'Datos Personales': { html: 'modulos/datos/datos-personales/datos-personales.html', css: 'modulos/datos/datos-personales/datos-personales.css', js: 'modulos/datos/datos-personales/datos-personales.js' },
        'Cambiar Contraseña': { html: 'modulos/datos/cambiar-contrasena/cambiar-contrasena.html', css: 'modulos/datos/cambiar-contrasena/cambiar-contrasena.css', js: 'modulos/datos/cambiar-contrasena/cambiar-contrasena.js' }
    };

    let isModulesContentVisible = false;

    function clearPreviousContent() {
        contentArea.innerHTML = '';
        document.querySelectorAll('.dynamic-css').forEach(link => link.remove());
        document.querySelectorAll('.dynamic-js').forEach(script => script.remove());
    }

    function loadContent(option) {
        const files = subOptionFiles[option];
        if (!files) {
            contentArea.innerHTML = '<p>Contenido no disponible.</p>';
            return;
        }

        clearPreviousContent();

        fetch(files.html)
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar el archivo HTML: ' + files.html);
                return response.text();
            })
            .then(data => {
                contentArea.innerHTML = data;

                const cssFiles = Array.isArray(files.css) ? files.css : [files.css];
                cssFiles.forEach(cssFile => {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = cssFile;
                    link.classList.add('dynamic-css');
                    link.onerror = () => console.error(`Error al cargar CSS: ${cssFile}`);
                    document.head.appendChild(link);
                });

                const jsFiles = Array.isArray(files.js) ? files.js : [files.js];
                jsFiles.forEach(jsFile => {
                    const script = document.createElement('script');
                    script.src = `${jsFile}?t=${new Date().getTime()}`;
                    script.type = 'module';
                    script.classList.add('dynamic-js');
                    script.onerror = () => console.error(`Error al cargar JS: ${jsFile}`);
                    document.head.appendChild(script);
                });
            })
            .catch(error => {
                console.error('Error al cargar el contenido:', error);
                contentArea.innerHTML = '<p>Error al cargar el contenido: ' + error.message + '</p>';
            });
    }

    function loadModulesContent() {
        if (isModulesContentVisible) {
            contentArea.style.display = 'none';
            isModulesContentVisible = false;
        } else {
            contentArea.style.display = 'block';
            isModulesContentVisible = true;
            fetch('modulos/modulos.html')
                .then(response => {
                    if (!response.ok) throw new Error('No se pudo cargar el archivo HTML: modulos/modulos.html');
                    return response.text();
                })
                .then(data => {
                    contentArea.innerHTML = data;
                })
                .catch(error => {
                    console.error('Error al cargar el contenido de Módulos:', error);
                    contentArea.innerHTML = '<p>Error al cargar el contenido: ' + error.message + '</p>';
                });
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.getAttribute('data-section');
            submenuTitle.textContent = section;
            let isBelowDivider = false;

            submenuList.innerHTML = '';
            subOptions[section].forEach((option, index) => {
                const li = document.createElement('li');
                li.classList.add('submenu-item');
                const iconClass = isBelowDivider ? 'fa-regular fa-square-check submenu-icon' : 'fas fa-eye submenu-icon';
                li.innerHTML = `
                    <i class="${iconClass}"></i>
                    <span class="submenu-text">${option}</span>
                `;
                submenuList.appendChild(li);

                li.addEventListener('click', () => {
                    loadContent(option);
                    contentArea.style.display = 'block';
                    isModulesContentVisible = false;
                });

                if (section === 'Implantes' && option === 'Consignado') {
                    const divider = document.createElement('hr');
                    divider.classList.add('submenu-divider');
                    submenuList.appendChild(divider);
                    isBelowDivider = true;
                } else if (section === 'Corporativo' && option === 'Planilla 2025') {
                    const divider = document.createElement('hr');
                    divider.classList.add('submenu-divider');
                    submenuList.appendChild(divider);
                    isBelowDivider = true;
                } else if (section === 'Laboratorio' && option === 'Órdenes de Compra') {
                    const divider = document.createElement('hr');
                    divider.classList.add('submenu-divider');
                    submenuList.appendChild(divider);
                    isBelowDivider = true;
                } else if (section === 'Prestaciones' && option === 'Áreas Clínicas') {
                    const divider = document.createElement('hr');
                    divider.classList.add('submenu-divider');
                    submenuList.appendChild(divider);
                    isBelowDivider = true;
                }
            });

            sidebarMenu.style.display = 'none';
            submenuContainer.style.display = 'block';
        });
    });

    submenuTitleContainer.addEventListener('click', () => {
        submenuContainer.style.display = 'none';
        sidebarMenu.style.display = 'flex';
        contentArea.style.display = 'block';
        isModulesContentVisible = false;
    });

    modulesTitle.addEventListener('click', () => {
        loadModulesContent();
        sidebarMenu.style.display = 'flex';
        submenuContainer.style.display = 'none';
    });

    const userLogo = document.getElementById('userLogo');
    const userName = document.getElementById('userName');
    const userDropdown = document.getElementById('userDropdown');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');

    function toggleDropdown() {
        userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
    }

    userLogo.addEventListener('click', toggleDropdown);
    userName.addEventListener('click', toggleDropdown);

    document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target) && !userLogo.contains(e.target) && !userName.contains(e.target)) {
            userDropdown.style.display = 'none';
        }
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            userDropdown.style.display = 'none';

            if (action === 'personal-data' || action === 'change-password') {
                loadContent(action === 'personal-data' ? 'Datos Personales' : 'Cambiar Contraseña');
            } else if (action === 'logout') {
                logoutModal.style.display = 'flex';
            }
        });
    });

    confirmLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('darkMode');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    });

    cancelLogout.addEventListener('click', () => {
        logoutModal.style.display = 'none';
    });
}