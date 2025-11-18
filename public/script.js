//variables
console.log('commit 4: debug log');
const API_BASE_URL = 'https://www.cheapshark.com/api/1.0';
const GAMES_PER_PAGE = 12;
let currentPage = 0;
let stores = {}; 
let lastSearchQuery = ''; 

//elementos del DOM
const gamesGrid = document.getElementById('gamesGrid');
//a partir de aqui nuevos elementos como botones y filtros
const searchButton = document.getElementById('searchButton');
const loadMoreButton = document.getElementById('loadMoreButton');
const storeFilter = document.getElementById('storeFilter');
const sortOrder = document.getElementById('sortOrder');
const searchQueryInput = document.getElementById('searchQuery');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageContainer = document.getElementById('messageContainer');
const detailModal = document.getElementById('detailModal');
const modalContainer = document.getElementById('modalContainer');


// FUNCIONES DE UTILIDAD
/**
 * Muestra u oculta el spinner de carga.
 * @param {boolean} isVisible 
 */
function toggleLoading(isVisible) {
    loadingIndicator.style.display = isVisible ? 'flex' : 'none';
    if (isVisible) {
        // Ocultar botón "Cargar más" mientras carga
        loadMoreButton.classList.add('hidden'); 
    }
}

/**
 * Muestra mensajes de estado
 * @param {string} message 
 * @param {string} type - 'error', 'info', 'warning'
 */
function showMessage(message, type = 'info') {
    messageContainer.textContent = message;
    
    // Resetear clases y usar clases base del HTML
    messageContainer.className = 'p-4 mb-8 font-semibold transition-all duration-300 border-l-4 rounded-none shadow-md text-flash-text';
    
    if (message === '') {
        messageContainer.classList.add('hidden');
        return;
    }

    // Aplicar estilos del tema según el tipo
    switch (type) {
        case 'error':
            messageContainer.classList.add('bg-red-900', 'text-white', 'border-red-500', 'border-4');
            break;
        case 'warning':
            messageContainer.classList.add('bg-yellow-900', 'text-white', 'border-yellow-500', 'border-4');
            break;
        case 'info':
        default:
            messageContainer.classList.add('bg-flash-card', 'text-flash-text', 'border-flash-accent', 'border-4');
            break;
    }
    messageContainer.classList.remove('hidden');
}

/**
 * Formato de precio USD.
 * @param {number|string} price
 * @returns {string} 
 */
