import unittest


class TestBasic(unittest.TestCase):
    def test_sanity(self):
        self.assertEqual(2 + 2, 4)


if __name__ == '__main__':
    unittest.main()