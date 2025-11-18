// tailwind.config.js
const colors = require('tailwindcss/colors');

module.exports = {
    // 1. RUTAS DE ARCHIVOS: Crucial para que Tailwind escanee las clases (incluyendo md:grid-cols-4)
    content: [
        // Busca clases en el HTML y JS dentro de la carpeta 'public'
        "./public/index.html", 
        "./public/script.js",
    ],
    theme: {
        extend: {
            // 2. PALETA DE COLORES PERSONALIZADA
            colors: {
                // Color Principal (Morado, usado en Header y Botones)
                'primary': colors.purple[700], 
                'primary-dark': colors.purple[900], 
                // Color de Acento (Rosa/Pink, usado en Descuentos y Foco en inputs)
                'accent': colors.pink[500],
                // Color de Peligro (Rojo, usado en Precios de Oferta y Mensajes de Error)
                'danger': colors.red[600],
                
                'background': colors.gray[100], 
                'card-bg': colors.white,
            },
        },
    },
    plugins: [],
}