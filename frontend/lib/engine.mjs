/** @typedef {{incidents: {id:string,title:string,location:string,severity:string,status:string,teamId:string|null,people:number}[],teams:{id:string,name:string,specialty:string}[],resources:{id:string,name:string,stock:number,unit:string}[],allocations:{incidentId:string,resourceId:string,quantity:number}[],events:{at:string,actor:string,message:string}[]}} State */
/** @returns {State} */
export const seed = () => ({
  incidents: [
    {
      id: "INC-1001",
      title: "Riverside flooding",
      location: "Gomti Nagar",
      severity: "CRITICAL",
      status: "REPORTED",
      teamId: null,
      people: 24,
    },
    {
      id: "INC-1002",
      title: "Road access blocked",
      location: "Aliganj",
      severity: "HIGH",
      status: "REPORTED",
      teamId: null,
      people: 12,
    },
    {
      id: "INC-1003",
      title: "Temporary shelter support",
      location: "Indira Nagar",
      severity: "MEDIUM",
      status: "REPORTED",
      teamId: null,
      people: 40,
    },
  ],
  teams: [
    { id: "T-01", name: "Alpha Unit", specialty: "Water rescue" },
    { id: "T-02", name: "Bravo Unit", specialty: "Medical response" },
    { id: "T-03", name: "Charlie Unit", specialty: "Logistics" },
  ],
  resources: [
    { id: "R-01", name: "Drinking water", stock: 240, unit: "litres" },
    { id: "R-02", name: "Medical kits", stock: 30, unit: "kits" },
    { id: "R-03", name: "Relief meals", stock: 180, unit: "packs" },
  ],
  allocations: [],
  events: [
    {
      at: new Date().toISOString(),
      actor: "system",
      message: "Fictional sample scenario loaded",
    },
  ],
});
export function available(s, teamId) {
  return !s.incidents.some(
    (i) => i.teamId === teamId && i.status !== "RESOLVED",
  );
}
export function transition(state, action, role = "COORDINATOR") {
  if (role !== "COORDINATOR")
    throw Error(
      "Viewer access is read-only. Switch to Coordinator to make changes.",
    );
  const s = structuredClone(state),
    d = action.data || {};
  let message = "";
  const i = s.incidents.find((x) => x.id === action.id);
  if (action.type === "report") {
    if (s.incidents.length >= 500)
      throw Error("Demo incident limit reached. Reset the scenario.");
    if (
      !d.title?.trim() ||
      d.title.trim().length > 100 ||
      !d.location?.trim() ||
      d.location.trim().length > 100 ||
      !["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(d.severity) ||
      !Number.isInteger(d.people) ||
      d.people < 1 ||
      d.people > 100000
    )
      throw Error(
        "Enter a title, location, severity and a whole number of affected people (1–100,000).",
      );
    s.incidents.unshift({
      id: "INC-" + crypto.randomUUID().slice(0, 8),
      title: d.title.trim(),
      location: d.location.trim(),
      severity: d.severity,
      people: d.people,
      status: "REPORTED",
      teamId: null,
    });
    message = "Reported: " + d.title.trim();
  } else {
    if (!i) throw Error("Incident not found");
    if (action.type === "dispatch") {
      if (i.status !== "REPORTED")
        throw Error("Only reported incidents can be dispatched");
      if (!s.teams.some((t) => t.id === d.teamId))
        throw Error("Select a valid team");
      if (!available(s, d.teamId)) throw Error("Team is already assigned");
      i.teamId = d.teamId;
      i.status = "DISPATCHED";
      message = "Dispatched " + d.teamId + " to " + i.id;
    } else if (action.type === "advance") {
      const next = { DISPATCHED: "ON_SITE", ON_SITE: "RESOLVED" }[i.status];
      if (!next) throw Error("Dispatch first; resolved incidents are final");
      i.status = next;
      message = i.id + " → " + next;
    } else if (action.type === "allocate") {
      if (i.status === "RESOLVED")
        throw Error("Cannot allocate to a resolved incident");
      const r = s.resources.find((r) => r.id === d.resourceId);
      if (
        !r ||
        !Number.isInteger(d.quantity) ||
        d.quantity < 1 ||
        d.quantity > r.stock
      )
        throw Error("Enter a whole quantity within available stock");
      r.stock -= d.quantity;
      s.allocations.push({
        incidentId: i.id,
        resourceId: r.id,
        quantity: d.quantity,
      });
      message =
        "Allocated " +
        d.quantity +
        " " +
        r.unit +
        " of " +
        r.name +
        " to " +
        i.id;
    } else throw Error("Unknown action");
  }
  s.events.unshift({
    at: new Date().toISOString(),
    actor: role.toLowerCase(),
    message,
  });
  s.events = s.events.slice(0, 100);
  return s;
}
export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (
      s.schema !== 1 ||
      !s.state ||
      !Array.isArray(s.state.incidents) ||
      !Array.isArray(s.state.resources) ||
      !Array.isArray(s.state.teams) ||
      !Array.isArray(s.state.events) ||
      !Array.isArray(s.state.allocations)
    )
      return seed();
    return s.state;
  } catch {
    return seed();
  }
}
