// ==========================
// FIREBASE
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// ==========================
// CONFIG FIREBASE
// ==========================

const firebaseConfig = {
    apiKey: "AIzaSyCt2saYt7SDEbxeS5u-8n44J0s9gISH95U",
    authDomain: "inventario-5c79e.firebaseapp.com",
    projectId: "inventario-5c79e",
    storageBucket: "inventario-5c79e.firebasestorage.app",
    messagingSenderId: "761477959721",
    appId: "1:761477959721:web:1bb5e8cfce66bdd9be4c38"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================
// ELEMENTOS HTML
// ==========================

const loginContainer = document.getElementById("loginContainer");
const appContainer = document.getElementById("appContainer");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const tablaInventario = document.getElementById("tablaInventario");
const tablaHistorial = document.getElementById("tablaHistorial");

const totalProductos = document.getElementById("totalProductos");
const totalPiezas = document.getElementById("totalPiezas");

const usuarioActual = document.getElementById("usuarioActual");

const buscador = document.getElementById("buscar");

const codigo = document.getElementById("codigo");
const descripcion = document.getElementById("descripcion");
const cantidad = document.getElementById("cantidad");

const btnEntrada = document.getElementById("btnEntrada");
const btnSalida = document.getElementById("btnSalida");
const btnExportar = document.getElementById("btnExportar");

// ==========================
// LOGIN
// ==========================

btnLogin.addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

    } catch (error) {

        alert("Error: " + error.message);

    }

});

// ==========================
// LOGOUT
// ==========================

btnLogout.addEventListener("click", async () => {

    await signOut(auth);

});

// ==========================
// VALIDAR SESION
// ==========================

onAuthStateChanged(auth, (user) => {

    if (user) {

        loginContainer.style.display = "none";
        appContainer.style.display = "block";

        usuarioActual.textContent = user.email;

        escucharInventario();
        escucharHistorial();

    } else {

        loginContainer.style.display = "block";
        appContainer.style.display = "none";

    }

});

// ==========================
// ENTRADA
// ==========================

btnEntrada.addEventListener("click", entradaInventario);

async function entradaInventario() {

    if (
        codigo.value.trim() === "" ||
        descripcion.value.trim() === "" ||
        cantidad.value.trim() === ""
    ) {
        alert("Complete todos los campos");
        return;
    }

    const refProducto = doc(
        db,
        "inventario",
        codigo.value.trim()
    );

    const productoDB = await getDoc(refProducto);

    if (productoDB.exists()) {

        const producto = productoDB.data();

        await updateDoc(refProducto, {

            cantidad:
                producto.cantidad +
                Number(cantidad.value),

            fecha:
                new Date().toLocaleString(),

            usuario:
                auth.currentUser.email

        });

    } else {

        await setDoc(refProducto, {

            codigo:
                codigo.value.trim(),

            descripcion:
                descripcion.value.trim(),

            cantidad:
                Number(cantidad.value),

            fecha:
                new Date().toLocaleString(),

            usuario:
                auth.currentUser.email

        });

    }

    await registrarMovimiento(
        "ENTRADA",
        codigo.value.trim(),
        descripcion.value.trim(),
        Number(cantidad.value)
    );

    limpiarFormulario();

}

// ==========================
// SALIDA
// ==========================

btnSalida.addEventListener("click", salidaInventario);

async function salidaInventario() {

    if (
        codigo.value.trim() === "" ||
        cantidad.value.trim() === ""
    ) {

        alert("Ingrese código y cantidad");
        return;

    }

    const refProducto = doc(
        db,
        "inventario",
        codigo.value.trim()
    );

    const productoDB = await getDoc(refProducto);

    if (!productoDB.exists()) {

        alert("Producto no encontrado");
        return;

    }

    const producto = productoDB.data();

    if (
        producto.cantidad <
        Number(cantidad.value)
    ) {

        alert("Inventario insuficiente");
        return;

    }

    const nuevoStock =
        producto.cantidad -
        Number(cantidad.value);

    await updateDoc(refProducto, {

        cantidad: nuevoStock,

        fecha:
            new Date().toLocaleString(),

        usuario:
            auth.currentUser.email

    });

    await registrarMovimiento(
        "SALIDA",
        producto.codigo,
        producto.descripcion,
        Number(cantidad.value)
    );

    limpiarFormulario();

}

