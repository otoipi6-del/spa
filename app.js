
let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.add('show');
    const mainHeader = document.getElementById('main-header'); if(mainHeader) mainHeader.style.marginTop = '48px';
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { hideInstallBanner(); }
    deferredPrompt = null;
});

function hideInstallBanner() {
    installBanner.classList.remove('show');
    const mainHeader2 = document.getElementById('main-header'); if(mainHeader2) mainHeader2.style.marginTop = '0';
}

window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    deferredPrompt = null;
});

// ====== БЕЗОПАСНЫЙ ПАРСИНГ JSON (не падаем при битом localStorage) ======
function safeJSONParse(str, fallback) {
    if (str === null || str === undefined || str === '') return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
}

// ====== ПОМОЩНИКИ ФОРМАТИРОВАНИЯ ЧИСЕЛ ======
function formatNumber(value, decimals) {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    if (isNaN(num)) return value;
    return num.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function parseNumber(value) {
    if (!value || value === '') return NaN;
    const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned);
}

function formatNumberInput(input) {
    const val = input.value;
    if (!val || val === '') return;
    const num = parseNumber(val);
    if (isNaN(num)) return;
    // Ценовые поля: сохраняем любое количество десятичных знаков, как введено
    if (input.classList && input.classList.contains('price-input')) {
        input.value = String(val).replace(/\s/g, '').replace(',', '.');
        return;
    }
    if (!isNaN(num)) {
        let decimals = 2;
        if (input.id.includes('qty') && input.id.includes('btc')) decimals = 8;
        else if (input.id.includes('qty') && input.id.includes('gold')) decimals = 3;
        else if (input.id.includes('qty')) decimals = 2;
        else if (input.id === 'liq-deposit') decimals = 0;
        else if (input.id === 'futures-liq-deposit') decimals = 0;
        else if (input.id === 'risk-deposit') decimals = 0;
        else if (input.classList && input.classList.contains('liq-vol')) decimals = 0;
        else if (input.classList && input.classList.contains('trade-sum')) decimals = 0;
        input.value = formatNumber(num, decimals);
    }
}

function unformatNumberInput(input) {
    if (input.classList && input.classList.contains('price-input')) return;
    const val = input.value;
    if (!val || val === '') return;
    const num = parseNumber(val);
    if (!isNaN(num)) {
        input.value = String(num).replace('.', ',');
    }
    setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
}

function getInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return NaN;
    return parseNumber(input.value);
}


// ====== ОТКРЫТИЕ КАЛЕНДАРЯ ======
function openDatePicker(wrapper, event) {
    // Не открывать календарь при клике на текстовое поле (пользователь хочет ввести дату вручную)
    if (event && event.target && event.target.classList.contains('date-text-input')) {
        return;
    }

    const dateInput = wrapper.querySelector('.native-date-input');
    if (!dateInput) return;

    // Сначала пробуем современный showPicker() (Chrome 99+, Safari 16+, Edge 99+)
    if (typeof dateInput.showPicker === 'function') {
        try {
            dateInput.showPicker();
            return;
        } catch (e) {}
    }

    // Запасной вариант: фокус на поле даты (открывает календарь в некоторых браузерах)
    dateInput.focus();

    // Дополнительный запасной вариант: имитация нажатия мыши на поле даты
    // Помогает в браузерах, где фокус не открывает календарь
    setTimeout(() => {
        const event = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        dateInput.dispatchEvent(event);
    }, 10);
}

// ====== ПОМОЩНИКИ ФОРМАТА ДАТЫ ======
function formatDateToDDMMYY(dateStr) {
    if (!dateStr) return '';
    if (/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr)) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return day + '.' + month + '.' + year;
}

function parseDDMMYY(dateStr) {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
    if (!match) return '';
    const [_, day, month, yearShort] = match;
    const year = parseInt(yearShort, 10) < 50 ? '20' + yearShort : '19' + yearShort;
    return year + '-' + month + '-' + day;
}

function handleDateInput(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length >= 2) val = val.slice(0, 2) + '.' + val.slice(2);
    if (val.length >= 5) val = val.slice(0, 5) + '.' + val.slice(5);
    if (val.length > 8) val = val.slice(0, 8);
    input.value = val;
}

function handleDateBlur(input, callback) {
    const val = input.value.trim();
    if (!val) { if (callback) callback(''); return; }
    let cleaned = val.replace(/[^\d]/g, '');
    let formatted = '';
    if (cleaned.length === 6) {
        formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 4) + '.' + cleaned.slice(4, 6);
    } else if (cleaned.length === 8) {
        formatted = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 4) + '.' + cleaned.slice(4, 8);
    } else {
        formatted = val;
    }
    input.value = formatted;
    if (callback) callback(formatted);
}

function handleDateKeydown(e, input) {
    if (e.key === 'Enter') { input.blur(); }
}

function handleNativeDateChange(nativeInput, type, id, field) {
    const wrapper = nativeInput.closest('.date-wrapper');
    const textInput = wrapper.querySelector('.date-text-input');
    const isoValue = nativeInput.value;
    if (isoValue) {
        const formatted = formatDateToDDMMYY(isoValue);
        textInput.value = formatted;
        updateTradeDate(type, id, field, formatted);
    } else {
        // Нажата кнопка очистки
        textInput.value = '';
        updateTrade(type, id, field, '');
        if (field === 'sellDate') checkCompleted(type, id);
    }
}

function updateTradeDate(type, id, field, value) {
    let val = value.trim();
    if (!val) { updateTrade(type, id, field, ''); return; }
    let cleaned = val.replace(/[^\d]/g, '');
    if (cleaned.length === 6) {
        val = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 4) + '.' + cleaned.slice(4, 6);
    } else if (cleaned.length === 8) {
        val = cleaned.slice(0, 2) + '.' + cleaned.slice(2, 4) + '.' + cleaned.slice(4, 8);
    }
    const card = document.getElementById(id);
    if (card) {
        const textInputs = card.querySelectorAll('.date-text-input');
        const idx = field === 'buyDate' ? 0 : 1;
        if (textInputs[idx]) textInputs[idx].value = val;
    }
    updateTrade(type, id, field, val);
    if (field === 'sellDate') checkCompleted(type, id);
}

const tickers = ['BTC','ETH','BNB','SOL','LTC','LINK','SUI','DOGE','ZK','ONDO','UNI','TWT'];
let spotTrades = safeJSONParse(localStorage.getItem('spotTrades'), []);
spotTrades.forEach(t => { if (!t.exchange) t.exchange = 'Dzengi'; });
let futuresTrades = safeJSONParse(localStorage.getItem('futuresTrades'), []);
futuresTrades.forEach(t => { if (!t.exchange) t.exchange = 'Dzengi'; });
let spotCounter = parseInt(localStorage.getItem('spotCounter') || '1', 10);
let futuresCounter = parseInt(localStorage.getItem('futuresCounter') || '1', 10);
let currentSpotExchange = localStorage.getItem('currentSpotExchange') || 'Dzengi';
let currentFuturesExchange = localStorage.getItem('currentFuturesExchange') || 'Dzengi';

// ====== СОСТОЯНИЕ ЦЕН API ======
let apiPrices = {
    btc: null,
    gold: null
};


// ====== КОТИРОВКИ ======
let quotesData = {
    btc: { price: null, change: null, prevPrice: null },
    eth: { price: null, change: null, prevPrice: null },
    sol: { price: null, change: null, prevPrice: null },
    link: { price: null, change: null, prevPrice: null },
    uni: { price: null, change: null, prevPrice: null },
    doge: { price: null, change: null, prevPrice: null },
    gold: { price: null, change: null, prevPrice: null },
    copper: { price: null, change: null, prevPrice: null },
    brent: { price: null, change: null, prevPrice: null },
    eur: { price: null, change: null, prevPrice: null },
    fred: { price: null, change: null, prevPrice: null },
};



function updateQuoteDisplay(asset, price, changePercent) {
    const priceEl = document.getElementById('quote-' + asset + '-price');
    const changeEl = document.getElementById('quote-' + asset + '-change');
    const priceEl2 = document.getElementById('quote-' + asset + '-retrace-price');
    const changeEl2 = document.getElementById('quote-' + asset + '-retrace-change');
    if (!priceEl && !priceEl2) return;

    const prevPrice = quotesData[asset].prevPrice;
    quotesData[asset].price = price;
    quotesData[asset].change = changePercent;

    if (asset === 'fred') {
        // FED balance in trillions
        if (priceEl) priceEl.textContent = formatNumber(price / 1000000, 2) + 'T';
        if (changeEl) { changeEl.textContent = '—'; changeEl.className = 'quote-change'; }
        if (priceEl2) priceEl2.textContent = formatNumber(price / 1000000, 2) + 'T';
        if (changeEl2) { changeEl2.textContent = '—'; changeEl2.className = 'quote-change'; }
        calculateRetrace(asset);
        return;
    }

    else {
        const decimals = asset === 'btc' || asset === 'eth' || asset === 'gold' ? 1 : asset === 'copper' ? 2 : asset === 'doge' ? 4 : asset === 'eur' ? 5 : 2;
        if (priceEl) priceEl.textContent = formatNumber(price, decimals);
        if (changeEl) {
            changeEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(1) + '%';
            if (changePercent >= 0) {
                changeEl.className = 'quote-change up';
            } else {
                changeEl.className = 'quote-change down';
            }
        }
        if (priceEl2) priceEl2.textContent = formatNumber(price, decimals);
        if (changeEl2) {
            changeEl2.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(1) + '%';
            changeEl2.className = changePercent >= 0 ? 'quote-change up' : 'quote-change down';
        }
        // Update retrace calculation
        calculateRetrace(asset);
    }

    // Flash only on actual price change during scheduled updates
    if (prevPrice !== null && price !== prevPrice) {
        // Clear any pending flash reset to prevent overlapping transitions
        if (priceEl._flashTimeout) {
            clearTimeout(priceEl._flashTimeout);
        }
        priceEl.style.transition = 'none';
        priceEl.style.color = price > prevPrice ? 'var(--green)' : 'var(--red)';
        priceEl._flashTimeout = setTimeout(() => {
            priceEl.style.transition = 'color 1.5s ease';
            priceEl.style.color = '';
            priceEl._flashTimeout = null;
        }, 50);
    }

    quotesData[asset].prevPrice = price;
}

// ===== RETRACE CALCULATOR =====
const extremumStorageKey = 'trading_extremums';

function loadExtremums() {
    try {
        return JSON.parse(localStorage.getItem(extremumStorageKey)) || {};
    } catch(e) { return {}; }
}

function saveExtremum(asset, value) {
    const data = loadExtremums();
    data[asset] = value;
    localStorage.setItem(extremumStorageKey, JSON.stringify(data));
}

function calculateRetrace(asset) {
    const priceEl = document.getElementById('quote-' + asset + '-price');
    const extremumEl = document.getElementById('quote-' + asset + '-retrace-extremum');
    const changeEl = document.getElementById('quote-' + asset + '-retrace-change');
    if (!priceEl || !extremumEl || !changeEl) return;

    // Parse price: remove ALL non-numeric chars except dot/comma/minus, then comma→dot
    const priceText = priceEl.textContent.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    const price = parseFloat(priceText);
    // Parse extremum: same cleanup
    const extremumText = (extremumEl.value || '').replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
    const extremum = parseFloat(extremumText);

    if (isNaN(price) || isNaN(extremum) || extremum === 0) {
        changeEl.textContent = '—';
        changeEl.className = 'quote-change';
        return;
    }

    const retrace = ((price - extremum) / extremum) * 100;
    const sign = retrace >= 0 ? '+' : '';
    changeEl.textContent = sign + retrace.toFixed(2) + '%';
    changeEl.className = 'quote-change ' + (retrace >= 0 ? 'up' : 'down');
}
function initRetraceInputs() {
    const data = loadExtremums();
    const assets = ['btc', 'eth', 'sol', 'link', 'uni', 'doge', 'brent', 'copper', 'gold', 'eur'];
    assets.forEach(asset => {
        const el = document.getElementById('quote-' + asset + '-retrace-extremum');
        if (el && data[asset]) {
            el.value = data[asset];
            formatNumberInput(el);
            calculateRetrace(asset);
        }
        if (el) {
            el.addEventListener('input', function() {
                saveExtremum(asset, this.value);
                calculateRetrace(asset);
            });
        }
    });
}

// ===== END RETRACE CALCULATOR =====

function updateQuotesTimestamp() {
    const now = new Date();
    const timeStr = '<span class="update-dot"></span>Обновлено: ' + now.toLocaleTimeString('ru-RU');
    const el = document.getElementById('quotes-update-time');
    if (el) el.innerHTML = timeStr;
    const el2 = document.getElementById('quotes-update-time-retrace');
    if (el2) el2.innerHTML = timeStr;
}

