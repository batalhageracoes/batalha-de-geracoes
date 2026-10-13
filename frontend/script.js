const API_URL = 'https://batalha-de-geracoes.onrender.com/api/questions';

// Variáveis do Jogo
let questoesAtuais = [];
let indiceAtual = 0;
let opcaoSelecionada = false;
let pontosPais = 0;
let pontosFilhos = 0;

// Elementos da Tela
const questionText = document.getElementById('questionText');
const categoryText = document.getElementById('categoryText');
const optionsGrid = document.getElementById('optionsGrid');
const progressFill = document.getElementById('progressFill');
const questionCounter = document.getElementById('questionCounter');
const btnNext = document.getElementById('btnNext');
const turnIndicator = document.getElementById('turnIndicator');
const scorePaisElement = document.getElementById('scorePais');
const scoreFilhosElement = document.getElementById('scoreFilhos');

async function carregarPerguntasDaAPI() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && data.length > 0) {
            questoesAtuais = data;
            mostrarPergunta();
        } else {
            questionText.textContent = "Nenhuma pergunta encontrada no banco de dados.";
        }
    } catch (error) {
        console.error('Erro:', error);
        questionText.textContent = "Erro ao carregar as perguntas da API.";
    }
}

function mostrarPergunta() {
    opcaoSelecionada = false;
    btnNext.disabled = true;
    
    const q = questoesAtuais[indiceAtual];
    questionText.textContent = q.content;
    categoryText.textContent = q.category;
    
    // DINÂMICA DESAFIO CRUZADO: Se a pergunta é da época dos Pais, quem responde são os Filhos.
    const geracaoDaPergunta = q.target_generation || 'Pais';
    const turnoAtual = geracaoDaPergunta === 'Pais' ? 'Filhos' : 'Pais';
    
    turnIndicator.textContent = `VEZ DOS: ${turnoAtual.toUpperCase()}`;
    turnIndicator.className = `turn-indicator turn-${turnoAtual.toLowerCase()}`;
    turnIndicator.dataset.turno = turnoAtual; // Salva quem está jogando
    
    // Atualiza barra de progresso
    questionCounter.textContent = `Pergunta ${indiceAtual + 1} de ${questoesAtuais.length}`;
    progressFill.style.width = `${((indiceAtual + 1) / questoesAtuais.length) * 100}%`;

    // Renderiza botões
    optionsGrid.innerHTML = '';
    const letras = ['A', 'B', 'C', 'D'];
    
    let opcoes = q.options;
    if (typeof opcoes === 'string') {
        opcoes = JSON.parse(opcoes); // Caso venha como string do banco
    }
    
    opcoes.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = `${letras[index]}) ${opt}`;
        btn.dataset.resposta = opt; // Salva o texto da resposta para validar depois
        
        btn.onclick = () => verificarResposta(btn, opt, q.correct_answer);
        optionsGrid.appendChild(btn);
    });
}

function verificarResposta(btnClicado, textoOpcao, respostaCorreta) {
    if (opcaoSelecionada) return; // Evita duplo clique
    opcaoSelecionada = true;
    
    const turnoAtual = turnIndicator.dataset.turno;
    
    // Trava todos os botões
    const todosBotoes = document.querySelectorAll('.option-btn');
    todosBotoes.forEach(b => b.disabled = true);
    
    if (textoOpcao === respostaCorreta) {
        // ACERTOU
        btnClicado.classList.add('correct');
        if (turnoAtual === 'Pais') pontosPais++;
        else pontosFilhos++;
    } else {
        // ERROU
        btnClicado.classList.add('incorrect');
        // Mostra qual era a certa pintando-a de verde
        todosBotoes.forEach(b => {
            if (b.dataset.resposta === respostaCorreta) {
                b.classList.add('correct');
            }
        });
    }
    
    // Atualiza o Placar visual
    scorePaisElement.textContent = pontosPais;
    scoreFilhosElement.textContent = pontosFilhos;
    
    // Libera botão de avançar
    btnNext.disabled = false;
}

btnNext.addEventListener('click', () => {
    if (indiceAtual < questoesAtuais.length - 1) {
        indiceAtual++;
        mostrarPergunta();
    } else {
        // FIM DO JOGO
        let vencedor = "Empate!";
        if (pontosPais > pontosFilhos) vencedor = "Vitória dos PAIS!";
        if (pontosFilhos > pontosPais) vencedor = "Vitória dos FILHOS!";
        
        alert(`FIM DA BATALHA!\n\nPais: ${pontosPais}\nFilhos: ${pontosFilhos}\n\n${vencedor}`);
        
        // Reinicia o jogo (temporário até termos a tela final)
        indiceAtual = 0;
        pontosPais = 0;
        pontosFilhos = 0;
        scorePaisElement.textContent = "0";
        scoreFilhosElement.textContent = "0";
        mostrarPergunta();
    }
});

// Inicia
carregarPerguntasDaAPI();