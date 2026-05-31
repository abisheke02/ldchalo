const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const env = require('../../config/env');

router.post('/speak', requireAuth, async (req, res, next) => {
  try {
    const { text, languageCode = 'en-IN', voiceName = 'en-IN-Wavenet-D' } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    if (!env.google.projectId || !env.google.credentials) {
      return res.status(503).json({ error: 'TTS not configured' });
    }

    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    const [response] = await client.synthesizeSpeech({
      input:       { text: text.slice(0, 500) },
      voice:       { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    });

    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (err) { next(err); }
});

module.exports = router;
