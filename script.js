// Nucleus — Lógica da Plataforma Web (Catálogo Real + Simulador AHP 9 Critérios + Área de Cliente)

// Saaty Random Index (RI) para matrizes de ordem 1 a 10
const SAATY_RI = {
    1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
    6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

const CRITERIA_CONFIG = [
    { key: 'RECEPCIONISTA', inputId: 'w_rec', labelId: 'val_rec', label: 'Recepcionista' },
    { key: 'WiFi', inputId: 'w_wifi', labelId: 'val_wifi', label: 'WiFi' },
    { key: 'SALA DE REUNIOES', inputId: 'w_reunioes', labelId: 'val_reunioes', label: 'Sala de Reuniões' },
    { key: 'ESTACIONAMENTO', inputId: 'w_est', labelId: 'val_est', label: 'Estacionamento' },
    { key: 'TRANSPORTES', inputId: 'w_trans', labelId: 'val_trans', label: 'Transportes' },
    { key: 'CANTINA/REST', inputId: 'w_cantina', labelId: 'val_cantina', label: 'Cantina/Rest' },
    { key: 'AREA DE LAZER', inputId: 'w_lazer', labelId: 'val_lazer', label: 'Área de Lazer' },
    { key: 'AC', inputId: 'w_ac', labelId: 'val_ac', label: 'Ar Condicionado' },
    { key: 'PREÇO', inputId: 'w_preco', labelId: 'val_preco', label: 'Preço Mensalidade' }
];

const ESTACIONAMENTO_LABELS = {
    4: 'Nível 4 (Incluído/Amplo)',
    3: 'Nível 3 (Próprio, pago à parte)',
    2: 'Nível 2 (Fácil na rua/periferia)',
    1: 'Nível 1 (Difícil, parquímetros/trânsito)'
};

const TRANSPORTES_LABELS = {
    4: 'Nível 4 (Metro + Autocarro + Comboio)',
    3: 'Nível 3 (Metro + Autocarro frequente)',
    2: 'Nível 2 (Apenas autocarro / longe do Metro)',
    1: 'Nível 1 (Fraco / Sem ligação direta)'
};

const CANTINA_LABELS = {
    4: 'Nível 4 (Cantina / Praça no pólo)',
    3: 'Nível 3 (Restaurante / Café integrado)',
    2: 'Nível 2 (Apenas copa equipada)',
    1: 'Nível 1 (Sem infraestrutura dedicada)'
};

let showAllSpaces = false;
let dynamicSpacesData = typeof EMPRESAS_DATA !== 'undefined' ? EMPRESAS_DATA : [];
let spacesDataSource = 'local';
let lastSimulationResult = null;
let pendingSpaceSelection = null;
let pendingRedirectToSim = false;

// --- Helpers de Parsing & Regra 8,88 ---
function parseNumericValue(val) {
    if (val === null || val === undefined) return 9999;
    if (typeof val === 'number') return val;
    const cleaned = String(val)
        .replace(/€/g, '')
        .replace(',', '.')
        .replace(/\/mês/gi, '')
        .replace(/\/hora/gi, '')
        .trim();
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 9999 : num;
}

function isSpecial888(num) {
    return Math.abs(num - 8.88) < 0.05;
}

function isAvailablePrice(num) {
    return num > 0 && num < 9000;
}

function getModalidadePrice(item, modalidade) {
    const map = {
        'Cowork': item['Cowork'],
        'Mesa individual': item['Mesa individual'],
        'Privado': item['Privado'],
        'Escritório Virtual': item['Escritório Virtual']
    };
    return parseNumericValue(map[modalidade] ?? item['Cowork']);
}

function formatPriceLabel(num, unitSuffix, isMeetingRoom = false) {
    if (isSpecial888(num)) {
        return isMeetingRoom ? 'Incluída na mensalidade' : 'Subsidiado / Candidatura';
    }
    if (!isAvailablePrice(num)) return 'N/D';
    return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace('.', ',')} €${unitSuffix}`;
}

function isTruthyFlag(val) {
    const s = String(val ?? '0').trim().toLowerCase();
    return s === '1' || s === 'sim' || s === 'true';
}

function getTipologiaBadgeColor(tipologia) {
    if (!tipologia) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    if (tipologia.includes('Incubadora')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300';
    if (tipologia.includes('Parque')) return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
    if (tipologia.includes('Centros')) return 'bg-blue-100 dark:bg-blue-900/40 text-brand-blue';
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
}

// --- Theme Toggle ---
function toggleDarkMode() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-moon text-sm';
        themeText.textContent = 'Escuro';
        localStorage.setItem('theme', 'light');
    } else {
        htmlEl.classList.add('dark');
        themeIcon.className = 'fa-solid fa-sun text-sm text-amber-400';
        themeText.textContent = 'Claro';
        localStorage.setItem('theme', 'dark');
    }
}

if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').className = 'fa-solid fa-sun text-sm text-amber-400';
    document.getElementById('themeText').textContent = 'Claro';
}

// --- Mobile Menu Toggle ---
function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}

// --- Diretório de Espaços ---
function getFilteredSpaces() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const regionVal = document.getElementById('regionFilter')?.value || 'all';
    const typeVal = document.getElementById('typeFilter')?.value || 'all';

    return dynamicSpacesData.filter(item => {
        const name = (item['EMPRESA'] || '').toLowerCase();
        const dir = (item['DIRECCAO'] || '').toLowerCase();
        const loc = item['Localização'] || '';
        const tip = item['TIPOLOGIA'] || '';

        const matchesSearch = !searchVal || name.includes(searchVal) || dir.includes(searchVal) || loc.toLowerCase().includes(searchVal) || tip.toLowerCase().includes(searchVal);
        const matchesRegion = regionVal === 'all' || loc === regionVal;
        const matchesType = typeVal === 'all' || tip === typeVal;

        return matchesSearch && matchesRegion && matchesType;
    });
}

function renderSpacesDirectory() {
    const grid = document.getElementById('spacesGrid');
    const countLabel = document.getElementById('spacesCountLabel');
    const toggleBtn = document.getElementById('toggleShowAllSpacesBtn');
    if (!grid) return;

    const filtered = getFilteredSpaces();
    const totalAll = dynamicSpacesData.length;
    const heroCount = document.getElementById('heroSpacesCount');
    if (heroCount) {
        heroCount.textContent = `${totalAll} Espaços Mapeados`;
    }
    const limit = showAllSpaces ? filtered.length : 6;
    const toRender = filtered.slice(0, limit);

    if (countLabel) {
        const sourceTag = spacesDataSource === 'firebase' ? ' • Sincronizado em tempo real (Firebase)' : '';
        countLabel.textContent = `A apresentar ${toRender.length} de ${filtered.length} espaços filtrados (total na base de dados: ${totalAll})${sourceTag}.`;
    }

    if (toggleBtn) {
        if (filtered.length <= 6) {
            toggleBtn.classList.add('hidden');
        } else {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = showAllSpaces
                ? 'Mostrar menos espaços'
                : `Ver todos os ${filtered.length} espaços`;
        }
    }

    if (toRender.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <p class="text-sm text-slate-500">Nenhum espaço encontrado com os filtros aplicados.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = toRender.map(item => {
        const empresa = item['EMPRESA'] || 'Espaço sem nome';
        const localizacao = item['Localização'] || 'Grande Porto';
        const tipologia = item['TIPOLOGIA'] || 'Espaço Empresarial';
        const direccao = item['DIRECCAO'] || '';
        const coworkPrice = parseNumericValue(item['Cowork']);
        const privadoPrice = parseNumericValue(item['Privado']);
        const meetingPrice = parseNumericValue(item['SALA DE REUNIOES']);
        const estNivel = parseInt(item['ESTACIONAMENTO'], 10) || 1;
        const transNivel = parseInt(item['TRANSPORTES'], 10) || 1;
        const wifiNivel = parseInt(item['WiFi'], 10) || 1;
        const lazerNivel = parseInt(item['AREA DE LAZER'], 10) || 1;
        const acNivel = parseInt(item['AC'], 10) || 1;

        const badgePrice = isSpecial888(coworkPrice) || isSpecial888(privadoPrice)
            ? '<span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold"><i class="fa-solid fa-award mr-1"></i>Por candidatura</span>'
            : isAvailablePrice(coworkPrice)
                ? `<span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Cowork ${coworkPrice.toFixed(0)} €/mês</span>`
                : isAvailablePrice(privadoPrice)
                    ? `<span class="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">Privado ${privadoPrice.toFixed(0)} €/mês</span>`
                    : `<span class="text-xs font-mono text-slate-500">${item['Modelo de Preço'] || 'Sob consulta'}</span>`;

        const tags = [];
        if (isTruthyFlag(item['RECEPCIONISTA'])) tags.push('Recepção');
        tags.push(`Wi-Fi ${wifiNivel}/9`);
        tags.push(`Lazer ${lazerNivel}/9`);
        tags.push(`AC ${acNivel}/9`);
        if (isSpecial888(meetingPrice)) tags.push('Sala Reuniões Incluída');
        tags.push(`Estac. ${estNivel}/4`);
        tags.push(`Transp. ${transNivel}/4`);

        const safeEmpresaAttr = empresa.replace(/'/g, "\\'");

        return `
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:border-brand-blue/50 transition-all flex flex-col">
                <div class="p-6 flex-1">
                    <div class="flex items-start justify-between gap-2 mb-4">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${getTipologiaBadgeColor(tipologia)}">${localizacao}</span>
                        ${badgePrice}
                    </div>
                    <h4 class="text-xl font-bold font-serif-title mb-1.5 text-slate-900 dark:text-white">${empresa}</h4>
                    <p class="text-xs font-medium text-brand-blue mb-3">${tipologia}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                        <i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>${direccao}
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                        ${tags.map(t => `<span class="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">${t}</span>`).join('')}
                    </div>
                </div>
                <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span class="text-slate-500">${item['Modelo de Preço'] || 'Mensalidade'}</span>
                    <a href="nucleus.html" target="_blank" rel="noopener" class="text-brand-blue hover:underline font-semibold">Testar no Simulador &rarr;</a>
                </div>
            </div>
        `;
    }).join('');
}

function filterSpaces() {
    showAllSpaces = false;
    renderSpacesDirectory();
}

function toggleShowAllSpaces() {
    showAllSpaces = !showAllSpaces;
    renderSpacesDirectory();
}

function goToSimulator(event) {
    if (event) event.preventDefault();
    if (!document.getElementById('flutterAppFrame') && !getCurrentClient()) {
        pendingRedirectToSim = true;
        openClientModal('login', true);
        return;
    }
    document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
}

function applySpaceSelectionInSim(empresa, tipologia, localizacao) {
    const locSelect = document.getElementById('simLocalizacao');
    const tipSelect = document.getElementById('simTipologia');
    if (locSelect) locSelect.value = localizacao;
    if (tipSelect) tipSelect.value = tipologia;

    runAHPSimulation(empresa);
    document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
}

function selectSpaceInSim(empresa, tipologia, localizacao) {
    if (document.getElementById('flutterAppFrame')) {
        document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    if (!getCurrentClient()) {
        pendingSpaceSelection = { empresa, tipologia, localizacao };
        pendingRedirectToSim = true;
        openClientModal('login', true);
        return;
    }
    applySpaceSelectionInSim(empresa, tipologia, localizacao);
}

// --- Algoritmo AHP Real (Matriz de Saaty 9x9 + Média Geométrica) ---
function runAHPSimulation(highlightEmpresa = null) {
    if (!document.getElementById('simModalidade') || !getCurrentClient()) {
        lastSimulationResult = null;
        return;
    }
    const dataset = dynamicSpacesData.length
        ? dynamicSpacesData
        : (typeof EMPRESAS_DATA !== 'undefined' ? EMPRESAS_DATA : []);
    const modalidade = document.getElementById('simModalidade').value;
    const localizacao = document.getElementById('simLocalizacao').value;
    const tipologia = document.getElementById('simTipologia').value;
    const includeSubsidized = document.getElementById('includeSubsidized').checked;

    // 1. Ler pesos brutos (1..9)
    const rawWeights = {};
    CRITERIA_CONFIG.forEach(c => {
        rawWeights[c.key] = parseFloat(document.getElementById(c.inputId).value) || 5;
    });

    // 2. Construir matriz par-a-par A (9x9) e calcular vetor próprio por Média Geométrica
    const m = CRITERIA_CONFIG.length;
    const geoMeans = CRITERIA_CONFIG.map(ci => {
        let prod = 1.0;
        CRITERIA_CONFIG.forEach(cj => {
            prod *= (rawWeights[ci.key] / rawWeights[cj.key]);
        });
        return Math.pow(prod, 1.0 / m);
    });

    const sumGeo = geoMeans.reduce((acc, v) => acc + v, 0);
    const normWeights = {};
    CRITERIA_CONFIG.forEach((c, idx) => {
        normWeights[c.key] = geoMeans[idx] / sumGeo;
        const labelEl = document.getElementById(c.labelId);
        if (labelEl) {
            labelEl.textContent = `${rawWeights[c.key]} (${Math.round(normWeights[c.key] * 100)}%)`;
        }
    });

    // 3. Calcular Consistência (CR)
    const lambdaMax = m;
    const ci = (lambdaMax - m) / (m - 1);
    const ri = SAATY_RI[m] || 1.45;
    const cr = ri > 0 ? ci / ri : 0.0;

    const crBadge = document.getElementById('crBadge');
    if (crBadge) {
        crBadge.textContent = `Coerência CR = ${cr.toFixed(3)} ${cr < 0.10 ? '✓' : '!'}`;
    }

    // 4. Filtrar candidatos
    const candidates = dataset.filter(item => {
        if (localizacao !== 'Todas' && item['Localização'] !== localizacao) return false;
        if (tipologia !== 'Todas' && item['TIPOLOGIA'] !== tipologia) return false;
        const pEsp = getModalidadePrice(item, modalidade);
        if (!includeSubsidized && isSpecial888(pEsp)) return false;
        return true;
    });

    const countEl = document.getElementById('simEvaluatedCount');
    if (countEl) {
        countEl.textContent = `${candidates.length} espaços avaliados (${modalidade})`;
    }

    const resultsContainer = document.getElementById('ahpResultsContainer');
    const winnerBox = document.getElementById('winnerAnalysisBox');

    if (candidates.length === 0) {
        resultsContainer.innerHTML = '<div class="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300">Nenhum espaço disponível com esta combinação de filtros. Experimente alargar a localização ou tipologia.</div>';
        winnerBox.innerHTML = '';
        lastSimulationResult = null;
        return;
    }

    // 5. Determinar min/max de preços reais (excluindo 9999 e o código especial 8,88)
    const validMeetingPrices = candidates
        .map(c => parseNumericValue(c['SALA DE REUNIOES']))
        .filter(p => isAvailablePrice(p) && !isSpecial888(p));
    const validSpacePrices = candidates
        .map(c => getModalidadePrice(c, modalidade))
        .filter(p => isAvailablePrice(p) && !isSpecial888(p));

    const minMeet = validMeetingPrices.length ? Math.min(...validMeetingPrices) : 8;
    const maxMeet = validMeetingPrices.length ? Math.max(...validMeetingPrices) : 30;
    const minSpace = validSpacePrices.length ? Math.min(...validSpacePrices) : 30;
    const maxSpace = validSpacePrices.length ? Math.max(...validSpacePrices) : 500;

    const normBenefit = (val, minV, maxV) => {
        if (maxV === minV) return 1.0;
        return Math.max(0, Math.min(1, (val - minV) / (maxV - minV)));
    };

    const normCost = (val, minV, maxV) => {
        if (isSpecial888(val)) return 1.0; // Incluído na mensalidade ou subsidiado por candidatura
        if (!isAvailablePrice(val)) return 0.0;
        if (maxV === minV) return 1.0;
        return Math.max(0, Math.min(1, (maxV - val) / (maxV - minV)));
    };

    // 6. Pontuar cada alternativa
    const ranked = candidates.map(item => {
        const sRec = isTruthyFlag(item['RECEPCIONISTA']) ? 1.0 : 0.0;
        const sWifi = isTruthyFlag(item['WiFi']) ? 1.0 : 0.0;
        const pMeet = parseNumericValue(item['SALA DE REUNIOES']);
        const sMeet = normCost(pMeet, minMeet, maxMeet);
        const estVal = Math.max(1, Math.min(4, parseFloat(item['ESTACIONAMENTO']) || 1));
        const sEst = normBenefit(estVal, 1, 4);
        const transVal = Math.max(1, Math.min(4, parseFloat(item['TRANSPORTES']) || 1));
        const sTrans = normBenefit(transVal, 1, 4);
        const cantVal = Math.max(1, Math.min(4, parseFloat(item['CANTINA/REST']) || 1));
        const sCant = normBenefit(cantVal, 1, 4);
        const sLazer = isTruthyFlag(item['AREA DE LAZER']) ? 1.0 : 0.0;
        const sAc = isTruthyFlag(item['AC']) ? 1.0 : 0.0;
        const pSpace = getModalidadePrice(item, modalidade);
        const sSpace = normCost(pSpace, minSpace, maxSpace);

        const globalScore =
            normWeights['RECEPCIONISTA'] * sRec +
            normWeights['WiFi'] * sWifi +
            normWeights['SALA DE REUNIOES'] * sMeet +
            normWeights['ESTACIONAMENTO'] * sEst +
            normWeights['TRANSPORTES'] * sTrans +
            normWeights['CANTINA/REST'] * sCant +
            normWeights['AREA DE LAZER'] * sLazer +
            normWeights['AC'] * sAc +
            normWeights['PREÇO'] * sSpace;

        return {
            item,
            score: globalScore,
            pMeet,
            pSpace,
            estVal,
            transVal,
            cantVal,
            sRec,
            sWifi,
            sLazer,
            sAc
        };
    });

    ranked.sort((a, b) => b.score - a.score);

    lastSimulationResult = {
        timestamp: new Date().toISOString(),
        modalidade,
        localizacao,
        tipologia,
        consistencyRatio: cr,
        normWeights,
        top5: ranked.slice(0, 5)
    };

    // 7. Renderizar Top 5
    resultsContainer.innerHTML = '';
    ranked.slice(0, 5).forEach((entry, index) => {
        const percentage = (entry.score * 100).toFixed(1);
        const isWinner = index === 0;
        const isHighlighted = highlightEmpresa && entry.item['EMPRESA'] === highlightEmpresa;
        const priceBadge = formatPriceLabel(entry.pSpace, '/mês', false);

        const barEl = document.createElement('div');
        barEl.className = `space-y-1.5 p-2 rounded-lg ${isHighlighted ? 'ring-1 ring-brand-blue bg-blue-500/10' : ''}`;
        barEl.innerHTML = `
            <div class="flex justify-between items-center text-xs gap-2">
                <span class="font-semibold text-slate-200 flex items-center gap-2 truncate">
                    ${isWinner
                ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">#1 RECOMENDADO</span>'
                : `<span class="text-slate-400 font-mono shrink-0">#${index + 1}</span>`}
                    <span class="truncate">${entry.item['EMPRESA']}</span>
                    <span class="text-[11px] font-normal text-slate-400 hidden sm:inline">(${entry.item['Localização']})</span>
                </span>
                <span class="font-mono font-bold shrink-0 ${isWinner ? 'text-brand-blue text-sm' : 'text-slate-300'}">${percentage}%</span>
            </div>
            <div class="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 ${isWinner ? 'bg-gradient-to-r from-blue-500 to-brand-blue' : 'bg-slate-500'}" style="width: ${Math.min(100, Math.round(entry.score * 100))}%"></div>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400">
                <span>${entry.item['TIPOLOGIA']}</span>
                <span class="font-mono">${modalidade}: ${priceBadge}</span>
            </div>
        `;
        resultsContainer.appendChild(barEl);
    });

    // 8. Cartão de análise do vencedor (#1 ou espaço focado)
    const focusEntry = highlightEmpresa
        ? (ranked.find(r => r.item['EMPRESA'] === highlightEmpresa) || ranked[0])
        : ranked[0];
    const w = focusEntry.item;

    const strengths = [];
    const notes = [];

    if (isSpecial888(focusEntry.pSpace)) strengths.push('Espaço subsidiado / acesso por candidatura.');
    else if (isAvailablePrice(focusEntry.pSpace)) strengths.push(`${modalidade} disponível por ${formatPriceLabel(focusEntry.pSpace, '/mês')}.`);
    else notes.push(`Modalidade "${modalidade}" sob consulta ou indisponível.`);

    if (isSpecial888(focusEntry.pMeet)) strengths.push('Sala de reuniões incluída na mensalidade.');
    if (focusEntry.estVal >= 3) strengths.push(ESTACIONAMENTO_LABELS[focusEntry.estVal]);
    else notes.push(ESTACIONAMENTO_LABELS[focusEntry.estVal]);

    if (focusEntry.transVal >= 3) strengths.push(TRANSPORTES_LABELS[focusEntry.transVal]);
    else notes.push(TRANSPORTES_LABELS[focusEntry.transVal]);

    if (focusEntry.cantVal >= 3) strengths.push(CANTINA_LABELS[focusEntry.cantVal]);
    if (focusEntry.sRec && focusEntry.sWifi) strengths.push('Inclui Recepção presencial e Wi-Fi.');
    if (!focusEntry.sAc) notes.push('Sem ar condicionado (AC) registado.');
    if (!focusEntry.sLazer) notes.push('Sem área de lazer dedicada.');

    winnerBox.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <span class="text-xs font-mono uppercase text-emerald-400 font-bold">
                <i class="fa-solid fa-circle-check mr-1"></i> Espaço Recomendado pela Nucleus
            </span>
            <span class="text-xs font-mono text-slate-400">Score AHP: ${(focusEntry.score * 100).toFixed(1)}%</span>
        </div>
        <div>
            <h4 class="text-base font-bold font-serif-title text-white">${w['EMPRESA']}</h4>
            <p class="text-xs text-slate-400 mt-0.5">${w['DIRECCAO']} • ${w['Localização']}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span class="text-emerald-400 font-semibold block mb-1"><i class="fa-solid fa-thumbs-up mr-1"></i> Pontos Fortes</span>
                <p class="text-slate-300 leading-relaxed">${strengths.slice(0, 3).join(' ')}</p>
            </div>
            <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span class="text-amber-400 font-semibold block mb-1"><i class="fa-solid fa-circle-info mr-1"></i> Notas Técnicas</span>
                <p class="text-slate-300 leading-relaxed">${notes.length ? notes.slice(0, 3).join(' ') : 'Cumpre todos os critérios de infraestrutura e mobilidade.'}</p>
            </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <span><i class="fa-solid fa-phone mr-1"></i>${w['TELEFONE'] || 'N/D'} · <i class="fa-regular fa-envelope ml-1 mr-1"></i>${w['EMAIL'] || 'N/D'}</span>
            ${w['WEBSITE'] ? `<a href="${w['WEBSITE']}" target="_blank" rel="noopener" class="text-brand-blue hover:underline font-semibold">Visitar website &rarr;</a>` : ''}
        </div>
    `;
}

