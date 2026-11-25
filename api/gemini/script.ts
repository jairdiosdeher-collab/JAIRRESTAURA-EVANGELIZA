import {GoogleGenAI, Type} from '@google/genai';

interface VercelRequest {
  method?: string;
  body?: Record<string, unknown>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Método no permitido'});
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'Servicio de IA en línea no configurado. Usa el generador autónomo local.',
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
      `Redacta un guion evangelístico en español cálido, pastoral y bíblico, fiel a la doctrina evangélica y protestante.`,
      `FUNDAMENTO DOCTRINAL: autoridad de la Biblia, salvación por gracia mediante la fe en Jesucristo, oración directa a Dios por medio de Cristo, adoración en espíritu y verdad, sin veneración de ídolos (Éxodo 20:3-5; Juan 14:6; Juan 4:23-24; Hechos 4:12; Efesios 2:8-9; 1 Timoteo 2:5).`,
      `PROHIBICIONES VISUALES ABSOLUTAS: nunca describir vírgenes, advocaciones marianas, rosarios, camándulas, escapularios, estatuas, santos, altares, procesiones, santuarios, crucifijos escultóricos ni iconos de veneración. Usar solo Biblias abiertas, paisajes naturales, familias cotidianas, oración directa sin intermediarios e iglesias evangélicas sencillas.`,
      `Formato: "${productionFormat}". Tema: "${topic}". Público: "${audience}". Duración exacta: ${durationSec} segundos en ${sceneCount} escenas.`,
      bibleRef ? `Referencia bíblica sugerida: ${bibleRef}.` : '',
      callToAction ? `Llamado evangelístico: ${callToAction}.` : '',
      `Usa imageId DISTINTOS entre escenas exclusivamente de: ${VALID_IMAGE_IDS.join(', ')}.`,
    ]
      .filter(Boolean)
      .join('\n');

    const config = {
      systemInstruction:
        'Responde exclusivamente en JSON válido en español, con estricta fidelidad bíblica evangélica y protestante (solo Escritura y Jesucristo como único mediador, sin veneración de imágenes ni objetos).',
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

    res.status(200).json({script: JSON.parse((response.text ?? '{}').trim())});
  } catch {
    res.status(502).json({
      error: 'Error al consultar el servicio en línea. Usa el generador autónomo local.',
      offlineFallback: true,
    });
  }
}
