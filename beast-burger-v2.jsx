import { useState, useEffect } from "react";

const C = {
  bg: "#0c0a09",
  surface: "#1a1412",
  surfaceHot: "#231c17",
  card: "#1f1914",
  border: "#3d2e22",
  borderHot: "#b45309",
  text: "#fef3c7",
  textSoft: "#d6a56a",
  textMuted: "#92764e",
  flame: "#f97316",
  flameHot: "#fb923c",
  flameDark: "#c2410c",
  flameGlow: "rgba(249,115,22,0.12)",
  red: "#dc2626",
  redGlow: "rgba(220,38,38,0.12)",
  green: "#16a34a",
  greenGlow: "rgba(22,163,74,0.12)",
  gold: "#eab308",
  goldGlow: "rgba(234,179,8,0.12)",
  blue: "#2563eb",
  blueGlow: "rgba(37,99,235,0.12)",
  cyan: "#0891b2",
  cyanGlow: "rgba(8,145,178,0.12)",
  purple: "#9333ea",
  purpleGlow: "rgba(147,51,234,0.12)",
  white: "#fefce8",
};

const tabs = [
  { id: "overview", label: "System Overview", icon: "🏗" },
  { id: "flow", label: "Order Flow", icon: "🔄" },
  { id: "scaling", label: "K8s Scaling", icon: "⚡" },
  { id: "failures", label: "What Failed → Fixed", icon: "🔥" },
  { id: "stack", label: "Tech Stack", icon: "🧱" },
];

const services = {
  gateway: {
    name: "KONG API Gateway",
    sub: "Ingress Controller",
    icon: "🚪",
    color: C.gold,
    glow: C.goldGlow,
    lang: "KONG OSS",
    store: "—",
    badge: "INGRESS",
    desc: "Single entry point for all external traffic. Handles rate limiting (prevents app crashes under viral load), JWT authentication, request routing to internal services, and load balancing across pods.",
    endpoints: ["Route: /api/orders → order-service", "Route: /api/menu → menu-service", "Route: /api/kitchens → kitchen-service", "Plugin: rate-limiting (100 req/min per IP)", "Plugin: jwt-auth"],
    fix: "MrBeast Burger had NO rate limiting — viral traffic crashed the app. KONG prevents this.",
  },
  queue: {
    name: "Order Queue Service",
    sub: "Redis Sorted Set + TTL",
    icon: "🎫",
    color: C.red,
    glow: C.redGlow,
    lang: "Go (Golang)",
    store: "Redis",
    badge: "QUEUE",
    desc: "Virtual waiting room. When order volume exceeds kitchen capacity, customers are placed in a fair queue using Redis sorted sets (atomic, no race conditions). Batch-releases orders to kitchens based on real-time capacity. This is what MrBeast Burger DIDN'T have — kitchens got flooded with unlimited orders.",
    endpoints: ["POST /queue/join", "GET /queue/position/{user_id}", "WS /queue/live (WebSocket)", "Internal: batch-release worker"],
    fix: "Kitchens were flooded with 500+ orders each. Queue Service caps orders per kitchen based on real-time capacity.",
  },
  order: {
    name: "Order Orchestrator",
    sub: "Saga Pattern Controller",
    icon: "📋",
    color: C.flame,
    glow: C.flameGlow,
    lang: "Python / Flask",
    store: "MySQL",
    badge: "SAGA",
    desc: "Central orchestrator. Creates orders, coordinates the saga across Inventory, Payment, Kitchen, and Delivery services. Manages compensating transactions (rollbacks) when any step fails — something MrBeast Burger couldn't do, leaving orders stuck in limbo.",
    endpoints: ["POST /orders", "GET /orders/{id}", "PUT /orders/{id}/status", "POST /orders/{id}/rollback"],
    fix: "Orders got stuck when kitchens or drivers failed. Saga pattern ensures clean rollback every time.",
  },
  menu: {
    name: "Menu / Product Service",
    sub: "OutSystems (Reusable)",
    icon: "🍔",
    color: C.cyan,
    glow: C.cyanGlow,
    lang: "OutSystems",
    store: "OutSystems DB",
    badge: "REUSE",
    desc: "Menu catalog with items, pricing, customizations, and availability per kitchen location. Built on OutSystems and exposed as a reusable REST API — consumed by the frontend, Order Service, and Kitchen Service.",
    endpoints: ["GET /menu", "GET /menu/{item_id}", "GET /menu/kitchen/{kitchen_id}", "PUT /menu/{item_id}/availability"],
    fix: "Standardized menu with per-kitchen availability prevents customers ordering items that specific locations can't make.",
  },
  kitchen: {
    name: "Kitchen Assignment Service",
    sub: "Capacity-Aware Routing",
    icon: "👨‍🍳",
    color: C.green,
    glow: C.greenGlow,
    lang: "Python / Flask",
    store: "MySQL + Redis",
    badge: "ROUTING",
    desc: "Routes orders to the optimal ghost kitchen based on proximity, current capacity, and preparation speed. Tracks real-time kitchen load. If a kitchen is overwhelmed, orders overflow to nearby locations — solving MrBeast Burger's biggest operational failure.",
    endpoints: ["POST /kitchens/assign", "GET /kitchens/{id}/capacity", "PUT /kitchens/{id}/status", "GET /kitchens/nearby?lat=&lng="],
    fix: "Individual locations were overwhelmed with no overflow. Kitchen routing distributes load across nearby locations.",
  },
  payment: {
    name: "Payment Service",
    sub: "Auth / Capture / Refund",
    icon: "💳",
    color: C.purple,
    glow: C.purpleGlow,
    lang: "Python / Flask",
    store: "MySQL",
    badge: null,
    desc: "Handles the payment lifecycle: authorise (hold funds), capture (confirm charge on successful delivery), and refund (compensating transaction on saga failure). Integrates with Stripe sandbox as the external service.",
    endpoints: ["POST /payments/authorise", "POST /payments/capture", "POST /payments/refund", "GET /payments/{id}"],
    fix: "No refund mechanism existed for failed orders. Payment Service supports automatic refund via saga compensation.",
  },
  delivery: {
    name: "Delivery Assignment Service",
    sub: "Async via RabbitMQ",
    icon: "🚗",
    color: C.blue,
    glow: C.blueGlow,
    lang: "Go (Golang)",
    store: "MySQL + Redis (TTL)",
    badge: "ASYNC",
    desc: "Assigns delivery drivers asynchronously via RabbitMQ. Uses Redis TTL for timeout — if no driver accepts within 2 minutes, a timeout event triggers saga rollback. Written in Go for high-concurrency driver matching.",
    endpoints: ["AMQP: delivery.assign (consume)", "AMQP: delivery.response (publish)", "GET /drivers/available?area=", "GET /drivers/{id}/status"],
    fix: "Driver shortages left orders undelivered for hours. Timeout + rollback gives customers a clean cancellation instead of endless waiting.",
  },
  notification: {
    name: "Notification Service",
    sub: "Real-time Updates",
    icon: "🔔",
    color: C.gold,
    glow: C.goldGlow,
    lang: "Python / Flask",
    store: "JSON file log",
    badge: null,
    desc: "Consumes events from RabbitMQ and pushes real-time order updates to customers: queue position, kitchen assigned, driver en route, delivery complete, or cancellation with reason. Uses Server-Sent Events for live browser updates.",
    endpoints: ["AMQP: notification.send (consume)", "SSE /notifications/stream/{user_id}", "GET /notifications/{user_id}"],
    fix: "Customers had zero visibility into order status. Real-time notifications keep them informed at every step.",
  },
};