function resetSliders() {
    const defaults = {
        w_rec: 5, w_wifi: 7, w_reunioes: 6, w_est: 5,
        w_trans: 6, w_cantina: 4, w_lazer: 3, w_ac: 4, w_preco: 8
    };
    Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
    document.getElementById('simModalidade').value = 'Cowork';
    document.getElementById('simLocalizacao').value = 'Todas';
    document.getElementById('simTipologia').value = 'Todas';
    document.getElementById('includeSubsidized').checked = true;
    runAHPSimulation();
}

// --- Área de Cliente (localStorage) ---
function getCurrentClient() {
    try {
        return JSON.parse(localStorage.getItem('nucleus_client_session') || 'null');
    } catch {
        return null;
    }
}

function getSimulationHistory() {
    try {
        return JSON.parse(localStorage.getItem('nucleus_client_history') || '[]');
    } catch {
        return [];
    }
}

function updateClientUI() {
    const client = getCurrentClient();
    const headerLabel = document.getElementById('clientAreaLabel');
    const simBanner = document.getElementById('simClientBanner');
    const authView = document.getElementById('clientAuthView');
    const dashView = document.getElementById('clientDashboardView');
    const lockedGate = document.getElementById('simulatorLockedGate');
    const unlockedContent = document.getElementById('simulatorUnlockedContent');

    if (client) {
        if (headerLabel) headerLabel.textContent = client.name;
        if (lockedGate) lockedGate.classList.add('hidden');
        if (unlockedContent) unlockedContent.classList.remove('hidden');
        if (simBanner) {
            simBanner.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs"><i class="fa-solid fa-user-check"></i></div>
                <div class="text-xs">
                    <div class="font-semibold text-white">${client.name}</div>
                    <div class="text-slate-400">${client.profile}</div>
                </div>
                <button onclick="openClientModal()" class="ml-2 text-xs text-brand-blue hover:underline font-medium">Histórico</button>
            `;
        }
        if (authView) authView.classList.add('hidden');
        if (dashView) dashView.classList.remove('hidden');
        document.getElementById('clientProfileName').textContent = client.name;
        document.getElementById('clientProfileMeta').textContent = `${client.email} · ${client.profile}`;
        renderClientHistory();
        runAHPSimulation();
    } else {
        if (headerLabel) headerLabel.textContent = 'Área de Cliente';
        if (lockedGate) lockedGate.classList.remove('hidden');
        if (unlockedContent) unlockedContent.classList.add('hidden');
        lastSimulationResult = null;
        if (simBanner) {
            simBanner.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs"><i class="fa-solid fa-lock"></i></div>
                <div class="text-xs">
                    <div class="font-semibold text-white">Acesso Reservado</div>
                    <div class="text-slate-400">Entre na Área de Cliente para simular</div>
                </div>
                <button onclick="openClientModal('login', true)" class="ml-2 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-blue-600">Entrar</button>
            `;
        }
        if (authView) authView.classList.remove('hidden');
        if (dashView) dashView.classList.add('hidden');
    }
}