async function fetchQuotes() {
    const assets = [
        { asset: 'btc', symbol: 'BTCUSDT', api: 'spot' },
        { asset: 'eth', symbol: 'ETHUSDT', api: 'spot' },
        { asset: 'sol', symbol: 'SOLUSDT', api: 'spot' },
        { asset: 'link', symbol: 'LINKUSDT', api: 'spot' },
        { asset: 'uni', symbol: 'UNIUSDT', api: 'spot' },
        { asset: 'doge', symbol: 'DOGEUSDT', api: 'spot' },
        { asset: 'gold', symbol: 'XAUUSDT', api: 'futures' },
        { asset: 'copper', symbol: 'COPPERUSDT', api: 'futures' },
        { asset: 'brent', symbol: 'BZUSDT', api: 'futures' },
        { asset: 'eur', symbol: 'EURUSDT', api: 'spot' }
    ];

    // Fetch FED balance sheet data (independent, can run in parallel)
    fetchFredBalance();

    // Fetch all assets in parallel, then update DOM all at once
    const results = await Promise.all(assets.map(async (a) => {
        let baseUrl;
        if (a.api === 'futures') baseUrl = 'https://fapi.binance.com/fapi/v1';
        else baseUrl = 'https://api.binance.com/api/v3';

        try {
            // Get current price from ticker
            const tickerRes = await fetch(baseUrl + '/ticker/24hr?symbol=' + a.symbol);
            let price = null;
            if (tickerRes.ok) {
                const tickerData = await tickerRes.json();
                price = parseFloat(tickerData.lastPrice);
            }

            // Get daily change from klines (1d, limit=2)
            let dailyChange = null;
            try {
                const klineRes = await fetch(baseUrl + '/klines?symbol=' + a.symbol + '&interval=1d&limit=2');
                if (klineRes.ok) {
                    const klineData = await klineRes.json();
                    if (klineData.length >= 2) {
                        const prevDayClose = parseFloat(klineData[0][4]);
                        const currentDayClose = parseFloat(klineData[1][4]);
                        dailyChange = ((currentDayClose - prevDayClose) / prevDayClose) * 100;
                    }
                }
            } catch (e) {}

            return { asset: a.asset, price, dailyChange };
        } catch (e) {return { asset: a.asset, price: null, dailyChange: null };
        }
    }));

    // Update all DOM elements at once — flashes will be synchronized
    results.forEach(r => {
        if (r.price !== null) {
            updateQuoteDisplay(r.asset, r.price, r.dailyChange !== null ? r.dailyChange : 0);
        }
    });

    updateQuotesTimestamp();
}

// ====== FED BALANCE SHEET ======
// Uses FRED API (series WALCL) - free API key required
// Users can set their key via localStorage: localStorage.setItem('fredApiKey', 'YOUR_KEY')
// Without key, shows cached or placeholder data
async function fetchFredBalance() {
    const priceEl = document.getElementById('quote-fred-price');
    const weeklyEl = document.getElementById('quote-fred-weekly');
    const monthlyEl = document.getElementById('quote-fred-monthly');
    if (!priceEl || !weeklyEl || !monthlyEl) return;

    const apiKey = localStorage.getItem('fredApiKey') || (window.APP_CONFIG && window.APP_CONFIG.fredApiKey) || '';

    // Try to get cached data first
    const cached = localStorage.getItem('fredBalanceData');
    let cachedData = null;
    if (cached) {
        try { cachedData = JSON.parse(cached); } catch (e) {}
    }

    // Use cached data if less than 24h old
    if (cachedData && (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000)) {
        displayFredData(cachedData);
        return;
    }

    if (!apiKey) {
        if (cachedData) {
            displayFredData(cachedData);
        } else {
            priceEl.textContent = '—';
            weeklyEl.textContent = '—';
            monthlyEl.textContent = '—';
        }
        return;
    }

    try {
        // Use CORS proxy for FRED API
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const fredUrl = encodeURIComponent('https://api.stlouisfed.org/fred/series/observations?series_id=WALCL&api_key=' + apiKey + '&file_type=json&frequency=w&sort_order=desc&limit=12');
        const res = await fetch(proxyUrl + fredUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const obs = data.observations || [];

        if (obs.length < 2) {
            priceEl.textContent = '—';
            return;
        }

        // Filter out empty/null values (FRED uses '.' for missing data)
        const validObs = obs.filter(o => o.value && o.value !== '.');
        if (validObs.length < 2) {
            priceEl.textContent = '—';
            return;
        }

        // validObs[0] = most recent, validObs[1] = previous week
        const currentValue = parseFloat(validObs[0].value);
        const prevWeekValue = parseFloat(validObs[1].value);
        const weeklyChange = ((currentValue - prevWeekValue) / prevWeekValue) * 100;

        // Monthly: compare current with ~4 weeks ago
        let monthlyChange = null;
        if (validObs.length >= 5) {
            const monthAgoValue = parseFloat(validObs[4].value);
            monthlyChange = ((currentValue - monthAgoValue) / monthAgoValue) * 100;
        }

        const result = {
            value: currentValue,
            weeklyChange: weeklyChange,
            monthlyChange: monthlyChange,
            timestamp: Date.now()
        };

        localStorage.setItem('fredBalanceData', JSON.stringify(result));
        displayFredData(result);
    } catch (err) {if (cachedData) displayFredData(cachedData);
        else {
            priceEl.textContent = '—';
            weeklyEl.textContent = '—';
            monthlyEl.textContent = '—';
        }
    }
}

function displayFredData(data) {
    const priceEl = document.getElementById('quote-fred-price');
    const weeklyEl = document.getElementById('quote-fred-weekly');
    const monthlyEl = document.getElementById('quote-fred-monthly');
    if (!priceEl || !weeklyEl || !monthlyEl) return;

    // Price in trillions
    priceEl.textContent = formatNumber(data.value / 1000000, 2) + 'T';

    // Weekly change
    if (data.weeklyChange !== null && !isNaN(data.weeklyChange)) {
        const sign = data.weeklyChange >= 0 ? '+' : '';
        weeklyEl.textContent = sign + data.weeklyChange.toFixed(1) + '%';
        weeklyEl.className = 'quote-weekly ' + (data.weeklyChange >= 0 ? 'up' : 'down');
    } else {
        weeklyEl.textContent = '—';
        weeklyEl.className = 'quote-weekly';
    }

    // Monthly change
    if (data.monthlyChange !== null && !isNaN(data.monthlyChange)) {
        const sign = data.monthlyChange >= 0 ? '+' : '';
        monthlyEl.textContent = sign + data.monthlyChange.toFixed(1) + '%';
        monthlyEl.className = 'quote-monthly ' + (data.monthlyChange >= 0 ? 'up' : 'down');
    } else {
        monthlyEl.textContent = '—';
        monthlyEl.className = 'quote-monthly';
    }
}


function switchTab(tab, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const sectionEl = document.getElementById('section-' + tab); if(sectionEl) sectionEl.classList.add('active');
    const navEl = el || (typeof window.event !== 'undefined' && window.event.currentTarget);
    if (navEl) navEl.classList.add('active');
    const titles = { calculators: 'Калькуляторы', spot: 'Спот', futures: 'Фьючерсы', quotes: 'Котировки' };
    const pageTitleEl = document.getElementById('page-title'); if(pageTitleEl) pageTitleEl.textContent = titles[tab];

    if (tab === 'spot') renderTrades('spot');
    if (tab === 'futures') {
        renderTrades('futures');
        loadFuturesLiqDeposit();
        updateFuturesQuotes();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    updateThemeToggleUI();
    localStorage.setItem('darkTheme', document.body.classList.contains('dark') ? '1' : '0');
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.content = document.body.classList.contains('dark') ? '#1a1a2e' : '#e8dcc8';
}

function updateThemeToggleUI() {
    const isDark = document.body.classList.contains('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}

function initTheme() {
    const saved = localStorage.getItem('darkTheme');
    if (saved === '1') {
        document.body.classList.add('dark');
    }
    updateThemeToggleUI();
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.content = document.body.classList.contains('dark') ? '#1a1a2e' : '#e8dcc8';
}



async function fetchPeriodChanges() {
    const assets = [
        { asset: 'btc', symbol: 'BTCUSDT', api: 'spot' },
        { asset: 'eth', symbol: 'ETHUSDT', api: 'spot' },
        { asset: 'sol', symbol: 'SOLUSDT', api: 'spot' },
        { asset: 'link', symbol: 'LINKUSDT', api: 'spot' },
        { asset: 'uni', symbol: 'UNIUSDT', api: 'spot' },
        { asset: 'doge', symbol: 'DOGEUSDT', api: 'spot' },
        { asset: 'gold', symbol: 'XAUUSDT', api: 'futures' },
        { asset: 'copper', symbol: 'COPPERUSDT', api: 'futures' },
        { asset: 'brent', symbol: 'BZUSDT', api: 'futures' },
        { asset: 'eur', symbol: 'EURUSDT', api: 'spot' }
    ];

    // Fetch all weekly and monthly data in parallel
    const results = await Promise.all(assets.map(async (a) => {
        let baseUrl;
        if (a.api === 'futures') baseUrl = 'https://fapi.binance.com/fapi/v1';
        else baseUrl = 'https://api.binance.com/api/v3';

        let weeklyChange = null;
        let monthlyChange = null;

        // Weekly (1w klines, limit=2)
        try {
            const res = await fetch(baseUrl + '/klines?symbol=' + a.symbol + '&interval=1w&limit=2');
            if (res.ok) {
                const data = await res.json();
                if (data.length >= 2) {
                    const prevWeekClose = parseFloat(data[0][4]);
                    const currentWeekClose = parseFloat(data[1][4]);
                    weeklyChange = ((currentWeekClose - prevWeekClose) / prevWeekClose) * 100;
                }
            }
        } catch (e) {}

        // Monthly (1M klines, limit=2)
        try {
            const res = await fetch(baseUrl + '/klines?symbol=' + a.symbol + '&interval=1M&limit=2');
            if (res.ok) {
                const data = await res.json();
                if (data.length >= 2) {
                    const prevMonthClose = parseFloat(data[0][4]);
                    const currentMonthClose = parseFloat(data[1][4]);
                    monthlyChange = ((currentMonthClose - prevMonthClose) / prevMonthClose) * 100;
                }
            }
        } catch (e) {}

        return { asset: a.asset, weeklyChange, monthlyChange };
    }));

    // Update all DOM elements at once
    results.forEach(r => {
        if (r.weeklyChange !== null) updatePeriodDisplay(r.asset, 'weekly', r.weeklyChange);
        if (r.monthlyChange !== null) updatePeriodDisplay(r.asset, 'monthly', r.monthlyChange);
    });
}

function updatePeriodDisplay(asset, period, change) {
    const el = document.getElementById('quote-' + asset + '-' + period);
    if (!el) return;
    const sign = change >= 0 ? '+' : '';
    el.textContent = sign + change.toFixed(1) + '%';
    el.className = 'quote-' + period + ' ' + (change >= 0 ? 'up' : 'down');
    const el2 = document.getElementById('quote-' + asset + '-retrace-' + period);
    if (el2) {
        el2.textContent = sign + change.toFixed(1) + '%';
        el2.className = 'quote-' + period + ' ' + (change >= 0 ? 'up' : 'down');
    }
}

// ====== ПРИМЕНИТЬ ЦЕНУ API ======
function applyApiPrice(asset, inputId, priceDisplayId) {
    const priceDisplay = document.getElementById(priceDisplayId);
    const input = document.getElementById(inputId);
    if (!priceDisplay || !input) return;

    const priceText = priceDisplay.textContent.replace(/[$\s]/g, '').replace('(кэш)', '');
    const price = parseNumber(priceText);

    if (!isNaN(price) && price > 0) {
        input.value = formatNumber(price, 0);
        // Запустить расчёт
        if (inputId.includes('calc4')) calc4();
        if (inputId.includes('calc5')) calc5();
        // Отключить кнопку после применения
        const btnId = 'btn-apply-' + asset + '-' + inputId.split('-')[0] + inputId.split('-')[2];
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = true;
            btn.textContent = '✓ Применено';
            setTimeout(() => { btn.textContent = '✓ Применить'; }, 2000);
        }
    }
}

function enableApplyButton(asset, calcPrefix) {
    const btnId = 'btn-apply-' + asset + '-' + calcPrefix;
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Применить';
    }
}

// ====== ПОЛУЧЕНИЕ ЦЕН API ======
async function fetchBtcPrice() {
    const displays = [
        { priceEl: document.getElementById('btc-price-calc4'), displayEl: document.getElementById('btc-display-calc4'), btnId: 'btn-apply-btc-calc4', inputId: 'calc4-btc-price' },
        { priceEl: document.getElementById('btc-price-calc5'), displayEl: document.getElementById('btc-display-calc5'), btnId: 'btn-apply-btc-calc5', inputId: 'calc5-btc-price' }
    ];

    displays.forEach(d => {
        if (d.displayEl) { d.displayEl.classList.remove('error'); d.displayEl.querySelector('.live-dot').style.animation = 'pulse 1.5s infinite'; }
        if (d.priceEl) d.priceEl.textContent = 'загрузка...';
    });

    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const price = parseFloat(data.lastPrice);
        apiPrices.btc = price;

        displays.forEach(d => {
            if (d.priceEl) d.priceEl.textContent = '$' + formatNumber(price, 0);
        });

        enableApplyButton('btc', 'calc4');
        enableApplyButton('btc', 'calc5');

        localStorage.setItem('btcPrice', JSON.stringify({ price, timestamp: Date.now() }));
    } catch (err) {const cached = localStorage.getItem('btcPrice');
        if (cached) {
            const cachedData = safeJSONParse(cached, null);
            if (!cachedData) return;
            apiPrices.btc = cachedData.price;
            displays.forEach(d => {
                if (d.priceEl) d.priceEl.textContent = '$' + formatNumber(cachedData.price, 0) + ' (кэш)';
            });
            enableApplyButton('btc', 'calc4');
            enableApplyButton('btc', 'calc5');
        } else {
            displays.forEach(d => {
                if (d.displayEl) {
                    d.displayEl.classList.add('error');
                    d.displayEl.querySelector('.price-value').textContent = 'ошибка';
                    d.displayEl.querySelector('.live-dot').style.animation = 'none';
                }
            });
        }
    }
}

async function fetchGoldPrice() {
    const displayEl = document.getElementById('gold-display-calc5');
    const priceEl = document.getElementById('gold-price-calc5');

    if (displayEl) { displayEl.classList.remove('error'); displayEl.querySelector('.live-dot').style.animation = 'pulse 1.5s infinite'; }
    if (priceEl) priceEl.textContent = 'загрузка...';

    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=XAUUSDT');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const price = parseFloat(data.lastPrice);
        apiPrices.gold = price;
        if (priceEl) priceEl.textContent = '$' + formatNumber(price, 0);
        enableApplyButton('gold', 'calc5');
        localStorage.setItem('goldPrice', JSON.stringify({ price, timestamp: Date.now() }));
    } catch (err) {const cached = localStorage.getItem('goldPrice');
        if (cached) {
            const cachedData = safeJSONParse(cached, null);
            if (!cachedData) return;
            apiPrices.gold = cachedData.price;
            if (priceEl) priceEl.textContent = '$' + formatNumber(cachedData.price, 0) + ' (кэш)';
            enableApplyButton('gold', 'calc5');
        } else {
            if (displayEl) {
                displayEl.classList.add('error');
                displayEl.querySelector('.price-value').textContent = 'ошибка';
                displayEl.querySelector('.live-dot').style.animation = 'none';
            }
        }
    }
}

