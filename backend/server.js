require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Conectando ao Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Caminho para a pasta frontend (sobe um nível com '../' a partir de backend/)
const frontendPath = path.join(__dirname, '../frontend');

// 1. Libera o acesso público aos arquivos estáticos (CSS, JS, imagem)
app.use(express.static(frontendPath));

// 2. Rota principal: entrega o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Rota da API para buscar perguntas aleatórias
app.get('/api/questions', async (req, res) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});