function renderClientHistory() {
    const listEl = document.getElementById('clientHistoryList');
    if (!listEl) return;
    const history = getSimulationHistory();
    if (history.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-slate-500 py-3 text-center">Ainda não guardou nenhuma simulação.</p>';
        return;
    }
    listEl.innerHTML = history.map(h => `
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center gap-2">
            <div>
                <div class="font-semibold text-slate-800 dark:text-slate-200">${h.winner}</div>
                <div class="text-[11px] text-slate-500">${h.date} · ${h.modalidade} · ${h.localizacao}</div>
            </div>
            <span class="font-mono font-bold text-brand-blue">${h.scorePct}%</span>
        </div>
    `).join('');
}

function openClientModal(tab = 'login', showNotice = false) {
    if (document.getElementById('flutterAppFrame')) {
        document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    updateClientUI();
    const notice = document.getElementById('clientAuthNotice');
    if (notice) {
        notice.classList.toggle('hidden', !showNotice);
    }
    switchClientTab(tab);
    document.getElementById('clientModal').classList.remove('hidden');
}

function closeClientModal() {
    document.getElementById('clientModal').classList.add('hidden');
    const notice = document.getElementById('clientAuthNotice');
    if (notice) notice.classList.add('hidden');
}

function switchClientTab(tab) {
    const loginForm = document.getElementById('clientLoginForm');
    const regForm = document.getElementById('clientRegisterForm');
    const loginBtn = document.getElementById('tabLoginBtn');
    const regBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        loginBtn.classList.add('border-brand-blue', 'text-brand-blue');
        regBtn.classList.remove('border-brand-blue', 'text-brand-blue');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        regBtn.classList.add('border-brand-blue', 'text-brand-blue');
        loginBtn.classList.remove('border-brand-blue', 'text-brand-blue');
    }
}

