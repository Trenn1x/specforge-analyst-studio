import unittest
import numpy as np
import pandas as pd
from analysis.build import features, labels, forecast, generate

class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tx=pd.DataFrame([(0,99,0,10.),(0,100,1,99.),(1,50,0,7.),(2,9,0,3.)],columns=['customer_id','day','category','amount'])
    def test_future_edits_do_not_change_features(self):
        a=features(self.tx,100,3)
        mutated=self.tx.copy();mutated.loc[mutated.day>=100,'amount']=999999
        pd.testing.assert_frame_equal(a,features(mutated,100,3))
        self.assertEqual(a.loc[0,'spend_30'],10.)
    def test_label_window_inclusive_start_exclusive_end(self):
        extra=pd.DataFrame([(1,130,0,10.)],columns=self.tx.columns)
        np.testing.assert_equal(labels(pd.concat([self.tx,extra]),100,[0,1]),[0,1])
    def test_sparse_eligible_customer_is_kept(self):
        a=features(self.tx,100,3)
        self.assertIn(1,a.index);self.assertEqual(a.loc[1,'count_30'],0)
        self.assertNotIn(2,a.index)
    def test_empty_history_excludes_everyone(self):
        self.assertTrue(features(self.tx.iloc[:0],100,3).empty)
    def test_forecast_does_not_read_future(self):
        s=np.arange(200,dtype=float)+30
        p,b=forecast(s,100);s[100:]=1e9
        p2,b2=forecast(s,100)
        np.testing.assert_allclose(p,p2);np.testing.assert_allclose(b,b2)
    def test_generator_reproducible(self):
        pd.testing.assert_frame_equal(generate(12,10,7),generate(12,10,7))

if __name__=='__main__': unittest.main()
