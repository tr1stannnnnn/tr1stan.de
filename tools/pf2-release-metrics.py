"""Read-only aggregate release telemetry. No logs, identifiers or DB row data."""
import argparse
import datetime as dt
import json
import os
import urllib.request
from pf2_metrics_gate import evaluate

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--since', help='ISO UTC lower bound for the controlled Worker test window')
parser.add_argument('--gate', action='store_true', help='Fail closed for absent samples, errors, CPU or quota thresholds')
parser.add_argument('--min-requests', type=int, default=1, help='Minimum project sample count for --gate')
args = parser.parse_args()
now = dt.datetime.now(dt.timezone.utc)
start = dt.datetime.fromisoformat(args.since.replace('Z', '+00:00')) if args.since else now.replace(hour=0, minute=0, second=0, microsecond=0)
if start.tzinfo is None or start > now:
    parser.error('--since must be timezone-aware and not in the future')
token = os.environ.get('CLOUDFLARE_API_TOKEN')
if not token:
    parser.error('CLOUDFLARE_API_TOKEN binding is absent; do not paste a value into arguments')

query = '''query($account:string!,$start:Time!,$end:Time!,$today:Date!){viewer{accounts(filter:{accountTag:$account}){
  project:workersInvocationsAdaptive(limit:100,filter:{datetime_geq:$start,datetime_leq:$end,scriptName:"packet-flight-leaderboard"}){
    dimensions{status} sum{requests errors} quantiles{cpuTimeP50 cpuTimeP99}}
  accountRequests:workersInvocationsAdaptive(limit:1,filter:{date:$today}){sum{requests errors}}
  projectD1:d1AnalyticsAdaptiveGroups(limit:1,filter:{date:$today,databaseId:"bc462466-1ed9-41d9-ab75-dc0197d50502"}){sum{rowsRead rowsWritten readQueries writeQueries}}
  accountD1:d1AnalyticsAdaptiveGroups(limit:1,filter:{date:$today}){sum{rowsRead rowsWritten}}
}}}'''
payload = {'query': query, 'variables': {'account': 'a094bf6212050658facf1c255a325b21', 'start': start.isoformat(), 'end': now.isoformat(), 'today': now.date().isoformat()}}
request = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', method='POST',
    headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json'}, data=json.dumps(payload).encode())
with urllib.request.urlopen(request, timeout=30) as response:
    result = json.load(response)
if result.get('errors'):
    print(json.dumps({'errors': [{'message': e.get('message')} for e in result['errors']]}, indent=2))
    raise SystemExit(1)
accounts = (result.get('data') or {}).get('viewer', {}).get('accounts', [])
if len(accounts) != 1:
    raise SystemExit('Expected one accessible account; metrics readiness unknown')
metrics = accounts[0]
failures = evaluate(metrics, args.min_requests)
print(json.dumps({'since': start.isoformat(), 'until': now.isoformat(), 'cpu_unit': 'microseconds',
    'note': 'Absent samples are not a pass. Quantiles are not maximum CPU guarantees.',
    'metrics': metrics, 'gate_failures': sorted(set(failures))}, indent=2))
if args.gate and failures:
    raise SystemExit(1)