function fillDemoClient() {
    document.getElementById('loginEmail').value = 'cliente@nucleus.pt';
    document.getElementById('loginPassword').value = 'nucleus2026';
}

function completeClientAuthentication() {
    updateClientUI();
    if (pendingSpaceSelection) {
        const { empresa, tipologia, localizacao } = pendingSpaceSelection;
        pendingSpaceSelection = null;
        pendingRedirectToSim = false;
        closeClientModal();
        applySpaceSelectionInSim(empresa, tipologia, localizacao);
        return;
    }
    if (pendingRedirectToSim) {
        pendingRedirectToSim = false;
        closeClientModal();
        document.getElementById('simulador').scrollIntoView({ behavior: 'smooth' });
    }
}

function handleClientLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const savedReg = JSON.parse(localStorage.getItem('nucleus_registered_user') || 'null');
    const client = (savedReg && savedReg.email === email)
        ? savedReg
        : { name: email.split('@')[0], email, profile: 'Cliente Empresarial Nucleus' };
    localStorage.setItem('nucleus_client_session', JSON.stringify(client));
    completeClientAuthentication();
}

function handleClientRegister(event) {
    event.preventDefault();
    const client = {
        name: document.getElementById('regName').value.trim(),
        profile: document.getElementById('regProfile').value,
        email: document.getElementById('regEmail').value.trim()
    };
    localStorage.setItem('nucleus_registered_user', JSON.stringify(client));
    localStorage.setItem('nucleus_client_session', JSON.stringify(client));
    completeClientAuthentication();
}