// ====== СОХРАНЕНИЕ КАЛЬКУЛЯТОРОВ ======
function saveCalcInput(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        localStorage.setItem('calc_' + inputId, input.value);
    }
}

function loadCalcInput(inputId) {
    const saved = localStorage.getItem('calc_' + inputId);
    if (saved !== null) {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = saved;
        }
    }
}

function initCalcInputs() {
    loadRiskRetraceData();
    const calcInputs = [
        'calc1-open', 'calc1-close',
        'calc2-price', 'calc2-percent',
        'risk-deposit',
        'calc4-btc-price', 'calc4-btc-qty', 'calc4-usd-qty',
        'calc5-btc-price', 'calc5-gold-price', 'calc5-btc-qty', 'calc5-gold-qty', 'calc5-usd-qty'
    ];
    calcInputs.forEach(id => loadCalcInput(id));
    calc1(); calc2(); calcRisk(); calc4(); calc5(); calcLeverageLiq();
}

function calc1() {
    const open = getInputValue('calc1-open');
    const close = getInputValue('calc1-close');
    const el = document.getElementById('calc1-result');
    if (isNaN(open) || isNaN(close) || open === 0) { el.textContent = '—'; el.className = 'result-value neutral'; return; }
    const res = ((close - open) / open) * 100;
    el.textContent = (res >= 0 ? '+' : '') + res.toFixed(2) + '%';
    el.className = 'result-value ' + (res >= 0 ? 'green' : 'red');
}

function stylePercentInput(input) {
    const val = parseFloat(input.value);
    const suffix = document.getElementById('calc2-suffix');
    if (input.value === '' || input.value === null) {
        suffix.style.visibility = 'hidden';
        input.style.color = ''; input.style.fontWeight = '';
        return;
    }
    suffix.style.visibility = 'visible';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const style = window.getComputedStyle(input);
    ctx.font = style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    const textWidth = ctx.measureText(input.value).width;
    suffix.style.left = (14 + textWidth + 2) + 'px';
    if (isNaN(val)) { input.style.color = ''; input.style.fontWeight = ''; suffix.style.color = 'var(--text-muted)'; return; }
    if (val > 0) { input.style.color = 'var(--green)'; input.style.fontWeight = '400'; suffix.style.color = 'var(--green)'; }
    else if (val < 0) { input.style.color = 'var(--red)'; input.style.fontWeight = '400'; suffix.style.color = 'var(--red)'; }
    else { input.style.color = ''; input.style.fontWeight = ''; suffix.style.color = 'var(--text-muted)'; }
}

function calc2() {
    const price = getInputValue('calc2-price');
    const calc2PctEl = document.getElementById('calc2-percent'); const pct = calc2PctEl ? parseFloat(calc2PctEl.value) : 0;
    const el = document.getElementById('calc2-result');
    if (isNaN(price) || isNaN(pct)) { el.textContent = '—'; el.className = 'result-value neutral'; return; }
    const res = price * (1 + pct / 100);
    el.textContent = formatNumber(res, 0);
    el.className = 'result-value neutral';
}

function calc3() {
    const usd = getInputValue('calc3-usd');
    const price = getInputValue('calc3-price');
    const el = document.getElementById('calc3-result');
    if (isNaN(usd) || isNaN(price) || price === 0) { el.textContent = '—'; return; }
    const res = usd / price;
    el.textContent = formatNumber(res, 8);
}

function calcRisk() {
    calcRiskLeverageTable();
    const deposit = getInputValue('risk-deposit');
    const leverage = getInputValue('risk-leverage');
    const totalEl = document.getElementById('risk-total');
    const minEl = document.getElementById('risk-min');
    if (isNaN(deposit) || deposit === 0 || isNaN(leverage) || leverage === 0) {
        totalEl.textContent = '—';
        minEl.textContent = '—';
        return;
    }
    totalEl.textContent = formatNumber(deposit * leverage, 0);
    minEl.textContent = formatNumber(deposit * 0.45, 0);
}

// ====== ТАБЛИЦА % ОТКАТА / ОБЪЕМ ПОЗИЦИЙ / ПЛЕЧО (Риск менеджмент) ======
function calcRiskLeverageTable() {
    const deposit = getInputValue('risk-deposit');
    const rows = document.querySelectorAll('#risk-leverage-rows .risk-lev-row');
    rows.forEach(function(row) {
        const volEl = row.querySelector('.risk-lev-vol');
        if (!volEl) return;
        const lev = parseFloat(row.dataset.leverage);
        if (isNaN(deposit) || deposit === 0 || isNaN(lev)) {
            volEl.textContent = '—';
            return;
        }
        volEl.textContent = formatNumber(deposit * lev, 0);
    });
}

function styleRiskRetraceInput(input) {
    const suffix = input.parentElement ? input.parentElement.querySelector('.percent-suffix') : null;
    const val = parseFloat(input.value.replace(/[+\s%]/g, '').replace(',', '.'));
    if (input.value === '' || isNaN(val)) {
        input.style.color = '';
        if (suffix) suffix.style.color = '';
        return;
    }
    if (val > 0) { input.style.color = 'var(--green)'; if (suffix) suffix.style.color = 'var(--green)'; }
    else if (val < 0) { input.style.color = 'var(--red)'; if (suffix) suffix.style.color = 'var(--red)'; }
    else { input.style.color = ''; if (suffix) suffix.style.color = ''; }
}

function saveRiskRetraceData() {
    const percents = [];
    document.querySelectorAll('#risk-leverage-rows .risk-retrace').forEach(function(inp) { percents.push(inp.value); });
    localStorage.setItem('riskRetraceData', JSON.stringify(percents));
}

function loadRiskRetraceData() {
    const data = safeJSONParse(localStorage.getItem('riskRetraceData'), null);
    if (!data) return;
    const inputs = document.querySelectorAll('#risk-leverage-rows .risk-retrace');
    inputs.forEach(function(inp, i) {
        if (data[i] !== undefined) { inp.value = data[i]; styleRiskRetraceInput(inp); }
    });
}
function calcLeverageLiq() {
    const input = document.getElementById('risk-leverage');
    const resultEl = document.getElementById('risk-liq-pct');
    if (!input || !resultEl) return;
    const raw = input.value;
    if (!raw || raw === '') {
        resultEl.textContent = '—';
        return;
    }
    const leverage = parseNumber(raw);
    if (isNaN(leverage) || leverage === 0) {
        resultEl.textContent = '—';
        return;
    }
    const pct = (1 / leverage) * 100;
    resultEl.textContent = Math.round(pct) + '%';
}


function calc4() {
    const btcPrice = getInputValue('calc4-btc-price');
    const btcQty = getInputValue('calc4-btc-qty');
    const usdQty = getInputValue('calc4-usd-qty');
    const el = document.getElementById('calc4-result');
    const actionEl = document.getElementById('calc4-action');
    if (isNaN(btcPrice) || isNaN(btcQty) || isNaN(usdQty) || btcPrice === 0) {
        el.textContent = '—'; el.className = 'result-value neutral'; actionEl.textContent = ''; actionEl.className = 'rebalance-action'; return;
    }
    const btcValue = btcQty * btcPrice;
    const totalPortfolio = usdQty + btcValue;
    const targetPerAsset = totalPortfolio / 2;
    const btcDiff = (targetPerAsset - btcValue) / btcPrice;
    const absRes = Math.abs(btcDiff);
    const formattedQty = formatNumber(absRes, 5);
    if (btcDiff > 0) {
        el.textContent = formatNumber(targetPerAsset, 0);
        el.className = 'result-value neutral';
        actionEl.innerHTML = '<span class="rebalance-action green rebalance-action-large">+' + formattedQty + ' BTC</span>';
    } else if (btcDiff < 0) {
        el.textContent = formatNumber(targetPerAsset, 0);
        el.className = 'result-value neutral';
        actionEl.innerHTML = '<span class="rebalance-action red rebalance-action-large">−' + formattedQty + ' BTC</span>';
    } else {
        el.textContent = formatNumber(targetPerAsset, 0);
        el.className = 'result-value neutral';
        actionEl.textContent = 'Портфель сбалансирован';
        actionEl.className = 'rebalance-action';
    }
}

function calc5() {
    const btcPrice = getInputValue('calc5-btc-price');
    const goldPrice = getInputValue('calc5-gold-price');
    const btcQty = getInputValue('calc5-btc-qty');
    const goldQty = getInputValue('calc5-gold-qty');
    const usdQty = getInputValue('calc5-usd-qty');
    const el = document.getElementById('calc5-result');
    const actionEl = document.getElementById('calc5-action');
    if (isNaN(btcPrice) || isNaN(goldPrice) || isNaN(btcQty) || isNaN(goldQty) || isNaN(usdQty) || btcPrice === 0 || goldPrice === 0) {
        el.textContent = '—'; el.className = 'result-value neutral'; actionEl.textContent = ''; actionEl.className = 'rebalance-action'; return;
    }
    const btcValue = btcQty * btcPrice;
    const goldValue = goldQty * goldPrice;
    const totalPortfolio = usdQty + btcValue + goldValue;
    const targetPerAsset = totalPortfolio / 3;
    const btcDiff = (targetPerAsset - btcValue) / btcPrice;
    const goldDiff = (targetPerAsset - goldValue) / goldPrice;
    const absBtcDiff = Math.abs(btcDiff);
    const absGoldDiff = Math.abs(goldDiff);
    const fmtBtc = formatNumber(absBtcDiff, 5);
    const fmtGold = formatNumber(absGoldDiff, 5);
    let hasAction = false;
    let actionLines = [];
    if (Math.abs(btcDiff) > 0.00000001) {
        hasAction = true;
        const colorClass = btcDiff > 0 ? 'green' : 'red';
        const sign = btcDiff > 0 ? '+' : '−';
        actionLines.push('<span class="rebalance-action ' + colorClass + ' rebalance-action-large">' + sign + fmtBtc + ' BTC</span>');
    }
    if (Math.abs(goldDiff) > 0.0001) {
        hasAction = true;
        const colorClass = goldDiff > 0 ? 'green' : 'red';
        const sign = goldDiff > 0 ? '+' : '−';
        actionLines.push('<span class="rebalance-action ' + colorClass + ' rebalance-action-large">' + sign + fmtGold + ' GOLD</span>');
    }
    if (!hasAction) {
        el.textContent = formatNumber(targetPerAsset, 0);
        el.className = 'result-value neutral';
        actionEl.textContent = 'Портфель сбалансирован';
        actionEl.className = 'rebalance-action';
    } else {
        const usdAfter = usdQty - btcDiff * btcPrice - goldDiff * goldPrice;
        el.textContent = formatNumber(usdAfter, 0);
        el.className = 'result-value neutral';
        actionEl.innerHTML = actionLines.join('<br>');
        actionEl.className = 'rebalance-action';
    }
}

function getTickerOptions(selected) {
    let html = '<option value="">Выберите...</option>';
    tickers.forEach(t => html += `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`);
    html += '<option value="OTHER" ' + (selected && !tickers.includes(selected) ? 'selected' : '') + '>Другое (вручную)</option>';
    return html;
}

function getTypeOptions(selected) {
    const types = ['Лимитка','Покупка','Продажа'];
    let html = '<option value="">Выберите...</option>';
    types.forEach(t => html += `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`);
    return html;
}

function getSellPercentOptions(selected) {
    const percents = ['10','25','50','75','100'];
    let html = '<option value="">Выберите...</option>';
    percents.forEach(p => html += `<option value="${p}" ${p === selected ? 'selected' : ''}>${p}%</option>`);
    return html;
}

function getTradeLabel(type, key) {
    const labels = {
        spot: {
            buyDate: 'Дата покупки',
            buyPrice: 'Цена покупки ($)',
            buySum: 'Сумма покупки ($)',
            sellDate: 'Дата продажи',
            sellPercent: 'Кол-во актива (%)',
            sellAmount: 'Кол-во продажи (авто)',
            sellSum: 'Сумма продажи ($) (авто)',
            sellPrice: 'Цена продажи ($)'
        },
        futures: {
            buyDate: 'Дата входа',
            buyPrice: 'Цена входа ($)',
            buySum: 'Объем позиции ($)',
            sellDate: 'Дата выхода',
            sellPercent: 'Объем позиции (%)',
            sellAmount: 'Кол-во актива (авто)',
            sellSum: 'Объем позиции ($) (авто)',
            sellPrice: 'Цена выхода ($)'
        }
    };
    return labels[type] && labels[type][key] ? labels[type][key] : key;
}

