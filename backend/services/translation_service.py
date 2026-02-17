# from googletrans import Translator

class TranslationService:
    def __init__(self):
        # self.translator = Translator()
        pass

    async def translate_text(self, text: str, target_lang: str) -> str:
        # Mock translation to avoid API limits/failures during demo
        # return self.translator.translate(text, dest=target_lang).text
        return f"[{target_lang}] {text}"

translation_service = TranslationService()
