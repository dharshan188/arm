"""Rules and announcement integration without loading speech models or using audio devices."""
import sys
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import server as s


class MultiFlowTests(unittest.TestCase):
    def setUp(self):
        self.old_state, self.old_vis = s.S, s.VIS
        s.S = s.State(); s.S.chosen = True; s.S.status = 'watching'
        s.VIS = SimpleNamespace(meta={'stream_map': {'plastic_waste': 'recyclable', 'battery_waste': 'hazardous'}})
        s.S.objects = [dict(cls=c, stream=st, confirmed=True, color=s.C.BINS[st]['color'])
                       for c, st in [('plastic_waste', 'recyclable'), ('plastic_waste', 'recyclable'),
                                     ('battery_waste', 'hazardous')]]
        self.say = patch.object(s.SP, 'say').start()

    def tearDown(self):
        patch.stopall(); s.S, s.VIS = self.old_state, self.old_vis

    def test_itemless_questions_cover_all_current_objects(self):
        for lang, text in [('en', 'which bin?'), ('hi', 'किस बिन में डालूँ?'), ('ta', 'எந்த பின்ல போடணும்?')]:
            s.S.lang = lang
            s.answer_question(None, typed=text)
            message = s.S.messages[-1]
            self.assertEqual(message['source'], 'rules')
            self.assertEqual(len(message['objects']), 3)
            self.assertIn('2', message['text'])
            self.assertIn(s.C.BIN_SHORT['hazardous'][lang], message['text'])

    def test_explicit_item_keeps_existing_rule_flow(self):
        s.answer_question(None, typed='which bin for a battery?')
        self.assertEqual(s.S.messages[-1]['item'], 'battery_waste')
        self.assertNotIn('objects', s.S.messages[-1])

    def test_multi_announce_and_single_dispatch(self):
        s.announce_objects(s.S.objects)
        self.assertEqual(s.S.announced_signature, ('battery_waste', 'plastic_waste', 'plastic_waste'))
        self.assertEqual(len(s.S.item['objects']), 3)
        with patch.object(s, 'announce') as announce:
            s.announce_objects(s.S.objects[:1])
            announce.assert_called_once_with('plastic_waste', 'recyclable')
        self.assertEqual(len(s.predictions()), 3)

    def test_no_current_objects_does_not_use_previous_item(self):
        s.S.objects = []; s.S.item = {'cls': 'battery_waste'}
        s.answer_question(None, typed='which bin?')
        self.assertEqual(s.S.messages[-1]['text'], s.C.PHRASES['no_item']['en'])


if __name__ == '__main__':
    unittest.main()
