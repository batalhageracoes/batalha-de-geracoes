const API_URL = '/api/questions';
const TEMPO_LIMITE = 20;
const SUPABASE_PROJECT_URL = 'https://gwhzjalgfrrgpotwfhrj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aHpqYWxnZnJyZ3BvdHdmaHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDM5MjgsImV4cCI6MjEwNzQ3OTkyOH0.v50QzSs3I1QkQ94U-hX45tgZi2CZYS-EP66l-RpMILs'; // <-- Substitua pela sua chave!

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY) : null;

// Lógica de Sessão e Equipas
let currentUser = null;
let isUserLoggedIn = false;
let partidasJogadas = 0;
let nomeEquipa1 = "Pais";
let nomeEquipa2 = "Filhos";

// Estado da Partida
let bancoDeQuestoes = [];
let questoesAtuais = [];
let indiceAtual = 0;
let opcaoSelecionada = false;
let pontosPais = 0;
let pontosFilhos = 0;
let categoriaSelecionada = 'Todas';
let desempateAtivo = false;

let timerInterval = null;
let tempoRestante = TEMPO_LIMITE;

// Elementos Principais dos Ecrãs
const categoryScreen = document.getElementById('categoryScreen');
const teamSetupScreen = document.getElementById('teamSetupScreen');
const quizArea = document.getElementById('quizArea');
const endScreen = document.getElementById('endScreen');

// Elementos de Equipas
const inputTeam1 = document.getElementById('inputTeam1');
const inputTeam2 = document.getElementById('inputTeam2');
const labelTeam1 = document.getElementById('labelTeam1');
const labelTeam2 = document.getElementById('labelTeam2');
const btnStartMatch = document.getElementById('btnStartMatch');

// Interface Quiz
const questionText = document.getElementById('questionText');
const categoryText = document.getElementById('categoryText');
const optionsGrid = document.getElementById('optionsGrid');
const progressFill = document.getElementById('progressFill');
const questionCounter = document.getElementById('questionCounter');
const btnNext = document.getElementById('btnNext');
const turnIndicator = document.getElementById('turnIndicator');
const scorePaisElement = document.getElementById('scorePais');
const scoreFilhosElement = document.getElementById('scoreFilhos');
const timerBadge = document.getElementById('timerBadge');
const timerText = document.getElementById('timerText');

// Autenticação & Histórico
const authText = document.getElementById('authText');
const btnGoogleLogin = document.getElementById('btnGoogleLogin');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const personalStatsCard = document.getElementById('personalStatsCard');
const statMatches = document.getElementById('statMatches');
const statTeam1Wins = document.getElementById('statTeam1Wins');
const statTeam2Wins = document.getElementById('statTeam2Wins');
const statTeam1Label = document.getElementById('statTeam1Label');
const statTeam2Label = document.getElementById('statTeam2Label');
const historySavedAlert = document.getElementById('historySavedAlert');

// Fim de Jogo
const winnerText = document.getElementById('winnerText');
const finalScoreText = document.getElementById('finalScoreText');
const btnRestart = document.getElementById('btnRestart');
const btnChangeCat = document.getElementById('btnChangeCat');


// ==========================================
// 1. GESTOR CENTRALIZADO DE ECRÃS
// ==========================================
function alternarEcra(nomeEcra) {
    categoryScreen.style.display = (nomeEcra === 'category') ? 'block' : 'none';
    if (teamSetupScreen) teamSetupScreen.style.display = (nomeEcra === 'teamSetup') ? 'block' : 'none';
    quizArea.style.display = (nomeEcra === 'quiz') ? 'block' : 'none';
    endScreen.style.display = (nomeEcra === 'end') ? 'block' : 'none';
}


// ==========================================
// 2. AUTENTICAÇÃO E HISTÓRICO DA CONTA
// ==========================================
async function verificarSessao() {
    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    atualizarInterfaceUsuario(currentUser);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user || null;
        atualizarInterfaceUsuario(currentUser);
    });
}

