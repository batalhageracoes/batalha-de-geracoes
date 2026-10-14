const API_URL = '/api/questions';
const TEMPO_LIMITE = 15; // Atualizado para 15 segundos
const SUPABASE_PROJECT_URL = 'https://gwhzjalgfrrgpotwfhrj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aHpqYWxnZnJyZ3BvdHdmaHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MDM5MjgsImV4cCI6MjEwNzQ3OTkyOH0.v50QzSs3I1QkQ94U-hX45tgZi2CZYS-EP66l-RpMILs'; // <-- Substitua pela sua chave!

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY) : null;

// Lógica de Retenção e Nomes Customizados
let isUserLoggedIn = false;
let partidasJogadas = 0;
let nomeEquipa1 = "Pais";
let nomeEquipa2 = "Filhos";

// Estado do Jogo
let bancoDeQuestoes = [];
let questoesAtuais = [];
let indiceAtual = 0;
let opcaoSelecionada = false;
let pontosPais = 0;
let pontosFilhos = 0;
let categoriaSelecionada = 'Todas';
let desempateAtivo = false; // Controle do Tira-Teima

let timerInterval = null;
let tempoRestante = TEMPO_LIMITE;

// Elementos Principais
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

// Autenticação
const authText = document.getElementById('authText');
const btnGoogleLogin = document.getElementById('btnGoogleLogin');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');

// Fim de Jogo
const winnerText = document.getElementById('winnerText');
const finalScoreText = document.getElementById('finalScoreText');
const btnRestart = document.getElementById('btnRestart');
const btnChangeCat = document.getElementById('btnChangeCat');


// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================
async function verificarSessao() {
    if (!supabaseClient) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    atualizarInterfaceUsuario(session?.user);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        atualizarInterfaceUsuario(session?.user);
    });
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
    } else {
        btnGoogleLogin.style.display = 'flex';
        authText.style.display = 'block';
        userProfile.style.display = 'none';
    }
}

if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert('Erro ao fazer login: ' + error.message);
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
    });
}
verificarSessao();

// ==========================================
// 2. SISTEMA DE ÁUDIO
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
// 3. FLUXO DO JOGO E TIRA-TEIMA
// ==========================================

function validarBarreiraLogin() {
    if (partidasJogadas >= 1 && !isUserLoggedIn) {
        alert("🎉 Vocês já jogaram a vossa partida de teste grátis!\n\nPara desbloquear partidas ilimitadas e guardar os vossos recordes, faça login rapidinho com o Google logo abaixo dos temas.");
        endScreen.style.display = 'none';
        categoryScreen.style.display = 'block';
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
            categoryScreen.style.display = 'none';
            teamSetupScreen.style.display = 'block';
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
    desempateAtivo = false; // Reinicia o status de tira-teima
    scorePaisElement.textContent = "0";
    scoreFilhosElement.textContent = "0";

    // Pega exatamente 20 perguntas para a rodada principal
    questoesAtuais = embaralhar(bancoDeQuestoes).slice(0, 20);

    teamSetupScreen.style.display = 'none';
    quizArea.style.display = 'block';
    mostrarPergunta();
}

function iniciarDesempate() {
    desempateAtivo = true;
    alert("⚖️ EMPATE! Preparem-se para o Tira-Teima: mais 5 perguntas decisivas!");

    // Busca 5 perguntas do banco que não foram usadas nesta rodada
    const perguntasRestantes = bancoDeQuestoes.filter(q => !questoesAtuais.includes(q));
    const extras = embaralhar(perguntasRestantes).slice(0, 5);

    if (extras.length === 0) {
        alert("Não temos mais perguntas inéditas. O jogo termina num Empate Épico!");
        mostrarEcraFinal();
        return;
    }

    // Adiciona as perguntas extras e continua o jogo
    questoesAtuais = questoesAtuais.concat(extras);
    indiceAtual++;
    mostrarPergunta();
}

function mostrarPergunta() {
    opcaoSelecionada = false;
    btnNext.disabled = true;

    const q = questoesAtuais[indiceAtual];
    questionText.textContent = q.content;
    
    // Adiciona selo visual se estiver no tira-teima
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

// 4. TIMER (Agora com 15 segundos e alerta nos últimos 5s)
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
        // Validação do Desempate (Morte Súbita)
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
    quizArea.style.display = 'none';
    endScreen.style.display = 'block';

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
}

btnRestart.addEventListener('click', () => {
    if (!validarBarreiraLogin()) return;
    iniciarPartida();
});

btnChangeCat.addEventListener('click', () => {
    if (!validarBarreiraLogin()) return;
    pararTimer();
    endScreen.style.display = 'none';
    categoryScreen.style.display = 'block';
});