// Content for the /docs start page — a language-neutral ARCP overview rendered
// as Stripe-/api-style concept sections (prose left, per-language code right).
// The code-panel toggle (data-code-lang) switches every panel's sample at once.
//
// These are presentation samples, not generated from the SDKs. The structure
// supports all 12 code langs; we author a representative set here and the panel
// shows exactly the languages present (with a `spec` wire view as the default).

export const START_LANGS = ['spec', 'python', 'typescript', 'go', 'rust'] as const;

export interface Concept {
  /** anchor id — doubles as the sidebar TOC target */
  id: string;
  heading: string;
  /** intro prose (inline HTML allowed) */
  body: string;
  /** mono signature pill for the panel header */
  signature?: string;
  /** per-language request sample */
  code: Record<string, string>;
  /** shared JSON response/event payload (language-independent) */
  response?: string;
  responseLabel?: string;
}

/** Install one-liner + 3-line connect snippet per language, for the start kit. */
export const QUICKSTART: Record<string, { install: string; connect: string; runtime: string }> = {
  spec: {
    runtime: 'Any HTTP/WebSocket client',
    install: '# no SDK — speak the wire protocol directly',
    connect: `curl -X POST https://rpc.example.com/arcp \\
  -H "Authorization: Bearer $ARCP_TOKEN" \\
  -d '{ "type": "connect", "version": "1.1" }'`,
  },
  python: {
    runtime: 'Python 3.11+',
    install: 'pip install arcp',
    connect: `from arcp import Client

client = Client("wss://rpc.example.com", token=ARCP_TOKEN)
session = client.connect()`,
  },
  typescript: {
    runtime: 'Node 20+ / Deno / Bun',
    install: 'npm install @arcp/client',
    connect: `import { ArcpClient } from "@arcp/client";

const client = new ArcpClient({ url: "wss://rpc.example.com", token });
const session = await client.connect();`,
  },
  go: {
    runtime: 'Go 1.22+',
    install: 'go get github.com/agentruntimecontrolprotocol/go-sdk',
    connect: `client := arcp.NewClient("wss://rpc.example.com", arcp.WithToken(token))
session, err := client.Connect(ctx)
if err != nil { log.Fatal(err) }`,
  },
  rust: {
    runtime: 'Rust 1.78+ (tokio)',
    install: 'cargo add arcp',
    connect: `let client = ArcpClient::new("wss://rpc.example.com", token);
let session = client.connect().await?;`,
  },
};