async function carregarEstatisticasUsuario() {
    if (!supabaseClient || !currentUser) return;

    try {
        const { data, error } = await supabaseClient
            .from('user_match_history')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        if (data && data.length > 0) {
            personalStatsCard.style.display = 'block';
            statMatches.textContent = data.length;

            let vitEquipe1 = 0;
            let vitEquipe2 = 0;

            data.forEach(m => {
                if (m.score_team1 > m.score_team2) vitEquipe1++;
                else if (m.score_team2 > m.score_team1) vitEquipe2++;
            });

            statTeam1Wins.textContent = vitEquipe1;
            statTeam2Wins.textContent = vitEquipe2;
            statTeam1Label.textContent = `Vitórias ${data[0].team1_name || 'Equipe 1'}`;
            statTeam2Label.textContent = `Vitórias ${data[0].team2_name || 'Equipe 2'}`;
        } else {
            personalStatsCard.style.display = 'none';
        }
    } catch (err) {
        console.error('Erro ao ler estatísticas do utilizador:', err.message);
    }
}

async function registrarPartidaNoHistorico(vencedorTexto) {
    if (!supabaseClient || !currentUser) return;

    try {
        const { error } = await supabaseClient
            .from('user_match_history')
            .insert([{
                user_id: currentUser.id,
                team1_name: nomeEquipa1,
                team2_name: nomeEquipa2,
                score_team1: pontosPais,
                score_team2: pontosFilhos,
                winner: vencedorTexto,
                category: categoriaSelecionada
            }]);

        if (!error) {
            historySavedAlert.style.display = 'block';
            carregarEstatisticasUsuario();
        }
    } catch (err) {
        console.error('Erro ao guardar histórico:', err.message);
    }
}

function atualizarInterfaceUsuario(user) {
    isUserLoggedIn = !!user;
    if (user) {
        btnGoogleLogin.style.display = 'none';
        authText.style.display = 'none';
        userProfile.style.display = 'flex';
        userName.textContent = user.user_metadata?.full_name || user.email.split('@')[0];
        if (user.user_metadata?.avatar_url) {
            userAvatar.src = user.user_metadata.avatar_url;
            userAvatar.style.display = 'block';
        } else {
            userAvatar.style.display = 'none';
        }
        carregarEstatisticasUsuario();
    } else {
        btnGoogleLogin.style.display = 'flex';
        authText.style.display = 'block';
        userProfile.style.display = 'none';
        personalStatsCard.style.display = 'none';
    }
}

if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert('Erro ao iniciar sessão: ' + error.message);
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        personalStatsCard.style.display = 'none';
    });
}
verificarSessao();

// ==========================================
// 3. SISTEMA DE ÁUDIO
// ==========================================
let audioCtx = null;
function iniciarAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tocarSom(tipo) {
    if (!audioCtx) return;
    const agora = audioCtx.currentTime;
    if (tipo === 'acerto') {
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, agora + i * 0.08);
            gain.gain.setValueAtTime(0.12, agora + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + i * 0.08 + 0.28);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(agora + i * 0.08);
            osc.stop(agora + i * 0.08 + 0.28);
        });
    } else if (tipo === 'erro') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, agora);
        osc.frequency.linearRampToValueAtTime(80, agora + 0.32);
        gain.gain.setValueAtTime(0.18, agora);
        gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.32);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(agora);
        osc.stop(agora + 0.32);
    } else if (tipo === 'vitoria') {
        const notas = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
        const tempos = [0, 0.12, 0.24, 0.36, 0.52, 0.72];
        notas.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, agora + tempos[idx]);
            gain.gain.setValueAtTime(0.12, agora + tempos[idx]);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + tempos[idx] + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(agora + tempos[idx]);
            osc.stop(agora + tempos[idx] + 0.4);
        });
    } else if (tipo === 'tick') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, agora);
        gain.gain.setValueAtTime(0.18, agora);
        gain.gain.exponentialRampToValueAtTime(0.001, agora + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(agora);
        osc.stop(agora + 0.08);
    }
}

// ==========================================
// 4. FLUXO DO JOGO COM TRANSIÇÕES E REVEZAMENTO
// ==========================================

function validarBarreiraLogin() {
    if (partidasJogadas >= 1 && !isUserLoggedIn) {
        alert("🎉 Já jogaram a vossa partida de teste grátis!\n\nPara desbloquear partidas ilimitadas e registar o histórico da família, inicie sessão com o Google abaixo dos temas.");
        alternarEcra('category');
        return false;
    }
    return true;
}

document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        iniciarAudioCtx();
        if (!validarBarreiraLogin()) return;
        
        categoriaSelecionada = btn.dataset.cat;
        carregarPerguntas();
    });
});

