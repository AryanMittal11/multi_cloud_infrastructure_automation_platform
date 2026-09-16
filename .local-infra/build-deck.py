#!/usr/bin/env python
"""cloudweave — supervisor deck. Dark monochrome theme matching the product."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
import copy

# ---------- theme ----------
BG      = RGBColor(0x0A, 0x0A, 0x0A)   # canvas
SURFACE = RGBColor(0x14, 0x14, 0x14)   # card
SURFACE2= RGBColor(0x1C, 0x1C, 0x1C)
BORDER  = RGBColor(0x2A, 0x2A, 0x2A)
INK     = RGBColor(0xFA, 0xFA, 0xFA)
MUTED   = RGBColor(0xA3, 0xA3, 0xA8)
FAINT   = RGBColor(0x6B, 0x6B, 0x72)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
GREEN   = RGBColor(0x4A, 0xD9, 0x8A)   # semantic success only
AMBER   = RGBColor(0xE8, 0xB4, 0x4A)

FONT = "Inter"
MONO = "Consolas"

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
SW, SH = prs.slide_width, prs.slide_height

def slide():
    s = prs.slides.add_slide(BLANK)
    r = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    r.fill.solid(); r.fill.fore_color.rgb = BG
    r.line.fill.background()
    r.shadow.inherit = False
    return s

def box(s, x, y, w, h, fill=SURFACE, line=BORDER, radius=None):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    try:
        if radius is not None:
            shp.adjustments[0] = radius
    except Exception:
        pass
    if fill is None:
        shp.fill.background()
    else:
        shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(1)
    shp.shadow.inherit = False
    return shp

def txt(s, x, y, w, h, runs, size=14, color=INK, bold=False, font=FONT,
        align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.0, space_after=4):
    """runs: str | list[str] (paragraphs) | list[list[(text, dict)]] rich"""
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    if isinstance(runs, str):
        runs = [runs]
    first = True
    for para in runs:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.line_spacing = spacing
        p.space_after = Pt(space_after)
        if isinstance(para, str):
            para = [(para, {})]
        for text, style in para:
            r = p.add_run(); r.text = text
            r.font.size = Pt(style.get("size", size))
            r.font.bold = style.get("bold", bold)
            r.font.name = style.get("font", font)
            r.font.color.rgb = style.get("color", color)
    return tb

def logo(s, x, y, size=0.30, dark=False):
    """brand mark: rounded square + open C arc + dot, drawn with shapes"""
    m = box(s, x, y, Inches(size), Inches(size), fill=WHITE if not dark else RGBColor(0x0A,0x0A,0x0A),
            line=None, radius=0.24)
    # arc approximated by block arc is heavy; use a text glyph inside
    c = "\u25D4"  # circle with upper right dark — not right; use custom draw below
    # simpler: draw 'C' arc using ARC shape
    return m

def brand(s, x, y, scale=1.0, wordmark=True):
    """white rounded square with a dark open-ring glyph + wordmark"""
    side = Inches(0.34 * scale)
    m = box(s, x, y, side, side, fill=WHITE, line=None, radius=0.26)
    # open ring: use an oval outline with a gap — approximate with '◔'-style: draw full ring + small bg notch
    ring = s.shapes.add_shape(MSO_SHAPE.DONUT, x + Inches(0.075*scale), y + Inches(0.075*scale),
                              Inches(0.19*scale), Inches(0.19*scale))
    ring.adjustments[0] = 0.30
    ring.fill.solid(); ring.fill.fore_color.rgb = RGBColor(0x0A, 0x0A, 0x0A)
    ring.line.fill.background(); ring.shadow.inherit = False
    # notch to open the ring (bg-colored small rect over upper-right)
    notch = box(s, x + Inches(0.205*scale), y + Inches(0.075*scale), Inches(0.075*scale), Inches(0.075*scale),
                fill=WHITE, line=None)
    notch.rotation = 0
    # center dot
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.128*scale), y + Inches(0.128*scale),
                             Inches(0.084*scale), Inches(0.084*scale))
    dot.fill.solid(); dot.fill.fore_color.rgb = RGBColor(0x0A, 0x0A, 0x0A)
    dot.line.fill.background(); dot.shadow.inherit = False
    if wordmark:
        txt(s, x + side + Inches(0.12*scale), y - Inches(0.02*scale), Inches(2.6*scale), side,
            [[("cloudweave", {"size": int(15*scale), "bold": True})]],
            anchor=MSO_ANCHOR.MIDDLE)
    return m

def eyebrow(s, x, y, text):
    w = Inches(2.6)
    e = box(s, x, y, w, Inches(0.30), fill=SURFACE2, line=BORDER, radius=0.5)
    tf = e.text_frame; tf.word_wrap = False
    tf.margin_left = tf.margin_right = Inches(0.08); tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.size = Pt(9.5); r.font.bold = True; r.font.name = MONO
    r.font.color.rgb = MUTED
    return e

def footer(s, n):
    brand(s, Inches(0.55), Inches(7.02), scale=0.62, wordmark=False)
    txt(s, Inches(1.05), Inches(7.06), Inches(4), Inches(0.3),
        [[("cloudweave", {"size": 9, "bold": True, "color": FAINT})]],
        anchor=MSO_ANCHOR.MIDDLE)
    txt(s, Inches(11.8), Inches(7.06), Inches(1.0), Inches(0.3),
        [[(f"{n:02d}", {"size": 9, "font": MONO, "color": FAINT})]],
        align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)

def h1(s, text, y=Inches(0.62), x=Inches(1.18), w=Inches(11.55)):
    txt(s, x, y, w, Inches(0.75),
        [[(text, {"size": 30, "bold": True})]])

def chip(s, x, y, text, color=MUTED, fill=SURFACE2, border=BORDER, mono=True, bold=True, size=9.5):
    est = Inches(0.095 * len(text) * size / 10 + 0.28)
    c = box(s, x, y, est, Inches(0.28), fill=fill, line=border, radius=0.5)
    tf = c.text_frame; tf.word_wrap = False
    tf.margin_left = tf.margin_right = Inches(0.07); tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = MONO if mono else FONT
    r.font.color.rgb = color
    return est

# ============================================================
# 01 · TITLE
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0)

# status chip row
chip(s, Inches(9.6), Inches(0.55), "●  LIVE DEMO READY", color=GREEN, fill=SURFACE, border=BORDER)

txt(s, Inches(0.55), Inches(2.02), Inches(11.0), Inches(1.9),
    ["A centralized multi-cloud provisioning",
     "and management engine"],
    size=40, bold=True, spacing=1.04)
txt(s, Inches(0.55), Inches(3.62), Inches(9.2), Inches(0.85),
    [[("cloudweave", {"bold": True, "color": INK}),
      ("  turns AWS, Azure, and GCP into one governed control plane — design visually, ", {"color": MUTED}),
      ("plan with policy guardrails, approve with receipts, operate with full memory.", {"color": MUTED})]],
    size=14, spacing=1.25)

# flow strip
steps = ["design", "plan", "policy", "approve", "apply", "operate"]
x = Inches(0.55)
for i, st in enumerate(steps):
    w = chip(s, x, Inches(4.62), st, color=INK if i in (0,5) else MUTED)
    x = x + w + Inches(0.28)
    if i < len(steps) - 1:
        txt(s, x, Inches(4.60), Inches(0.25), Inches(0.3),
            [[("→", {"color": FAINT, "size": 12})]], anchor=MSO_ANCHOR.MIDDLE)
        x = x + Inches(0.30)

# team card
tc = box(s, Inches(0.55), Inches(5.42), Inches(12.23), Inches(1.42), fill=SURFACE, line=BORDER, radius=0.10)
txt(s, Inches(0.85), Inches(5.62), Inches(3.0), Inches(0.3),
    [[("GROUP NO. 2", {"size": 10, "bold": True, "font": MONO, "color": MUTED})]])
txt(s, Inches(0.85), Inches(5.98), Inches(11.6), Inches(0.75),
    [[("Vidhan Gupta ", {"bold": True}), ("23BSA10043", {"font": MONO, "color": FAINT, "size": 11}),
      ("    ·    Aryan ", {"bold": True}), ("23BSA10041", {"font": MONO, "color": FAINT, "size": 11}),
      ("    ·    Anshul Bari ", {"bold": True}), ("23BSA10011", {"font": MONO, "color": FAINT, "size": 11}),
      ("    ·    Nikhil Kumar ", {"bold": True}), ("23BSA10196", {"font": MONO, "color": FAINT, "size": 11}),
      ("    ·    Manas Awasthi ", {"bold": True}), ("23BSA10061", {"font": MONO, "color": FAINT, "size": 11})]],
    size=13)
footer(s, 1)

# ============================================================
# 02 · PROBLEM
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "The problem: multi-cloud is three jobs, not one")
eyebrow(s, Inches(1.18), Inches(1.42), "WHY TEAMS STRUGGLE")

cards = [
    ("01", "Fragmented consoles", "AWS, Azure, GCP: three IAM models, three billing formats, zero shared memory of what runs where."),
    ("02", "Terraform bottleneck", "Correct HCL, state, and provider pinning is expert work. Everyone else waits — or makes risky console clicks."),
    ("03", "Ungoverned change", "Anyone with console access can delete a database. No plan review, no approval, no record of who did what."),
    ("04", "Cost after the fact", "Spend surfaces at month end, per provider, after decisions are locked. Nothing prices a change before apply."),
    ("05", "No operational memory", "Nobody knows what depends on what. Deleting \u201can idle VM\u201d can silently kill a database network path."),
]
cw, gap = Inches(2.36), Inches(0.105)
x = Inches(0.55)
for num, title, body in cards:
    c = box(s, x, Inches(2.0), cw, Inches(3.5), fill=SURFACE, line=BORDER, radius=0.07)
    txt(s, x + Inches(0.22), Inches(2.24), cw - Inches(0.44), Inches(0.4),
        [[(num, {"size": 13, "font": MONO, "color": FAINT, "bold": True})]])
    txt(s, x + Inches(0.22), Inches(2.72), cw - Inches(0.44), Inches(0.75),
        [[(title, {"size": 13.5, "bold": True})]], spacing=1.05)
    txt(s, x + Inches(0.22), Inches(3.5), cw - Inches(0.44), Inches(1.85),
        [[(body, {"size": 10.5, "color": MUTED})]], spacing=1.18)
    x += cw + gap

# bottom line
bl = box(s, Inches(0.55), Inches(5.85), Inches(12.23), Inches(0.85), fill=SURFACE2, line=BORDER, radius=0.12)
txt(s, Inches(0.85), Inches(5.85), Inches(11.7), Inches(0.85),
    [[("Existing tools each solve one slice — dashboards view, pipelines expert-only, CSPMs audit, FinOps cost. ", {"color": MUTED}),
      ("None give a small team one governed path from intent to running infrastructure.", {"bold": True, "color": INK})]],
    size=12.5, anchor=MSO_ANCHOR.MIDDLE, spacing=1.2)
footer(s, 2)

# ============================================================
# 03 · SOLUTION
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "The solution: one governed pipeline")
eyebrow(s, Inches(1.18), Inches(1.42), "INTENT → RUNNING INFRASTRUCTURE")

# pipeline band
stages = [("Design", "canvas or template"), ("Configure", "schema-validated"), ("Plan", "diff + cost"),
          ("Policy", "guardrail verdicts"), ("Approve", "named receipt"), ("Apply", "resources recorded"),
          ("Operate", "inventory·topo·cost")]
bw = Inches(1.62); gp = Inches(0.135); x = Inches(0.55)
for i, (t, d) in enumerate(stages):
    c = box(s, x, Inches(2.0), bw, Inches(1.06), fill=WHITE if i == 0 else SURFACE,
            line=None if i == 0 else BORDER, radius=0.12)
    txt(s, x + Inches(0.12), Inches(2.14), bw - Inches(0.24), Inches(0.35),
        [[(t, {"size": 12.5, "bold": True, "color": BG if i == 0 else INK})]], align=PP_ALIGN.CENTER)
    txt(s, x + Inches(0.08), Inches(2.52), bw - Inches(0.16), Inches(0.45),
        [[(d, {"size": 8.5, "font": MONO, "color": MUTED if i != 0 else RGBColor(0x55,0x55,0x5A)})]],
        align=PP_ALIGN.CENTER)
    x += bw + gp
    if i < len(stages) - 1:
        txt(s, x - Inches(0.16), Inches(2.34), Inches(0.2), Inches(0.3),
            [[("→", {"color": FAINT, "size": 11})]], anchor=MSO_ANCHOR.MIDDLE)

pillars = [
    ("One control plane", "Projects & environments span three clouds. One identity, one RBAC model, one audit trail, one cost view."),
    ("Paved-road IaC", "Hardened templates + visual designer generate Terraform. Teams configure; modules carry the security defaults."),
    ("Governed change", "Plan-before-apply is mandatory. Policy runs first. Named approvals create receipts. Destructive verbs need typed confirmation."),
    ("Cost before the bill", "Every plan carries a monthly estimate. A rule-based advisor projects savings with concrete steps."),
    ("Operational memory", "Resources, dependency topology, and history recorded at apply time — blast radius visible before change."),
]
y = Inches(3.42)
for t, d in pillars:
    dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.63), y + Inches(0.09), Inches(0.07), Inches(0.07))
    dot.fill.solid(); dot.fill.fore_color.rgb = WHITE; dot.line.fill.background(); dot.shadow.inherit = False
    txt(s, Inches(0.88), y, Inches(3.1), Inches(0.4), [[(t, {"size": 12.5, "bold": True})]])
    txt(s, Inches(4.05), y, Inches(8.7), Inches(0.62), [[(d, {"size": 11, "color": MUTED})]], spacing=1.12)
    y += Inches(0.68)
footer(s, 3)

# ============================================================
# 04 · MVP OVERVIEW
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Five MVPs — one chain of custody")
eyebrow(s, Inches(1.18), Inches(1.42), "WHAT WE BUILT")

mvps = [
    ("MVP 1", "Multi-cloud governance backbone", "Accounts · projects · environments · RBAC", "Credentials encrypted & live-validated; dev/staging/prod each bound to its own account; ADMIN / DEVELOPER / VIEWER enforced at every route."),
    ("MVP 2", "Curated template catalog", "12 hardened Terraform modules", "4 per provider with JSON-Schema contracts. Guardrails inside: private-by-default DBs, encrypted storage, deny-by-default SGs."),
    ("MVP 3", "Visual designer → Terraform", "canvas writes production main.tf", "Place nodes, wire dependencies; diagram and generated HCL never diverge. Designs save as reusable artifacts."),
    ("MVP 4", "Governed pipeline", "plan → policy → approve → apply", "Isolated worker runs terraform plan; guardrails check encryption/exposure/CIDRs; named approver signs; apply records every resource."),
    ("MVP 5", "Operate surface", "inventory · topology · costs", "Every apply records resources cross-cloud; dependency graph shows blast radius; rate-card cost estimates + rule-based optimization advisor."),
]
y = Inches(1.95)
for tag, t, mono_sub, d in mvps:
    c = box(s, Inches(0.55), y, Inches(12.23), Inches(0.88), fill=SURFACE, line=BORDER, radius=0.10)
    tag_w = chip(s, Inches(0.78), y + Inches(0.28), tag, color=INK, fill=SURFACE2)
    txt(s, Inches(2.05), y + Inches(0.12), Inches(4.3), Inches(0.64),
        [[(t, {"size": 13, "bold": True})], [(mono_sub, {"size": 9.5, "font": MONO, "color": FAINT})]], spacing=1.05)
    txt(s, Inches(6.5), y + Inches(0.08), Inches(6.05), Inches(0.72),
        [[(d, {"size": 10, "color": MUTED})]], spacing=1.12, anchor=MSO_ANCHOR.MIDDLE)
    y += Inches(0.99)
footer(s, 4)

# ============================================================
# 05–09 · MVP DETAILS
# ============================================================
def mvp_slide(n, tag, title, subtitle, points, demo, chip_text, page):
    s = slide()
    brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
    chip(s, Inches(11.05), Inches(0.58), tag, color=INK, fill=SURFACE2)
    h1(s, title)
    txt(s, Inches(0.55), Inches(1.34), Inches(11.5), Inches(0.4),
        [[(subtitle, {"font": MONO, "color": MUTED, "size": 12})]])
    y = Inches(2.05)
    for head, body in points:
        dot = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.63), y + Inches(0.10), Inches(0.07), Inches(0.07))
        dot.fill.solid(); dot.fill.fore_color.rgb = WHITE; dot.line.fill.background(); dot.shadow.inherit = False
        txt(s, Inches(0.88), y, Inches(3.0), Inches(0.4), [[(head, {"size": 12.5, "bold": True})]])
        txt(s, Inches(3.95), y, Inches(8.8), Inches(0.75), [[(body, {"size": 11, "color": MUTED})]], spacing=1.14)
        y += Inches(0.72)
    # demo strip
    d = box(s, Inches(0.55), Inches(5.55), Inches(12.23), Inches(1.1), fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, Inches(0.85), Inches(5.72), Inches(2.2), Inches(0.3),
        [[("LIVE DEMO PATH", {"size": 9.5, "bold": True, "font": MONO, "color": GREEN})]])
    txt(s, Inches(0.85), Inches(6.02), Inches(11.6), Inches(0.55),
        [[(demo, {"size": 11.5, "color": INK})]], spacing=1.15)
    footer(s, page)

mvp_slide(1, "MVP 1", "Multi-cloud governance backbone",
    "accounts · projects · environments · RBAC",
    [("Sealed credentials", "AES-256-GCM at rest; validated live at onboarding via AWS STS / Azure ARM / GCP Resource Manager. The API never returns secrets."),
     ("Workspace isolation", "Projects carry dev / staging / production environments, each bound to its own cloud account — paved roads, not shared credentials."),
     ("Role-gated everywhere", "ADMIN governs accounts, DEVELOPER ships infrastructure, VIEWER reads — enforced at route level, tested in the suite.")],
    "Sign up → onboard a cloud account (validation fires) → create project + 3 environments → open a second browser as VIEWER and watch actions get refused.",
    "one identity plane across three clouds", 5)

mvp_slide(2, "MVP 2", "Curated template catalog",
    "12 production-grade Terraform modules · schema contracts",
    [("Hardened by default", "4 modules per provider — VPC/VNet, compute, database, storage. Databases private-by-default, storage encrypted, security groups deny-by-default."),
     ("Schema-driven config", "Each module ships a JSON-Schema contract; the UI generates typed forms from it. Invalid configurations are rejected before plan."),
     ("Synced from disk", "Modules live in the repo, sync into the catalog on demand — versioned, reviewable, extensible without touching product code.")],
    "Template Catalog → Inspect Schema on AWS EC2 Web Server → see 3 typed parameters with safe defaults → Launch into the wizard.",
    "paved roads, not blank pages", 6)

mvp_slide(3, "MVP 3", "Visual designer → Terraform",
    "the diagram and the main.tf never diverge",
    [("Draw what you mean", "Place network, compute, database, storage nodes on a live canvas; every wire is a real Terraform dependency edge."),
     ("HCL in real time", "The code panel regenerates production-ready main.tf as you edit — what you see is literally what will plan."),
     ("Reusable artifacts", "Designs save as named artifacts and hand off to the deployment pipeline in one click — no copy-paste bridge.")],
    "Saved Designs → open designer → drop VPC + EC2 + RDS → wire network→compute→database → watch main.tf update live → Save.",
    "visual intent compiles to IaC", 7)

mvp_slide(4, "MVP 4", "Governed pipeline with policy + approvals",
    "terraform plan · guardrails · named approval · apply",
    [("Plan in isolation", "The worker runs terraform plan in a sandboxed runner — the UI never touches cloud APIs or credentials."),
     ("Policy before humans", "A guardrail engine checks encryption, public exposure, and CIDR allowlists, and attaches verdicts to the diff for review."),
     ("Receipts, not vibes", "A named approver signs exactly what will change; approvals land in the audit log. Destructive plans demand typed confirmation.")],
    "Launch AWS EC2 Web Server → configure → plan shows diff + cost + policy results → approve (recorded) → apply → resources appear in inventory.",
    "no change without a plan, verdict, and receipt", 8)

mvp_slide(5, "MVP 5", "Operate surface: inventory, topology, costs",
    "recorded resources · dependency graph · cost advisor",
    [("Truthful inventory", "Every apply records provisioned resources grouped by kind, linked to deployments, searchable across clouds. Teardown flips them to DESTROYED."),
     ("Topology = blast radius", "A live dependency graph (network → compute → database) shows what a change or teardown would touch before you commit."),
     ("Cost before the bill", "Offline rate card prices every plan; an advisor flags idle sandboxes, oversized volumes, non-prod redundancy, region arbitrage — with projected savings.")],
    "Resources → Topology → Costs: $78.40/mo current, advisor projects $36.45/mo (−54%) with concrete steps per recommendation.",
    "the platform observes what it provisions", 9)

# ============================================================
# 10 · ARCHITECTURE
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Under the hood")
eyebrow(s, Inches(1.18), Inches(1.42), "ARCHITECTURE IN ONE SLIDE")

layers = [
    ("Frontend", "Next.js 15 · TypeScript · Tailwind — dark monochrome control plane, landing + platform app", "browser tab shows the brand icon"),
    ("API", "Express · JWT (15m/7d rotation) · RBAC · Zod validation on every route", "13 route modules"),
    ("Data", "PostgreSQL + Prisma — 10 models from users to audit logs", "AES-256-GCM credential vault"),
    ("Worker", "Terraform pipeline: PLAN → POLICY → APPROVAL → APPLY/DESTROY · sandboxed simulation runner", "in-process queue"),
    ("Templates", "12 canonical modules (4/provider) synced to catalog with JSON-Schema contracts", "git-versioned"),
]
y = Inches(2.0)
for name, desc, meta in layers:
    c = box(s, Inches(0.55), y, Inches(12.23), Inches(0.78), fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, Inches(0.85), y, Inches(1.85), Inches(0.78), [[(name, {"size": 12.5, "bold": True})]], anchor=MSO_ANCHOR.MIDDLE)
    txt(s, Inches(2.8), y, Inches(7.6), Inches(0.78), [[(desc, {"size": 10.5, "color": MUTED})]], anchor=MSO_ANCHOR.MIDDLE, spacing=1.1)
    txt(s, Inches(10.55), y, Inches(2.05), Inches(0.78), [[(meta, {"size": 9, "font": MONO, "color": FAINT})]],
        align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
    y += Inches(0.88)

chip(s, Inches(0.55), Inches(6.55), "249/249 backend tests passing", color=GREEN)
chip(s, Inches(4.4), Inches(6.55), "frontend tsc + production build clean", color=INK)
chip(s, Inches(9.7), Inches(6.55), "live e2e walkthrough verified", color=INK)
footer(s, 10)

# ============================================================
# 11 · EXTRAS
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Beyond the MVPs")
eyebrow(s, Inches(1.18), Inches(1.42), "EXTRAS THAT MAKE IT A PRODUCT")

extras = [
    ("Immutable audit log", "Append-only; actor + verb + target on every action, incl. policy verdicts and approvals."),
    ("Typed destruction", "Destructive ops require typed confirmation; teardown keeps inventory & cost truthful."),
    ("Cost optimization advisor", "4 deterministic rules with steps and projected savings — explainable, testable."),
    ("Command palette", "Ctrl+K navigation across every platform section; keyboard-first operations."),
    ("Notifications", "In-app alerts on approval requests and pipeline outcomes."),
    ("Portability export", "Export designs and deployments as portable Terraform — no lock-in."),
    ("Brand system", "Dark monochrome language, custom SVG favicon, landing page mirroring the real product."),
    ("Test discipline", "249 backend tests: unit + route + worker + policy + crypto + template sync."),
]
y0, x0 = Inches(2.05), Inches(0.55)
cw2, ch2 = Inches(6.0), Inches(1.06)
for i, (t, d) in enumerate(extras):
    col, row = i % 2, i // 2
    x = x0 + col * (cw2 + Inches(0.23))
    y = y0 + row * (ch2 + Inches(0.14))
    c = box(s, x, y, cw2, ch2, fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, x + Inches(0.24), y + Inches(0.14), cw2 - Inches(0.48), Inches(0.32), [[(t, {"size": 12, "bold": True})]])
    txt(s, x + Inches(0.24), y + Inches(0.5), cw2 - Inches(0.48), Inches(0.52), [[(d, {"size": 9.8, "color": MUTED})]], spacing=1.1)
footer(s, 11)

# ============================================================
# 12 · CLOSING
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0)
txt(s, Inches(0.55), Inches(2.35), Inches(12.2), Inches(1.6),
    ["Make the safe path", "the easy path."],
    size=40, bold=True, spacing=1.05)
txt(s, Inches(0.55), Inches(4.1), Inches(10.5), Inches(1.0),
    [[("Five MVPs prove the chain: ", {"color": MUTED}),
      ("govern → template → design → pipeline → operate.", {"bold": True, "color": INK}),
      ("  Multi-cloud stops being three consoles and becomes one product.", {"color": MUTED})]],
    size=15, spacing=1.3)
x = Inches(0.55)
for t in ["Thank you", "Questions welcome"]:
    w = chip(s, x, Inches(5.35), t, color=INK if t == "Thank you" else MUTED)
    x += w + Inches(0.3)
footer(s, 12)

prs.save("docs/cloudweave-supervisor-deck.pptx")
print("saved docs/cloudweave-supervisor-deck.pptx —", len(prs.slides.slides if hasattr(prs.slides,'slides') else prs.slides._sldIdLst), "slides")
