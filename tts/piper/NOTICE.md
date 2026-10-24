# Piper TTS notices

The Piper engine is provided by [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), licensed GPL-3.0. Its eSpeak NG phonemizer also has its own license notices. Piper runs as an isolated local Docker service; the JARVIS application calls it over the private Compose network.

The default voice is `pt_BR-cadu-medium`, downloaded from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices). The repository currently labels the artifacts MIT and its model card identifies the training dataset as CC0, while also noting that the voice was fine-tuned from Lessac. Review the upstream model card and source voice rights before redistributing this model or using it commercially; this notice is not legal advice.

The model is approximately 63 MB. The container is limited to 1 CPU and 512 MB RAM. No user reference recording is uploaded or retained by this service.