async function carregarPerguntas() {
    try {
        const url = categoriaSelecionada === 'Todas' ? API_URL : `${API_URL}?category=${encodeURIComponent(categoriaSelecionada)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro no servidor");
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            bancoDeQuestoes = data;
            alternarEcra('teamSetup');
        } else {
            alert(`Nenhuma pergunta encontrada para o tema "${categoriaSelecionada}".`);
        }
    } catch (err) {
        alert(`Erro ao conectar: ${err.message}`);
    }
}

btnStartMatch.addEventListener('click', () => {
    nomeEquipa1 = inputTeam1.value.trim() || "Pais";
    nomeEquipa2 = inputTeam2.value.trim() || "Filhos";

    labelTeam1.textContent = nomeEquipa1.toUpperCase();
    labelTeam2.textContent = nomeEquipa2.toUpperCase();

    iniciarPartida();
});

function embaralhar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function iniciarPartida() {
    partidasJogadas++;
    indiceAtual = 0;
    pontosPais = 0;
    pontosFilhos = 0;
    desempateAtivo = false;
    historySavedAlert.style.display = 'none';
    scorePaisElement.textContent = "0";
    scoreFilhosElement.textContent = "0";

    const poolEquipe1 = embaralhar(bancoDeQuestoes.filter(q => q.target_generation === 'Filhos'));
    const poolEquipe2 = embaralhar(bancoDeQuestoes.filter(q => q.target_generation === 'Pais'));

    const selecionadasEq1 = poolEquipe1.slice(0, 10);
    const selecionadasEq2 = poolEquipe2.slice(0, 10);

    questoesAtuais = [];
    for (let i = 0; i < 10; i++) {
        if (selecionadasEq1[i]) questoesAtuais.push(selecionadasEq1[i]);
        if (selecionadasEq2[i]) questoesAtuais.push(selecionadasEq2[i]);
    }

    alternarEcra('quiz');
    mostrarPergunta();
}

function iniciarDesempate() {
    desempateAtivo = true;
    alert("⚖️ EMPATE! Preparem-se para o Tira-Teima com perguntas extras alternadas!");

    const poolRestanteEq1 = bancoDeQuestoes.filter(q => q.target_generation === 'Filhos' && !questoesAtuais.includes(q));
    const poolRestanteEq2 = bancoDeQuestoes.filter(q => q.target_generation === 'Pais' && !questoesAtuais.includes(q));

    const extrasEq1 = embaralhar(poolRestanteEq1).slice(0, 3);
    const extrasEq2 = embaralhar(poolRestanteEq2).slice(0, 3);

    const extras = [];
    for (let i = 0; i < Math.max(extrasEq1.length, extrasEq2.length); i++) {
        if (extrasEq1[i]) extras.push(extrasEq1[i]);
        if (extrasEq2[i]) extras.push(extrasEq2[i]);
    }

    if (extras.length === 0) {
        alert("Não temos mais perguntas inéditas. O jogo termina num Empate Épico!");
        mostrarEcraFinal();
        return;
    }

    questoesAtuais = questoesAtuais.concat(extras);
    indiceAtual++;
    mostrarPergunta();
}

function mostrarPergunta() {
    opcaoSelecionada = false;
    btnNext.disabled = true;

    const q = questoesAtuais[indiceAtual];
    questionText.textContent = q.content;
    
    categoryText.innerHTML = desempateAtivo 
        ? `<span style="color: #ef4444;">🔥 TIRA-TEIMA</span>` 
        : q.category;

    const geracaoDaPergunta = q.target_generation || 'Pais';
    let equipaAtual, classeEquipa;
    
    if (geracaoDaPergunta === 'Pais') {
        equipaAtual = nomeEquipa2;
        classeEquipa = 'turn-filhos';
    } else {
        equipaAtual = nomeEquipa1;
        classeEquipa = 'turn-pais';
    }

    turnIndicator.textContent = `VEZ DE: ${equipaAtual.toUpperCase()}`;
    turnIndicator.className = `turn-indicator ${classeEquipa}`;
    turnIndicator.dataset.turnoEquipa = classeEquipa;

    questionCounter.textContent = `Pergunta ${indiceAtual + 1} de ${questoesAtuais.length}`;
    progressFill.style.width = `${((indiceAtual + 1) / questoesAtuais.length) * 100}%`;

    optionsGrid.innerHTML = '';
    const letras = ['A', 'B', 'C', 'D'];
    let opcoes = q.options;
    if (typeof opcoes === 'string') opcoes = JSON.parse(opcoes);

    // EMBARALHAMENTO DAS OPÇÕES ENTRE A, B, C E D
    opcoes = embaralhar(opcoes);

    opcoes.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${letras[index]}) ${opt}`;
        btn.dataset.resposta = opt;
        btn.onclick = () => verificarResposta(btn, opt, q.correct_answer);
        optionsGrid.appendChild(btn);
    });

    iniciarTimer();
}

