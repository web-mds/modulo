import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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

// Cargar datos del usuario autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no hay usuario autenticado, redirigir a login.html
        window.location.href = 'login.html';
    } else {
        try {
            // Buscar el usuario en Firestore por correo
            const q = query(collection(db, 'usuarios'), where('correo', '==', user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();

                // Actualizar elementos de la tarjeta
                document.getElementById('nombre-completo').textContent = userData.nombreCompleto || 'Sin nombre';
                document.getElementById('rut').textContent = userData.rut || 'Sin RUT';
                document.getElementById('fecha-nacimiento').textContent = userData.fechaNacimiento
                    ? new Date(userData.fechaNacimiento).toLocaleDateString('es-ES')
                    : 'Sin fecha';
                document.getElementById('nombre-usuario').textContent = userData.nombreUsuario || 'Sin usuario';
                document.getElementById('rol').textContent = userData.rol || 'Sin rol';
                document.getElementById('identidad').textContent = userData.identidad || 'Sin identidad';
                document.getElementById('correo').textContent = userData.correo || 'Sin correo';

                // Actualizar imagen según identidad
                const iconElement = document.getElementById('profile-icon');
                const iconSrc = {
                    hombre: 'img/icono-hombre.png',
                    mujer: 'img/icono-mujer.png',
                    otro: 'img/icono-otro.png'
                }[userData.identidad] || 'img/icono-otro.png';
                iconElement.src = iconSrc;
                iconElement.alt = `Icono ${userData.identidad || 'otro'}`;
            } else {
                console.error('No se encontró el usuario en Firestore.');
                document.getElementById('nombre-completo').textContent = 'Usuario no encontrado';
            }
        } catch (error) {
            console.error('Error al cargar datos personales:', error);
            document.getElementById('nombre-completo').textContent = 'Error al cargar datos';
        }
    }
});