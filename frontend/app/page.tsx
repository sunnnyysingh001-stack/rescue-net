"use client";
import { useState, useEffect } from "react";
import { seed, transition, available, restore } from "../lib/engine.mjs";
type State = ReturnType<typeof seed>;
export default function Page() {
  const [s, setS] = useState<State>(seed);
  const [tab, setTab] = useState("Overview");
  const [role, setRole] = useState("COORDINATOR");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState("INC-1001");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [login, setLogin] = useState(false);
  const [report, setReport] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rescue-net-v1");
      if (raw) setS(restore(raw));
    } catch {
      setMessage(
        "Storage is unavailable. Changes will last until this page closes.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready && !token)
      try {
        localStorage.setItem(
          "rescue-net-v1",
          JSON.stringify({ schema: 1, state: s }),
        );
      } catch {
        setMessage(
          "Browser storage is full or unavailable. Changes are kept in this tab.",
        );
      }
  }, [s, ready, token]);
  const active = s.incidents.filter((i) => i.status !== "RESOLVED");
  const focused = s.incidents.find((i) => i.id === selected) || s.incidents[0];
  async function act(action: any) {
    setBusy(true);
    setMessage("");
    try {
      let next;
      if (token) {
        const paths: any = {
          report: "/api/incidents",
          dispatch: `/api/incidents/${action.id}/dispatch`,
          advance: `/api/incidents/${action.id}/advance`,
          allocate: `/api/incidents/${action.id}/allocations`,
        };
        const r = await fetch(paths[action.type], {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(action.data || {}),
        });
        if (!r.ok) {
          let msg = "Request failed. Your session may have expired.";
          try {
            msg = (await r.json()).message || msg;
          } catch {}
          throw Error(msg);
        }
        next = await r.json();
      } else next = transition(s, action, role);
      setS(next);
      setMessage("Saved successfully.");
      setReport(false);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      if (!r.ok)
        throw Error(
          "Backend sign-in unavailable or credentials incorrect. This public deployment runs in browser-demo mode.",
        );
      const auth = await r.json();
      const state = await fetch("/api/state", {
        headers: { Authorization: "Bearer " + auth.token },
      });
      if (!state.ok) throw Error("Could not load backend state");
      setS(await state.json());
      setToken(auth.token);
      setRole(auth.role);
      setLogin(false);
      setMessage("Connected to the Java backend.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const can = role === "COORDINATOR" && !busy;
  return (
    <div className="app">
      <aside>
        <a className="logo" href="#">
          <span>✚</span> RESCUE<span className="dot">.NET</span>
        </a>
        <div className="side-label">RESPONSE WORKSPACE</div>
        <nav>
          {[
            "Overview",
            "Incidents",
            "Teams",
            "Resources",
            "Activity",
            "Engineering",
          ].map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              <span>{["◈", "⚑", "♧", "▦", "◷", "⌘"][i]}</span>
              {t}
              {t === "Incidents" && <small>{active.length}</small>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <span className="tiny-dot" />{" "}
          {token ? "Java API connected" : "Local sandbox"}
          <p>
            Built by Sunny Singh
            <br />
            Portfolio rebuild · 2026
          </p>
          <a href="https://sunny-singh-sde-portfolio.vercel.app">
            ← Back to portfolio
          </a>
        </div>
      </aside>
      <main>
        <div className="notice">
          <b>SIMULATION</b> Fictional sample data. This is a portfolio demo, not
          an emergency service.
        </div>
        <header>
          <div className="crumb">
            Workspace <span>/</span> {tab}
          </div>
          <div className="account">
            <span className="live-dot" />
            {token ? "Backend mode" : "Browser demo"}
            <select
              aria-label="Demo role"
              value={role}
              disabled={!!token}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="COORDINATOR">Coordinator</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <span className="avatar">SS</span>
          </div>
        </header>
        <div className="content">
          <div className="heading">
            <div>
              <p className="eyebrow">DISASTER RESPONSE / CONTROL CENTER</p>
              <h1>{tab === "Overview" ? "Every response matters." : tab}</h1>
              <p>
                {tab === "Overview"
                  ? "A clear picture. A coordinated response. One connected workspace."
                  : "Coordinate the next step with clear, accountable actions."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="quiet"
                onClick={() => setReset(true)}
                disabled={!!token}
              >
                ↺ Reset demo
              </button>
              <button
                className="primary"
                disabled={!can}
                onClick={() => setReport(true)}
              >
                ＋ Report incident
              </button>
            </div>
          </div>
          {message && (
            <div className="message" role="status">
              {message}
              <button
                onClick={() => setMessage("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          {(tab === "Overview" || tab === "Incidents") && (
            <>
              <div className="metrics">
                <Metric
                  label="ACTIVE INCIDENTS"
                  n={active.length}
                  detail="Awaiting resolution"
                  icon="⚑"
                />
                <Metric
                  label="CRITICAL PRIORITY"
                  n={active.filter((i) => i.severity === "CRITICAL").length}
                  detail="Needs urgent attention"
                  icon="!"
                />
                <Metric
                  label="AVAILABLE TEAMS"
                  n={s.teams.filter((t) => available(s, t.id)).length}
                  detail={"Of " + s.teams.length + " response units"}
                  icon="♧"
                />
                <Metric
                  label="PEOPLE AFFECTED"
                  n={active.reduce((a, i) => a + i.people, 0)}
                  detail="Across active reports"
                  icon="◎"
                />
              </div>
              <div className="workspace-grid">
                <section className="panel incident-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Incident queue</h2>
                      <p>Prioritize. Assign. Respond.</p>
                    </div>
                    <span className="pill">{s.incidents.length} total</span>
                  </div>
                  <div className="tools">
                    <input
                      aria-label="Search incidents"
                      placeholder="⌕  Search incident or location…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="Filter status"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="ALL">All statuses</option>
                      {["REPORTED", "DISPATCHED", "ON_SITE", "RESOLVED"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="incident-list">
                    {s.incidents
                      .filter(
                        (i) =>
                          (filter === "ALL" || i.status === filter) &&
                          (i.title + " " + i.location + " " + i.id)
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((i) => (
                        <button
                          key={i.id}
                          className={
                            "incident " + (focused?.id === i.id ? "chosen" : "")
                          }
                          onClick={() => setSelected(i.id)}
                        >
                          <div className="incident-top">
                            <span
                              className={"severity " + i.severity.toLowerCase()}
                            >
                              {i.severity}
                            </span>
                            <small>{i.id}</small>
                          </div>
                          <h3>{i.title}</h3>
                          <div className="incident-bottom">
                            <span>
                              ⌖ {i.location} · {i.people} people
                            </span>
                            <span
                              className={"status " + i.status.toLowerCase()}
                            >
                              {i.status.replace("_", " ")}
                            </span>
                          </div>
                        </button>
                      ))}
                    {!s.incidents.some(
                      (i) =>
                        (filter === "ALL" || i.status === filter) &&
                        (i.title + " " + i.location + " " + i.id)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    ) && (
                      <p className="empty">
                        No matching incidents. Try another search.
                      </p>
                    )}
                  </div>
                </section>
                <section className="panel detail">
                  {focused && (
                    <>
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">INCIDENT WORKSPACE</p>
                          <h2>{focused.title}</h2>
                        </div>
                        <span className="detail-icon">⌖</span>
                      </div>
                      <div className="scene">
                        <div className="scene-grid" />
                        <svg viewBox="0 0 500 180" aria-hidden="true">
                          <path
                            d="M-10 70 Q90 0 170 90 T320 70 T520 140"
                            fill="none"
                            stroke="#b7d5ec"
                            strokeWidth="24"
                          />
                          <path
                            d="M0 150L500 30M50 0L400 180M200 0L250 180"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="7"
                          />
                          <circle cx="250" cy="90" r="28" fill="#e67c5430" />
                          <circle cx="250" cy="90" r="9" fill="#dd693d" />
                          <circle cx="250" cy="90" r="4" fill="#fff" />
                        </svg>
                        <span>SCHEMATIC VIEW · NOT A LIVE MAP</span>
                      </div>
                      <div className="detail-info">
                        <div>
                          <small>LOCATION</small>
                          <b>{focused.location}</b>
                        </div>
                        <div>
                          <small>ASSIGNED TEAM</small>
                          <b>
                            {s.teams.find((t) => t.id === focused.teamId)
                              ?.name || "Unassigned"}
                          </b>
                        </div>
                      </div>
                      <div className="steps">
                        {["REPORTED", "DISPATCHED", "ON_SITE", "RESOLVED"].map(
                          (v, n) => (
                            <div
                              key={v}
                              className={
                                n <=
                                [
                                  "REPORTED",
                                  "DISPATCHED",
                                  "ON_SITE",
                                  "RESOLVED",
                                ].indexOf(focused.status)
                                  ? "done"
                                  : ""
                              }
                            >
                              <i>{n + 1}</i>
                              <span>{v.replace("_", " ")}</span>
                            </div>
                          ),
                        )}
                      </div>
                      {focused.status === "REPORTED" ? (
                        <form
                          key={focused.id}
                          onSubmit={(e) => {
                            e.preventDefault();
                            act({
                              type: "dispatch",
                              id: focused.id,
                              data: {
                                teamId: new FormData(e.currentTarget).get(
                                  "teamId",
                                ),
                              },
                            });
                          }}
                        >
                          <label>Dispatch an available unit</label>
                          <div className="inline">
                            <select name="teamId" required disabled={!can}>
                              <option value="">Select team</option>
                              {s.teams
                                .filter((t) => available(s, t.id))
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} · {t.specialty}
                                  </option>
                                ))}
                            </select>
                            <button className="primary" disabled={!can}>
                              Dispatch ↗
                            </button>
                          </div>
                        </form>
                      ) : focused.status !== "RESOLVED" ? (
                        <button
                          className="primary wide"
                          disabled={!can}
                          onClick={() =>
                            act({ type: "advance", id: focused.id })
                          }
                        >
                          {focused.status === "DISPATCHED"
                            ? "Mark team on site"
                            : "Resolve incident"}{" "}
                          →
                        </button>
                      ) : (
                        <div className="resolved">
                          ✓ Incident resolved · Team available for reassignment
                        </div>
                      )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          act({
                            type: "allocate",
                            id: focused.id,
                            data: {
                              resourceId: f.get("resourceId"),
                              quantity: Number(f.get("quantity")),
                            },
                          });
                        }}
                      >
                        <label>Allocate relief supplies</label>
                        <div className="allocation">
                          <select
                            name="resourceId"
                            required
                            disabled={!can || focused.status === "RESOLVED"}
                          >
                            {s.resources.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} ({r.stock} {r.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            name="quantity"
                            aria-label="Quantity"
                            type="number"
                            min="1"
                            max="100000"
                            step="1"
                            defaultValue="10"
                            required
                            disabled={!can || focused.status === "RESOLVED"}
                          />
                          <button
                            className="secondary"
                            disabled={!can || focused.status === "RESOLVED"}
                          >
                            Allocate
                          </button>
                        </div>
                      </form>
                      <div className="allocations">
                        <small>ALLOCATED TO THIS INCIDENT</small>
                        {s.allocations.filter(
                          (a) => a.incidentId === focused.id,
                        ).length ? (
                          s.allocations
                            .filter((a) => a.incidentId === focused.id)
                            .map((a, n) => (
                              <p key={n}>
                                {
                                  s.resources.find((r) => r.id === a.resourceId)
                                    ?.name
                                }{" "}
                                <b>{a.quantity}</b>
                              </p>
                            ))
                        ) : (
                          <p>No supplies allocated yet.</p>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
          {tab === "Teams" && (
            <div className="cards">
              {s.teams.map((t) => (
                <section className="panel team-card" key={t.id}>
                  <div className="unit-icon">♧</div>
                  <span
                    className={
                      "pill " + (available(s, t.id) ? "green" : "orange")
                    }
                  >
                    {available(s, t.id) ? "Available" : "Dispatched"}
                  </span>
                  <h2>{t.name}</h2>
                  <p>{t.specialty}</p>
                  <hr />
                  <small>{t.id}</small>
                  <p>
                    {s.incidents.find(
                      (i) => i.teamId === t.id && i.status !== "RESOLVED",
                    )?.title || "Ready for next assignment"}
                  </p>
                </section>
              ))}
            </div>
          )}
          {tab === "Resources" && (
            <>
              <div className="cards">
                {s.resources.map((r) => (
                  <section className="panel resource-card" key={r.id}>
                    <span className="unit-icon">▦</span>
                    <h2>{r.name}</h2>
                    <strong>
                      {r.stock}
                      <small> {r.unit}</small>
                    </strong>
                    <p>Available inventory</p>
                    <div className="stock-bar">
                      <i
                        style={{
                          width:
                            Math.min(
                              100,
                              (r.stock /
                                ({ "R-01": 240, "R-02": 30, "R-03": 180 }[
                                  r.id
                                ] || 1)) *
                                100,
                            ) + "%",
                        }}
                      />
                    </div>
                  </section>
                ))}
              </div>
              <section className="panel log">
                <h2>Allocation ledger</h2>
                {s.allocations.length ? (
                  s.allocations.map((a, n) => (
                    <div className="log-row" key={n}>
                      <b>{a.incidentId}</b>
                      <span>
                        {s.resources.find((r) => r.id === a.resourceId)?.name}
                      </span>
                      <strong>{a.quantity}</strong>
                    </div>
                  ))
                ) : (
                  <p className="empty">
                    Allocate supplies from an incident workspace to populate the
                    ledger.
                  </p>
                )}
              </section>
            </>
          )}
          {(tab === "Activity" || tab === "Overview") && (
            <section className="panel log">
              <div className="panel-heading">
                <div>
                  <h2>Activity timeline</h2>
                  <p>Every action leaves a trace.</p>
                </div>
                <span className="pill">
                  Latest{" "}
                  {Math.min(tab === "Overview" ? 4 : 100, s.events.length)}
                </span>
              </div>
              {s.events.slice(0, tab === "Overview" ? 4 : 100).map((e, n) => (
                <div className="log-row" key={n}>
                  <span className="event-dot" />
                  <div>
                    <b>{e.message}</b>
                    <small>{e.actor}</small>
                  </div>
                  <time suppressHydrationWarning>
                    {ready
                      ? new Date(e.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </time>
                </div>
              ))}
            </section>
          )}
          {tab === "Engineering" && (
            <section className="panel engineering">
              <p className="eyebrow">BUILT TO BE EXPLAINED</p>
              <h2>From report to response.</h2>
              <p>
                This is a new 2026 implementation based on the original project
                brief. The public demo uses browser storage. Its companion Java
                backend uses Spring Boot, signed JWTs, role enforcement and H2
                persistence.
              </p>
              <div className="arch">
                <div>
                  Browser UI
                  <br />
                  <small>React / Next.js</small>
                </div>
                <span>→</span>
                <div>
                  Mode adapter
                  <br />
                  <small>Local engine or REST</small>
                </div>
                <span>→</span>
                <div>
                  Java API
                  <br />
                  <small>JWT / validation</small>
                </div>
                <span>→</span>
                <div>
                  Operations service
                  <br />
                  <small>Atomic transactions</small>
                </div>
                <span>→</span>
                <div>
                  H2 database
                  <br />
                  <small>Locked state aggregate</small>
                </div>
              </div>
              <h3>Rules worth testing</h3>
              <ul>
                <li>One team can work on only one active incident.</li>
                <li>
                  Progress follows Reported → Dispatched → On site → Resolved.
                </li>
                <li>
                  Stock cannot go negative; failed operations change nothing.
                </li>
                <li>Viewer credentials cannot mutate server state.</li>
              </ul>
              <h3>Run the full backend</h3>
              <p>
                Download the source and follow the README. Docker Compose serves
                the same UI with the Java API on localhost:8080. Backend login
                is only available on that deployment.
              </p>
              <div className="heading-actions">
                <a className="primary" href="/source.zip" download>
                  Download source ↓
                </a>
                <a
                  className="secondary"
                  href="/architecture.svg"
                  target="_blank"
                >
                  Architecture ↗
                </a>
                <button className="secondary" onClick={() => setLogin(true)}>
                  Backend sign-in
                </button>
              </div>
              <p className="fine">
                Browser role switching demonstrates workflows; it is not
                security. Server permissions are enforced independently. No live
                emergency data, geolocation, SMS dispatch, or production
                readiness is claimed.
              </p>
              {token && (
                <button
                  className="quiet"
                  onClick={() => {
                    setToken("");
                    setS(seed());
                    setRole("COORDINATOR");
                    setMessage("Returned to a fresh browser demo.");
                  }}
                >
                  Sign out of backend
                </button>
              )}
            </section>
          )}
          <footer>
            RESCUE.NET <span>Sample scenario · Lucknow</span>
            <a href="/source.zip" download>
              Source & documentation ↗
            </a>
          </footer>
        </div>
      </main>
      {report && (
        <div className="overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="modal"
          >
            <button
              className="close"
              onClick={() => setReport(false)}
              aria-label="Close report form"
            >
              ×
            </button>
            <p className="eyebrow">NEW INCIDENT</p>
            <h2 id="report-title">Start a coordinated response.</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act({
                  type: "report",
                  data: {
                    title: f.get("title"),
                    location: f.get("location"),
                    severity: f.get("severity"),
                    people: Number(f.get("people")),
                  },
                });
              }}
            >
              <label>
                Incident title
                <input
                  autoFocus
                  name="title"
                  maxLength={100}
                  required
                  placeholder="e.g. Access road flooded"
                />
              </label>
              <label>
                Location
                <input
                  name="location"
                  maxLength={100}
                  required
                  placeholder="Area or neighbourhood"
                />
              </label>
              <div className="two">
                <label>
                  Severity
                  <select name="severity">
                    <option>CRITICAL</option>
                    <option>HIGH</option>
                    <option>MEDIUM</option>
                    <option>LOW</option>
                  </select>
                </label>
                <label>
                  People affected
                  <input
                    name="people"
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    defaultValue="1"
                    required
                  />
                </label>
              </div>
              <button className="primary wide" disabled={busy}>
                Create incident →
              </button>
              {message && <p role="status">{message}</p>}
            </form>
          </section>
        </div>
      )}
      {reset && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Reset this browser demo?</h2>
            <p>
              This replaces your local incidents, dispatches and allocations
              with the sample scenario.
            </p>
            <div className="heading-actions">
              <button
                className="secondary"
                autoFocus
                onClick={() => setReset(false)}
              >
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  setS(seed());
                  setSelected("INC-1001");
                  setReset(false);
                  setMessage("Sample scenario restored.");
                }}
              >
                Reset demo
              </button>
            </div>
          </section>
        </div>
      )}
      {login && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
          >
            <button
              className="close"
              onClick={() => setLogin(false)}
              aria-label="Close login"
            >
              ×
            </button>
            <h2 id="login-title">Java backend sign-in</h2>
            <p>
              Use the credentials you configured when running the source
              locally. The public sandbox has no hosted Java API.
            </p>
            <form onSubmit={signIn}>
              <label>
                Username
                <select name="username">
                  <option value="coordinator">coordinator</option>
                  <option value="viewer">viewer</option>
                </select>
              </label>
              <label>
                Password
                <input
                  autoFocus
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button className="primary wide" disabled={busy}>
                Sign in
              </button>
              {message && <p role="status">{message}</p>}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  n,
  detail,
  icon,
}: {
  label: string;
  n: number;
  detail: string;
  icon: string;
}) {
  return (
    <div className="metric">
      <div>
        <small>{label}</small>
        <strong>{n}</strong>
        <p>{detail}</p>
      </div>
      <span>{icon}</span>
    </div>
  );
}
