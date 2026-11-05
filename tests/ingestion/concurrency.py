#!/usr/bin/env python3
"""Two real PostgreSQL sessions; no third-party Python packages required."""
import os
import queue
import subprocess
import threading
import time
import uuid


class Session:
    def __init__(self, name):
        self.name = name
        self.p = subprocess.Popen(['psql', '-XAt', '-v', 'ON_ERROR_STOP=1'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, env={**os.environ, 'PGAPPNAME': name})
        self.lines = queue.Queue()
        threading.Thread(target=self.read, daemon=True).start()

    def read(self):
        for line in self.p.stdout:
            self.lines.put(line.rstrip('\n'))
        self.lines.put(None)

    def send(self, sql):
        marker = str(uuid.uuid4())
        self.p.stdin.write(sql + '\n\\echo ' + marker + '\n')
        self.p.stdin.flush()
        return marker

    def receive(self, marker):
        lines = []
        while True:
            line = self.lines.get(timeout=15)
            if line is None:
                raise AssertionError(f'{self.name} exited: {lines}')
            if line == marker:
                return [line for line in lines if line not in ('BEGIN', 'COMMIT', 'UPDATE 1', 'INSERT 0 1', '')]
            lines.append(line)

    def query(self, sql):
        return self.receive(self.send(sql))

    def close(self):
        # A blocked SQL statement cannot consume a queued \q or ROLLBACK.
        # Closing the client process releases its connection/transaction even
        # when the assertion failed before the lock owner was committed.
        if self.p.poll() is None:
            self.p.terminate()
            try:
                self.p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.p.kill()
                self.p.wait(timeout=5)


def assert_blocked(observer, name):
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        result = observer.query("select exists(select 1 from pg_stat_activity where application_name='" + name + "' and wait_event_type='Lock');")
        if result == ['t']:
            return
        time.sleep(0.02)
    raise AssertionError(name + ' did not block on the publication/claim row lock')


sessions = [Session('ingestion_observer'), Session('ingestion_publisher'), Session('ingestion_reclaimer')]
o, p, r = sessions
try:
    f = '20000000-0000-0000-0000-000000000001'
    o.query(f"insert into private_files(id,user_id) values ('{f}','00000000-0000-0000-0000-000000000001');")
    a = o.query(f"select claim_file_ingestion('{f}');")[0]
    o.query(f"update private_files set processing_started_at=now()-interval '16 minutes' where id='{f}';")
    assert p.query(f"begin; select publish_file_ingestion('{f}','{a}','[{{\"chunk_index\":0,\"text\":\"publisher wins\"}}]',1);") == ['t']
    pending = r.send(f"select claim_file_ingestion('{f}') is null;")
    assert_blocked(o, r.name)
    p.query('commit;')
    assert r.receive(pending) == ['t'], 'reclaimer must recheck ready after waiting'
    assert o.query(f"select processing_status||':'||text from private_files join document_chunks on private_files.id=file_id where file_id='{f}';") == ['ready:publisher wins']

    # Opposite order: reclaim holds the row lock, so old publication waits,
    # rechecks its fencing predicate, and leaves chunks unchanged.
    o.query(f"update private_files set processing_status='failed' where id='{f}';")
    a = o.query(f"select claim_file_ingestion('{f}');")[0]
    o.query(f"update private_files set processing_started_at=now()-interval '16 minutes' where id='{f}';")
    b = r.query(f"begin; select claim_file_ingestion('{f}');")[0]
    assert b and b != a
    pending = p.send(f"select publish_file_ingestion('{f}','{a}','[{{\"chunk_index\":0,\"text\":\"stale writer\"}}]',9);")
    assert_blocked(o, p.name)
    r.query('commit;')
    assert p.receive(pending) == ['f'], 'old publisher must lose after reclaim commits'
    assert o.query(f"select text from document_chunks where file_id='{f}';") == ['publisher wins']
    assert o.query(f"select publish_file_ingestion('{f}','{b}','[{{\"chunk_index\":0,\"text\":\"reclaimer wins\"}}]',2);") == ['t']
    assert o.query(f"select processing_status||':'||page_count||':'||text from private_files join document_chunks on private_files.id=file_id where file_id='{f}';") == ['ready:2:reclaimer wins']
    # Simultaneous pending claims must also serialize to a single owner.
    f = '20000000-0000-0000-0000-000000000002'
    o.query(f"insert into private_files(id,user_id) values ('{f}','00000000-0000-0000-0000-000000000001');")
    a = p.query(f"begin; select claim_file_ingestion('{f}');")[0]
    assert a
    pending = r.send(f"select claim_file_ingestion('{f}') is null;")
    assert_blocked(o, r.name)
    p.query('commit;')
    assert r.receive(pending) == ['t'], 'only one simultaneous pending claim wins'
    print('Concurrent claims and publication/reclaim assertions passed in both lock orders.')
finally:
    # Terminate all clients first so cleanup never depends on lock ordering.
    for session in sessions:
        if session.p.poll() is None:
            session.p.terminate()
    for session in sessions:
        session.close()