function verificarResposta(btnClicado, textoOpcao, respostaCorreta) {
    if (opcaoSelecionada) return;
    opcaoSelecionada = true;
    pararTimer();

    const turnoEquipa = turnIndicator.dataset.turnoEquipa;
    const todosBotoes = document.querySelectorAll('.option-btn');
    todosBotoes.forEach(b => b.disabled = true);

    if (textoOpcao === respostaCorreta) {
        tocarSom('acerto');
        btnClicado.classList.add('correct');
        if (turnoEquipa === 'turn-pais') pontosPais++;
        else pontosFilhos++;
    } else {
        tocarSom('erro');
        btnClicado.classList.add('incorrect');
        todosBotoes.forEach(b => {
            if (b.dataset.resposta === respostaCorreta) b.classList.add('correct');
        });
    }

    scorePaisElement.textContent = pontosPais;
    scoreFilhosElement.textContent = pontosFilhos;
    btnNext.disabled = false;
}

// 5. TEMPORIZADOR
function pararTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerBadge.classList.remove('warning');
}

function iniciarTimer() {
    pararTimer();
    tempoRestante = TEMPO_LIMITE;
    timerText.textContent = tempoRestante;

    timerInterval = setInterval(() => {
        tempoRestante--;
        timerText.textContent = tempoRestante;

        if (tempoRestante <= 5 && tempoRestante > 0) {
            timerBadge.classList.add('warning');
            tocarSom('tick');
        }

        if (tempoRestante <= 0) {
            pararTimer();
            tempoEsgotado();
        }
    }, 1000);
}

function tempoEsgotado() {
    if (opcaoSelecionada) return;
    opcaoSelecionada = true;
    tocarSom('erro');

    const q = questoesAtuais[indiceAtual];
    const todosBotoes = document.querySelectorAll('.option-btn');
    todosBotoes.forEach(b => {
        b.disabled = true;
        if (b.dataset.resposta === q.correct_answer) b.classList.add('correct');
    });

    questionCounter.textContent = `Tempo Esgotado! (${indiceAtual + 1} de ${questoesAtuais.length})`;
    btnNext.disabled = false;
}

btnNext.addEventListener('click', () => {
    pararTimer();
    if (indiceAtual < questoesAtuais.length - 1) {
        indiceAtual++;
        mostrarPergunta();
    } else {
        if (pontosPais === pontosFilhos && !desempateAtivo) {
            iniciarDesempate();
        } else {
            mostrarEcraFinal();
        }
    }
});

function soltarFogosDeArtificio(corHex) {
    if (typeof confetti !== 'function') return;
    const fim = Date.now() + 3200;
    const intervalo = setInterval(() => {
        if (Date.now() > fim) return clearInterval(intervalo);
        confetti({ particleCount: 35, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: [corHex, '#ffd700', '#ffffff'] });
        confetti({ particleCount: 35, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: [corHex, '#ffd700', '#ffffff'] });
    }, 280);
}

function mostrarEcraFinal() {
    pararTimer();
    alternarEcra('end');

    let vencedor = "EMPATE!";
    let corDestaque = "#ffd700";

    if (pontosPais > pontosFilhos) {
        vencedor = `VITÓRIA: ${nomeEquipa1.toUpperCase()}!`;
        corDestaque = "#0b1953";
        winnerText.style.color = "var(--blue-bg)";
    } else if (pontosFilhos > pontosPais) {
        vencedor = `VITÓRIA: ${nomeEquipa2.toUpperCase()}!`;
        corDestaque = "#ff6a00";
        winnerText.style.color = "var(--orange-bg)";
    } else {
        winnerText.style.color = "#333";
    }

    winnerText.textContent = vencedor;
    finalScoreText.textContent = `${nomeEquipa1}: ${pontosPais}  |  ${nomeEquipa2}: ${pontosFilhos}`;

    tocarSom('vitoria');
    soltarFogosDeArtificio(corDestaque);

    if (isUserLoggedIn) {
        registrarPartidaNoHistorico(vencedor);
    }
}

btnRestart.addEventListener('click', () => {
    if (!validarBarreiraLogin()) return;
    iniciarPartida();
});

btnChangeCat.addEventListener('click', () => {
    if (!validarBarreiraLogin()) return;
    pararTimer();
    alternarEcra('category');
});