function handleClientLogout() {
    localStorage.removeItem('nucleus_client_session');
    updateClientUI();
}

function saveSimulationToHistory() {
    const client = getCurrentClient();
    if (!client) {
        openClientModal();
        return;
    }
    if (!lastSimulationResult || !lastSimulationResult.top5.length) return;
    const top = lastSimulationResult.top5[0];
    const history = getSimulationHistory();
    history.unshift({
        date: new Date().toLocaleString('pt-PT'),
        modalidade: lastSimulationResult.modalidade,
        localizacao: lastSimulationResult.localizacao,
        winner: top.item['EMPRESA'],
        scorePct: (top.score * 100).toFixed(1)
    });
    localStorage.setItem('nucleus_client_history', JSON.stringify(history.slice(0, 15)));
    updateClientUI();
    alert(`Simulação "${top.item['EMPRESA']}" guardada na sua Área de Cliente!`);
}

function clearSimulationHistory() {
    localStorage.removeItem('nucleus_client_history');
    renderClientHistory();
}

// --- Export Simulation Results ---
function exportResults() {
    if (!getCurrentClient()) {
        pendingRedirectToSim = true;
        openClientModal('login', true);
        return;
    }
    if (!lastSimulationResult || !lastSimulationResult.top5.length) {
        alert('Não existem resultados para exportar com os filtros atuais.');
        return;
    }

    const modal = document.getElementById('exportModal');
    const contentBox = document.getElementById('modalReportContent');
    const client = getCurrentClient();

    const weightsPct = {};
    Object.entries(lastSimulationResult.normWeights).forEach(([k, v]) => {
        weightsPct[k] = `${Math.round(v * 100)}%`;
    });

    const payload = {
        plataforma: 'Nucleus Consultoria Empresarial (AHP)',
        cliente: client ? client.name : 'Visitante',
        data: new Date().toLocaleDateString('pt-PT'),
        filtros: {
            modalidade: lastSimulationResult.modalidade,
            localizacao: lastSimulationResult.localizacao,
            tipologia: lastSimulationResult.tipologia
        },
        consistency_ratio: Number(lastSimulationResult.consistencyRatio.toFixed(4)),
        pesos_normalizados: weightsPct,
        ranking_top_3: lastSimulationResult.top5.slice(0, 3).map((r, i) => ({
            posicao: i + 1,
            espaco: r.item['EMPRESA'],
            localizacao: r.item['Localização'],
            score: `${(r.score * 100).toFixed(1)}%`,
            preco: formatPriceLabel(r.pSpace, '/mês')
        }))
    };

    contentBox.textContent = JSON.stringify(payload, null, 2);
    modal.classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

function copyReportToClipboard() {
    const text = document.getElementById('modalReportContent').innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Relatório JSON copiado para a área de transferência!');
        }).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        alert('Relatório JSON copiado para a área de transferência!');
    } catch (err) {
        console.error('Falha ao copiar:', err);
    }
    document.body.removeChild(textarea);
}