const orderFlow = [
  { id: "customer", label: "Customer opens app", svc: "frontend", color: C.text, type: "start" },
  { id: "browse", label: "Browse menu (location-aware)", svc: "menu", color: C.cyan, type: "rest" },
  { id: "place", label: "Place order", svc: "gateway", color: C.gold, type: "rest" },
  { id: "queue-check", label: "Check kitchen capacity", svc: "queue", color: C.red, type: "rest" },
  { id: "queue-wait", label: "If at capacity → join virtual queue", svc: "queue", color: C.red, type: "wait" },
  { id: "queue-release", label: "Released from queue → proceed", svc: "queue", color: C.red, type: "rest" },
  { id: "create", label: "Order Service creates order, begins saga", svc: "order", color: C.flame, type: "saga" },
  { id: "kitchen-assign", label: "Assign to optimal kitchen (proximity + load)", svc: "kitchen", color: C.green, type: "rest" },
  { id: "payment-auth", label: "Authorise payment (hold funds)", svc: "payment", color: C.purple, type: "rest" },
  { id: "driver", label: "Request driver assignment (async)", svc: "delivery", color: C.blue, type: "amqp" },
  { id: "driver-wait", label: "Await driver response (2 min TTL)", svc: "delivery", color: C.blue, type: "wait" },
  { id: "confirm", label: "Driver found → capture payment, confirm order", svc: "order", color: C.green, type: "saga" },
  { id: "notify", label: "Notify customer: order confirmed + ETA", svc: "notification", color: C.gold, type: "amqp" },
  { id: "deliver", label: "Driver picks up → delivers → complete", svc: "delivery", color: C.green, type: "end" },
];

const rollbackFlow = [
  { id: "timeout", label: "Driver TTL expires — no driver accepted", svc: "delivery", color: C.red, type: "fail" },
  { id: "rollback-pay", label: "Compensate: refund payment", svc: "payment", color: C.red, type: "compensate" },
  { id: "rollback-kitchen", label: "Compensate: release kitchen slot", svc: "kitchen", color: C.red, type: "compensate" },
  { id: "cancel", label: "Order status → CANCELLED", svc: "order", color: C.red, type: "fail" },
  { id: "notify-cancel", label: "Notify customer: cancelled + reason", svc: "notification", color: C.red, type: "amqp" },
];

const failures = [
  {
    problem: "App crashed on launch day",
    what: "1M+ downloads in hours, servers overwhelmed, no autoscaling",
    fix: "Kubernetes HPA auto-scales Order and Queue pods from 2→8 based on CPU/request volume",
    icon: "💥",
    severity: "critical",
  },
  {
    problem: "Kitchens flooded with orders",
    what: "No order throttling — 300 kitchens each got unlimited simultaneous orders",
    fix: "Queue Service caps orders per kitchen based on real-time capacity, overflows to nearby locations",
    icon: "🌊",
    severity: "critical",
  },
  {
    problem: "2–3 hour delivery waits",
    what: "Not enough drivers, orders stuck in limbo indefinitely",
    fix: "Delivery Service uses Redis TTL — if no driver in 2 min, saga rolls back cleanly (refund + notification)",
    icon: "⏳",
    severity: "high",
  },
  {
    problem: "No refunds for failed orders",
    what: "Payment taken but food never arrived, no automated compensation",
    fix: "Saga orchestration pattern with compensating transactions: Payment refund + kitchen slot release on any failure",
    icon: "💸",
    severity: "critical",
  },
  {
    problem: "Zero order visibility",
    what: "Customers couldn't track order status after placing it",
    fix: "Notification Service pushes real-time updates via SSE: queue position → kitchen assigned → driver en route → delivered",
    icon: "👁",
    severity: "medium",
  },
  {
    problem: "Inconsistent food quality",
    what: "No kitchen performance monitoring, no way to reroute bad kitchens",
    fix: "Kitchen Service tracks prep times + ratings; underperforming kitchens get deprioritized in routing algorithm",
    icon: "📉",
    severity: "high",
  },
];

