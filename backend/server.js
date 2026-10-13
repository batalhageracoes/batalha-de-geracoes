require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Conectando ao Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Rota de teste para ver se está funcionando
app.get('/', (req, res) => {
  res.send('API Batalha de Gerações rodando!');
});

// Rota para buscar perguntas aleatórias
app.get('/api/questions', async (req, res) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .limit(10); // Pega 10 perguntas

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});