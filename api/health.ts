interface VercelRequest {
  method?: string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({error: 'Método no permitido'});
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
  });
}
