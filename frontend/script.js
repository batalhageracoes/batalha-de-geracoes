const API_URL = 'https://batalha-de-geracoes.onrender.com/api/questions';

// Variáveis de Estado
let bancoDeQuestoes = [];
let questoesAtuais = [];
let indiceAtual = 0;
let opcaoSelecionada = false;
let pontosPais = 0;
let pontosFilhos = 0;

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
const quizArea = document.getElementById('quizArea');

// Elementos da Tela de Vitória
const endScreen = document.getElementById('endScreen');
const winnerText = document.getElementById('winnerText');
const finalScoreText = document.getElementById('finalScoreText');
const btnRestart = document.getElementById('btnRestart');

// SINTETIZADOR DE EFEITOS SONOROS (NATIVO DO NAVEGADOR)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function tocarSom(tipo) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const agora = audioCtx.currentTime;

    if (tipo === 'acerto') {
        // Acorde agradável ascendente (C5 -> E5 -> G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, agora + i * 0.08);
            gain.gain.setValueAtTime(0.15, agora + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, agora + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(agora + i * 0.08);
            osc.stop(agora + i * 0.08 + 0.3);
        });
    } else if (tipo === 'erro') {
        // Som grave descendente tipo buzzer
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, agora);
        osc.frequency.linearRampToValueAtTime(80, agora + 0.35);
        gain.gain.setValueAtTime(0.2, agora);
        gain.gain.exponentialRampToValueAtTime(0.01, agora + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(agora);
        osc.stop(agora + 0.35);
    } else if (tipo === 'vitoria') {
        // Fanfarra triunfal rápida
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

// EMBARALHAR ARRAY (ALGORITMO FISHER-YATES)
function embaralhar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

async function carregarPerguntasDaAPI() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && data.length > 0) {
            bancoDeQuestoes = data;
            iniciarNovaPartida();
        } else {
            questionText.textContent = "Nenhuma pergunta encontrada no banco de dados.";
        }
    } catch (error) {
        console.error('Erro:', error);
        questionText.textContent = "Erro ao carregar as perguntas da API.";
    }
}

function iniciarNovaPartida() {
    indiceAtual = 0;
    pontosPais = 0;
    pontosFilhos = 0;
    scorePaisElement.textContent = "0";
    scoreFilhosElement.textContent = "0";
    
    // Embaralha todas as perguntas recebidas do banco
    questoesAtuais = embaralhar(bancoDeQuestoes);
    
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
    
    // Desafio Cruzado
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
    if (typeof opcoes === 'string') {
        opcoes = JSON.parse(opcoes);
    }
    
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
            if (b.dataset.resposta === respostaCorreta) {
                b.classList.add('correct');
            }
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

// FOGOS DE ARTIFÍCIO
function soltarFogosDeArtificio(corHex) {
    if (typeof confetti !== 'function') return;

    const duracao = 3.5 * 1000;
    const fim = Date.now() + duracao;

    const intervalo = setInterval(() => {
        const tempoRestante = fim - Date.now();
        if (tempoRestante <= 0) {
            return clearInterval(intervalo);
        }

        confetti({
            particleCount: 40,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: [corHex, '#ffd700', '#ffffff']
        });

        confetti({
            particleCount: 40,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: [corHex, '#ffd700', '#ffffff']
        });
    }, 300);

    confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.55 },
        colors: [corHex, '#ffd700', '#ffffff']
    });
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
        winnerText.style.textShadow = "0 3px 10px rgba(11, 25, 83, 0.3)";
    } else if (pontosFilhos > pontosPais) {
        vencedor = "VITÓRIA DOS FILHOS!";
        corDestaque = "#ff6a00";
        winnerText.style.color = "var(--orange-bg)";
        winnerText.style.textShadow = "0 3px 10px rgba(255, 106, 0, 0.35)";
    } else {
        winnerText.style.color = "#333";
        winnerText.style.textShadow = "none";
    }

    winnerText.textContent = vencedor;
    finalScoreText.textContent = `Pais: ${pontosPais}  |  Filhos: ${pontosFilhos}`;

    tocarSom('vitoria');
    soltarFogosDeArtificio(corDestaque);
}

btnRestart.addEventListener('click', () => {
    iniciarNovaPartida();
});

carregarPerguntasDaAPI();