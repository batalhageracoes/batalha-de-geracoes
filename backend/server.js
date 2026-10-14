require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ALERTA: SUPABASE_URL ou SUPABASE_KEY não configuradas no ambiente!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Rota de perguntas sem corte artificial de limite
app.get('/api/questions', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('questions').select('*');

    if (category && category !== 'Todas') {
      query = query.eq('category', category);
    }

    // Busca até 1000 perguntas (cobre com folga todo o acervo do tema)
    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('Erro na consulta Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro interno na API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});