function getExchangeOptions(selected) {
    const exchanges = ['Dzengi','OKX','Bybit','Binance'];
    let html = '';
    exchanges.forEach(e => html += `<option value="${e}" ${e === selected ? 'selected' : ''}>${e}</option>`);
    return html;
}
function switchExchange(type, exchange) {
    if (type === 'spot') currentSpotExchange = exchange;
    else currentFuturesExchange = exchange;
    localStorage.setItem('current' + type.charAt(0).toUpperCase() + type.slice(1) + 'Exchange', exchange);
    const tabs = document.getElementById(type + '-exchange-tabs');
    if (tabs) {
        tabs.querySelectorAll('.exchange-tab').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.trim() === exchange);
        });
    }
    renderTrades(type);
    if (type === 'futures') {
        loadFuturesLiqDeposit();
        updateFuturesQuotes();
    }
}

function updateExchangeTabs(type) {
    const exchange = type === 'spot' ? currentSpotExchange : currentFuturesExchange;
    const tabs = document.getElementById(type + '-exchange-tabs');
    if (tabs) {
        tabs.querySelectorAll('.exchange-tab').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.trim() === exchange);
        });
    }
}
function addTrade(type, data = null) {
    const container = document.getElementById(type + '-trades');
    const counter = type === 'spot' ? spotCounter++ : futuresCounter++;
    const id = type + '_' + counter;
    const currentExchange = type === 'spot' ? currentSpotExchange : currentFuturesExchange;
    const tradeData = data || {
        id, num: counter,
        exchange: currentExchange,
        buyDate: '', ticker: '', type: '', buyPrice: '', amount: '', buySum: '',
        sellDate: '', sellPrice: '', sellPercent: '', sellAmount: '', sellSum: '', profit: '', percent: ''
    };
    if (!data) {
        if (type === 'spot') { spotTrades.push(tradeData); localStorage.setItem('spotTrades', JSON.stringify(spotTrades)); localStorage.setItem('spotCounter', spotCounter); }
        else { futuresTrades.push(tradeData); localStorage.setItem('futuresTrades', JSON.stringify(futuresTrades)); localStorage.setItem('futuresCounter', futuresCounter); }
    }
    const card = document.createElement('div');
    card.className = 'trade-card';
    card.id = id;
    const buyDateDisplay = formatDateToDDMMYY(tradeData.buyDate);
    const sellDateDisplay = formatDateToDDMMYY(tradeData.sellDate);
    const buyDateIso = parseDDMMYY(tradeData.buyDate);
    const sellDateIso = parseDDMMYY(tradeData.sellDate);
    card.innerHTML = `
        <div class="trade-header">
            <span class="trade-number">#${counter}</span>
            <span class="trade-exchange-badge">${tradeData.exchange || 'Dzengi'}</span>
            <button type="button" class="trade-delete" data-action="delete">🗑️</button>
        </div>
        <div class="trade-grid">
            <div class="input-group">
                <label>${getTradeLabel(type, 'buyDate')}</label>
                <div class="date-wrapper">
                    <input type="text" class="date-text-input" value="${escapeHtml(buyDateDisplay)}" placeholder="ДД.ММ.ГГ" maxlength="8" data-datefield="buyDate">
                    <button type="button" class="date-picker-btn">&nbsp;</button>
                    <input type="date" class="native-date-input" value="${escapeHtml(buyDateIso)}" data-datefield="buyDate">
                </div>
            </div>
            <div class="input-group">
                <label>Тикер</label>
                <select data-field="ticker-select">${getTickerOptions(tradeData.ticker)}</select>
                <input type="text" id="${id}_ticker_custom" class="ticker-custom" value="${escapeHtml(tickers.includes(tradeData.ticker) ? '' : tradeData.ticker)}" placeholder="Тикер" style="margin-top:6px;${tickers.includes(tradeData.ticker) || !tradeData.ticker ? 'display:none;' : ''}">
            </div>
            <div class="input-group">
                <label>Тип</label>
                <select data-field="type">${getTypeOptions(tradeData.type)}</select>
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'buyPrice')}</label>
                <input type="text" inputmode="decimal" class="price-input" placeholder="0,00" value="${escapeHtml(tradeData.buyPrice)}" data-field="buyPrice" data-calc="1">
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'buySum')}</label>
                <input type="text" inputmode="decimal" class="trade-sum" placeholder="0" value="${escapeHtml(tradeData.buySum)}" data-field="buySum" data-calc="1">
            </div>
            <div class="input-group">
                <label>Кол-во актива (авто)</label>
                <input type="text" class="auto-field" id="${id}_amount" value="${tradeData.amount}" readonly placeholder="-">
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'sellDate')}</label>
                <div class="date-wrapper">
                    <input type="text" class="date-text-input" value="${escapeHtml(sellDateDisplay)}" placeholder="ДД.ММ.ГГ" maxlength="8" data-datefield="sellDate">
                    <button type="button" class="date-picker-btn">&nbsp;</button>
                    <input type="date" class="native-date-input" value="${escapeHtml(sellDateIso)}" data-datefield="sellDate">
                </div>
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'sellPrice')}</label>
                <input type="text" inputmode="decimal" class="price-input" placeholder="0,00" value="${escapeHtml(tradeData.sellPrice)}" data-field="sellPrice" data-calc="1">
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'sellPercent')}</label>
                <select id="${id}_sellPercent" data-field="sellPercent" data-calc="1">${getSellPercentOptions(tradeData.sellPercent)}</select>
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'sellAmount')}</label>
                <input type="text" class="auto-field" id="${id}_sellAmount" value="${tradeData.sellAmount}" readonly placeholder="-">
            </div>
            <div class="input-group">
                <label>${getTradeLabel(type, 'sellSum')}</label>
                <input type="text" class="auto-field" id="${id}_sellSum" value="${tradeData.sellSum}" readonly placeholder="-">
            </div>
            <div class="input-group">
                <label>Прибыль/убыток ($)</label>
                <input type="text" class="auto-field" id="${id}_profit" value="${tradeData.profit}" readonly placeholder="-">
            </div>
            <div class="input-group">
                <label>% роста/падения</label>
                <input type="text" class="auto-field" id="${id}_percent" value="${tradeData.percent}" readonly placeholder="-">
            </div>
        </div>
    `;
    container.appendChild(card);
    if (type === 'futures') {
        loadFuturesLiqDeposit();
        updateFuturesQuotes();
    }
}

function handleTickerChange(select, type, id) {
    const val = select.value;
    const customInput = document.getElementById(id + '_ticker_custom');
    if (val === 'OTHER') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
        updateTrade(type, id, 'ticker', val);
    }
}

function updateTrade(type, id, field, value) {
    const arr = type === 'spot' ? spotTrades : futuresTrades;
    const trade = arr.find(t => t.id === id);
    if (trade) trade[field] = value;
    localStorage.setItem(type + 'Trades', JSON.stringify(arr));
    if (type === 'futures') {
        calcFuturesLiq();
    }
}

function calcTrade(type, id) {
    const arr = type === 'spot' ? spotTrades : futuresTrades;
    const trade = arr.find(t => t.id === id);
    if (!trade) return;
    const buyPrice = parseNumber(trade.buyPrice);
    const buySum = parseNumber(trade.buySum);
    const sellPrice = parseNumber(trade.sellPrice);
    const sellPercent = parseFloat(trade.sellPercent);
    let amount = '';
    let amountNum = 0;
    if (!isNaN(buySum) && !isNaN(buyPrice) && buyPrice !== 0) {
        amountNum = buySum / buyPrice;
        amount = formatNumber(amountNum, 8);
    }
    const amountEl = document.getElementById(id + '_amount');
    if (amountEl) { amountEl.value = amount; }
    trade.amount = amount;
    let sellAmount = '';
    let sellAmountNum = 0;
    if (!isNaN(sellPercent) && amountNum > 0) {
        sellAmountNum = amountNum * (sellPercent / 100);
        sellAmount = formatNumber(sellAmountNum, 8);
    }
    const sellAmountEl = document.getElementById(id + '_sellAmount');
    if (sellAmountEl) { sellAmountEl.value = sellAmount; }
    trade.sellAmount = sellAmount;
    let sellSum = '';
    let sellSumNum = 0;
    if (!isNaN(sellAmountNum) && !isNaN(sellPrice)) {
        sellSumNum = sellAmountNum * sellPrice;
        sellSum = formatNumber(sellSumNum, 2);
    }
    const sellSumEl = document.getElementById(id + '_sellSum');
    if (sellSumEl) { sellSumEl.value = sellSum; }
    trade.sellSum = sellSum;
    let profit = '';
    let profitClass = '';
    let profitNum = 0;
    if (!isNaN(sellSumNum) && !isNaN(sellAmountNum) && !isNaN(buyPrice)) {
        const buyCost = sellAmountNum * buyPrice;
        profitNum = sellSumNum - buyCost;
        profit = (profitNum >= 0 ? '+' : '') + formatNumber(profitNum, 2);
        profitClass = profitNum >= 0 ? 'green' : 'red';
    }
    const profitEl = document.getElementById(id + '_profit');
    if (profitEl) { 
        profitEl.value = profit;
        profitEl.className = 'auto-field ' + profitClass;
    }
    trade.profit = profit;
    let percent = '';
    let percentClass = '';
    if (!isNaN(profitNum) && !isNaN(sellAmountNum) && !isNaN(buyPrice) && (sellAmountNum * buyPrice) !== 0) {
        const buyCost = sellAmountNum * buyPrice;
        const pct = (profitNum / buyCost) * 100;
        percent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        percentClass = pct >= 0 ? 'green' : 'red';
    }
    const percentEl = document.getElementById(id + '_percent');
    if (percentEl) { 
        percentEl.value = percent;
        percentEl.className = 'auto-field ' + percentClass;
    }
    trade.percent = percent;
    localStorage.setItem(type + 'Trades', JSON.stringify(arr));
    if (type === 'futures') {
        loadFuturesLiqDeposit();
        updateFuturesQuotes();
    }
}

function deleteTrade(type, id) {
    showConfirm('Удалить позицию?').then(function(ok) {
    if (!ok) return;
    const arr = type === 'spot' ? spotTrades : futuresTrades;
    const idx = arr.findIndex(t => t.id === id);
    if (idx > -1) {
        arr.splice(idx, 1);
        localStorage.setItem(type + 'Trades', JSON.stringify(arr));
    }
    const elToRemove = document.getElementById(id); if(elToRemove) elToRemove.remove();
    if (type === 'futures') {
        loadFuturesLiqDeposit();
        updateFuturesQuotes();
    }
    });
}
function deleteSummaryTrade(type, id) {
    showConfirm('Удалить позицию из сводной ведомости?').then(function(ok) {
    if (!ok) return;
    summaryArchive = summaryArchive.filter(t => !(String(t.id) === String(id) && t.archiveType === type));
    if (!summaryRemoved.includes(id)) summaryRemoved.push(id);
    localStorage.setItem('tradeSummaryArchive', JSON.stringify(summaryArchive));
    localStorage.setItem('tradeSummaryRemoved', JSON.stringify(summaryRemoved));
    showSummary(type);
    });
}

