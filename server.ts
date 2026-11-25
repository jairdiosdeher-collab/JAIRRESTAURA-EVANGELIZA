import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';
import {GoogleGenAI, Type} from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({limit: '2mb'}));

const VALID_IMAGE_IDS = [
  'biblical_landscape',
  'jesus_teaching',
  'miracles_of_jesus',
  'parable_sower',
  'praying_people',
  'restored_family',
  'calvary_cross',
  'empty_tomb',
  'salvation_grace',
  'finding_hope',
  'inspiring_sunrise',
  'children_bible',
  'kids_good_shepherd',
  'kids_jesus_children',
  'teens_purpose',
  'youth_fellowship',
  'youth_worship_light',
  'christian_marriage',
  'street_evangelism',
  'church_worship',
  'church_invitation_welcome',
  'open_bible_light',
  'testimony_freedom',
];

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/gemini/script', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'Servicio de IA en línea no configurado. Se recomienda usar el generador autónomo local.',
      offlineFallback: true,
    });
    return;
  }

  const body = req.body ?? {};
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 180) : '';
  const audience = typeof body.audience === 'string' ? body.audience.trim().slice(0, 80) : 'General';
  const productionFormat =
    typeof body.productionFormat === 'string'
      ? body.productionFormat.trim().slice(0, 60)
      : 'evangelistico_30_60';
  const durationSec = [15, 30, 60, 90, 180].includes(Number(body.durationSec))
    ? Number(body.durationSec)
    : 60;
  const bibleRef = typeof body.bibleRef === 'string' ? body.bibleRef.trim().slice(0, 80) : '';
  const callToAction =
    typeof body.callToAction === 'string' ? body.callToAction.trim().slice(0, 220) : '';

  if (!topic) {
    res.status(400).json({error: 'Debes indicar un tema evangelístico.'});
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const sceneCount = durationSec <= 15 ? 3 : durationSec <= 30 ? 4 : durationSec <= 60 ? 5 : 6;

    const prompt = [
      `Eres el productor editorial del estudio cristiano evangélico JAIRRESTAURA EVANGELIZA, dirigido por el Pastor Jair Hernández (Lema: ESCUCHA · ORIENTACIÓN · FE).`,
      `Redacta un guion evangelístico en español cálido, pastoral, bíblico y emocionalmente cercano, fiel a la doctrina evangélica y protestante.`,
      `FUNDAMENTO DOCTRINAL OBLIGATORIO: autoridad exclusiva de las Sagradas Escrituras, salvación por gracia mediante la fe en Jesucristo, oración directa a Dios por medio de Jesucristo (único mediador), adoración en espíritu y en verdad, y rechazo bíblico de la fabricación o veneración de ídolos (Éxodo 20:3-5; Juan 14:6; Juan 4:23-24; Hechos 4:12; Efesios 2:8-9; 1 Timoteo 2:5).`,
      `PROHIBICIONES VISUALES ABSOLUTAS en visualDirection y en todo el guion: NO sugerir, describir ni mencionar vírgenes o advocaciones marianas, rosarios, camándulas, escapularios, estatuas, esculturas, imágenes de santos, altares, procesiones, santuarios, crucifijos con escultura, ni iconos o estampas de veneración.`,
      `ELEMENTOS VISUALES PERMITIDOS: Biblias abiertas, paisajes naturales, oración directa a Dios sin objetos de culto, familias cotidianas, caminos, puertas abiertas e iglesias evangélicas sencillas sin imágenes de culto.`,
      `Formato de producción: "${productionFormat}".`,
      `Tema: "${topic}".`,
      `Público objetivo: "${audience}".`,
      `Duración total exacta: ${durationSec} segundos repartidos en exactamente ${sceneCount} escenas independientes.`,
      bibleRef ? `Referencia bíblica sugerida: ${bibleRef}.` : '',
      callToAction ? `Llamado evangelístico deseado: ${callToAction}.` : '',
      `Elige para cada escena un imageId DISTINTO (sin repetir imágenes entre escenas) exclusivamente entre: ${VALID_IMAGE_IDS.join(', ')}.`,
      `La suma de durationSec de todas las escenas debe ser exactamente ${durationSec}.`,
    ]
      .filter(Boolean)
      .join('\n');

    const config = {
      systemInstruction:
        'Responde exclusivamente en JSON válido en español, con estricta fidelidad bíblica evangélica y protestante (solo la Escritura, salvación por gracia en Cristo, sin veneración de imágenes ni devociones ajenas al evangelio), tono compasivo y pastoral.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {type: Type.STRING},
          hook3s: {type: Type.STRING},
          bibleReference: {type: Type.STRING},
          bibleVerseText: {type: Type.STRING},
          fullNarration: {type: Type.STRING},
          callToAction: {type: Type.STRING},
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                durationSec: {type: Type.INTEGER},
                imageId: {type: Type.STRING},
                visualDirection: {type: Type.STRING},
                onScreenText: {type: Type.STRING},
                narrationText: {type: Type.STRING},
                bibleRef: {type: Type.STRING},
              },
            },
          },
        },
      },
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config,
      });
    } catch {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config,
      });
    }

    const text = (response.text ?? '{}').trim();
    const parsed = JSON.parse(text);
    res.json({script: parsed});
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 260) : String(err).slice(0, 260);
    console.error('Gemini script generation error:', detail);
    res.status(502).json({
      error:
        'No se pudo conectar con el servicio de IA en este momento. Usa el generador autónomo local.',
      detail,
      offlineFallback: true,
    });
  }
});

app.post('/api/gemini/tts', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'Síntesis de voz en línea no configurada. Puedes grabar tu voz directamente en el estudio.',
      offlineFallback: true,
    });
    return;
  }

  const body = req.body ?? {};
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1800) : '';
  const voiceType = body.voiceType === 'femenina' ? 'femenina' : 'masculina';

  if (!text) {
    res.status(400).json({error: 'El texto de narración está vacío.'});
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const styleDesc =
      voiceType === 'masculina'
        ? 'Warm, compassionate Spanish pastoral male narrator, unhurried, deeply reassuring and clear'
        : 'Warm, gentle, empathetic Spanish female narrator, clear and inspiring pastoral delivery';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: styleDesc,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceType === 'masculina' ? 'Charon' : 'Kore',
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(502).json({
        error: 'No se recibió audio del servicio TTS.',
        offlineFallback: true,
      });
      return;
    }

    res.json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
      mimeType: 'audio/wav',
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 260) : String(err).slice(0, 260);
    console.error('Gemini TTS error:', detail);
    res.status(502).json({
      error: 'No se pudo generar el audio narrado en línea. Usa el grabador de voz local.',
      detail,
      offlineFallback: true,
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true, hmr: false},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JAIRRESTAURA EVANGELIZA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
