import {GoogleGenAI} from '@google/genai';

interface VercelRequest {
  method?: string;
  body?: Record<string, unknown>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Método no permitido'});
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error: 'Síntesis de voz en línea no configurada.',
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style:
                  voiceType === 'masculina'
                    ? 'Warm, compassionate Spanish pastoral male narrator'
                    : 'Warm, empathetic Spanish female narrator',
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
      res.status(502).json({error: 'No se recibió audio TTS.', offlineFallback: true});
      return;
    }

    res.status(200).json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
      mimeType: 'audio/wav',
    });
  } catch {
    res.status(502).json({
      error: 'Error en síntesis de voz en línea.',
      offlineFallback: true,
    });
  }
}