// --- Sincronização em tempo real com Cloud Firestore ---
function normalizeFirestoreSpace(id, raw) {
    return {
        id,
        'EMPRESA': raw['EMPRESA'] ?? raw.empresa ?? 'Espaço sem nome',
        'DIRECCAO': raw['DIRECCAO'] ?? raw.direccao ?? '',
        'Localização': raw['Localização'] ?? raw.localizacao ?? 'Grande Porto',
        'TIPOLOGIA': raw['TIPOLOGIA'] ?? raw.tipologia ?? 'Espaço Empresarial',
        'Cowork': raw['Cowork'] ?? raw.precoCowork ?? null,
        'Mesa individual': raw['Mesa individual'] ?? raw.precoMesaIndividual ?? null,
        'Privado': raw['Privado'] ?? raw.precoPrivado ?? null,
        'Escritório Virtual': raw['Escritório Virtual'] ?? raw.precoEscritorioVirtual ?? null,
        'SALA DE REUNIOES': raw['SALA DE REUNIOES'] ?? raw.precoSalaReunioes ?? null,
        'Modelo de Preço': raw['Modelo de Preço'] ?? raw.modeloPreco ?? 'Mensalidade',
        'RECEPCIONISTA': raw['RECEPCIONISTA'] ?? (raw.temRecepcionista ? '1' : '0'),
        'WiFi': raw['WiFi'] ?? raw.nivelWiFi ?? (raw.temWiFi ? 7 : 1),
        'AC': raw['AC'] ?? raw.nivelAc ?? (raw.temAc ? 7 : 1),
        'AREA DE LAZER': raw['AREA DE LAZER'] ?? raw.nivelAreaLazer ?? (raw.temAreaLazer ? 6 : 1),
        'ESTACIONAMENTO': raw['ESTACIONAMENTO'] ?? raw.nivelEstacionamento ?? 1,
        'TRANSPORTES': raw['TRANSPORTES'] ?? raw.nivelTransportes ?? 1,
        'CANTINA/REST': raw['CANTINA/REST'] ?? raw.nivelCantina ?? 1
    };
}