function renderTrades(type) {
    const container = document.getElementById(type + '-trades');
    container.innerHTML = '';
    updateExchangeTabs(type);
    const currentExchange = type === 'spot' ? currentSpotExchange : currentFuturesExchange;
    const arr = (type === 'spot' ? spotTrades : futuresTrades).filter(t => (t.exchange || 'Dzengi') === currentExchange);
    if (arr.length === 0) {
        container.innerHTML = '';
        return;
    }
    arr.forEach(t => {
        const counter = type === 'spot' ? spotCounter : futuresCounter;
        if (t.num >= counter) {
            if (type === 'spot') spotCounter = t.num + 1;
            else futuresCounter = t.num + 1;
        }
        const buyDateDisplay = formatDateToDDMMYY(t.buyDate);
        const sellDateDisplay = formatDateToDDMMYY(t.sellDate);
        const buyDateIso = parseDDMMYY(t.buyDate);
        const sellDateIso = parseDDMMYY(t.sellDate);
        const card = document.createElement('div');
        card.className = 'trade-card';
        card.id = t.id;
        card.innerHTML = `
            <div class="trade-header">
                <span class="trade-number">#${t.num}</span>
                <span class="trade-exchange-badge">${t.exchange || 'Dzengi'}</span>
                <button type="button" class="trade-delete" data-action="delete">🗑️</button>
            </div>
            <div class="trade-grid">
                <div class="input-group">
                    <label>${getTradeLabel(type, 'buyDate')}</label>
                    <div class="date-wrapper">
                        <input type="text" class="date-text-input" value="${escapeHtml(buyDateDisplay)}" placeholder="ДД.ММ.ГГ" maxlength="8" data-datefield="buyDate">
                        <button type="button" class="date-picker-btn">&nbsp;</button>
                            <input type="date" class="native-date-input" value="${escapeHtml(buyDateIso)}" data-datefield="buyDate">
                    </div>
                </div>
                <div class="input-group">
                    <label>Тикер</label>
                    <select data-field="ticker-select">${getTickerOptions(t.ticker)}</select>
                    <input type="text" id="${t.id}_ticker_custom" class="ticker-custom" value="${escapeHtml(tickers.includes(t.ticker) ? '' : t.ticker)}" placeholder="Тикер" style="margin-top:6px;${tickers.includes(t.ticker) || !t.ticker ? 'display:none;' : ''}">
                </div>
                <div class="input-group">
                    <label>Тип</label>
                    <select data-field="type">${getTypeOptions(t.type)}</select>
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'buyPrice')}</label>
                    <input type="text" inputmode="decimal" class="price-input" placeholder="0,00" value="${escapeHtml(t.buyPrice)}" data-field="buyPrice" data-calc="1">
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'buySum')}</label>
                    <input type="text" inputmode="decimal" class="trade-sum" placeholder="0" value="${escapeHtml(t.buySum)}" data-field="buySum" data-calc="1">
                </div>
                <div class="input-group">
                    <label>Кол-во актива (авто)</label>
                    <input type="text" class="auto-field" id="${t.id}_amount" value="${t.amount}" readonly placeholder="-">
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'sellDate')}</label>
                    <div class="date-wrapper">
                        <input type="text" class="date-text-input" value="${escapeHtml(sellDateDisplay)}" placeholder="ДД.ММ.ГГ" maxlength="8" data-datefield="sellDate">
                        <button type="button" class="date-picker-btn">&nbsp;</button>
                            <input type="date" class="native-date-input" value="${escapeHtml(sellDateIso)}" data-datefield="sellDate">
                    </div>
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'sellPrice')}</label>
                    <input type="text" inputmode="decimal" class="price-input" placeholder="0,00" value="${escapeHtml(t.sellPrice)}" data-field="sellPrice" data-calc="1">
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'sellPercent')}</label>
                    <select id="${t.id}_sellPercent" data-field="sellPercent" data-calc="1">${getSellPercentOptions(t.sellPercent)}</select>
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'sellAmount')}</label>
                    <input type="text" class="auto-field" id="${t.id}_sellAmount" value="${t.sellAmount}" readonly placeholder="-">
                </div>
                <div class="input-group">
                    <label>${getTradeLabel(type, 'sellSum')}</label>
                    <input type="text" class="auto-field" id="${t.id}_sellSum" value="${t.sellSum}" readonly placeholder="-">
                </div>
                <div class="input-group">
                    <label>Прибыль/убыток ($)</label>
                    <input type="text" class="auto-field ${t.profit && t.profit.startsWith('+') ? 'green' : t.profit && t.profit.startsWith('-') ? 'red' : ''}" id="${t.id}_profit" value="${t.profit}" readonly placeholder="-">
                </div>
                <div class="input-group">
                    <label>% роста/падения</label>
                    <input type="text" class="auto-field ${t.percent && t.percent.startsWith('+') ? 'green' : t.percent && t.percent.startsWith('-') ? 'red' : ''}" id="${t.id}_percent" value="${t.percent}" readonly placeholder="-">
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function checkCompleted(type, id) {
    const arr = type === 'spot' ? spotTrades : futuresTrades;
    const trade = arr.find(t => t.id === id);
    if (trade && trade.sellDate && trade.sellDate.trim() !== '') {
        // Сделка имеет дату продажи — завершена
    }
}

let summaryArchive = safeJSONParse(localStorage.getItem('tradeSummaryArchive'), []);
summaryArchive.forEach(t => { if (!t.exchange) t.exchange = 'Dzengi'; });
let summaryRemoved = safeJSONParse(localStorage.getItem('tradeSummaryRemoved'), []);

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSummary(type, selectedExchange) {
    const currentExchange = selectedExchange || (type === 'spot' ? currentSpotExchange : currentFuturesExchange);
    const allArr = type === 'spot' ? spotTrades : futuresTrades;
    const completed = allArr.filter(t => t.sellDate && t.sellDate.trim() !== '' && t.profit !== '');
    // Add completed trades to archive (avoid duplicates and removed)
    completed.forEach(t => {
        if (!summaryRemoved.includes(t.id) && !summaryArchive.some(a => String(a.id) === String(t.id) && a.archiveType === type)) {
            summaryArchive.push({...t, archiveType: type});
        }
    });
    localStorage.setItem('tradeSummaryArchive', JSON.stringify(summaryArchive));
    const modal = document.getElementById('summary-modal');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');
    title.textContent = (type === 'spot' ? 'Спот' : 'Фьючерсы') + ' — Сводная ведомость';

    // Build exchange tabs inside modal
    const exchanges = ['Dzengi','OKX','Bybit','Binance'];
    let tabsHtml = '<div class="exchange-tabs" style="margin-bottom:12px;">';
    exchanges.forEach(ex => {
        tabsHtml += `<button type="button" class="exchange-tab ${ex === currentExchange ? 'active' : ''}" data-stype="${type}" data-sexchange="${ex}">${ex}</button>`;
    });
    tabsHtml += '</div>';

    const display = summaryArchive.filter(t => t.archiveType === type && (t.exchange || 'Dzengi') === currentExchange);
    if (display.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = tabsHtml + '<div class="icon">📋</div><p>Нет завершенных сделок на ' + currentExchange + '. Укажите дату продажи и % продажи.</p>';
        content.innerHTML = '';
        content.appendChild(emptyDiv);
        modal.classList.add('active');
        return;
    }
    let totalProfit = 0;
    let html = tabsHtml;
    html += '<div style="overflow-x:auto;"><table class="summary-table"><thead><tr>';
    html += '<th>№</th><th>Дата</th><th>Тикер</th><th>Тип</th><th>' + getTradeLabel(type, 'buyPrice').replace(' ($)', '') + '</th><th>Кол-во</th><th>' + getTradeLabel(type, 'sellPrice').replace(' ($)', '') + '</th><th>% продажи</th><th>' + getTradeLabel(type, 'sellSum').replace(' ($) (авто)', '') + '</th><th>Прибыль</th><th>%</th><th>Действие</th>';
    html += '</tr></thead><tbody>';
    display.forEach(t => {
        const p = parseFloat(t.profit.replace(/[+\s]/g, '').replace(',', '.'));
        totalProfit += p;
        const pct = t.percent || '';
        const buyPrice = t.buyPrice || '—';
        const sellPrice = t.sellPrice || '—';
        const sellPercent = t.sellPercent || '—';
        const amount = t.amount || '—';
        const sellAmount = t.sellAmount || '—';
        const sellSum = t.sellSum || '—';
        html += `<tr>
            <td>#${t.num}</td>
            <td>${escapeHtml(t.sellDate)}</td>
            <td><b>${escapeHtml(t.ticker) || '—'}</b></td>
            <td>${escapeHtml(t.type) || '—'}</td>
            <td>$${escapeHtml(buyPrice)}</td>
            <td>${escapeHtml(amount)}</td>
            <td>$${escapeHtml(sellPrice)}</td>
            <td>${escapeHtml(sellPercent)}%</td>
            <td>$${escapeHtml(sellSum)}</td>
            <td style="color:${p>=0?'var(--green)':'var(--red)'};font-weight:700;">${escapeHtml(t.profit)}</td>
            <td style="color:${pct.startsWith('+')?'var(--green)':pct.startsWith('-')?'var(--red)':'inherit'};font-weight:700;">${escapeHtml(pct)}</td>
            <td><button type="button" class="trade-delete" data-action="sumdelete" data-stype="${type}" data-sid="${t.id}" title="Удалить из сводной ведомости" style="position:static;display:inline-block;margin:0;">🗑️</button></td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    html += `<div class="summary-total">
        <span class="summary-total-label">ИТОГО ${currentExchange} — ПРИБЫЛЬ / УБЫТОК</span>
        <span class="summary-total-value" style="color:${totalProfit>=0?'var(--green)':'var(--red)'}">${totalProfit>=0?'+':''}${formatNumber(totalProfit, 2)} $</span>
    </div>`;
    html += `<button type="button" class="btn-add" data-action="clearexch" data-stype="${type}" data-sexch="${currentExchange}" style="margin-top:16px;background:var(--red-soft);border-color:var(--red);color:var(--red);">
        <span>🧹</span> Очистить ${currentExchange}
    </button>`;
    content.innerHTML = html;
    modal.classList.add('active');
}

function clearCompleted(type) {
    const currentExchange = type === 'spot' ? currentSpotExchange : currentFuturesExchange;
    clearCompletedByExchange(type, currentExchange);
}

function clearCompletedByExchange(type, exchange) {
    showConfirm('Очистить сводную ведомость для ' + exchange + '?', 'Очистить').then(function(ok) {
    if (!ok) return;
    const arr = (type === 'spot' ? spotTrades : futuresTrades).filter(t => (t.exchange || 'Dzengi') === exchange);
    const completed = arr.filter(t => t.sellDate && t.sellDate.trim() !== '' && t.profit !== '');
    completed.forEach(t => {
        if (!summaryRemoved.includes(t.id)) summaryRemoved.push(t.id);
    });
    summaryArchive = summaryArchive.filter(t => !(t.archiveType === type && (t.exchange || 'Dzengi') === exchange));
    localStorage.setItem('tradeSummaryArchive', JSON.stringify(summaryArchive));
    localStorage.setItem('tradeSummaryRemoved', JSON.stringify(summaryRemoved));
    showSummary(type, exchange);
    });
}

// ====== МОДАЛКА ПОДТВЕРЖДЕНИЯ (замена confirm()) ======
let confirmResolver = null;

function showConfirm(message, okText) {
    return new Promise(function(resolve) {
        if (confirmResolver) confirmResolver(false); // предыдущее окно закрыто без ответа
        confirmResolver = resolve;
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-ok').textContent = okText || 'Удалить';
        document.getElementById('confirm-modal').classList.add('active');
    });
}

function closeConfirm(result) {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('active');
    if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeConfirm(false);
});

// ====== ДЕЛЕГИРОВАННЫЕ ОБРАБОТЧИКИ: КАЛЬКУЛЯТОРЫ ======
function bindClick(id, fn) {
    const el = document.getElementById(id);
    // обёртка без проброса event: вызываемые функции не ждут аргументов
    if (el) el.addEventListener('click', function() { fn(); });
}

function initCalculatorHandlers() {
    const root = document.getElementById('section-calculators');
    if (!root) return;

    // Что считать при вводе в каждое поле
    const onInput = {
        'calc1-open':       () => { calc1(); saveCalcInput('calc1-open'); },
        'calc1-close':      () => { calc1(); saveCalcInput('calc1-close'); },
        'calc2-price':      () => { calc2(); saveCalcInput('calc2-price'); },
        'calc2-percent':    () => { calc2(); stylePercentInput(document.getElementById('calc2-percent')); saveCalcInput('calc2-percent'); },
        'risk-deposit':     () => { calcRisk(); saveCalcInput('risk-deposit'); },
        'risk-leverage':    () => { calcRisk(); calcLeverageLiq(); saveCalcInput('risk-leverage'); },
        'calc4-btc-price':  () => { calc4(); saveCalcInput('calc4-btc-price'); },
        'calc4-btc-qty':    () => { calc4(); saveCalcInput('calc4-btc-qty'); },
        'calc4-usd-qty':    () => { calc4(); saveCalcInput('calc4-usd-qty'); },
        'calc5-btc-price':  () => { calc5(); saveCalcInput('calc5-btc-price'); },
        'calc5-gold-price': () => { calc5(); saveCalcInput('calc5-gold-price'); },
        'calc5-btc-qty':    () => { calc5(); saveCalcInput('calc5-btc-qty'); },
        'calc5-gold-qty':   () => { calc5(); saveCalcInput('calc5-gold-qty'); },
        'calc5-usd-qty':    () => { calc5(); saveCalcInput('calc5-usd-qty'); },
        'grid-extremum':    () => { calcGrid(); saveGridData(); },
        'liq-deposit':      () => { calcLiquidation(); saveLiqData(); }
    };
    const onBlurExtra = {
        'risk-leverage': () => calcLeverageLiq(),
        'grid-extremum': () => saveGridData(),
        'liq-deposit':   () => saveLiqData()
    };
    const isPlainText = (t) => t.tagName === 'INPUT' && t.type === 'text' && !t.readOnly && !(t.classList && t.classList.contains('grid-percent')) && !(t.classList && t.classList.contains('risk-retrace'));

    root.addEventListener('input', function(e) {
        const t = e.target;
        const fn = onInput[t.id];
        if (fn) fn();
        if (t.classList && t.classList.contains('grid-percent')) { calcGrid(); saveGridData(); }
        if (t.classList && t.classList.contains('risk-retrace')) { styleRiskRetraceInput(t); saveRiskRetraceData(); }
    });
    root.addEventListener('focusin', function(e) {
        if (isPlainText(e.target)) unformatNumberInput(e.target);
    });
    root.addEventListener('focusout', function(e) {
        const t = e.target;
        if (t.tagName !== 'INPUT') return;
        if (isPlainText(t)) formatNumberInput(t);
        if (t.id && /^(calc|risk)-/.test(t.id)) saveCalcInput(t.id);
        const fn = onBlurExtra[t.id];
        if (fn) fn();
    });

    // Кнопки (привязка по id)
    bindClick('theme-toggle', toggleTheme);
    bindClick('btn-apply-btc-calc4', () => applyApiPrice('btc', 'calc4-btc-price', 'btc-price-calc4'));
    bindClick('btn-apply-btc-calc5', () => applyApiPrice('btc', 'calc5-btc-price', 'btc-price-calc5'));
    bindClick('btn-apply-gold-calc5', () => applyApiPrice('gold', 'calc5-gold-price', 'gold-price-calc5'));
    bindClick('btn-add-grid', addGridRow);
    bindClick('btn-add-liq', addLiqPosition);

    // Обновление цен — через data-action
    root.addEventListener('click', function(e) {
        const btn = e.target.closest ? e.target.closest('[data-action]') : null;
        if (!btn) return;
        const act = btn.getAttribute('data-action');
        if (act === 'refresh-btc') fetchBtcPrice();
        else if (act === 'refresh-gold') fetchGoldPrice();
    });

    // Сетка: делегирование для динамически созданных строк
    const gridRows = document.getElementById('grid-rows');
    if (gridRows) {
        gridRows.addEventListener('click', function(e) {
            const btn = e.target.closest ? e.target.closest('.grid-del-btn') : null;
            if (btn) deleteGridRow(btn);
        });
    }

    // Закрытие баннера установки
    const bannerClose = document.querySelector ? document.querySelector('.install-banner-close') : null;
    if (bannerClose) bannerClose.addEventListener('click', hideInstallBanner);
}

// ====== ДЕЛЕГИРОВАННЫЕ ОБРАБОТЧИКИ: НАВИГАЦИЯ, БИРЖИ, КОТИРОВКИ, МОДАЛКИ ======
function initDelegatedHandlers() {
    // Нижняя навигация
    const nav = document.querySelector('.bottom-nav');
    if (nav) nav.addEventListener('click', function(e) {
        const btn = e.target.closest ? e.target.closest('.nav-item') : null;
        if (btn && btn.dataset && btn.dataset.tab) switchTab(btn.dataset.tab, btn);
    });

    // Табы бирж (спот, фьючерсы + модалка сводной ведомости)
    document.querySelectorAll('.exchange-tabs').forEach(function(tabs) {
        tabs.addEventListener('click', function(e) {
            const btn = e.target.closest ? e.target.closest('.exchange-tab') : null;
            if (!btn || !btn.dataset) return;
            if (btn.dataset.etype) switchExchange(btn.dataset.etype, btn.dataset.exchange);
            else if (btn.dataset.stype) showSummary(btn.dataset.stype, btn.dataset.sexchange);
        });
    });

    // Экстремумы отката в котировках: форматирование (input-логика уже в initRetraceInputs)
    const quotes = document.getElementById('section-quotes');
    if (quotes) {
        quotes.addEventListener('focusin', function(e) {
            if (e.target.classList && e.target.classList.contains('extremum-input')) unformatNumberInput(e.target);
        });
        quotes.addEventListener('focusout', function(e) {
            if (e.target.classList && e.target.classList.contains('extremum-input')) formatNumberInput(e.target);
        });
    }

    // Модалка сводной ведомости: подложка + крестик + табы бирж + действия с архивом.
    // NB: табы создаются динамически — делегируем с постоянного родителя.
    const summaryModal = document.getElementById('summary-modal');
    if (summaryModal) summaryModal.addEventListener('click', function(e) {
        const t = e.target;
        const tabBtn = t.closest ? t.closest('.exchange-tab') : null;
        if (tabBtn && tabBtn.dataset && tabBtn.dataset.stype) {
            showSummary(tabBtn.dataset.stype, tabBtn.dataset.sexchange);
            return;
        }
        if (t === summaryModal || (t.closest && t.closest('.modal-close'))) { closeSummary(); return; }
        const delBtn = t.closest ? t.closest('[data-action="sumdelete"]') : null;
        if (delBtn) { deleteSummaryTrade(delBtn.dataset.stype, delBtn.dataset.sid); return; }
        const clrBtn = t.closest ? t.closest('[data-action="clearexch"]') : null;
        if (clrBtn) clearCompletedByExchange(clrBtn.dataset.stype, clrBtn.dataset.sexch);
    });

    // Модалка подтверждения: подложка + кнопки
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) { closeConfirm(false); return; }
        const t = e.target;
        if (t.classList && t.classList.contains('btn-confirm-cancel')) closeConfirm(false);
        else if (t.classList && t.classList.contains('btn-confirm-danger')) closeConfirm(true);
    });
}