export const CONCEPTS: Concept[] = [
  {
    id: 'connect',
    heading: 'Connect & handshake',
    body:
      'Open a session over any transport. The handshake authenticates the principal, ' +
      'negotiates the protocol version, and establishes the <code class="term">lease</code> bound ' +
      'that scopes everything you submit.',
    signature: 'client.connect()',
    code: {
      spec: `curl -X POST https://rpc.example.com/arcp \\
  -H "Authorization: Bearer $ARCP_TOKEN" \\
  -d '{ "type": "connect", "version": "1.1" }'`,
      python: `client = Client("wss://rpc.example.com", token=ARCP_TOKEN)
session = client.connect()
print(session.id, session.version)`,
      typescript: `const client = new ArcpClient({ url, token });
const session = await client.connect();
console.log(session.id, session.version);`,
      go: `client := arcp.NewClient(url, arcp.WithToken(token))
session, err := client.Connect(ctx)
fmt.Println(session.ID, session.Version)`,
      rust: `let client = ArcpClient::new(url, token);
let session = client.connect().await?;
println!("{} {}", session.id, session.version);`,
    },
    response: `{
  "type": "connect.ack",
  "session": { "id": "ses_8f2a", "version": "1.1", "lease": "lease_3b" }
}`,
    responseLabel: 'ConnectAck',
  },
  {
    id: 'submit',
    heading: 'Submit a job',
    body:
      'Submit a long-running job under the session lease. The job outlives the connection — ' +
      'you can disconnect and re-observe it later from anywhere.',
    signature: 'session.submit()',
    code: {
      spec: `curl -X POST https://rpc.example.com/arcp/jobs \\
  -H "Authorization: Bearer $ARCP_TOKEN" \\
  -d '{ "type": "submit", "input": { "task": "research" } }'`,
      python: `job = session.submit(input={"task": "research"})
print(job.id, job.state)`,
      typescript: `const job = await session.submit({ input: { task: "research" } });
console.log(job.id, job.state);`,
      go: `job, err := session.Submit(ctx, arcp.JobInput{Task: "research"})
fmt.Println(job.ID, job.State)`,
      rust: `let job = session.submit(JobInput { task: "research".into() }).await?;
println!("{} {:?}", job.id, job.state);`,
    },
    response: `{
  "type": "submitted",
  "job": { "id": "job_5c1d", "state": "running", "lease": "lease_3b" }
}`,
    responseLabel: 'Submitted',
  },
  {
    id: 'streaming',
    heading: 'Stream events',
    body:
      'Subscribe to a job’s <strong>resumable, sequenced</strong> event stream. Each frame ' +
      'carries a monotonic <code class="term">seq</code>; if you drop, resume after the last seq ' +
      'you saw. This is a stream, <em>not</em> list pagination.',
    signature: 'job.events()',
    code: {
      spec: `curl -N https://rpc.example.com/arcp/jobs/job_5c1d/events \\
  -H "Authorization: Bearer $ARCP_TOKEN" \\
  -H "Last-Seq: 6"`,
      python: `for event in job.events(after=last_seq):
    print(event.seq, event.type)`,
      typescript: `for await (const event of job.events({ after: lastSeq })) {
  console.log(event.seq, event.type);
}`,
      go: `stream, _ := job.Events(ctx, arcp.After(lastSeq))
for stream.Next() {
    e := stream.Event()
    fmt.Println(e.Seq, e.Type)
}`,
      rust: `let mut stream = job.events().resume_after(last_seq).await?;
while let Some(e) = stream.next().await {
    println!("{} {}", e.seq, e.type);
}`,
    },
    response: `{
  "type": "event",
  "seq": 7,
  "event": { "type": "task.progress", "ratio": 0.42 }
}`,
    responseLabel: 'Event',
  },
  {
    id: 'control',
    heading: 'Control & leases',
    body:
      'Steer a job mid-flight — pause, cancel, or send control signals — within the ' +
      'enforceable <code class="term">lease</code> that bounds its cost and time budget.',
    signature: 'job.cancel()',
    code: {
      spec: `curl -X POST https://rpc.example.com/arcp/jobs/job_5c1d/control \\
  -H "Authorization: Bearer $ARCP_TOKEN" \\
  -d '{ "type": "control", "action": "cancel" }'`,
      python: `job.send_control("pause")
job.cancel()`,
      typescript: `await job.sendControl("pause");
await job.cancel();`,
      go: `_ = job.SendControl(ctx, "pause")
_ = job.Cancel(ctx)`,
      rust: `job.send_control(Control::Pause).await?;
job.cancel().await?;`,
    },
    response: `{
  "type": "control.ack",
  "job": { "id": "job_5c1d", "state": "cancelled" }
}`,
    responseLabel: 'ControlAck',
  },
  {
    id: 'errors',
    heading: 'Errors',
    body:
      'Every failure is a typed <code class="term">Error</code> frame with a stable ' +
      '<code class="term">code</code> and a <code class="term">category</code> ' +
      '(protocol, runtime, or lease-violation). <code class="term">submit</code> is idempotent, so retries are safe.',
    signature: 'ArcpError',
    code: {
      spec: `# any frame may be answered with an error envelope
{ "type": "error", "code": "lease_exceeded", "category": "lease" }`,
      python: `try:
    job = session.submit(input=payload)
except ArcpError as e:
    print(e.category, e.code)`,
      typescript: `try {
  await session.submit({ input: payload });
} catch (e) {
  if (e instanceof ArcpError) console.log(e.category, e.code);
}`,
      go: `_, err := session.Submit(ctx, payload)
var ae *arcp.Error
if errors.As(err, &ae) { fmt.Println(ae.Category, ae.Code) }`,
      rust: `match session.submit(payload).await {
    Err(ArcpError { category, code, .. }) => eprintln!("{category} {code}"),
    Ok(job) => { /* … */ }
}`,
    },
    response: `{
  "type": "error",
  "code": "lease_exceeded",
  "category": "lease",
  "retryable": false
}`,
    responseLabel: 'Error',
  },
  {
    id: 'versioning',
    heading: 'Versioning',
    body:
      'ARCP negotiates a protocol version at connect time. SDKs pin the spec version they ' +
      'implement; the handshake reports what was agreed. See the <a href="/spec/draft-arcp-1.1">v1.1 draft</a>.',
    signature: 'PROTOCOL_VERSION',
    code: {
      spec: `# the negotiated version is echoed in connect.ack
{ "type": "connect.ack", "version": "1.1" }`,
      python: `import arcp
print(arcp.PROTOCOL_VERSION)   # "1.1"`,
      typescript: `import { PROTOCOL_VERSION } from "@arcp/client";
console.log(PROTOCOL_VERSION); // "1.1"`,
      go: `fmt.Println(arcp.ProtocolVersion) // "1.1"`,
      rust: `println!("{}", arcp::PROTOCOL_VERSION); // "1.1"`,
    },
  },
];