function initFirestoreSpaces() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        return;
    }

    try {
        const firebaseConfig = {
            apiKey: 'AIzaSyCvbzIkvpXBjSgXgf8MLPi48ePD2dyn_S8',
            authDomain: 'projeto-cm-f517c.firebaseapp.com',
            projectId: 'projeto-cm-f517c',
            storageBucket: 'projeto-cm-f517c.firebasestorage.app',
            messagingSenderId: '712094680171',
            appId: '1:712094680171:web:c2f669888130b5fc891d2e'
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const db = firebase.firestore();
        db.collection('espacos').onSnapshot(
            snapshot => {
                if (!snapshot.empty) {
                    const docs = snapshot.docs.map(doc => normalizeFirestoreSpace(doc.id, doc.data()));
                    docs.sort((a, b) => String(a['EMPRESA'] || '').localeCompare(String(b['EMPRESA'] || ''), 'pt'));
                    dynamicSpacesData = docs;
                    spacesDataSource = 'firebase';
                    renderSpacesDirectory();
                }
            },
            err => {
                console.warn('Aviso Firestore (a usar dados locais de fallback):', err);
            }
        );
    } catch (err) {
        console.warn('Falha ao inicializar Firebase no diretório:', err);
    }
}

// --- Inicialização ---
window.onload = function () {
    renderSpacesDirectory();
    updateClientUI();
    initFirestoreSpaces();
};