// ====== ДЕЛЕГИРОВАННЫЕ ОБРАБОТЧИКИ: КАРТОЧКИ СДЕЛОК ======
function initTradeHandlers() {
    ['spot', 'futures'].forEach(function(type) {
        const container = document.getElementById(type + '-trades');
        if (!container) return;

        container.addEventListener('click', function(e) {
            const card = e.target.closest ? e.target.closest('.trade-card') : null;
            const del = e.target.closest ? e.target.closest('.trade-delete') : null;
            if (del && card) { deleteTrade(type, card.id); return; }
            const dw = e.target.closest ? e.target.closest('.date-wrapper') : null;
            if (dw && !(e.target.classList && e.target.classList.contains('date-text-input'))) {
                openDatePicker(dw, e);
            }
        });

        container.addEventListener('input', function(e) {
            const t = e.target;
            const card = t.closest ? t.closest('.trade-card') : null;
            if (!card) return;
            if (t.classList && t.classList.contains('date-text-input')) { handleDateInput(t); return; }
            const f = t.dataset ? t.dataset.field : null;
            if (!f) return;
            if (f === 'ticker-custom') { updateTrade(type, card.id, 'ticker', t.value); return; }
            updateTrade(type, card.id, f, t.value);
            if (t.dataset.calc) calcTrade(type, card.id);
        });

        container.addEventListener('change', function(e) {
            const t = e.target;
            const card = t.closest ? t.closest('.trade-card') : null;
            if (!card) return;
            if (t.classList && t.classList.contains('native-date-input')) {
                handleNativeDateChange(t, type, card.id, t.dataset.datefield);
                return;
            }
            const f = t.dataset ? t.dataset.field : null;
            if (f === 'ticker-select') { handleTickerChange(t, type, card.id); return; }
            if (!f) return;
            updateTrade(type, card.id, f, t.value);
            if (t.dataset.calc) calcTrade(type, card.id);
        });

        container.addEventListener('focusin', function(e) {
            const t = e.target;
            if (t.tagName === 'INPUT' && t.dataset && t.dataset.field) unformatNumberInput(t);
        });

        container.addEventListener('focusout', function(e) {
            const t = e.target;
            const card = t.closest ? t.closest('.trade-card') : null;
            if (!card) return;
            if (t.classList && t.classList.contains('date-text-input')) {
                updateTradeDate(type, card.id, t.dataset.datefield, t.value);
                return;
            }
            if (t.tagName === 'INPUT' && t.dataset && t.dataset.field) formatNumberInput(t);
        });

        container.addEventListener('keydown', function(e) {
            const t = e.target;
            if (e.key === 'Enter' && t.classList && t.classList.contains('date-text-input')) t.blur();
        });
    });

    bindClick('btn-add-spot', () => addTrade('spot'));
    bindClick('btn-add-futures', () => addTrade('futures'));
    bindClick('btn-summary-spot', () => showSummary('spot'));
    bindClick('btn-summary-futures', () => showSummary('futures'));

    // Депозит ликвидации фьючерсов
    const futLiqDep = document.getElementById('futures-liq-deposit');
    if (futLiqDep) futLiqDep.addEventListener('input', function() { calcFuturesLiq(); saveFuturesLiqDeposit(); });
    const futSection = document.getElementById('section-futures');
    if (futSection) {
        futSection.addEventListener('focusin', function(e) {
            if (e.target.id === 'futures-liq-deposit') unformatNumberInput(e.target);
        });
        futSection.addEventListener('focusout', function(e) {
            if (e.target.id === 'futures-liq-deposit') {
                formatNumberInput(e.target);
                calcFuturesLiq();
                saveFuturesLiqDeposit();
            }
        });
    }
}

function closeSummary(e) {
    if (e && e.target !== e.currentTarget) return;
    const summaryModal = document.getElementById('summary-modal'); if(summaryModal) summaryModal.classList.remove('active');
}

window.addEventListener('DOMContentLoaded', () => {
    loadGridData();
    initTheme();
    loadFuturesLiqDeposit();
    const percentInput = document.getElementById('calc2-percent');
    if (percentInput) stylePercentInput(percentInput);

    if (spotTrades.length > 0) {
        const maxNum = Math.max(...spotTrades.map(t => t.num || 0));
        if (maxNum >= spotCounter) spotCounter = maxNum + 1;
    }
    if (futuresTrades.length > 0) {
        const maxNum = Math.max(...futuresTrades.map(t => t.num || 0));
        if (maxNum >= futuresCounter) futuresCounter = maxNum + 1;
    }

    // Загрузить кэшированные цены при запуске
    const cachedBtc = localStorage.getItem('btcPrice');
    if (cachedBtc) {
        const data = safeJSONParse(cachedBtc, null);
        if (data) {
        apiPrices.btc = data.price;
        const displays = [
            { priceEl: document.getElementById('btc-price-calc4'), btnId: 'btn-apply-btc-calc4' },
            { priceEl: document.getElementById('btc-price-calc5'), btnId: 'btn-apply-btc-calc5' }
        ];
        displays.forEach(d => {
            if (d.priceEl) d.priceEl.textContent = '$' + formatNumber(data.price, 0);
            const btn = document.getElementById(d.btnId);
            if (btn) { btn.disabled = false; }
        });
        }
    }
    const cachedGold = localStorage.getItem('goldPrice');
    if (cachedGold) {
        const data = safeJSONParse(cachedGold, null);
        if (data) {
        apiPrices.gold = data.price;
        const priceEl = document.getElementById('gold-price-calc5');
        if (priceEl) priceEl.textContent = '$' + formatNumber(data.price, 0);
        const btn = document.getElementById('btn-apply-gold-calc5');
        if (btn) { btn.disabled = false; }
        }
    }

    // Получить свежие цены
    fetchBtcPrice();
    fetchGoldPrice();
    fetchQuotes();
    fetchPeriodChanges();
    scheduleATRUpdate();
    initCalcInputs();
    initCalculatorHandlers();
    initDelegatedHandlers();
    initTradeHandlers();
    loadLiqData();
    // Setup deposit input listener
    const liqDep = document.getElementById('liq-deposit');
    if (liqDep) {
        liqDep.addEventListener('input', function() {
            calcLiquidation();
            saveLiqData();
        });
        liqDep.addEventListener('keyup', function() {
            calcLiquidation();
            saveLiqData();
        });
    }

    calcLiquidation();

    // Cleanup intervals on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(priceInterval);
        clearInterval(quotesInterval);
        clearInterval(futuresQuotesInterval);
    });

    // Автообновление котировок: Калькуляторы — 30с, Котировки — 15с, Фьючерсы — 15с
    const priceInterval = setInterval(() => {
        fetchBtcPrice();
        fetchGoldPrice();
    }, 30000);
    const quotesInterval = setInterval(() => {
        fetchQuotes();
        fetchPeriodChanges();
    }, 15000);
    const futuresQuotesInterval = setInterval(() => {
        if (document.getElementById('section-futures') && document.getElementById('section-futures').classList.contains('active')) {
            updateFuturesQuotes();
        }
    }, 15000);
});

// ====== ЛИКВИДАЦИЯ ======
let liqPositions = [];
let liqCounter = 1;
const LIQ_MMR = 0.005; // 0.5%
let liqListenersAttached = false;

function initLiqData() {
    try {
        const rawPos = localStorage.getItem('liqPositions');
        if (rawPos) liqPositions = JSON.parse(rawPos);
        else liqPositions = [];
    } catch (e) { liqPositions = []; }
    try {
        const rawCnt = localStorage.getItem('liqCounter');
        if (rawCnt) liqCounter = parseInt(rawCnt, 10);
        else liqCounter = 1;
    } catch (e) { liqCounter = 1; }
}

function getLiqDirOptions(selected) {
    let html = '<option value="">—</option>';
    html += '<option value="LONG"' + (selected === 'LONG' ? ' selected' : '') + '>LONG</option>';
    html += '<option value="SHORT"' + (selected === 'SHORT' ? ' selected' : '') + '>SHORT</option>';
    return html;
}

function addLiqPosition(data) {
    const container = document.getElementById('liq-positions');
    if (!container) return;
    const id = 'liq_pos_' + liqCounter++;
    const posData = data || { id: id, volume: '', entryPrice: '', direction: '' };
    if (!data) {
        liqPositions.push(posData);
        saveLiqData();
    }

    const row = document.createElement('div');
    row.className = 'liq-position-row';
    row.id = posData.id;
    row.dataset.posId = posData.id;

    row.innerHTML = `
        <div class="input-group">
            <input type="text" inputmode="decimal" placeholder="0" value="${escapeHtml(posData.volume || '')}" class="liq-vol" data-field="volume">
        </div>
        <div class="input-group">
            <input type="text" inputmode="decimal" class="liq-price price-input" placeholder="0,00" value="${escapeHtml(posData.entryPrice || '')}" data-field="entryPrice">
        </div>
        <div class="input-group">
            <select class="liq-dir" data-field="direction">${getLiqDirOptions(posData.direction)}</select>
        </div>
        <button type="button" class="liq-del-btn" data-action="delete">🗑️</button>
    `;

    container.appendChild(row);

    const dirSelect = row.querySelector('.liq-dir');
    if (posData.direction) updateLiqDirStyle(dirSelect);

    // Attach event listeners via delegation if not already done
    if (!liqListenersAttached) {
        attachLiqListeners();
        liqListenersAttached = true;
    }
}

