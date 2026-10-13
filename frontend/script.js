const API_URL = '/api/questions';

// Estado do Jogo
let bancoDeQuestoes = [];
let questoesAtuais = [];
let indiceAtual = 0;
let opcaoSelecionada = false;
let pontosPais = 0;
let pontosFilhos = 0;
let categoriaSelecionada = 'Todas';

// Telas principais
const categoryScreen = document.getElementById('categoryScreen');
const quizArea = document.getElementById('quizArea');
const endScreen = document.getElementById('endScreen');

// Elementos da Interface
const questionText = document.getElementById('questionText');
const categoryText = document.getElementById('categoryText');
const optionsGrid = document.getElementById('optionsGrid');
const progressFill = document.getElementById('progressFill');
const questionCounter = document.getElementById('questionCounter');
const btnNext = document.getElementById('btnNext');
const turnIndicator = document.getElementById('turnIndicator');
const scorePaisElement = document.getElementById('scorePais');
const scoreFilhosElement = document.getElementById('scoreFilhos');

// Elementos Fim de Jogo
const winnerText = document.getElementById('winnerText');
const finalScoreText = document.getElementById('finalScoreText');
const btnRestart = document.getElementById('btnRestart');
const btnChangeCat = document.getElementById('btnChangeCat');

// Sintetizador de Som Nativo (AudioContext)
let audioCtx = null;
function iniciarAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
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
    }
}

function embaralhar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Eventos de Seleção de Categoria
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        iniciarAudioCtx();
        categoriaSelecionada = btn.dataset.cat;
        carregarPerguntas();
    });
});

async function carregarPerguntas() {
    try {
        const url = categoriaSelecionada === 'Todas' ? API_URL : `${API_URL}?category=${encodeURIComponent(categoriaSelecionada)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.length > 0) {
            bancoDeQuestoes = data;
            iniciarPartida();
        } else {
            alert('Nenhuma pergunta encontrada para esta categoria.');
        }
    } catch (err) {
        console.error('Erro ao carregar perguntas:', err);
        alert('Erro ao conectar à base de perguntas.');
    }
}

function iniciarPartida() {
    indiceAtual = 0;
    pontosPais = 0;
    pontosFilhos = 0;
    scorePaisElement.textContent = "0";
    scoreFilhosElement.textContent = "0";

    questoesAtuais = embaralhar(bancoDeQuestoes);

    categoryScreen.style.display = 'none';
    endScreen.style.display = 'none';
    quizArea.style.display = 'block';

    mostrarPergunta();
}

function mostrarPergunta() {
    opcaoSelecionada = false;
    btnNext.disabled = true;

    const q = questoesAtuais[indiceAtual];
    questionText.textContent = q.content;
    categoryText.textContent = q.category;

    const geracaoDaPergunta = q.target_generation || 'Pais';
    const turnoAtual = geracaoDaPergunta === 'Pais' ? 'Filhos' : 'Pais';

    turnIndicator.textContent = `VEZ DOS: ${turnoAtual.toUpperCase()}`;
    turnIndicator.className = `turn-indicator turn-${turnoAtual.toLowerCase()}`;
    turnIndicator.dataset.turno = turnoAtual;

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
}

function verificarResposta(btnClicado, textoOpcao, respostaCorreta) {
    if (opcaoSelecionada) return;
    opcaoSelecionada = true;

    const turnoAtual = turnIndicator.dataset.turno;
    const todosBotoes = document.querySelectorAll('.option-btn');
    todosBotoes.forEach(b => b.disabled = true);

    if (textoOpcao === respostaCorreta) {
        tocarSom('acerto');
        btnClicado.classList.add('correct');
        if (turnoAtual === 'Pais') pontosPais++;
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

btnNext.addEventListener('click', () => {
    if (indiceAtual < questoesAtuais.length - 1) {
        indiceAtual++;
        mostrarPergunta();
    } else {
        mostrarEcraFinal();
    }
});

function soltarFogosDeArtificio(corHex) {
    if (typeof confetti !== 'function') return;
    const fim = Date.now() + 3200;

    const intervalo = setInterval(() => {
        if (Date.now() > fim) return clearInterval(intervalo);

        confetti({
            particleCount: 35,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: [corHex, '#ffd700', '#ffffff']
        });
        confetti({
            particleCount: 35,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: [corHex, '#ffd700', '#ffffff']
        });
    }, 280);
}

function mostrarEcraFinal() {
    quizArea.style.display = 'none';
    endScreen.style.display = 'block';

    let vencedor = "EMPATE!";
    let corDestaque = "#ffd700";

    if (pontosPais > pontosFilhos) {
        vencedor = "VITÓRIA DOS PAIS!";
        corDestaque = "#0b1953";
        winnerText.style.color = "var(--blue-bg)";
    } else if (pontosFilhos > pontosPais) {
        vencedor = "VITÓRIA DOS FILHOS!";
        corDestaque = "#ff6a00";
        winnerText.style.color = "var(--orange-bg)";
    } else {
        winnerText.style.color = "#333";
    }

    winnerText.textContent = vencedor;
    finalScoreText.textContent = `Pais: ${pontosPais}  |  Filhos: ${pontosFilhos}`;

    tocarSom('vitoria');
    soltarFogosDeArtificio(corDestaque);
}

btnRestart.addEventListener('click', () => {
    iniciarPartida();
});

btnChangeCat.addEventListener('click', () => {
    endScreen.style.display = 'none';
    quizArea.style.display = 'none';
    categoryScreen.style.display = 'block';
});