// ==========================
// HISTORIAL
// ==========================

async function registrarMovimiento(
    tipo,
    codigo,
    descripcion,
    cantidad
) {

    await addDoc(
        collection(db, "historial"),
        {

            fecha:
                new Date().toLocaleString(),

            tipo,

            codigo,

            descripcion,

            cantidad,

            usuario:
                auth.currentUser.email

        }
    );

}

// ==========================
// INVENTARIO TIEMPO REAL
// ==========================

function escucharInventario() {

    onSnapshot(
        collection(db, "inventario"),
        (snapshot) => {

            tablaInventario.innerHTML = "";

            let contadorProductos = 0;
            let contadorPiezas = 0;

            snapshot.forEach((productoDB) => {

                const p = productoDB.data();

                contadorProductos++;
                contadorPiezas += p.cantidad;

                let clase = "";

                if (p.cantidad === 0) {

                    clase = "sin-stock";

                } else if (p.cantidad <= 5) {

                    clase = "stock-bajo";

                }

                tablaInventario.innerHTML += `
                <tr class="${clase}">
                    <td>${p.codigo}</td>
                    <td>${p.descripcion}</td>
                    <td>${p.cantidad}</td>
                    <td>${p.fecha}</td>
                    <td>${p.usuario}</td>
                </tr>
                `;

            });

            totalProductos.textContent =
                contadorProductos;

            totalPiezas.textContent =
                contadorPiezas;

        }
    );

}

// ==========================
// HISTORIAL TIEMPO REAL
// ==========================

function escucharHistorial() {

    const q = query(
        collection(db, "historial"),
        orderBy("fecha", "desc")
    );

    onSnapshot(q, (snapshot) => {

        tablaHistorial.innerHTML = "";

        snapshot.forEach((mov) => {

            const m = mov.data();

            tablaHistorial.innerHTML += `
            <tr>
                <td>${m.fecha}</td>
                <td>${m.tipo}</td>
                <td>${m.codigo}</td>
                <td>${m.descripcion}</td>
                <td>${m.cantidad}</td>
                <td>${m.usuario}</td>
            </tr>
            `;

        });

    });

}

// ==========================
// BUSCADOR
// ==========================

buscador.addEventListener(
    "keyup",
    buscarProducto
);

function buscarProducto() {

    const filtro =
        buscador.value.toLowerCase();

    const filas =
        tablaInventario.querySelectorAll("tr");

    filas.forEach((fila) => {

        const texto =
            fila.textContent.toLowerCase();

        fila.style.display =
            texto.includes(filtro)
                ? ""
                : "none";

    });

}

// ==========================
// EXPORTAR CSV
// ==========================

btnExportar.addEventListener(
    "click",
    exportarCSV
);

async function exportarCSV() {

    const snapshot =
        await getDocs(
            collection(db, "inventario")
        );

    let csv =
        "Codigo,Descripcion,Cantidad,Fecha,Usuario\n";

    snapshot.forEach((doc) => {

        const p = doc.data();

        csv +=
            `"${p.codigo}","${p.descripcion}","${p.cantidad}","${p.fecha}","${p.usuario}"\n`;

    });

    const blob =
        new Blob(
            [csv],
            { type: "text/csv" }
        );

    const enlace =
        document.createElement("a");

    enlace.href =
        URL.createObjectURL(blob);

    enlace.download =
        "Inventario.csv";

    enlace.click();

}

// ==========================
// LIMPIAR FORMULARIO
// ==========================

function limpiarFormulario() {

    codigo.value = "";
    descripcion.value = "";
    cantidad.value = "";

}