function attachLiqListeners() {
    const container = document.getElementById('liq-positions');
    if (!container) return;

    // Handle input events on volume and price fields
    container.addEventListener('input', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' && (target.classList.contains('liq-vol') || target.classList.contains('liq-price'))) {
            const row = target.closest('.liq-position-row');
            if (!row) return;
            const id = row.dataset.posId;
            const field = target.dataset.field;
            updateLiqPosition(id, field, target.value);
            calcLiquidation();
            saveLiqData();
        }
    });

    // Handle change events on direction select
    container.addEventListener('change', function(e) {
        const target = e.target;
        if (target.tagName === 'SELECT' && target.classList.contains('liq-dir')) {
            const row = target.closest('.liq-position-row');
            if (!row) return;
            const id = row.dataset.posId;
            updateLiqPosition(id, 'direction', target.value);
            updateLiqDirStyle(target);
            calcLiquidation();
            saveLiqData();
        }
    });

    // Handle click on delete buttons
    container.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action="delete"]');
        if (target) {
            const row = target.closest('.liq-position-row');
            if (row) deleteLiqPosition(row.dataset.posId);
        }
    });
}

function updateLiqDirStyle(select) {
    select.className = 'liq-dir';
    if (select.value === 'LONG') select.classList.add('liq-dir-long');
    else if (select.value === 'SHORT') select.classList.add('liq-dir-short');
}

function updateLiqPosition(id, field, value) {
    const pos = liqPositions.find(p => p.id === id);
    if (pos) pos[field] = value;
}

function deleteLiqPosition(id) {
    const idx = liqPositions.findIndex(p => p.id === id);
    if (idx > -1) liqPositions.splice(idx, 1);
    const row = document.getElementById(id);
    if (row) row.remove();
    saveLiqData();
    calcLiquidation();
}

function saveLiqData() {
    const deposit = document.getElementById('liq-deposit');
    if (deposit) localStorage.setItem('liq_deposit', deposit.value);
    localStorage.setItem('liqPositions', JSON.stringify(liqPositions));
    localStorage.setItem('liqCounter', liqCounter);
}

function loadLiqData() {
    initLiqData();
    initRetraceInputs();
    const deposit = localStorage.getItem('liq_deposit');
    if (deposit !== null) {
        const el = document.getElementById('liq-deposit');
        if (el) el.value = deposit;
    }

    // Fix liqCounter to be max of existing ids + 1
    let maxNum = 0;
    liqPositions.forEach(function(p) {
        if (p.id) {
            const num = parseInt(p.id.replace('liq_pos_', ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    });
    if (maxNum >= liqCounter) liqCounter = maxNum + 1;

    const container = document.getElementById('liq-positions');
    if (container) {
        container.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'liq-position-row';
        header.style.marginBottom = '4px';
        header.innerHTML = `
            <div class="input-group"><label>Объём ($)</label></div>
            <div class="input-group"><label>Цена входа</label></div>
            <div class="input-group"><label>Напр.</label></div>
            <div style="width:44px;"></div>
        `;
        container.appendChild(header);
        liqPositions.forEach(function(p) { addLiqPosition(p); });
    }
}

// ====== ФЬЮЧЕРСЫ — ЛИКВИДАЦИЯ И КОТИРОВКИ ======
function getFuturesLiqDeposit() {
    const key = 'futuresLiqDeposit_' + currentFuturesExchange;
    let val = localStorage.getItem(key);
    if (val === null && currentFuturesExchange === 'Dzengi') {
        val = localStorage.getItem('futuresLiqDeposit');
    }
    return parseFloat(val || '0') || 0;
}
let futuresTickerPrices = {};

function saveFuturesLiqDeposit() {
    const input = document.getElementById('futures-liq-deposit');
    if (input) {
        const val = parseNumber(input.value);
        const deposit = isNaN(val) ? 0 : val;
        localStorage.setItem('futuresLiqDeposit_' + currentFuturesExchange, deposit);
    }
}

function loadFuturesLiqDeposit() {
    const input = document.getElementById('futures-liq-deposit');
    const deposit = getFuturesLiqDeposit();
    if (input) {
        input.value = deposit > 0 ? formatNumber(deposit, 0) : '';
    }
}

function getFuturesPositions() {
    const currentExchange = currentFuturesExchange;
    return futuresTrades.filter(t => (t.exchange || 'Dzengi') === currentExchange && t.buyPrice && t.buySum);
}

function getTickerSymbol(ticker) {
    const map = {
        'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT', 'LINK': 'LINKUSDT',
        'UNI': 'UNIUSDT', 'DOGE': 'DOGEUSDT', 'BNB': 'BNBUSDT', 'LTC': 'LTCUSDT',
        'SUI': 'SUIUSDT', 'ZK': 'ZKUSDT', 'ONDO': 'ONDOUSDT', 'TWT': 'TWTUSDT'
    };
    return map[ticker] || (ticker + 'USDT');
}

async function fetchFuturesTickerPrice(ticker) {
    const symbol = getTickerSymbol(ticker);
    // Check if we already have fresh data from quotes
    const asset = ticker.toLowerCase();
    if (quotesData[asset] && quotesData[asset].price !== null) {
        return quotesData[asset].price;
    }
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + symbol);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return parseFloat(data.lastPrice);
    } catch (e) {
        return null;
    }
}

async function updateFuturesQuotes() {
    const positions = getFuturesPositions();
    const uniqueTickers = [...new Set(positions.map(p => p.ticker).filter(Boolean))];
    if (uniqueTickers.length === 0) {
        const rowContainer = document.getElementById('futures-quotes-row');
        if (rowContainer) rowContainer.innerHTML = '';
        const timeEl = document.getElementById('futures-quotes-update-time');
        if (timeEl) timeEl.innerHTML = '';
        calcFuturesLiq();
        return;
    }

    const prices = {};
    await Promise.all(uniqueTickers.map(async (ticker) => {
        const price = await fetchFuturesTickerPrice(ticker);
        if (price !== null) prices[ticker] = price;
    }));
    futuresTickerPrices = prices;

    renderFuturesQuotes(prices, positions);
    calcFuturesLiq();

    const now = new Date();
    const timeEl = document.getElementById('futures-quotes-update-time');
    if (timeEl) {
        timeEl.innerHTML = '<span class="update-dot"></span>Обновлено: ' + now.toLocaleTimeString('ru-RU');
    }
}

function renderFuturesQuotes(prices, positions) {
    const container = document.getElementById('futures-quotes-row');
    if (!container) return;
    let html = '';
    Object.entries(prices).forEach(([ticker, price]) => {
        const tickerPositions = positions.filter(p => p.ticker === ticker);
        let pnlText = '';
        let pnlClass = '';
        let pctText = '';
        let avgEntry = 0;
        let tickerVolume = 0;
        let tickerWeighted = 0;
        tickerPositions.forEach(p => {
            const bp = parseNumber(p.buyPrice);
            const bs = parseNumber(p.buySum);
            if (!isNaN(bp) && !isNaN(bs) && bp > 0) {
                tickerVolume += bs;
                tickerWeighted += bs * bp;
            }
        });
        if (tickerVolume > 0) {
            avgEntry = tickerWeighted / tickerVolume;
            const qty = tickerVolume / avgEntry;
            const pnl = (price - avgEntry) * qty;
            const pct = ((price - avgEntry) / avgEntry) * 100;
            pnlText = (pnl >= 0 ? '+' : '') + formatNumber(pnl, 2) + ' $';
            pctText = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
            pnlClass = pnl >= 0 ? 'green' : 'red';
        }
        const decimals = price >= 10000 ? 1 : price >= 100 ? 2 : price >= 1 ? 4 : 6;
        html += '<div class="futures-quote-row">';
        html += '<span class="futures-quote-name">' + escapeHtml(ticker) + '</span>';
        html += '<span class="api-price-display"><span class="price-value">' + formatNumber(price, decimals) + '</span></span>';
        html += '<span class="futures-quote-pnl ' + pnlClass + '">' + pctText + ' (' + pnlText + ')</span>';
        html += '</div>';
    });
    container.innerHTML = html;
}

function calcFuturesLiq() {
    try {
        const depositInput = document.getElementById('futures-liq-deposit');
        const deposit = depositInput ? parseNumber(depositInput.value) : getFuturesLiqDeposit();
        const marginEl = document.getElementById('futures-liq-margin');
        const leverageEl = document.getElementById('futures-liq-leverage');
        const avgEl = document.getElementById('futures-liq-avg');
        const totalEl = document.getElementById('futures-liq-total');
        const effectiveEl = document.getElementById('futures-liq-effective');
        const liqPriceEl = document.getElementById('futures-liq-price');

        if (!marginEl) return;

        const positions = getFuturesPositions();
        if (positions.length === 0) {
            if (marginEl) marginEl.textContent = '—';
            if (leverageEl) leverageEl.textContent = '—';
            if (avgEl) avgEl.textContent = '—';
            if (totalEl) totalEl.textContent = '—';
            if (effectiveEl) effectiveEl.textContent = '—';
            if (liqPriceEl) { liqPriceEl.textContent = '—'; liqPriceEl.className = 'result-value'; }
            return;
        }

        let totalVolume = 0;
        let weightedSum = 0;
        let totalMargin = 0;
        let dir = null;

        positions.forEach(function(t) {
            const sum = parseNumber(t.buySum);
            const price = parseNumber(t.buyPrice);
            if (!isNaN(sum) && !isNaN(price) && price > 0) {
                totalVolume += sum;
                weightedSum += sum * price;
                totalMargin += sum / 10;
                const typeVal = (t.type || '').toUpperCase();
                if (dir === null) {
                    if (typeVal === 'ПРОДАЖА' || typeVal === 'SHORT') dir = 'SHORT';
                    else dir = 'LONG';
                } else if ((typeVal === 'ПРОДАЖА' || typeVal === 'SHORT') && dir !== 'SHORT') {
                    dir = 'MIX';
                } else if (typeVal !== 'ПРОДАЖА' && typeVal !== 'SHORT' && dir !== 'LONG') {
                    dir = 'MIX';
                }
            }
        });

        if (totalVolume === 0) {
            if (marginEl) marginEl.textContent = '—';
            if (leverageEl) leverageEl.textContent = '—';
            if (avgEl) avgEl.textContent = '—';
            if (totalEl) totalEl.textContent = '—';
            if (effectiveEl) effectiveEl.textContent = '—';
            if (liqPriceEl) { liqPriceEl.textContent = '—'; liqPriceEl.className = 'result-value'; }
            return;
        }

        const avgPrice = weightedSum / totalVolume;
        const dep = isNaN(deposit) ? 0 : deposit;

        if (marginEl) marginEl.textContent = formatNumber(totalMargin, 0);
        if (avgEl) avgEl.textContent = formatNumber(avgPrice, 0);
        if (totalEl) totalEl.textContent = formatNumber(totalVolume, 0);

        // Нереализованный PnL по текущим котировкам
        let unrealizedPnL = 0;
        positions.forEach(function(t) {
            const sum = parseNumber(t.buySum);
            const price = parseNumber(t.buyPrice);
            const ticker = t.ticker;
            const currentPrice = futuresTickerPrices[ticker];
            if (!isNaN(sum) && !isNaN(price) && price > 0 && currentPrice) {
                const qty = sum / price;
                const typeVal = (t.type || '').toUpperCase();
                const isShort = typeVal === 'ПРОДАЖА' || typeVal === 'SHORT';
                if (!isShort) {
                    // LONG: PnL = (current - entry) * qty
                    unrealizedPnL += (currentPrice - price) * qty;
                } else {
                    // SHORT: PnL = (entry - current) * qty
                    unrealizedPnL += (price - currentPrice) * qty;
                }
            }
        });

        const effectiveDeposit = dep - totalMargin + unrealizedPnL;
        if (effectiveEl) {
            effectiveEl.textContent = formatNumber(effectiveDeposit, 0);
            effectiveEl.className = 'result-value ' + (effectiveDeposit >= 0 ? 'neutral' : 'red');
        }

        let leverage = 0;
        if (effectiveDeposit > 0) {
            leverage = totalVolume / effectiveDeposit;
        }
        if (leverageEl) {
            if (effectiveDeposit > 0 && leverage > 0) {
                leverageEl.textContent = formatNumber(leverage, 2);
            } else {
                leverageEl.textContent = '—';
            }
        }

        const LIQ_MMR = 0.005;
        const noRisk = effectiveDeposit > 0 && leverage <= 1;
        const liquidated = effectiveDeposit <= 0;

        const liqPctEl = document.getElementById('futures-liq-pct');
        if (dir === 'LONG') {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liq = avgPrice * (1 - 1 / leverage + LIQ_MMR);
                const pct = (1 / leverage - LIQ_MMR) * 100;
                if (liqPriceEl) { liqPriceEl.textContent = formatNumber(liq, 0); liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = Math.round(pct) + '%'; liqPctEl.className = 'result-value orange'; }
            }
        } else if (dir === 'SHORT') {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liq = avgPrice * (1 + 1 / leverage - LIQ_MMR);
                const pct = (1 / leverage - LIQ_MMR) * 100;
                if (liqPriceEl) { liqPriceEl.textContent = formatNumber(liq, 0); liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = Math.round(pct) + '%'; liqPctEl.className = 'result-value orange'; }
            }
        } else {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liqL = avgPrice * (1 - 1 / leverage + LIQ_MMR);
                const liqS = avgPrice * (1 + 1 / leverage - LIQ_MMR);
                if (liqPriceEl) {
                    liqPriceEl.innerHTML = '<span class="liq-mix-long">' + formatNumber(liqL, 0) + '</span> / <span class="liq-mix-short">' + formatNumber(liqS, 0) + '</span>';
                    liqPriceEl.className = 'result-value';
                }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            }
        }
    } catch (e) {
        console.error('calcFuturesLiq error:', e);
    }
}

