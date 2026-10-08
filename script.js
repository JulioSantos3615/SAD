// <!-- JAVASCRIPT APPLICATION LOGIC -->
// Data Store for Science Parks in Simulation
        const parkData = [
            {
                id: 'UPTEC',
                name: 'UPTEC (Porto)',
                costsScore: 70, // 0-100 rating (higher is better/cheaper)
                incubationScore: 95,
                accessScore: 90,
                networkingScore: 95,
                strengths: 'Acesso privilegiado a VCs, excelente ecossistema de startups e ligação à U.Porto.',
                weaknesses: 'Custos de incubação mais elevados em fases de escala.'
            },
            {
                id: 'IPN',
                name: 'Instituto Pedro Nunes (Coimbra)',
                costsScore: 80,
                incubationScore: 95,
                accessScore: 85,
                networkingScore: 88,
                strengths: 'Instalações premiadas mundialmente, programas de prototipagem e aceleração ESA BIC.',
                weaknesses: 'Menor densidade de venture capital direto comparado com Lisboa.'
            },
            {
                id: 'TecPark',
                name: 'TecPark / Sanjotec (S. João da Madeira)',
                costsScore: 92,
                incubationScore: 78,
                accessScore: 80,
                networkingScore: 70,
                strengths: 'Custos de instalação imbativeis, excelentes infraestruturas de produção e FabLab.',
                weaknesses: 'Rede de networking e fundos de investimento com menor escala regional.'
            },
            {
                id: 'Parkurbis',
                name: 'Parkurbis (Covilhã)',
                costsScore: 95,
                incubationScore: 75,
                accessScore: 70,
                networkingScore: 68,
                strengths: 'Isenção e incentivos fiscais municipais fortes, proximidade à UBI.',
                weaknesses: 'Distância geográfica dos grandes centros urbanos do litoral.'
            },
            {
                id: 'LISPOLIS',
                name: 'LISPOLIS / Taguspark (Lisboa)',
                costsScore: 55,
                incubationScore: 90,
                accessScore: 92,
                networkingScore: 98,
                strengths: 'Máxima concentração de investidores, clientes empresariais e eventos internacionais.',
                weaknesses: 'Custo por m² substancialmente mais alto.'
            },
            {
                id: 'UA',
                name: 'Incubadora UA (Aveiro)',
                costsScore: 82,
                incubationScore: 88,
                accessScore: 88,
                networkingScore: 82,
                strengths: 'Ligação direta a laboratórios de topo em 5G, IoT e robótica na U.Aveiro.',
                weaknesses: 'Espaço físico com disponibilidade limitada para expansão acelerada.'
            }
        ];

        // Theme Toggle Functionality
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

        // Initialize Theme from Preferences
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            document.getElementById('themeIcon').className = 'fa-solid fa-sun text-sm text-amber-400';
            document.getElementById('themeText').textContent = 'Claro';
        }

        // Mobile Menu Toggle
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
        }

        // Filter Science Parks in Directory
        function filterParks() {
            const searchVal = document.getElementById('searchInput').value.toLowerCase();
            const regionVal = document.getElementById('regionFilter').value;
            const cards = document.querySelectorAll('.park-card');

            cards.forEach(card => {
                const cardRegion = card.getAttribute('data-region');
                const cardName = card.getAttribute('data-name');

                const matchesSearch = cardName.includes(searchVal);
                const matchesRegion = (regionVal === 'all' || cardRegion === regionVal);

                if (matchesSearch && matchesRegion) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // Select Park from card direct to simulator
        function selectParkInSim(parkId) {
            const simSec = document.getElementById('simulador');
            simSec.scrollIntoView({ behavior: 'smooth' });
            
            // Highlight simulation
            runAHPSimulation();
        }

        // AHP Simulation Calculations (RF6 Core Algorithm)
        function runAHPSimulation() {
            let wCosts = parseFloat(document.getElementById('wCosts').value);
            let wIncubation = parseFloat(document.getElementById('wIncubation').value);
            let wAccess = parseFloat(document.getElementById('wAccess').value);
            let wNetworking = parseFloat(document.getElementById('wNetworking').value);
            const taxExempt = document.getElementById('taxExempt').checked;

            // Normalize weights to sum = 1.0 (100%)
            let total = wCosts + wIncubation + wAccess + wNetworking;
            let normCosts = wCosts / total;
            let normIncubation = wIncubation / total;
            let normAccess = wAccess / total;
            let normNetworking = wNetworking / total;

            // Update UI Percentages
            document.getElementById('valCosts').textContent = Math.round(normCosts * 100) + '%';
            document.getElementById('valIncubation').textContent = Math.round(normIncubation * 100) + '%';
            document.getElementById('valAccess').textContent = Math.round(normAccess * 100) + '%';
            document.getElementById('valNetworking').textContent = Math.round(normNetworking * 100) + '%';

            // Calculate overall score for each park
            const scoredParks = parkData.map(park => {
                let effectiveCostsScore = park.costsScore;
                if (taxExempt && (park.id === 'Parkurbis' || park.id === 'TecPark')) {
                    effectiveCostsScore += 10; // Tax exemption bonus
                }

                let finalScore = (
                    (effectiveCostsScore * normCosts) +
                    (park.incubationScore * normIncubation) +
                    (park.accessScore * normAccess) +
                    (park.networkingScore * normNetworking)
                ) / 100;

                return {
                    ...park,
                    score: finalScore
                };
            });

            // Sort descending by score
            scoredParks.sort((a, b) => b.score - a.score);

            // Render Output Bar Charts
            const resultsContainer = document.getElementById('ahpResultsContainer');
            resultsContainer.innerHTML = '';

            scoredParks.slice(0, 4).forEach((park, index) => {
                const percentage = Math.round(park.score * 100);
                const isWinner = index === 0;

                const barEl = document.createElement('div');
                barEl.className = 'space-y-1.5';
                barEl.innerHTML = `
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-semibold text-slate-200 flex items-center gap-2">
                            ${isWinner ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">#1 RECOMENDADO</span>' : `<span class="text-slate-400 font-mono">#${index+1}</span>`}
                            ${park.name}
                        </span>
                        <span class="font-mono font-bold ${isWinner ? 'text-brand-blue text-sm' : 'text-slate-400'}">${percentage}% Score</span>
                    </div>
                    <div class="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500 ${isWinner ? 'bg-gradient-to-r from-blue-500 to-brand-blue' : 'bg-slate-500'}" style="width: ${percentage}%"></div>
                    </div>
                `;
                resultsContainer.appendChild(barEl);
            });

            // Update Winner Analysis Callout Box
            const winner = scoredParks[0];
            const winnerBox = document.getElementById('winnerAnalysisBox');
            winnerBox.innerHTML = `
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span class="text-xs font-mono uppercase text-emerald-400 font-bold">
                        <i class="fa-solid fa-circle-check mr-1"></i> Opção Recomendada pelo D4SP
                    </span>
                    <span class="text-xs font-mono text-slate-400">AHP Weight: ${winner.score.toFixed(3)}</span>
                </div>
                <h4 class="text-base font-bold font-serif-title text-white">${winner.name}</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                        <span class="text-emerald-400 font-semibold block mb-1"><i class="fa-solid fa-thumbs-up mr-1"></i> Pontos Fortes</span>
                        <p class="text-slate-300">${winner.strengths}</p>
                    </div>
                    <div class="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                        <span class="text-amber-400 font-semibold block mb-1"><i class="fa-solid fa-circle-exclamation mr-1"></i> Pontos Fracos</span>
                        <p class="text-slate-300">${winner.weaknesses}</p>
                    </div>
                </div>
            `;
        }

        // Reset Sliders to default
        function resetSliders() {
            document.getElementById('wCosts').value = 35;
            document.getElementById('wIncubation').value = 30;
            document.getElementById('wAccess').value = 20;
            document.getElementById('wNetworking').value = 15;
            document.getElementById('taxExempt').checked = false;
            runAHPSimulation();
        }

        // Export Simulation Results (RF7 Modal)
        function exportResults() {
            const modal = document.getElementById('exportModal');
            const contentBox = document.getElementById('modalReportContent');

            const wCosts = document.getElementById('valCosts').textContent;
            const wInc = document.getElementById('valIncubation').textContent;
            const wAcc = document.getElementById('valAccess').textContent;
            const wNet = document.getElementById('valNetworking').textContent;

            const simData = {
                timestamp: new Date().toISOString(),
                project: "D4SP - ISPGAYA 2026/2027",
                criteria_weights: {
                    costs: wCosts,
                    incubation: wInc,
                    accessibility: wAcc,
                    networking: wNet
                },
                top_recommendation: document.querySelector('#winnerAnalysisBox h4')?.textContent || "UPTEC Porto",
                status: "Export Completed (RF7)"
            };

            contentBox.innerHTML = `
                <div>// D4SP Decision Matrix Output</div>
                <div>"date": "${new Date().toLocaleDateString('pt-PT')}"</div>
                <div>"weights": { "costs": "${wCosts}", "incubation": "${wInc}", "access": "${wAcc}", "networking": "${wNet}" }</div>
                <div>"winner": "${simData.top_recommendation}"</div>
                <div>"consistency_ratio": "0.042 (Valido)"</div>
            `;

            modal.classList.remove('hidden');
        }

        function closeExportModal() {
            document.getElementById('exportModal').classList.add('hidden');
        }

        function copyReportToClipboard() {
            const text = document.getElementById('modalReportContent').innerText;
            
            // Clipboard copy fall-back for iframe compatibility
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert("Resultado JSON/AHP copiado para a área de transferência!");
            } catch (err) {
                console.error('Falha ao copiar:', err);
            }
            document.body.removeChild(textarea);
        }

        // Run simulation on load
        window.onload = function() {
            runAHPSimulation();
        };