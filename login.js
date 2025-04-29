import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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

// Inicializar Firebase con un nombre específico
const app = initializeApp(firebaseConfig, "usuariosApp");
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar la persistencia de la sesión
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Persistencia de sesión configurada a browserLocalPersistence');
    })
    .catch((error) => {
        console.error('Error al configurar la persistencia:', error);
    });

const loginForm = document.getElementById('login-form');
const messageDiv = document.getElementById('message');

// Manejar el inicio de sesión
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        messageDiv.textContent = 'Iniciando sesión...';
        messageDiv.className = 'message';

        const q = query(collection(db, 'usuarios'), where('nombreUsuario', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('auth/user-not-found');
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.contrasena !== password) {
            throw new Error('auth/wrong-password');
        }

        await signInWithEmailAndPassword(auth, userData.correo, userData.contrasena);
        console.log('Usuario autenticado en login.js:', auth.currentUser?.email);

        messageDiv.textContent = 'Inicio de sesión exitoso. Redirigiendo...';
        messageDiv.className = 'message success';
        setTimeout(() => {
            window.location.href = 'panel.html';
        }, 1000);
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        let errorMessage = 'Error al iniciar sesión. Verifique sus credenciales.';
        if (error.message === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado.';
        } else if (error.message === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Correo electrónico inválido.';
        }
        messageDiv.textContent = errorMessage;
        messageDiv.className = 'message error';
    }
});

const forgotPasswordLink = document.getElementById('forgot-password');
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    if (!username) {
        messageDiv.textContent = 'Por favor, ingrese su nombre de usuario.';
        messageDiv.className = 'message error';
        return;
    }

    try {
        messageDiv.textContent = 'Buscando usuario...';
        messageDiv.className = 'message';

        const q = query(collection(db, 'usuarios'), where('nombreUsuario', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('auth/user-not-found');
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        await sendPasswordResetEmail(auth, userData.correo);
        messageDiv.textContent = 'Correo de restablecimiento enviado. Revise su bandeja de entrada.';
        messageDiv.className = 'message success';
    } catch (error) {
        console.error('Error al enviar correo de restablecimiento:', error);
        let errorMessage = 'Error al enviar el correo de restablecimiento.';
        if (error.message === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Correo electrónico inválido.';
        }
        messageDiv.textContent = errorMessage;
        messageDiv.className = 'message error';
    }
});