// ====== END ФЬЮЧЕРСЫ ЛИКВИДАЦИЯ ======

function calcLiquidation() {
    try {
        const depositInput = document.getElementById('liq-deposit');
        const deposit = depositInput ? parseNumber(depositInput.value) : NaN;
        const avgEl = document.getElementById('liq-avg-price');
        const totalVolEl = document.getElementById('liq-total-volume');
        const effectiveDepositEl = document.getElementById('liq-effective-deposit');
        const liqPriceEl = document.getElementById('liq-price');
        const liqPctEl = document.getElementById('liq-pct');
        const leverageDisplayEl = document.getElementById('liq-leverage-display');
        const marginDisplayEl = document.getElementById('liq-margin-display');

        if (!avgEl) return;

        let totalVolume = 0;
        let weightedSum = 0;
        let hasData = false;
        let dir = null;
        let firstPrice = null;
        let positionCount = 0;
        let totalMargin = 0;

        liqPositions.forEach(function(pos) {
            const vol = parseNumber(pos.volume);
            const price = parseNumber(pos.entryPrice);
            if (!isNaN(vol) && !isNaN(price) && vol > 0 && price > 0) {
                totalVolume += vol;
                weightedSum += vol * price;
                totalMargin += vol / 10;
                hasData = true;
                positionCount++;
                if (dir === null) dir = pos.direction;
                else if (dir !== pos.direction) dir = 'MIX';
                if (firstPrice === null) firstPrice = price;
            }
        });

        if (!hasData || totalVolume === 0) {
            avgEl.textContent = '—';
            if (totalVolEl) totalVolEl.textContent = '—';
            if (effectiveDepositEl) effectiveDepositEl.textContent = '—';
            if (liqPriceEl) { liqPriceEl.textContent = '—'; liqPriceEl.className = 'result-value'; }
            if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            if (leverageDisplayEl) leverageDisplayEl.textContent = '—';
            if (marginDisplayEl) marginDisplayEl.textContent = '—';
            return;
        }

        const avgPrice = weightedSum / totalVolume;
        const dep = isNaN(deposit) ? 0 : deposit;

        avgEl.textContent = formatNumber(avgPrice, 0);
        if (totalVolEl) totalVolEl.textContent = formatNumber(totalVolume, 0);
        if (marginDisplayEl) marginDisplayEl.textContent = formatNumber(totalMargin, 0);

        // Убыток от движения цены от цены открытия первой позиции
        let unrealizedLoss = 0;
        if (firstPrice !== null && !isNaN(firstPrice) && firstPrice > 0) {
            const totalQty = totalVolume / avgPrice;
            if (dir === 'LONG' && avgPrice < firstPrice) {
                unrealizedLoss = (firstPrice - avgPrice) * totalQty;
            } else if (dir === 'SHORT' && avgPrice > firstPrice) {
                unrealizedLoss = (avgPrice - firstPrice) * totalQty;
            }
        }

        // Эффективный депозит с учётом залога и убытка
        let effectiveDeposit = dep - totalMargin - unrealizedLoss;

        // Плечо
        let leverage = 0;
        if (effectiveDeposit > 0) {
            leverage = totalVolume / effectiveDeposit;
        }

        if (effectiveDepositEl) {
            effectiveDepositEl.textContent = formatNumber(effectiveDeposit, 0);
        }

        if (leverageDisplayEl) {
            if (effectiveDeposit > 0 && leverage > 0) {
                leverageDisplayEl.textContent = formatNumber(leverage, 2);
            } else {
                leverageDisplayEl.textContent = '—';
            }
        }

        // Проверка: если плечо <= 1 — ликвидация невозможна (позиция полностью обеспечена)
        const noRisk = effectiveDeposit > 0 && leverage <= 1;
        const liquidated = effectiveDeposit <= 0;

        // Цена ликвидации
        if (dir === 'LONG') {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liq = avgPrice * (1 - 1 / leverage + LIQ_MMR);
                const pct = (1 / leverage - LIQ_MMR) * 100;
                if (liqPriceEl) { liqPriceEl.textContent = formatNumber(liq, 0); liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = Math.round(pct) + '%'; liqPctEl.className = 'result-value orange'; }
            }
        } else if (dir === 'SHORT') {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liq = avgPrice * (1 + 1 / leverage - LIQ_MMR);
                const pct = (1 / leverage - LIQ_MMR) * 100;
                if (liqPriceEl) { liqPriceEl.textContent = formatNumber(liq, 0); liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = Math.round(pct) + '%'; liqPctEl.className = 'result-value orange'; }
            }
        } else {
            if (liquidated) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Ликвидация!'; liqPriceEl.className = 'result-value red'; }
                if (liqPctEl) { liqPctEl.textContent = '0%'; liqPctEl.className = 'result-value red'; }
            } else if (noRisk) {
                if (liqPriceEl) { liqPriceEl.textContent = 'Нет риска'; liqPriceEl.className = 'result-value green'; }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            } else {
                const liqL = avgPrice * (1 - 1 / leverage + LIQ_MMR);
                const liqS = avgPrice * (1 + 1 / leverage - LIQ_MMR);
                if (liqPriceEl) {
                    liqPriceEl.innerHTML = '<span class="liq-mix-long">' + formatNumber(liqL, 0) + '</span> / <span class="liq-mix-short">' + formatNumber(liqS, 0) + '</span>';
                    liqPriceEl.className = 'result-value';
                }
                if (liqPctEl) { liqPctEl.textContent = '—'; liqPctEl.className = 'result-value orange'; }
            }
        }
    } catch (e) {
        console.error('calcLiquidation error:', e);
    }
}




// ====== ATR (14 дней) — ежедневное обновление после 04:00 UTC ======
const ATR_CACHE_KEY = 'trading_atr_cache_v2';
const ATR_UPDATE_HOUR_UTC = 4; // 04:00 UTC = 00:00 UTC+4

function getATRCache() {
    try {
        const raw = localStorage.getItem(ATR_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function setATRCache(values) {
    localStorage.setItem(ATR_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), values }));
}

function updateATRDisplay(asset, value) {
    const el = document.getElementById('quote-' + asset + '-atr');
    if (!el) return;
    if (value === null || value === undefined || isNaN(value)) {
        el.textContent = '—';
        return;
    }
    el.textContent = value.toFixed(2) + '%';
    el.className = 'quote-atr';
}

function shouldUpdateATR() {
    const cached = getATRCache();
    if (!cached || !cached.timestamp) return true;
    const now = new Date();
    const today04UTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ATR_UPDATE_HOUR_UTC, 0, 0);
    // Если сейчас ещё до 04:00 UTC — проверяем вчерашнее обновление
    const checkTime = now.getTime() >= today04UTC ? today04UTC : today04UTC - 86400000;
    return cached.timestamp < checkTime;
}

function msUntilNextUpdate() {
    const now = new Date();
    const today04UTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), ATR_UPDATE_HOUR_UTC, 0, 0);
    if (now.getTime() < today04UTC) {
        return today04UTC - now.getTime();
    }
    return today04UTC + 86400000 - now.getTime();
}

async function fetchATR() {
    const assets = [
        { asset: 'btc', symbol: 'BTCUSDT', api: 'spot' },
        { asset: 'eth', symbol: 'ETHUSDT', api: 'spot' },
        { asset: 'sol', symbol: 'SOLUSDT', api: 'spot' },
        { asset: 'link', symbol: 'LINKUSDT', api: 'spot' },
        { asset: 'uni', symbol: 'UNIUSDT', api: 'spot' },
        { asset: 'doge', symbol: 'DOGEUSDT', api: 'spot' },
        { asset: 'gold', symbol: 'XAUUSDT', api: 'futures' },
        { asset: 'copper', symbol: 'COPPERUSDT', api: 'futures' },
        { asset: 'brent', symbol: 'BZUSDT', api: 'futures' },
        { asset: 'eur', symbol: 'EURUSDT', api: 'spot' }
    ];

    // Показать кэш сразу
    const cached = getATRCache();
    if (cached && cached.values) {
        Object.entries(cached.values).forEach(([asset, value]) => {
            updateATRDisplay(asset, value);
        });
    }

    // Если обновление не требуется — выходим
    if (!shouldUpdateATR()) {
        return;
    }

    const results = await Promise.all(assets.map(async (a) => {
        let baseUrl = a.api === 'futures' ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3';
        try {
            const res = await fetch(baseUrl + '/klines?symbol=' + a.symbol + '&interval=1d&limit=15');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const klines = await res.json();
            if (klines.length < 15) throw new Error('Not enough data');

            let sum = 0;
            for (let i = 1; i < klines.length; i++) {
                const open = parseFloat(klines[i][1]);
                const high = parseFloat(klines[i][2]);
                const low = parseFloat(klines[i][3]);
                const tr = Math.max((high - open) / open * 100, (open - low) / open * 100);
                sum += tr;
            }
            const atr = sum / 14;
            return { asset: a.asset, atr };
        } catch (e) {
            return { asset: a.asset, atr: null };
        }
    }));

    const cacheData = {};
    results.forEach(r => {
        if (r.atr !== null) {
            updateATRDisplay(r.asset, r.atr);
            cacheData[r.asset] = r.atr;
        }
    });
    if (Object.keys(cacheData).length > 0) {
        setATRCache(cacheData);
    }
}

function scheduleATRUpdate() {
    // Первый запуск: если пора обновлять — сразу, иначе покажем кэш
    fetchATR();
    // Затем планируем ежедневное обновление в 04:00 UTC
    const ms = msUntilNextUpdate();
    setTimeout(() => {
        fetchATR();
        setInterval(fetchATR, 24 * 60 * 60 * 1000); // раз в сутки
    }, ms);
}
// ====== END ATR ======

// ====== SERVICE WORKER (OFFLINE SUPPORT) ======
// Требует HTTPS (или localhost); sw.js должен лежать рядом с index.html
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(){}).catch(function(){});
    });
}

function calcGrid() {
    const extremum = getInputValue('grid-extremum');
    const rows = document.querySelectorAll('#grid-rows .grid-row');
    rows.forEach(row => {
        const percentInput = row.querySelector('.grid-percent');
        const resultEl = row.querySelector('.grid-result');
        const percent = parseFloat(percentInput.value.replace(/[+\s%]/g, '').replace(',', '.'));
        if (isNaN(extremum) || extremum === 0 || isNaN(percent)) {
            resultEl.textContent = '—';
            return;
        }
        // Color percent input and suffix based on value
        const suffix = row.querySelector('.percent-suffix');
        if (percent > 0) {
            percentInput.style.color = 'var(--green)';
            if (suffix) suffix.style.color = 'var(--green)';
        } else if (percent < 0) {
            percentInput.style.color = 'var(--red)';
            if (suffix) suffix.style.color = 'var(--red)';
        } else {
            percentInput.style.color = '';
            if (suffix) suffix.style.color = '';
        }
        let result;
        if (percent > 0) {
            result = extremum + (extremum * percent / 100);
        } else {
            result = extremum - (extremum * percent / -100);
        }
        resultEl.textContent = formatNumber(result, 0);
    });
}

function addGridRow() {
    const container = document.getElementById('grid-rows');
    const index = container.children.length;
    const row = document.createElement('div');
    row.className = 'grid-row';
    row.dataset.index = index;
    row.innerHTML = '<div class="trade-grid"><div class="input-group" style="margin-bottom:0;"><div class="percent-wrap"><input type="text" class="grid-percent" placeholder="0"><span class="percent-suffix">%</span></div></div><div class="input-group" style="margin-bottom:0;"><div class="result-box"><div class="result-value neutral grid-result">—</div></div></div><button type="button" class="grid-del-btn" title="Удалить строку">🗑️</button></div>';
    container.appendChild(row);
    saveGridData();
}

function deleteGridRow(btn) {
    const row = btn.closest('.grid-row');
    const container = document.getElementById('grid-rows');
    if (container.children.length > 1) {
        row.remove();
        saveGridData();
    }
}

function removeGridRow() {
    const container = document.getElementById('grid-rows');
    if (container.children.length > 1) {
        container.removeChild(container.lastElementChild);
        saveGridData();
    }
}

function saveGridData() {
    const gridExtremumEl = document.getElementById('grid-extremum'); const extremum = gridExtremumEl ? gridExtremumEl.value : '';
    const percents = [];
    document.querySelectorAll('#grid-rows .grid-percent').forEach(inp => percents.push(inp.value));
    localStorage.setItem('gridData', JSON.stringify({extremum, percents}));
}

function loadGridData() {
    const data = safeJSONParse(localStorage.getItem('gridData'), null);
    if (!data) return;
    const gridExtEl = document.getElementById('grid-extremum'); if(gridExtEl) gridExtEl.value = data.extremum || '';
    if (data.percents) {
        const container = document.getElementById('grid-rows');
        container.innerHTML = '';
        data.percents.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            row.dataset.index = i;
            row.innerHTML = '<div class="trade-grid"><div class="input-group" style="margin-bottom:0;"><div class="percent-wrap"><input type="text" class="grid-percent" placeholder="0" value="' + escapeHtml(p) + '"><span class="percent-suffix">%</span></div></div><div class="input-group" style="margin-bottom:0;"><div class="result-box"><div class="result-value neutral grid-result">—</div></div></div><button type="button" class="grid-del-btn" title="Удалить строку">🗑️</button></div>';
            container.appendChild(row);
        });
    }
    calcGrid();
}