function formatPrice(price) {
    price = parseFloat(price);
    if (isNaN(price)) return 'N/A';
    if (price === 0.00) return 'Gratis';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

/**
 * Retorna la clase de color para la puntuación (Metascore/Steam).
 * @param {number|string} score 
 * @returns {string} 
 */
function getScoreClass(score) {
    // Para Steam Rating (texto)
    if (typeof score === 'string') {
        const lowerScore = score.toLowerCase();
        if (lowerScore.includes('positive') || lowerScore.includes('overwhelmingly')) return 'score-green';
        if (lowerScore.includes('mixed') || lowerScore.includes('mostly')) return 'score-yellow';
        return 'score-red';
    }
    
    // Para Metascore (número)
    score = parseInt(score);
    if (isNaN(score) || score === 0) return 'score-unknown';
    if (score >= 75) return 'score-green';
    if (score >= 50) return 'score-yellow';
    return 'score-red';
}

// CARGA DE DATOS Y RENDERIZADO
/**
 * Carga de tiendas desde la API
 */
async function loadStores() {
    try {
        const response = await fetch(`${API_BASE_URL}/stores`);
        if (!response.ok) throw new Error('Error al cargar las tiendas');
        const data = await response.json();

        stores = {};
        storeFilter.innerHTML = '<option value="">Todas las tiendas</option>';

        data.forEach(store => {
            if (store.isActive == 1) { 
                stores[store.storeID] = store.storeName;
                const option = document.createElement('option');
                option.value = store.storeID;
                option.textContent = store.storeName;
                storeFilter.appendChild(option);
            }
        });

    } catch (error) {
        console.error('Error en loadStores:', error);
        showMessage('No se pudo cargar las tiendas. Algunos filtros podrían no estar disponibles', 'error');
    }
}

/**
 * Carga de ofertas usando el endpoint 
 * @param {boolean} isNewSearch - Indica si es una nueva búsqueda
 */
async function loadDeals(isNewSearch = true) {
    if (isNewSearch) {
        gamesGrid.innerHTML = ''; 
        currentPage = 0;
        lastSearchQuery = searchQueryInput.value.trim();
        loadMoreButton.classList.add('hidden');
        showMessage('');
    }

    toggleLoading(true); 

    const storeId = storeFilter.value;
    const sortBy = sortOrder.value;
    
    //Iniciar la URL sin storeID
    let apiUrl = `${API_BASE_URL}/deals?sortBy=${sortBy}&pageNumber=${currentPage}&pageSize=${GAMES_PER_PAGE}`;

    //Solo agregar storeID
    if (storeId) { 
        apiUrl += `&storeID=${storeId}`; 
    }
    
    if (lastSearchQuery) {
        apiUrl += `&title=${encodeURIComponent(lastSearchQuery)}`; 
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('La API de CheapShark no respondió o falló la consulta');
        const dealsToRender = await response.json();
        const totalResults = dealsToRender.length;
        
        if (dealsToRender.length === 0 && isNewSearch) {
            showMessage(`No se encontraron ofertas ${lastSearchQuery ? `para el juego "${lastSearchQuery}"` : 'con estos filtros'}.`, 'info');
        } else if (dealsToRender.length > 0) {
            renderDeals(dealsToRender); 

            // Verificar si mostrar botón cargar mas
            if (!lastSearchQuery && totalResults === GAMES_PER_PAGE) {
                loadMoreButton.classList.remove('hidden');
            } else if (lastSearchQuery && totalResults === GAMES_PER_PAGE) {
                 loadMoreButton.classList.remove('hidden');
            } else {
                 loadMoreButton.classList.add('hidden');
            }
        }
        
        currentPage++; 
        
    } catch (error) {
        console.error('Error al cargar las ofertas:', error);
        showMessage(`Error: ${error.message}. No se pudieron cargar los datos de la API`, 'error');
    } finally {
        toggleLoading(false);
    }
}


/**
 * Renderiza las tarjetas de ofertas en el DOM
 */
function renderDeals(deals) {
    deals.forEach(deal => {
        const dealElement = createDealCard(deal);
        gamesGrid.appendChild(dealElement);
    });
}

/**
 * Crea el elemento HTML para una tarjeta de oferta, usando las clases de estilo del tema
 * @returns {HTMLElement} 
 */
function createDealCard(deal) {
    const metascore = parseInt(deal.metacriticScore) || 0;
    const salePrice = parseFloat(deal.salePrice);
    const retailPrice = parseFloat(deal.normalPrice); // Usar solo el valor real
const originalPrice = isNaN(retailPrice) || retailPrice < salePrice ? salePrice * 1.5 : retailPrice; // Fallback más explícito

const savings = originalPrice > salePrice 
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) 
    : 0;

const storeName = stores[deal.storeID] || 'Tienda Desconocida';

    
    const card = document.createElement('div');
    card.className = 'overflow-hidden transition-shadow border-2 border-transparent rounded-lg shadow-md cursor-pointer bg-flash-card hover:shadow-xl hover:border-2 hover:border-flash-primary'; 
    card.dataset.dealId = deal.dealID;

    card.innerHTML = `
        <div class="h-40 bg-gray-900 overflow-hidden">
            <img src="${deal.thumb || 'https://placehold.co/600x400/CCCCCC/333333?text=Sin+Imagen'}" 
                alt="${deal.title}" 
                onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/333333?text=Sin+Imagen';"
                class="w-full h-full object-cover opacity-80 hover:opacity-100 transition duration-300">
        </div>
        <div class="p-4 flex flex-col justify-between h-auto text-white">
            <h3 class="text-lg font-semibold text-flash-primary truncate mb-1">${deal.title}</h3>
            
            <div class="flex justify-between items-end mt-2">
                <div>
                    <p class="text-2xl font-bold text-flash-primary">${formatPrice(salePrice)}</p>
                    <p class="text-xs text-gray-500 line-through">
                        ${retailPrice > salePrice ? formatPrice(retailPrice) : ''}
                    </p>
                </div>
                
                <div class="flex flex-col items-end space-y-1">
                    <div class="score-box ${getScoreClass(metascore)}">
                        MC: ${metascore > 0 ? metascore : 'N/A'}
                    </div>
                    ${savings > 0 ? `
                        <div class="bg-flash-primary text-flash-accent text-xs font-bold px-2 py-0.5 rounded">
                            -${savings}%
                        </div>
                    ` : ''}
                </div>
            </div>

            <p class="text-xs text-gray-500 mt-2">Tienda: ${storeName}</p>
        </div>
    `;

    card.addEventListener('click', () => openModal(deal.dealID));

    return card;
}

