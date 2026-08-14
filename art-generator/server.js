import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ALLOWED_SIZES = new Set(['1024x1024', '1024x1536', '1536x1024', 'auto']);
const ALLOWED_QUALITY = new Set(['low', 'medium', 'high', 'auto']);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no servidor. Veja o arquivo .env.example.' });
  }

  const { prompt, size, quality, n } = req.body ?? {};

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Informe um prompt descrevendo a arte desejada.' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Prompt muito longo (máximo 4000 caracteres).' });
  }

  const finalSize = ALLOWED_SIZES.has(size) ? size : '1024x1024';
  const finalQuality = ALLOWED_QUALITY.has(quality) ? quality : 'auto';
  const finalN = Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt.trim(),
        size: finalSize,
        quality: finalQuality,
        n: finalN,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || 'Falha ao gerar a imagem.';
      return res.status(response.status).json({ error: message });
    }

    const images = (data.data ?? []).map((item) => `data:image/png;base64,${item.b64_json}`);
    res.json({ images });
  } catch (err) {
    console.error('Erro ao chamar a API da OpenAI:', err);
    res.status(502).json({ error: 'Não foi possível conectar à API da OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Gerador de artes rodando em http://localhost:${PORT}`);
});