const Flame = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.5 8 4 12 4 15a8 8 0 0016 0c0-3-2.5-7-8-13z" fill={C.flame} opacity="0.3" />
    <path d="M12 9c-2 3-3 5-3 7a3 3 0 006 0c0-2-1-4-3-7z" fill={C.flame} />
  </svg>
);

const Pulse = ({ color }) => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 8px ${color}`,
      animation: "pulse 2s infinite",
    }}
  />
);

export default function BeastBurgerArchitecture() {
  const [tab, setTab] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [flowStep, setFlowStep] = useState(-1);
  const [showRollback, setShowRollback] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    setAnimIn(false);
    const t = setTimeout(() => setAnimIn(true), 50);
    return () => clearTimeout(t);
  }, [tab]);

  const svc = selected ? services[selected] : null;

  return (
    <div style={{
      background: `radial-gradient(ellipse at 30% 0%, ${C.surfaceHot} 0%, ${C.bg} 50%)`,
      color: C.text,
      fontFamily: "'Courier New', 'Courier', monospace",
      minHeight: "100vh",
      padding: "28px 24px",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 12px ${C.flame}30} 50%{box-shadow:0 0 24px ${C.flame}50} }
        .card-hover:hover { border-color: ${C.borderHot} !important; transform: translateY(-2px); }
        .card-hover { transition: all 0.25s ease; }
        .svc-btn:hover { background: ${C.surfaceHot} !important; border-color: ${C.flame} !important; }
        .flow-step { transition: all 0.3s ease; }
        .flow-step:hover { transform: translateX(4px); }
        .severity-critical { border-left: 3px solid ${C.red}; }
        .severity-high { border-left: 3px solid ${C.flame}; }
        .severity-medium { border-left: 3px solid ${C.gold}; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 32 }}>🍔</span>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "-1px",
              color: C.flame,
              textShadow: `0 0 40px ${C.flame}40`,
            }}>
              BEAST BURGER
            </h1>
            <span style={{
              fontSize: 9, padding: "3px 10px", borderRadius: 4,
              background: C.flameDark, color: C.white, fontWeight: 800,
              letterSpacing: "1.5px", textTransform: "uppercase",
            }}>
              v2.0 REBUILT
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted, maxWidth: 600 }}>
            Ghost Kitchen Platform — Reimagined with Microservices, Saga Orchestration, and Kubernetes Autoscaling.
            Everything MrBeast Burger should have been.
          </p>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 24,
        background: C.surface, padding: 4, borderRadius: 10,
        border: `1px solid ${C.border}`, width: "fit-content",
        overflowX: "auto",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); setFlowStep(-1); setShowRollback(false); }}
            style={{
              padding: "9px 16px", fontSize: 11, fontWeight: 700,
              fontFamily: "inherit", border: "none", borderRadius: 7, cursor: "pointer",
              background: tab === t.id ? C.flame : "transparent",
              color: tab === t.id ? C.bg : C.textMuted,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(12px)", transition: "all 0.4s ease" }}>

        {/* ════ OVERVIEW ════ */}
        {tab === "overview" && (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Architecture SVG */}
            <div style={{ flex: "1 1 680px" }}>
              <svg viewBox="0 0 720 600" style={{
                width: "100%", maxWidth: 720, borderRadius: 14,
                background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
                border: `1px solid ${C.border}`,
              }}>
                {/* Grid texture */}
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke={C.border} strokeWidth="0.3" opacity="0.4" />
                  </pattern>
                  <marker id="ah-flame" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.flame} />
                  </marker>
                  <marker id="ah-green" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.green} />
                  </marker>
                  <marker id="ah-blue" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.blue} />
                  </marker>
                  <marker id="ah-gold" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.gold} />
                  </marker>
                  <marker id="ah-red" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.red} />
                  </marker>
                  <marker id="ah-purple" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.purple} />
                  </marker>
                  <marker id="ah-cyan" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill={C.cyan} />
                  </marker>
                </defs>
                <rect width="720" height="600" fill="url(#grid)" />

                {/* Title */}
                <text x="24" y="30" fill={C.textMuted} fontSize="9" fontWeight="700" letterSpacing="2" fontFamily="monospace">SYSTEM ARCHITECTURE</text>

                {/* ── Customers ── */}
                <g onClick={() => setSelected(null)} style={{ cursor: "pointer" }}>
                  <rect x="270" y="42" width="180" height="46" rx="8" fill={C.surface} stroke={C.border} />
                  <text x="294" y="64" fill={C.text} fontSize="11" fontWeight="700" fontFamily="monospace">🖥  Customer App</text>
                  <text x="294" y="78" fill={C.textMuted} fontSize="8.5" fontFamily="monospace">Vue.js / React</text>
                </g>

                {/* ── KONG ── */}
                <g onClick={() => setSelected("gateway")} style={{ cursor: "pointer" }}>
                  <rect x="250" y="118" width="220" height="46" rx="8"
                    fill={selected === "gateway" ? C.goldGlow : C.surface}
                    stroke={selected === "gateway" ? C.gold : C.border} strokeWidth={selected === "gateway" ? 2 : 1} />
                  <text x="280" y="140" fill={C.gold} fontSize="11" fontWeight="700" fontFamily="monospace">🚪 KONG API Gateway</text>
                  <text x="280" y="154" fill={C.textMuted} fontSize="8.5" fontFamily="monospace">Rate Limit · JWT · Routing</text>
                  <rect x="410" y="110" width="55" height="16" rx="4" fill={C.gold} opacity="0.85" />
                  <text x="437" y="122" textAnchor="middle" fill={C.bg} fontSize="8" fontWeight="800" fontFamily="monospace">INGRESS</text>
                </g>
                <line x1="360" y1="88" x2="360" y2="118" stroke={C.gold} strokeWidth="1.5" markerEnd="url(#ah-gold)" opacity="0.6" />

                {/* ── K8s Cluster ── */}
                <rect x="20" y="185" width="680" height="395" rx="14" fill="none"
                  stroke={C.flame} strokeWidth="1" strokeDasharray="6 4" opacity="0.3" />
                <rect x="38" y="176" width="195" height="18" rx="5" fill={C.bg} />
                <text x="46" y="189" fill={C.flame} fontSize="9.5" fontWeight="700" fontFamily="monospace">☸ Kubernetes Cluster (k3s)</text>

                {/* ── Queue Service ── */}
                <g onClick={() => setSelected("queue")} style={{ cursor: "pointer" }}>
                  <rect x="40" y="210" width="156" height="58" rx="8"
                    fill={selected === "queue" ? C.redGlow : C.surface}
                    stroke={selected === "queue" ? C.red : C.border} strokeWidth={selected === "queue" ? 2 : 1} />
                  <text x="56" y="234" fill={C.red} fontSize="10.5" fontWeight="700" fontFamily="monospace">🎫 Queue Service</text>
                  <text x="56" y="254" fill={C.textMuted} fontSize="8" fontFamily="monospace">Go · Redis Sorted Set</text>
                </g>

                {/* ── Order Orchestrator ── */}
                <g onClick={() => setSelected("order")} style={{ cursor: "pointer" }}>
                  <rect x="260" y="210" width="200" height="58" rx="8"
                    fill={selected === "order" ? C.flameGlow : C.surface}
                    stroke={selected === "order" ? C.flame : C.border} strokeWidth={selected === "order" ? 2 : 1} />
                  <text x="280" y="234" fill={C.flame} fontSize="10.5" fontWeight="700" fontFamily="monospace">📋 Order Orchestrator</text>
                  <text x="280" y="254" fill={C.textMuted} fontSize="8" fontFamily="monospace">Python/Flask · MySQL · Saga</text>
                  <rect x="400" y="202" width="46" height="16" rx="4" fill={C.flame} opacity="0.85" />
                  <text x="423" y="214" textAnchor="middle" fill={C.bg} fontSize="7.5" fontWeight="800" fontFamily="monospace">SAGA</text>
                </g>

                {/* ── Menu Service ── */}
                <g onClick={() => setSelected("menu")} style={{ cursor: "pointer" }}>
                  <rect x="524" y="210" width="156" height="58" rx="8"
                    fill={selected === "menu" ? C.cyanGlow : C.surface}
                    stroke={selected === "menu" ? C.cyan : C.border} strokeWidth={selected === "menu" ? 2 : 1} />
                  <text x="542" y="234" fill={C.cyan} fontSize="10.5" fontWeight="700" fontFamily="monospace">🍔 Menu Service</text>
                  <text x="542" y="254" fill={C.textMuted} fontSize="8" fontFamily="monospace">OutSystems (Reuse)</text>
                  <rect x="624" y="202" width="46" height="16" rx="4" fill={C.cyan} opacity="0.85" />
                  <text x="647" y="214" textAnchor="middle" fill={C.bg} fontSize="7.5" fontWeight="800" fontFamily="monospace">REUSE</text>
                </g>

                {/* KONG → services */}
                <line x1="310" y1="164" x2="140" y2="210" stroke={C.gold} strokeWidth="1" markerEnd="url(#ah-gold)" opacity="0.5" />
                <line x1="360" y1="164" x2="360" y2="210" stroke={C.gold} strokeWidth="1" markerEnd="url(#ah-gold)" opacity="0.5" />
                <line x1="410" y1="164" x2="580" y2="210" stroke={C.gold} strokeWidth="1" markerEnd="url(#ah-gold)" opacity="0.5" />

                {/* Queue → Order */}
                <line x1="196" y1="239" x2="260" y2="239" stroke={C.red} strokeWidth="1.5" markerEnd="url(#ah-red)" opacity="0.6" />
                <rect x="208" y="230" width="38" height="14" rx="3" fill={C.bg} stroke={C.border} strokeWidth="0.5" />
                <text x="227" y="240" textAnchor="middle" fill={C.textMuted} fontSize="7" fontFamily="monospace">REST</text>

                {/* ── ROW 2: Kitchen, Payment, Delivery ── */}
                <g onClick={() => setSelected("kitchen")} style={{ cursor: "pointer" }}>
                  <rect x="40" y="320" width="165" height="58" rx="8"
                    fill={selected === "kitchen" ? C.greenGlow : C.surface}
                    stroke={selected === "kitchen" ? C.green : C.border} strokeWidth={selected === "kitchen" ? 2 : 1} />
                  <text x="56" y="344" fill={C.green} fontSize="10.5" fontWeight="700" fontFamily="monospace">👨‍🍳 Kitchen Svc</text>
                  <text x="56" y="360" fill={C.textMuted} fontSize="8" fontFamily="monospace">Flask · MySQL + Redis</text>
                </g>

                <g onClick={() => setSelected("payment")} style={{ cursor: "pointer" }}>
                  <rect x="240" y="320" width="165" height="58" rx="8"
                    fill={selected === "payment" ? C.purpleGlow : C.surface}
                    stroke={selected === "payment" ? C.purple : C.border} strokeWidth={selected === "payment" ? 2 : 1} />
                  <text x="258" y="344" fill={C.purple} fontSize="10.5" fontWeight="700" fontFamily="monospace">💳 Payment Svc</text>
                  <text x="258" y="360" fill={C.textMuted} fontSize="8" fontFamily="monospace">Flask · MySQL · Stripe</text>
                </g>

                <g onClick={() => setSelected("delivery")} style={{ cursor: "pointer" }}>
                  <rect x="444" y="320" width="165" height="58" rx="8"
                    fill={selected === "delivery" ? C.blueGlow : C.surface}
                    stroke={selected === "delivery" ? C.blue : C.border} strokeWidth={selected === "delivery" ? 2 : 1} />
                  <text x="462" y="344" fill={C.blue} fontSize="10.5" fontWeight="700" fontFamily="monospace">🚗 Delivery Svc</text>
                  <text x="462" y="360" fill={C.textMuted} fontSize="8" fontFamily="monospace">Go · MySQL + Redis TTL</text>
                  <rect x="554" y="312" width="46" height="16" rx="4" fill={C.blue} opacity="0.85" />
                  <text x="577" y="324" textAnchor="middle" fill={C.white} fontSize="7.5" fontWeight="800" fontFamily="monospace">ASYNC</text>
                </g>

                {/* Order → Kitchen (REST) */}
                <line x1="310" y1="268" x2="150" y2="320" stroke={C.green} strokeWidth="1.2" markerEnd="url(#ah-green)" opacity="0.5" />
                <rect x="200" y="283" width="38" height="14" rx="3" fill={C.bg} stroke={C.border} strokeWidth="0.5" />
                <text x="219" y="293" textAnchor="middle" fill={C.textMuted} fontSize="7" fontFamily="monospace">REST</text>

                {/* Order → Payment (REST) */}
                <line x1="360" y1="268" x2="330" y2="320" stroke={C.purple} strokeWidth="1.2" markerEnd="url(#ah-purple)" opacity="0.5" />
                <rect x="322" y="288" width="38" height="14" rx="3" fill={C.bg} stroke={C.border} strokeWidth="0.5" />
                <text x="341" y="298" textAnchor="middle" fill={C.textMuted} fontSize="7" fontFamily="monospace">REST</text>

                {/* Order → Delivery (AMQP dashed) */}
                <line x1="420" y1="268" x2="510" y2="320" stroke={C.blue} strokeWidth="1.2" strokeDasharray="5 3" markerEnd="url(#ah-blue)" opacity="0.5" />
                <rect x="444" y="283" width="42" height="14" rx="3" fill={C.bg} stroke={C.border} strokeWidth="0.5" />
                <text x="465" y="293" textAnchor="middle" fill={C.textMuted} fontSize="7" fontFamily="monospace">AMQP</text>

                {/* ── RabbitMQ ── */}
                <rect x="300" y="420" width="170" height="44" rx="8" fill={C.surface} stroke={C.red} strokeWidth="1" opacity="0.7" />
                <text x="322" y="442" fill={C.red} fontSize="10.5" fontWeight="700" fontFamily="monospace">🐇 RabbitMQ</text>
                <text x="322" y="456" fill={C.textMuted} fontSize="8" fontFamily="monospace">Message Broker</text>

                {/* Delivery → RabbitMQ */}
                <line x1="526" y1="378" x2="470" y2="420" stroke={C.red} strokeWidth="1" strokeDasharray="5 3" opacity="0.5" />
                {/* Order → RabbitMQ */}
                <line x1="360" y1="268" x2="385" y2="420" stroke={C.red} strokeWidth="1" strokeDasharray="5 3" opacity="0.3" />

                {/* ── Notification ── */}
                <g onClick={() => setSelected("notification")} style={{ cursor: "pointer" }}>
                  <rect x="100" y="430" width="165" height="50" rx="8"
                    fill={selected === "notification" ? C.goldGlow : C.surface}
                    stroke={selected === "notification" ? C.gold : C.border} strokeWidth={selected === "notification" ? 2 : 1} />
                  <text x="118" y="452" fill={C.gold} fontSize="10.5" fontWeight="700" fontFamily="monospace">🔔 Notification</text>
                  <text x="118" y="466" fill={C.textMuted} fontSize="8" fontFamily="monospace">Flask · SSE · RabbitMQ</text>
                </g>
                <line x1="300" y1="445" x2="265" y2="455" stroke={C.red} strokeWidth="1" strokeDasharray="5 3" markerEnd="url(#ah-red)" opacity="0.5" />

                {/* ── Databases ── */}
                <g>
                  <rect x="530" y="420" width="150" height="130" rx="8" fill={C.surface} stroke={C.border} />
                  <text x="546" y="440" fill={C.textMuted} fontSize="9" fontWeight="700" fontFamily="monospace">DATA STORES</text>
                  <text x="546" y="458" fill={C.green} fontSize="8.5" fontFamily="monospace">📀 kitchen_db (MySQL)</text>
                  <text x="546" y="474" fill={C.flame} fontSize="8.5" fontFamily="monospace">📀 order_db (MySQL)</text>
                  <text x="546" y="490" fill={C.purple} fontSize="8.5" fontFamily="monospace">📀 payment_db (MySQL)</text>
                  <text x="546" y="506" fill={C.blue} fontSize="8.5" fontFamily="monospace">📀 delivery_db (MySQL)</text>
                  <text x="546" y="522" fill={C.red} fontSize="8.5" fontFamily="monospace">📀 Redis (queue + TTL)</text>
                  <text x="546" y="538" fill={C.cyan} fontSize="8.5" fontFamily="monospace">📀 OutSystems DB</text>
                </g>

                {/* Legend */}
                <g transform="translate(40, 510)">
                  <text x="0" y="0" fill={C.textMuted} fontSize="8" fontWeight="700" fontFamily="monospace" letterSpacing="1">LEGEND</text>
                  <line x1="0" y1="14" x2="30" y2="14" stroke={C.green} strokeWidth="1.5" />
                  <text x="36" y="18" fill={C.textMuted} fontSize="8" fontFamily="monospace">REST (sync)</text>
                  <line x1="0" y1="30" x2="30" y2="30" stroke={C.blue} strokeWidth="1.5" strokeDasharray="5 3" />
                  <text x="36" y="34" fill={C.textMuted} fontSize="8" fontFamily="monospace">AMQP (async)</text>
                  <line x1="140" y1="14" x2="170" y2="14" stroke={C.flame} strokeWidth="1" strokeDasharray="6 4" />
                  <text x="176" y="18" fill={C.textMuted} fontSize="8" fontFamily="monospace">K8s Cluster</text>
                </g>
              </svg>
              <p style={{ fontSize: 9, color: C.textMuted, textAlign: "center", margin: "8px 0 0" }}>
                Click any service to inspect → endpoints, communication, and what it fixes from MrBeast Burger
              </p>
            </div>

            {/* Detail Panel */}
            {svc && (
              <div style={{
                flex: "0 0 320px", background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
                height: "fit-content", position: "sticky", top: 20,
                borderTop: `3px solid ${svc.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{svc.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: svc.color }}>{svc.name}</h3>
                </div>
                <p style={{ fontSize: 10, color: C.textMuted, margin: "0 0 12px" }}>{svc.sub}</p>
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, padding: "3px 8px", background: svc.glow, border: `1px solid ${svc.color}50`, borderRadius: 5, color: svc.color }}>{svc.lang}</span>
                  <span style={{ fontSize: 9, padding: "3px 8px", background: C.greenGlow, border: `1px solid ${C.green}50`, borderRadius: 5, color: C.green }}>{svc.store}</span>
                </div>
                <p style={{ fontSize: 11, color: C.textSoft, lineHeight: 1.65, marginBottom: 16 }}>{svc.desc}</p>
                <h4 style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontWeight: 800 }}>Endpoints / Channels</h4>
                {svc.endpoints.map((ep, i) => (
                  <div key={i} style={{
                    fontSize: 9.5, padding: "5px 8px", background: C.bg,
                    borderRadius: 4, marginBottom: 3, color: C.flame, fontFamily: "monospace",
                  }}>{ep}</div>
                ))}
                <div style={{
                  marginTop: 16, padding: "12px 14px", borderRadius: 8,
                  background: C.flameGlow, border: `1px solid ${C.flame}30`,
                }}>
                  <h4 style={{ fontSize: 9, color: C.flame, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 6px", fontWeight: 800 }}>
                    🔥 What This Fixes
                  </h4>
                  <p style={{ fontSize: 10, color: C.textSoft, lineHeight: 1.6, margin: 0 }}>{svc.fix}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ORDER FLOW ════ */}
        {tab === "flow" && (
          <div style={{ maxWidth: 780 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button onClick={() => { setShowRollback(false); setFlowStep(-1); }}
                style={{
                  padding: "9px 18px", fontSize: 11, fontFamily: "inherit", fontWeight: 700,
                  border: `1px solid ${!showRollback ? C.green : C.border}`, borderRadius: 8, cursor: "pointer",
                  background: !showRollback ? C.greenGlow : C.surface, color: !showRollback ? C.green : C.textMuted,
                }}>✓ Happy Path</button>
              <button onClick={() => { setShowRollback(true); setFlowStep(-1); }}
                style={{
                  padding: "9px 18px", fontSize: 11, fontFamily: "inherit", fontWeight: 700,
                  border: `1px solid ${showRollback ? C.red : C.border}`, borderRadius: 8, cursor: "pointer",
                  background: showRollback ? C.redGlow : C.surface, color: showRollback ? C.red : C.textMuted,
                }}>✗ Rollback (No Driver)</button>
            </div>

            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24,
            }}>
              <h3 style={{ margin: "0 0 18px", fontSize: 15, color: showRollback ? C.red : C.green, fontWeight: 800 }}>
                {showRollback ? "🔥 No Driver → Full Saga Rollback" : "✓ Successful Order Flow"}
              </h3>

              {(showRollback ? [...orderFlow.slice(0, 11), ...rollbackFlow] : orderFlow).map((step, i) => {
                const isActive = flowStep === -1 || i <= flowStep;
                const isCurrent = i === flowStep;
                const isCompensate = step.type === "compensate";
                const isFail = step.type === "fail";
                return (
                  <div key={i} className="flow-step" onClick={() => setFlowStep(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 14px", marginBottom: 3, borderRadius: 8,
                      cursor: "pointer", opacity: isActive ? 1 : 0.3,
                      background: isCurrent ? (isCompensate || isFail ? C.redGlow : C.flameGlow) : "transparent",
                      border: `1px solid ${isCurrent ? (isCompensate || isFail ? C.red : C.flame) : "transparent"}`,
                    }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 10,
                      fontWeight: 800, flexShrink: 0,
                      background: isActive ? (isCompensate ? C.red : isFail ? C.red : step.type === "amqp" ? C.blue : step.color) : C.card,
                      color: isActive ? C.bg : C.textMuted,
                    }}>{i + 1}</div>
                    <span style={{
                      fontSize: 8.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: C.bg, color: C.textMuted, width: 75, textAlign: "center",
                      flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>{step.svc}</span>
                    <span style={{
                      fontSize: 8, padding: "2px 6px", borderRadius: 3,
                      background: step.type === "amqp" ? C.blueGlow : step.type === "rest" ? C.greenGlow : step.type === "compensate" ? C.redGlow : C.flameGlow,
                      color: step.type === "amqp" ? C.blue : step.type === "rest" ? C.green : step.type === "compensate" ? C.red : C.flame,
                      fontWeight: 700, flexShrink: 0,
                    }}>{step.type === "amqp" ? "ASYNC" : step.type === "rest" ? "REST" : step.type === "compensate" ? "UNDO" : step.type === "saga" ? "SAGA" : step.type === "fail" ? "FAIL" : step.type === "wait" ? "WAIT" : ""}</span>
                    <span style={{ fontSize: 11.5, color: isActive ? C.text : C.textMuted }}>{step.label}</span>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button onClick={() => setFlowStep(f => Math.max(-1, f - 1))}
                  style={{ padding: "7px 18px", fontSize: 10, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", background: C.card, color: C.textMuted }}>
                  ← Prev
                </button>
                <button onClick={() => { const max = showRollback ? orderFlow.slice(0, 11).length + rollbackFlow.length - 1 : orderFlow.length - 1; setFlowStep(f => Math.min(max, f + 1)); }}
                  style={{ padding: "7px 18px", fontSize: 10, fontFamily: "inherit", border: `1px solid ${C.flame}`, borderRadius: 6, cursor: "pointer", background: C.flameGlow, color: C.flame }}>
                  Next →
                </button>
                <button onClick={() => setFlowStep(-1)}
                  style={{ padding: "7px 18px", fontSize: 10, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", background: C.card, color: C.textMuted }}>
                  Show All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ K8S SCALING ════ */}
        {tab === "scaling" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 16 }}>
            {[
              {
                title: "HPA — Auto-Scale on Viral Traffic",
                icon: "⚡", color: C.flame, target: "Order + Queue Services",
                desc: "MrBeast Burger crashed because servers couldn't handle 1M+ downloads. HPA monitors CPU and request volume — when a viral video drops and orders spike, pods auto-scale from 2 → 8. When traffic subsides, it scales back down.",
                yaml: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60`,
              },
              {
                title: "Queue Batch Release (CronJob)",
                icon: "🎫", color: C.red, target: "Queue Service → Kitchen routing",
                desc: "Kitchens got flooded with unlimited orders. The CronJob runs every 30s, checks each kitchen's current capacity, and releases the next batch of queued orders only to kitchens that can handle them. Full kitchens get zero new orders.",
                yaml: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: queue-batch-release
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: batch-worker
            image: beastburger/queue-worker:latest
            env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-creds
                  key: url
            - name: MAX_ORDERS_PER_KITCHEN
              value: "15"`,
              },
              {
                title: "Driver Timeout Checker",
                icon: "⏱", color: C.blue, target: "Delivery Assignment Service",
                desc: "Customers waited 2–3 hours for food that never came. Redis TTL tracks each driver assignment request. When the TTL expires (2 min), the CronJob publishes a timeout event to RabbitMQ, triggering the saga rollback (refund + release).",
                yaml: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: driver-timeout-checker
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: timeout-checker
            image: beastburger/timeout-worker:latest
            env:
            - name: DRIVER_TTL_SECONDS
              value: "120"
            - name: RABBITMQ_URL
              valueFrom:
                secretKeyRef:
                  name: broker-creds
                  key: rabbitmq_url`,
              },
              {
                title: "Liveness & Readiness Probes",
                icon: "💓", color: C.green, target: "All Services",
                desc: "If a kitchen service pod dies under heavy load, K8s detects it via liveness probe and auto-restarts. Readiness probe ensures traffic only routes to pods that are actually ready — no more orders sent to crashed services.",
                yaml: `livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 10`,
              },
              {
                title: "Secrets & ConfigMaps",
                icon: "🔐", color: C.purple, target: "Cluster-wide",
                desc: "No hardcoded credentials. DB passwords, Stripe API keys, and RabbitMQ URLs stored as K8s Secrets. Kitchen capacity limits, timeout values, and feature flags in ConfigMaps — change config without redeploying.",
                yaml: `apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  MYSQL_ROOT_PASSWORD: <base64>
  STRIPE_SECRET_KEY: <base64>
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: beast-config
data:
  DRIVER_TIMEOUT: "120"
  MAX_KITCHEN_QUEUE: "15"
  QUEUE_BATCH_SIZE: "10"`,
              },
              {
                title: "Docker Compose (Local Dev)",
                icon: "🐳", color: C.gold, target: "Development baseline",
                desc: "Docker Compose is the baseline (required by project). One command spins up all services locally. Kubernetes is the BTL upgrade — you demo Compose first, then show K8s with autoscaling as the production-ready improvement.",
                yaml: `version: '3.8'
services:
  order-service:
    build: ./services/order
    ports: ["5001:5000"]
    depends_on: [rabbitmq, mysql]
  kitchen-service:
    build: ./services/kitchen
    ports: ["5002:5000"]
  queue-service:
    build: ./services/queue
    ports: ["5003:8080"]
    depends_on: [redis]
  delivery-service:
    build: ./services/delivery
    ports: ["5004:8080"]
    depends_on: [rabbitmq, redis]
  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672","15672:15672"]
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]`,
              },
            ].map((item, i) => (
              <div key={i} className="card-hover" style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: 20, borderTop: `3px solid ${item.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: item.color }}>{item.title}</h3>
                </div>
                <span style={{
                  fontSize: 8.5, padding: "2px 8px", borderRadius: 4,
                  background: `${item.color}15`, border: `1px solid ${item.color}40`,
                  color: item.color, fontWeight: 700, display: "inline-block", marginBottom: 10,
                }}>{item.target}</span>
                <p style={{ fontSize: 10.5, color: C.textSoft, lineHeight: 1.65, marginBottom: 14 }}>{item.desc}</p>
                <pre style={{
                  fontSize: 9, background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: 12, overflow: "auto", color: C.textMuted,
                  lineHeight: 1.5, margin: 0, maxHeight: 240,
                }}>{item.yaml}</pre>
              </div>
            ))}
          </div>
        )}

        {/* ════ FAILURES ════ */}
        {tab === "failures" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "20px 24px", marginBottom: 20,
            }}>
              <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.7, margin: 0 }}>
                MrBeast Burger crashed on launch day, flooded kitchens with unlimited orders, left customers waiting 2–3 hours,
                and had no rollback mechanism for failed orders. Here's every failure mapped to how Beast Burger v2.0 fixes it.
              </p>
            </div>
            {failures.map((f, i) => (
              <div key={i} className={`card-hover severity-${f.severity}`}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "18px 20px", marginBottom: 10,
                  animation: `slideUp 0.4s ease ${i * 0.08}s both`,
                }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text }}>{f.problem}</h4>
                      <span style={{
                        fontSize: 8, padding: "2px 8px", borderRadius: 4, fontWeight: 800,
                        textTransform: "uppercase", letterSpacing: "1px",
                        background: f.severity === "critical" ? C.redGlow : f.severity === "high" ? C.flameGlow : C.goldGlow,
                        color: f.severity === "critical" ? C.red : f.severity === "high" ? C.flame : C.gold,
                        border: `1px solid ${f.severity === "critical" ? C.red : f.severity === "high" ? C.flame : C.gold}40`,
                      }}>{f.severity}</span>
                    </div>
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10,
                    }}>
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: C.redGlow, border: `1px solid ${C.red}20` }}>
                        <div style={{ fontSize: 8, fontWeight: 800, color: C.red, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>❌ What happened</div>
                        <p style={{ fontSize: 10.5, color: C.textSoft, lineHeight: 1.5, margin: 0 }}>{f.what}</p>
                      </div>
                      <div style={{ padding: "10px 12px", borderRadius: 8, background: C.greenGlow, border: `1px solid ${C.green}20` }}>
                        <div style={{ fontSize: 8, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>✓ How v2.0 fixes it</div>
                        <p style={{ fontSize: 10.5, color: C.textSoft, lineHeight: 1.5, margin: 0 }}>{f.fix}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ TECH STACK ════ */}
        {tab === "stack" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {[
              {
                cat: "Core Services", color: C.flame, items: [
                  { name: "Order Orchestrator", tech: "Python / Flask", note: "Saga pattern controller" },
                  { name: "Kitchen Assignment", tech: "Python / Flask", note: "Capacity-aware routing + Redis" },
                  { name: "Payment Service", tech: "Python / Flask", note: "Stripe sandbox integration" },
                  { name: "Order Queue", tech: "Go (Golang)", note: "Redis sorted sets, high throughput" },
                  { name: "Delivery Assignment", tech: "Go (Golang)", note: "Async via RabbitMQ, Redis TTL" },
                ],
              },
              {
                cat: "OutSystems (Reusable)", color: C.cyan, items: [
                  { name: "Menu / Product Service", tech: "OutSystems", note: "Reused by frontend + Order + Kitchen" },
                  { name: "Notification Service", tech: "Flask + OutSystems", note: "SSE live updates + RabbitMQ consumer" },
                ],
              },
              {
                cat: "Infrastructure", color: C.green, items: [
                  { name: "Message Broker", tech: "RabbitMQ", note: "Delivery assignment + notifications" },
                  { name: "Databases", tech: "MySQL 8.0", note: "One DB per service (isolation)" },
                  { name: "Cache / Queue / TTL", tech: "Redis 7", note: "Order queue + driver timeout" },
                  { name: "API Gateway", tech: "KONG", note: "Rate limiting + routing + auth" },
                ],
              },
              {
                cat: "Deployment", color: C.gold, items: [
                  { name: "Containers", tech: "Docker", note: "One Dockerfile per service" },
                  { name: "Local Dev", tech: "Docker Compose", note: "Required baseline" },
                  { name: "Production", tech: "Kubernetes (k3s)", note: "BTL — HPA, CronJobs, probes" },
                  { name: "Ingress", tech: "KONG Ingress", note: "Single K8s entry point" },
                ],
              },
              {
                cat: "Frontend", color: C.purple, items: [
                  { name: "Customer App", tech: "Vue.js / React", note: "Team's choice" },
                  { name: "Live Updates", tech: "SSE / WebSocket", note: "Queue position + order status" },
                  { name: "Data Format", tech: "JSON", note: "All APIs use JSON" },
                ],
              },
              {
                cat: "Beyond-The-Labs (BTL)", color: C.red, items: [
                  { name: "Kubernetes", tech: "k3s / Minikube", note: "HPA, CronJobs, Secrets, probes" },
                  { name: "Go Microservices", tech: "Golang", note: "Queue + Delivery (concurrency)" },
                  { name: "Redis", tech: "Redis 7", note: "Sorted sets + TTL (not in labs)" },
                  { name: "Saga Orchestration", tech: "Custom pattern", note: "Compensating transactions" },
                  { name: "SSE / WebSocket", tech: "Real-time push", note: "Live queue + order updates" },
                ],
              },
            ].map((g, i) => (
              <div key={i} className="card-hover" style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: 20, borderLeft: `3px solid ${g.color}`,
              }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 12.5, fontWeight: 800, color: g.color }}>{g.cat}</h3>
                {g.items.map((item, j) => (
                  <div key={j} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "8px 0",
                    borderBottom: j < g.items.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{item.name}</div>
                      <div style={{ fontSize: 8.5, color: C.textMuted, marginTop: 2 }}>{item.note}</div>
                    </div>
                    <span style={{
                      fontSize: 9, padding: "3px 8px", background: C.bg, borderRadius: 4,
                      color: g.color, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8,
                    }}>{item.tech}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
