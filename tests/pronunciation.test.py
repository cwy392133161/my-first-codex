"""Development regression checks for the English recording phoneme pipeline.

Run with the audio development environment, for example:
  python tests/pronunciation.test.py --model /path/to/kokoro-v1.0.onnx

These checks validate model inputs and intended word readings. They do not
replace listening to recordings or certify a human pronunciation rating.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("garden_audio_builder", ROOT / "scripts/build-audio.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PronunciationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import onnxruntime as ort
        ort.disable_telemetry_events()
        settings = ort.SessionOptions()
        settings.intra_op_num_threads = 1
        settings.inter_op_num_threads = 1
        settings.log_severity_level = 3
        model = ort.InferenceSession(str(MODEL_PATH), sess_options=settings,
                                    providers=["CPUExecutionProvider"])
        cls.model_inputs = {item.name: (item.type, item.shape) for item in model.get_inputs()}
        cls.vocab = json.loads(model.get_modelmeta().custom_metadata_map["kokoro_config"])["vocab"]
        # Phonemization needs no inference session once the real vocabulary is read.
        del model
        cls.g2p = builder.make_g2p()
        cls.clips = json.loads(subprocess.check_output(
            ["node", str(ROOT / "scripts/audio-texts.js")], cwd=ROOT))["clips"]

    def reading(self, text):
        return self.g2p(text)[0]

    def word_in_sentence(self, text, word):
        _, tokens = self.g2p(text)
        return [token.phonemes for token in tokens if token.text.lower() == word]

    def test_actual_model_contract_and_diphthong_tokens(self):
        self.assertEqual(self.model_inputs, {
            "input_ids": ("tensor(int64)", [1, "input_ids_len"]),
            "style": ("tensor(float)", [1, 256]),
            "speed": ("tensor(float)", [1]),
        })
        # Literal official model token IDs protect the old eSpeak-to-model mismatch.
        self.assertEqual({p: self.vocab[p] for p in "QIAWY"},
                         {"Q": 33, "I": 25, "A": 24, "W": 39, "Y": 41})
        self.assertEqual(self.vocab["θ"], 119)
        self.assertEqual(self.vocab["ð"], 81)
        self.assertEqual(self.vocab["ʧ"], 133)

    def test_greetings_and_common_vowels(self):
        expected = {
            "hello": "həlˈQ", "hi": "hˈI", "grey": "ɡɹˈA",
            "brown": "bɹˈWn", "boy": "bˈY", "chair": "ʧˈɛː",
        }
        for word, phonemes in expected.items():
            for variant in (word, word.capitalize()):
                with self.subTest(word=variant):
                    self.assertEqual(self.reading(variant), phonemes)
        self.assertEqual(self.reading("Hello!"), "həlˈQ!")
        self.assertEqual(self.reading("Hi!"), "hˈI!")

    def test_british_consonants_and_trap_encoding(self):
        expected = {
            "three": "θɹˈiː", "mother": "mˈʌðə", "father": "fˈɑːðə",
            "brother": "bɹˈʌðə", "sister": "sˈɪstə", "teacher": "tˈiːʧə",
            # Misaki 0.9.4 GB vocabulary represents this vowel with a, not æ.
            "bag": "bˈaɡ", "cat": "kˈat",
        }
        for word, phonemes in expected.items():
            with self.subTest(word=word):
                self.assertEqual(self.reading(word), phonemes)
        self.assertEqual(self.reading("mother, father, brother"),
                         "mˈʌðə, fˈɑːðə, bɹˈʌðə")

    def test_meaning_overrides_across_capitalization(self):
        # Expectations are independent of builder.OVERRIDES: these are the
        # meanings taught by the current data, not every future use of each word.
        expected = {
            "close": "klˈQz", "read": "ɹˈiːd", "reads": "ɹˈiːdz",
            "minute": "mˈɪnɪt", "minutes": "mˈɪnɪts",
        }
        for word, phonemes in expected.items():
            for variant in (word, word.capitalize(), word.upper()):
                with self.subTest(word=variant):
                    self.assertEqual(self.reading(variant), phonemes)
        self.assertEqual(self.word_in_sentence("Please close the door.", "close"), ["klˈQz"])

    def test_present_tense_reading_and_time_noun(self):
        # The statistical POS tagger can classify 'We read' as past tense.
        # These original learning examples describe present activities.
        self.assertEqual(self.reading("We read a book together."),
                         "wˌiː ɹˈiːd ɐ bˈʊk təɡˈɛðə.")
        self.assertEqual(self.reading("She reads a book."),
                         "ʃˌiː ɹˈiːdz ɐ bˈʊk.")
        self.assertEqual(self.word_in_sentence("Read a book.", "read"), ["ɹˈiːd"])
        self.assertEqual(self.word_in_sentence("one minute", "minute"), ["mˈɪnɪt"])
        self.assertEqual(self.word_in_sentence("two minutes", "minutes"), ["mˈɪnɪts"])

    def test_other_contextual_word_meanings(self):
        self.assertEqual(self.reading("mouth"), "mˈWθ")  # Noun, not /maʊð/.
        for body, action in (("ears", "hear"), ("eyes", "see"), ("hands", "touch"),
                             ("nose", "smell"), ("tongue", "taste")):
            with self.subTest(body=body):
                self.assertEqual(self.word_in_sentence(f"We use our {body} to {action}.", "use"),
                                 ["jˈuːz"])  # Verb, not noun /juːs/.

    def test_every_current_source_has_known_model_phonemes(self):
        self.assertEqual(len(self.clips), 398, "Review coverage when spoken sources change")
        prepared = builder.prepare_clips(self.g2p, self.clips, self.vocab)
        self.assertEqual(len(prepared), len(self.clips))
        self.assertEqual({clip["key"] for clip in prepared}, {clip["key"] for clip in self.clips})
        for clip in prepared:
            with self.subTest(text=clip["text"]):
                phonemes = clip["phonemes"]
                self.assertTrue(phonemes)
                self.assertNotIn("❓", phonemes)
                self.assertFalse(set(phonemes) - set(self.vocab))
                self.assertLessEqual(len(phonemes), 510)
                self.assertGreaterEqual(len(phonemes), 1)
                self.assertNotIn("ʔ", phonemes)  # Official v1.0 postprocessing uses t.
                self.assertNotIn("ɾ", phonemes)  # Official v1.0 postprocessing uses T.

    def test_generation_rejects_silent_unknown_or_oversized_sequences(self):
        for phonemes in ("", "❓", "🚀", "h" * 511):
            with self.subTest(phonemes=phonemes[:10]):
                def invalid_g2p(text):
                    return phonemes, []
                with self.assertRaises(ValueError):
                    builder.prepare_clips(invalid_g2p,
                                          [{"key": "invalid", "text": "hello"}], self.vocab)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True,
                        help="Local Kokoro v1.0 ONNX file; no model is downloaded")
    arguments, unittest_arguments = parser.parse_known_args()
    MODEL_PATH = arguments.model.resolve()
    if not MODEL_PATH.is_file():
        parser.error(f"Model file does not exist: {MODEL_PATH}")
    unittest.main(argv=[sys.argv[0], *unittest_arguments], verbosity=2)