// MODAL DE DETALLES

/**
 * Muestra el modal y carga los detalles de la oferta, usando las clases de estilo del tema
 * @param {string} dealID - id de la oferta
 */
async function openModal(dealID) {
    
    modalContainer.innerHTML = `
        <div class="flex justify-center items-center h-64 p-6 text-white">
            <div class="spinner w-12 h-12"></div>
            <p class="ml-4 text-flash-primary font-bold">Buscando la mejor oferta</p>
        </div>
    `;
    
    detailModal.classList.remove('hidden'); 
    setTimeout(() => detailModal.classList.add('active'), 10);

    try {
        const response = await fetch(`${API_BASE_URL}/deals?id=${dealID}`);
        if (!response.ok) throw new Error('Error al obtener los detalles de la oferta');
        const data = await response.json();
        
        const info = data.info; 
        const deals = data.cheaperStores || []; 

        const salePrice = parseFloat(info.salePrice);
        const normalPrice = parseFloat(info.retailPrice);
        const storeName = stores[info.storeID] || 'Tienda principal';
        const metascore = parseInt(info.metacriticScore) || 0;
        
        const steamRatingText = info.steamRatingText || 'NA';

        const savings = Math.round(((normalPrice - salePrice) / normalPrice) * 100) || 0;
        
        // Listar otras ofertas
        const otherDealsHtml = deals.filter(d => d.storeID !== info.storeID).slice(0, 5).map(d => {
            const otherStoreName = stores[d.storeID] || 'Tienda';
            const otherSalePrice = formatPrice(d.salePrice);
            return `
                <a href="https://www.cheapshark.com/redirect?dealID=${d.dealID}" target="_blank" class="flex justify-between items-center py-2 px-3 border-b border-gray-700 hover:bg-gray-800 transition">
                    <span class="text-sm font-medium text-white">${otherStoreName}</span>
                    <span class="text-lg font-bold text-flash-primary">${otherSalePrice}</span>
                </a>
            `;
        }).join('');
        
        const otherDealsSection = deals.length > 1 ? `
            <div class="mt-6 pt-4 border-t border-gray-700">
                <h4 class="text-xl font-bold text-flash-primary mb-3">Más ofertas Disponibles</h4>
                <div class="space-y-1 max-h-40 overflow-y-auto">
                    ${otherDealsHtml || '<p class="text-gray-500 text-sm">No hay ofertas más baratas disponibles.</p>'}
                </div>
            </div>
        ` : '';

        modalContainer.innerHTML = `
            <button id="closeModalButtonDynamic" aria-label="Cerrar"
                    class="absolute top-3 right-3 z-30 p-2 bg-gray-900/50 hover:bg-gray-700 text-white rounded-full transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div class="h-56 overflow-hidden bg-gray-200">
                <img id="modalImage" 
                    src="${info.thumb || 'https://placehold.co/600x400/CCCCCC/333333?text=Sin+Imagen'}" 
                    alt="Imagen del Juego" 
                    onerror="this.onerror=null;this.src='https://placehold.co/600x400/CCCCCC/333333?text=Sin+Imagen';"
                    class="w-full h-full object-cover opacity-80">
            </div>
            <div class="p-6 text-white">
                <h3 id="modalTitle" class="text-3xl font-extrabold text-flash-primary mb-2">${info.title}</h3>
                <p id="modalStore" class="text-sm text-gray-500 mb-4">Oferta principal en: ${storeName}</p>

                <div class="flex flex-wrap justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <div class="flex flex-col mb-4 sm:mb-0">
                        ${normalPrice > salePrice ? `<p class="text-base text-gray-500 line-through">Antes: <span id="modalNormalPrice" class="font-medium">${formatPrice(normalPrice)}</span></p>` : ''}
                        <p class="text-4xl font-black text-flash-primary mt-1">
                            ¡Solo <span id="modalSalePrice">${formatPrice(salePrice)}</span>!
                        </p>
                    </div>

                    <div class="flex space-x-4">
                        <div class="flex flex-col items-center">
                            <p class="text-sm text-gray-400 font-medium mb-1">Metascore</p>
                            <div class="score-box ${getScoreClass(metascore)} w-12 h-12 flex items-center justify-center text-lg font-bold rounded-full">${metascore > 0 ? metascore : 'N/A'}</div>
                        </div>
                        <div class="flex flex-col items-center">
                            <p class="text-sm text-gray-400 font-medium mb-1">Steam Rating</p>
                            <div class="score-box ${getScoreClass(steamRatingText)} w-12 h-12 flex items-center justify-center text-center text-xs font-bold rounded-full leading-none">${steamRatingText.split(' ').join('<br>')}</div>
                        </div>
                    </div>
                    
                    ${savings > 0 ? `
                        <div class="bg-flash-primary text-flash-accent text-xl font-bold px-4 py-2 rounded shadow-lg mt-4 w-full text-center sm:w-auto sm:mt-0">
                            Ahorra <span id="modalSavings">${savings}%</span>
                        </div>
                    ` : ''}
                </div>

                <a id="modalDealLink" href="https://www.cheapshark.com/redirect?dealID=${dealID}" target="_blank"
                   class="block w-full text-center py-3 bg-flash-primary text-flash-accent font-black rounded-sm shadow-md hover:bg-yellow-700 transition uppercase">
                    Ir a la Oferta en ${storeName}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5 inline ml-2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                </a>
                ${otherDealsSection}
            </div>
        `;
        
        document.getElementById('closeModalButtonDynamic').addEventListener('click', closeModal);

    } catch (error) {
        console.error('Error al abrir modal:', error);

        modalContainer.innerHTML = `
            <div class="p-6 text-center relative bg-flash-card text-white">
                 <button id="closeModalButtonDynamicError" aria-label="Cerrar"
                         class="absolute top-3 right-3 p-2 bg-gray-900/50 hover:bg-gray-700 text-white rounded-full transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h3 class="text-xl font-bold text-flash-primary mb-4">Error al cargar detalles</h3>
                <p class="text-gray-400">Lo sentimos, no pudimos obtener más detalles de esta oferta. Intenta más tarde.</p>
            </div>
        `;
         document.getElementById('closeModalButtonDynamicError').addEventListener('click', closeModal);
    }
}

/**
 * Cierra el modal
 */
function closeModal() {
    detailModal.classList.remove('active');

    setTimeout(() => {
        detailModal.classList.add('hidden');
        modalContainer.innerHTML = ''; // borrar contenido
    }, 300); 
}


// INICIALIZACIÓN

/**
 * Inicializa los listeners.
 */
function initializeListeners() {
    // Escuchar el click del botón de búsqueda
    searchButton.addEventListener('click', () => loadDeals(true));

    // Escuchar Enter en el input de búsqueda
    searchQueryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadDeals(true);
        }
    });

    // Escuchar cambios en filtros (inicia nueva búsqueda)
    storeFilter.addEventListener('change', () => loadDeals(true));
    sortOrder.addEventListener('change', () => loadDeals(true));

    // Cargar más (usa la página actual)
    loadMoreButton.addEventListener('click', () => loadDeals(false));
    
    // Cerrar modal al hacer click fuera
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) { 
            closeModal();
        }
    });
}


/**
 * Inicializa la app.
 */
async function initializeApp() {
    initializeListeners();
    // Carga tiendas y luego ofertas
    await loadStores(); 
    await loadDeals(true); 
    showMessage('¡Bienvenido! Busca por título o explora las ofertas actuales.', 'info');
}

