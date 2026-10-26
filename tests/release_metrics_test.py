"""Thresholds must fail closed before a production rollout is continued."""
import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from pf2_metrics_gate import evaluate

def sample():
    return {'project':[{'sum':{'requests':10,'errors':0},'dimensions':{'status':'success'},'quantiles':{'cpuTimeP99':7999}}],
        'accountRequests':[{'sum':{'requests':49999}}],
        'accountD1':[{'sum':{'rowsRead':2499999,'rowsWritten':49999}}]}

class ReleaseMetricsTests(unittest.TestCase):
    def test_good_samples_below_every_threshold(self): self.assertEqual(evaluate(sample(),10),[])
    def test_cpu_threshold_is_in_microseconds(self):
        data=sample(); data['project'][0]['quantiles']['cpuTimeP99']=8000
        self.assertTrue(evaluate(data))
    def test_missing_cpu_is_not_zero(self):
        data=sample(); data['project'][0]['quantiles']={}
        self.assertTrue(evaluate(data))
    def test_absent_or_insufficient_samples_do_not_pass(self):
        self.assertTrue(evaluate({},1)); self.assertTrue(evaluate(sample(),11))
    def test_errors_and_non_success_status_stop_release(self):
        for change in ['errors','status']:
            data=sample()
            if change=='errors': data['project'][0]['sum']['errors']=1
            else: data['project'][0]['dimensions']['status']='exceededCpu'
            self.assertTrue(evaluate(data))
    def test_each_account_quota_has_a_fifty_percent_margin(self):
        for dataset,field,limit in [('accountRequests','requests',50000),('accountD1','rowsRead',2500000),('accountD1','rowsWritten',50000)]:
            data=copy.deepcopy(sample());data[dataset][0]['sum'][field]=limit
            self.assertTrue(evaluate(data),field)
    def test_missing_account_dataset_does_not_pass(self):
        for name in ['accountRequests','accountD1']:
            data=sample();del data[name]
            self.assertTrue(evaluate(data),name)

if __name__=='__main__': unittest.main(verbosity=2)
