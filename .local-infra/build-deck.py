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
# 10 · TECHNICAL ARCHITECTURE  (layered diagram)
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Technical architecture")
eyebrow(s, Inches(1.18), Inches(1.42), "FIVE LAYERS · ONE GOVERNED PATH")

# ---- row 1: request path, left → right ----
ARROW_W = Inches(0.32)
row1_y, row1_h = Inches(2.0), Inches(1.15)
bw1 = Inches(2.19)
r1 = [
    ("Client layer", "browser · Next.js 15 dashboard"),
    ("Control plane", "Express API · JWT · RBAC · Zod"),
    ("Platform services", "templates · policy · cost · designs"),
    ("Async execution", "job queue → terraform worker · isolated workspace"),
    ("IaC engine", "terraform plan · apply · destroy · 12 modules"),
]
x = Inches(0.55)
for i, (t, d) in enumerate(r1):
    box(s, x, row1_y, bw1, row1_h, fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, x + Inches(0.14), row1_y + Inches(0.12), bw1 - Inches(0.28), Inches(0.3),
        [[(t, {"size": 11.5, "bold": True})]])
    txt(s, x + Inches(0.14), row1_y + Inches(0.46), bw1 - Inches(0.28), Inches(0.6),
        [[(d, {"size": 8, "font": MONO, "color": MUTED})]], spacing=1.15)
    x += bw1
    if i < len(r1) - 1:
        txt(s, x, Inches(2.42), ARROW_W, Inches(0.3), [[("\u2192", {"color": FAINT, "size": 12})]],
            align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        x += ARROW_W

# ---- vertical drops: control plane → data layer, iac → clouds ----
txt(s, Inches(2.45), Inches(3.18), Inches(1.05), Inches(0.32),
    [[("prisma", {"font": MONO, "color": FAINT, "size": 8})]], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
txt(s, Inches(3.55), Inches(3.18), Inches(0.5), Inches(0.32),
    [[("\u2193", {"color": FAINT, "size": 12})]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
txt(s, Inches(10.3), Inches(3.18), Inches(1.1), Inches(0.32),
    [[("provider api", {"font": MONO, "color": FAINT, "size": 8})]], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)
txt(s, Inches(11.5), Inches(3.18), Inches(0.5), Inches(0.32),
    [[("\u2193", {"color": FAINT, "size": 12})]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)

# ---- row 2: data layer + managed clouds ----
row2_y, row2_h = Inches(3.55), Inches(1.35)
box(s, Inches(0.55), row2_y, Inches(3.6), row2_h, fill=SURFACE, line=BORDER, radius=0.10)
txt(s, Inches(0.75), row2_y + Inches(0.12), Inches(3.2), Inches(0.3), [[("Data layer", {"size": 12, "bold": True})]])
txt(s, Inches(0.75), row2_y + Inches(0.46), Inches(3.2), Inches(0.55),
    [[("PostgreSQL + Prisma — users · projects · environments · deployments · resources · audit logs", {"size": 9, "color": MUTED})]], spacing=1.12)
txt(s, Inches(0.75), row2_y + Inches(1.04), Inches(3.2), Inches(0.25),
    [[("AES-256-GCM credential vault", {"size": 8, "font": MONO, "color": FAINT})]])

box(s, Inches(4.4), row2_y, Inches(8.38), row2_h, fill=SURFACE2, line=BORDER, radius=0.08)
txt(s, Inches(4.62), row2_y + Inches(0.1), Inches(6.0), Inches(0.28),
    [[("Managed cloud infrastructure", {"size": 11, "bold": True})]])
providers = [("AWS", "VPC · EC2 · RDS · S3"), ("Azure", "VNet · VMs · Blob Storage"), ("GCP", "VPC · Compute Engine · SQL")]
px = Inches(4.62)
for name, items in providers:
    box(s, px, row2_y + Inches(0.44), Inches(2.5), Inches(0.72), fill=SURFACE, line=BORDER, radius=0.12)
    txt(s, px + Inches(0.14), row2_y + Inches(0.52), Inches(2.2), Inches(0.26), [[(name, {"size": 10, "bold": True})]])
    txt(s, px + Inches(0.14), row2_y + Inches(0.8), Inches(2.2), Inches(0.3),
        [[(items, {"size": 7.5, "font": MONO, "color": MUTED})]])
    px += Inches(2.74)

# ---- feedback loop caption ----
txt(s, Inches(0.55), Inches(4.98), Inches(12.23), Inches(0.22),
    [[("outputs \u2192 recorded inventory \u2192 topology & cost rollups \u2192 audit trail", {"size": 8.5, "font": MONO, "color": FAINT})]],
    align=PP_ALIGN.CENTER)

# ---- row 3: what the platform records ----
r3 = [
    ("Resource inventory", "every apply records resources cross-cloud; teardown flips them to DESTROYED"),
    ("Topology & costs", "dependency graph = blast radius; rate-card estimates + optimization advisor"),
    ("Audit & observability", "append-only actor · verb · target on every transition; worker logs & job status"),
]
cw3 = Inches(3.91)
x = Inches(0.55)
for t, d in r3:
    box(s, x, Inches(5.22), cw3, Inches(0.95), fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, x + Inches(0.16), Inches(5.34), cw3 - Inches(0.32), Inches(0.28), [[(t, {"size": 11, "bold": True})]])
    txt(s, x + Inches(0.16), Inches(5.64), cw3 - Inches(0.32), Inches(0.48), [[(d, {"size": 8.5, "color": MUTED})]], spacing=1.12)
    x += cw3 + Inches(0.25)

# ---- principle strip ----
box(s, Inches(0.55), Inches(6.35), Inches(12.23), Inches(0.52), fill=SURFACE2, line=BORDER, radius=0.16)
txt(s, Inches(0.85), Inches(6.35), Inches(9.1), Inches(0.52),
    [[("The frontend never touches cloud APIs — execution flows only through the queue and sandboxed worker; every transition lands in the audit log.", {"size": 10.5, "color": MUTED})]],
    anchor=MSO_ANCHOR.MIDDLE, spacing=1.1)
chip(s, Inches(10.15), Inches(6.47), "251/251 backend tests", color=GREEN)
footer(s, 10)

# ============================================================
# 11 · WORKFLOW ARCHITECTURE
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Workflow architecture")
eyebrow(s, Inches(1.18), Inches(1.42), "END-TO-END CONTROLLED LIFECYCLE")

phases = [
    ("01", "User & roles", "ADMIN governs accounts & policy · DEVELOPER provisions · VIEWER read-only — RBAC enforced on every route"),
    ("02", "Project & cloud", "Admin scopes projects + environments · Developer binds a validated cloud account (AWS · Azure · GCP)"),
    ("03", "Template & config", "Catalog → JSON-schema contract → region · size · storage parameters with safe defaults"),
    ("04", "Validate & cost", "Invalid config rejected early · monthly estimate per provider surfaces before approval"),
    ("05", "Plan & policy", "Terraform diff CREATE / MODIFY / DELETE · guardrails: encryption · exposure · CIDRs · destructive protection"),
    ("06", "Approval", "Named approver signs the exact plan · rejection notifies the developer with reason · every decision audited"),
    ("07", "Execution", "Job queue → sandboxed worker · state QUEUED ▸ RUNNING ▸ SUCCESSFUL / FAILED — the UI never executes"),
    ("08", "Provision", "Provider-specific execution: compute · storage · network · load balancer on AWS · Azure · GCP"),
    ("09", "Resource management", "Apply registers inventory · dependency graph (LB → web → DB) shows blast radius before change"),
    ("10", "Monitor & notify", "Health & availability dashboards · alerts on anomalies and pipeline outcomes"),
    ("11", "Audit & controlled change", "Append-only actor · verb · target · modifications and teardown re-run plan → policy → approve (typed confirm)"),
]

def phase_row(items, y, cw, ch):
    x = Inches(0.55)
    for num, t, d in items:
        box(s, x, y, cw, ch, fill=SURFACE, line=BORDER, radius=0.08)
        chip(s, x + Inches(0.14), y + Inches(0.13), num, color=FAINT, fill=SURFACE2, size=8)
        txt(s, x + Inches(0.62), y + Inches(0.11), cw - Inches(0.76), Inches(0.3), [[(t, {"size": 11, "bold": True})]])
        txt(s, x + Inches(0.14), y + Inches(0.45), cw - Inches(0.28), ch - Inches(0.57), [[(d, {"size": 8, "color": MUTED})]], spacing=1.12)
        x += cw + Inches(0.14)

W4 = Inches(2.9525); W3 = Inches(3.9833)
phase_row(phases[0:4], Inches(1.95), W4, Inches(1.0))
phase_row(phases[4:8], Inches(3.09), W4, Inches(1.0))
phase_row(phases[8:11], Inches(4.23), W3, Inches(1.0))

# lifecycle strip
box(s, Inches(0.55), Inches(5.52), Inches(12.23), Inches(0.92), fill=SURFACE2, line=BORDER, radius=0.12)
txt(s, Inches(0.85), Inches(5.63), Inches(5.5), Inches(0.24), [[("COMPLETE CONTROLLED LIFECYCLE", {"size": 9, "bold": True, "font": MONO, "color": GREEN})]])
txt(s, Inches(6.5), Inches(5.63), Inches(6.0), Inches(0.24),
    [[("any change loops back: plan → policy → approval → execution", {"size": 8, "font": MONO, "color": FAINT})]],
    align=PP_ALIGN.RIGHT)
lc = ["authenticate", "project · cloud", "template · validate", "plan · approve", "provision · register", "monitor", "audit · modify · destroy"]
lx = Inches(0.85)
for i, st in enumerate(lc):
    w = chip(s, lx, Inches(5.95), st, color=INK if i in (0, len(lc) - 1) else MUTED, size=8)
    lx = lx + w + Inches(0.06)
    if i < len(lc) - 1:
        txt(s, lx, Inches(5.95), Inches(0.18), Inches(0.28), [[("\u2192", {"color": FAINT, "size": 9})]],
            align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        lx += Inches(0.18)
txt(s, Inches(0.55), Inches(6.58), Inches(12.23), Inches(0.3),
    [[("Authorized users safely plan, approve, deploy, monitor, and destroy reusable multi-cloud infrastructure — one governed lifecycle.", {"size": 10, "color": MUTED})]],
    align=PP_ALIGN.CENTER)
footer(s, 11)

# ============================================================
# 12 · EXTRAS
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
    ("Test discipline", "251 backend tests: unit + route + worker + policy + crypto + template sync."),
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
footer(s, 12)

# ============================================================
# 13 · FUTURE SCOPE
# ============================================================
s = slide()
brand(s, Inches(0.55), Inches(0.5), scale=1.0, wordmark=False)
h1(s, "Future scope")
eyebrow(s, Inches(1.18), Inches(1.42), "WHERE THE PLATFORM GOES NEXT")

future = [
    ("Live provider execution", "NEXT", "Swap the sandboxed simulation runner for real terraform runs behind the same runner interface — zero pipeline or policy changes."),
    ("Durable execution queue", "NEXT", "RabbitMQ-backed jobs with retries and dead-lettering so in-flight deployments survive restarts; scale-out to multiple workers."),
    ("Drift detection & alerting", "NEXT", "Scheduled plan-vs-state reconciliation flags out-of-band console changes and opens a governed remediation path."),
    ("Live pricing & budgets", "LATER", "Provider pricing APIs and usage telemetry replace the offline rate card — actuals, forecasts, and budget alerts."),
    ("SSO & team collaboration", "LATER", "OIDC sign-in, per-project fine-grained roles, and multi-user designer sessions with live presence."),
    ("GitOps workflow", "LATER", "Push generated modules to Git; plan-on-PR comments and review gates ride the existing approval pipeline."),
]
y0, x0 = Inches(2.05), Inches(0.55)
cw2, ch2 = Inches(6.0), Inches(1.28)
for i, (t, tag, d) in enumerate(future):
    col, row = i % 2, i // 2
    fx = x0 + col * (cw2 + Inches(0.23))
    fy = y0 + row * (ch2 + Inches(0.16))
    box(s, fx, fy, cw2, ch2, fill=SURFACE, line=BORDER, radius=0.10)
    txt(s, fx + Inches(0.24), fy + Inches(0.16), cw2 - Inches(1.3), Inches(0.32), [[(t, {"size": 12.5, "bold": True})]])
    chip(s, fx + cw2 - Inches(1.02), fy + Inches(0.18), tag, color=GREEN if tag == "NEXT" else FAINT)
    txt(s, fx + Inches(0.24), fy + Inches(0.56), cw2 - Inches(0.48), Inches(0.62), [[(d, {"size": 10, "color": MUTED})]], spacing=1.15)
footer(s, 13)

# ============================================================
# 14 · CLOSING
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
footer(s, 14)

prs.save("docs/cloudweave-supervisor-deck.pptx")
print("saved docs/cloudweave-supervisor-deck.pptx —", len(prs.slides.slides if hasattr(prs.slides,'slides') else prs.slides._sldIdLst), "slides")
