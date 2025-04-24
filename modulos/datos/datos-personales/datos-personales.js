import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para calcular la edad
function calculateAge(birthDate) {
    if (!birthDate || isNaN(birthDate.getTime())) {
        return 'Sin edad';
    }

    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Ajustar si el día o mes es negativo
    if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    // Construir la cadena de edad
    let ageString = '';
    if (years > 0) {
        ageString += `${years} ${years === 1 ? 'año' : 'años'}`;
    }
    if (months > 0 || years > 0) {
        ageString += years > 0 ? ' con ' : '';
        ageString += months > 0 ? `${months} ${months === 1 ? 'mes' : 'meses'}` : '';
    }
    if (days > 0 || months > 0 || years > 0) {
        ageString += (years > 0 || months > 0) ? ' y ' : '';
        ageString += days > 0 ? `${days} ${days === 1 ? 'día' : 'días'}` : '';
    }

    return ageString || '0 días';
}

// Cargar datos del usuario autenticado
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Buscar el usuario en Firestore por correo
        const q = query(collection(db, 'usuarios'), where('correo', '==', user.email), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Actualizar elementos de la tarjeta
            document.getElementById('nombre-completo').textContent = userData.nombreCompleto || 'Sin nombre';
            document.getElementById('rut').textContent = userData.rut || 'Sin RUT';
            const birthDate = userData.fechaNacimiento ? new Date(userData.fechaNacimiento) : null;
            document.getElementById('fecha-nacimiento').textContent = birthDate
                ? birthDate.toLocaleDateString('es-ES')
                : 'Sin fecha';
            document.getElementById('edad').textContent = calculateAge(birthDate);
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
            document.getElementById('edad').textContent = 'Sin edad';
        }
    } catch (error) {
        console.error('Error al cargar datos personales:', error);
        document.getElementById('nombre-completo').textContent = 'Error al cargar datos';
        document.getElementById('edad').textContent = 'Sin edad';
    }
});