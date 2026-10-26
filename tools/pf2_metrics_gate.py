"""Conservative release gates for aggregate GraphQL metrics, no I/O."""
def evaluate(metrics, min_requests=1):
    failures = []
    project = metrics.get('project') or []
    if sum(item.get('sum', {}).get('requests', 0) for item in project) < max(1, min_requests):
        failures.append('insufficient project request samples')
    for sample in project:
        if sample.get('sum', {}).get('errors') != 0 or sample.get('dimensions', {}).get('status') != 'success':
            failures.append('project invocation error/status')
        cpu = sample.get('quantiles', {}).get('cpuTimeP99')
        if cpu is None or cpu >= 8000:
            failures.append('missing CPU or p99 >= 8000 microseconds')
    for dataset, field, limit in [('accountRequests','requests',50000),('accountD1','rowsRead',2500000),('accountD1','rowsWritten',50000)]:
        samples = metrics.get(dataset) or []
        if not samples or any(item.get('sum', {}).get(field) is None for item in samples):
            failures.append('missing account quota data: '+field)
        elif sum(item['sum'][field] for item in samples) >= limit:
            failures.append('quota margin reached: '+field)
    return sorted(set(failures))
