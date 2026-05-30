import type { SkillPack } from "@/types";
import { now } from "@/lib/utils";

// ─── 5 packs de skills prédéfinis ────────────────────────────────────────────
export const SKILL_PACKS: SkillPack[] = [
  {
    id: "ecommerce",
    name: "E-Commerce",
    icon: "🛒",
    description: "SEO produit, copy conversion, conformité légale boutique",
    sector: "ecommerce",
    skills: [
      {
        id: "seo-produit",
        name: "SEO Produit",
        description: "Optimisation pages produit et catégories",
        content: `Pour chaque produit/catégorie : title tag 50-60 chars avec mot-clé principal en tête, meta description 150-160 chars incitative. H1 unique différent du title. URL courte avec mot-clé (sans stop words). Structure les données (prix, stock, avis) en JSON-LD Schema.org. Identifie les requêtes transactionnelles (acheter, prix, livraison, comparatif). Cible les Featured Snippets pour les questions produit fréquentes.`,
        agentIds: ["sofia"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["boutique", "produit", "fiche produit", "e-commerce", "shop"],
        sector: "ecommerce", createdBy: "system",
      },
      {
        id: "copy-conversion",
        name: "Copy Conversion",
        description: "Textes orientés conversion et taux d'achat",
        content: `Méthode AIDA systématique. Fiches produit : bénéfices AVANT caractéristiques, preuve sociale (nombre avis, étoiles, volume vendu), urgence légère (stock limité, délai livraison), CTA visible et spécifique ("Ajouter au panier — Livré en 24h"). Évite le jargon technique sauf si B2B. Objections anticipées dans la description. Prix encadré d'une valeur perçue.`,
        agentIds: ["leo"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["conversion", "vente", "achat", "panier", "boutique"],
        sector: "ecommerce", createdBy: "system",
      },
      {
        id: "legal-ecommerce",
        name: "Légal E-Commerce",
        description: "CGV, mentions légales, conformité RGPD boutique",
        content: `Obligations légales e-commerce FR/EU : CGV obligatoires avec droit de rétractation 14 jours, politique retours claire, mentions légales complètes (SIRET, responsable, hébergeur). RGPD : consentement cookies, politique confidentialité, mentions collecte données. Si paiement en ligne : conformité PCI-DSS, mentions sécurité. Signaler les risques spécifiques au secteur (alimentaire, cosmétique, etc.).`,
        agentIds: ["camille"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["boutique", "cgv", "vente", "retour", "remboursement"],
        sector: "ecommerce", createdBy: "system",
      },
    ],
  },
  {
    id: "saas",
    name: "SaaS",
    icon: "⚡",
    description: "Onboarding, pitch investisseur, architecture scalable",
    sector: "saas",
    skills: [
      {
        id: "onboarding-copy",
        name: "Onboarding Copy",
        description: "Textes d'activation utilisateur et emails séquentiels",
        content: `Onboarding SaaS : focus sur la valeur du premier AHA moment. Emails d'activation J0-J7 : J0 bienvenue + action unique, J1 astuce clé, J3 cas d'usage similaire, J7 relance si inactif. In-app : tooltips contextuels non bloquants, messages de progression, célébration des étapes clés. Ton : ami expert, jamais commercial. Metric d'activation clairement définie.`,
        agentIds: ["leo"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["saas", "activation", "onboarding", "app", "utilisateur"],
        sector: "saas", createdBy: "system",
      },
      {
        id: "pitch-investisseur",
        name: "Pitch Investisseur",
        description: "Structure deck, KPIs, narrative investissement",
        content: `Structure pitch seed/série A : Problème (1 slide, data), Solution (1-2 slides, démo), Marché TAM/SAM/SOM, Business model clair, Traction (MRR, croissance, rétention, NPS), Équipe (exécution > parcours), Compétition (honest, matrice), Ask (montant, use of funds, milestones 18 mois). Narratif : storytelling client avant chiffres. Évite : CAC sans LTV, projections sans hypothèses, buzzwords sans substance.`,
        agentIds: ["omar"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["pitch", "investisseur", "levée", "startup", "deck"],
        sector: "saas", createdBy: "system",
      },
      {
        id: "architecture-scalable",
        name: "Architecture Scalable",
        description: "Patterns techniques pour SaaS multi-tenant",
        content: `SaaS multi-tenant : isolation données (schema-per-tenant vs shared), rate limiting par tenant, feature flags (LaunchDarkly/Flagsmith), observabilité (traces distribuées, métriques par tenant). Auth : OAuth2 + OIDC, RBAC granulaire. Async : queue events, webhooks fiables avec retry. Facturation : Stripe usage-based. DB : connection pooling (PgBouncer), read replicas par région. CDN pour assets. IaC : Terraform ou Pulumi.`,
        agentIds: ["nina"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["saas", "multi-tenant", "scalable", "architecture", "api"],
        sector: "saas", createdBy: "system",
      },
    ],
  },
  {
    id: "local",
    name: "Business Local",
    icon: "📍",
    description: "SEO local, ton de proximité, Google Business",
    sector: "local",
    skills: [
      {
        id: "seo-local",
        name: "SEO Local",
        description: "Visibilité locale, Google Business, citations NAP",
        content: `SEO local : optimiser Google Business Profile (photos, horaires, attributs, posts hebdomadaires). Cohérence NAP (Nom/Adresse/Phone) sur tous les annuaires. Pages de zones géographiques (ville + quartier + code postal). Avis Google : template de demande d'avis + réponses aux avis négatifs. Balises LocalBusiness Schema.org. Cible "near me" + "[service] [ville]". Backlinks locaux : associations, presse locale, partenaires.`,
        agentIds: ["sofia"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["local", "ville", "région", "near me", "proximité", "cabinet", "clinique"],
        sector: "local", createdBy: "system",
      },
      {
        id: "ton-proximite",
        name: "Ton de Proximité",
        description: "Copywriting chaleureux pour business local",
        content: `Ton : chaleureux, humain, ancré localement. Référencer la zone géographique naturellement (pas mécaniquement). Valoriser l'expertise locale et la connaissance du terrain. Équipe mise en avant (prénoms, photos, parcours local). Témoignages clients avec prénom + ville/quartier. Éviter le jargon corporate. Storytelling authentique sur l'histoire locale. CTA personnalisés : "Venez nous rencontrer à [adresse]".`,
        agentIds: ["leo"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["local", "proximité", "artisan", "cabinet", "clinique", "restaurant"],
        sector: "local", createdBy: "system",
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Digital",
    icon: "📣",
    description: "Social media, email marketing, stratégie contenu",
    sector: "marketing",
    skills: [
      {
        id: "social-strategy",
        name: "Social Media Strategy",
        description: "Stratégie contenu réseaux sociaux par plateforme",
        content: `Par plateforme : LinkedIn (expertise B2B, format carrousel, jeudi-vendredi matin), Instagram (visuels + Reels 15-30s, hashtags niche 10-15), Twitter/X (opinions tranchées, threads, veille), Facebook (communauté, groupes, events). Règle 80/20 : 80% valeur/éducation, 20% promotion. Fréquence : 3-5x/semaine. Viral hook en première ligne. CTA clair. Analyse hebdomadaire des tops posts.`,
        agentIds: ["leo", "maya"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["social", "réseaux", "instagram", "linkedin", "facebook", "posts"],
        sector: "marketing", createdBy: "system",
      },
      {
        id: "email-marketing",
        name: "Email Marketing",
        description: "Séquences email, deliverability, automation",
        content: `Séquences automatisées : welcome (J0-J7), nurturing (hebdo), réactivation (J30 inactif). Objet : 40 chars max, curiosité ou bénéfice clair, émoticône en tête si B2C. Preheader complémentaire. Structure : une idée = un email. CTA unique et contrasté. Délivrabilité : SPF+DKIM+DMARC, liste propre (suppression bounces 30j), warm-up domaine. A/B test objet systématique. KPIs : open rate >25%, CTR >3%.`,
        agentIds: ["leo"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["email", "newsletter", "mailing", "automation", "séquence"],
        sector: "marketing", createdBy: "system",
      },
    ],
  },
  {
    id: "tech",
    name: "Tech & Dev",
    icon: "🔧",
    description: "Performance web, sécurité renforcée, code quality",
    sector: "tech",
    skills: [
      {
        id: "performance-web",
        name: "Performance Web",
        description: "Core Web Vitals, optimisation front-end",
        content: `Core Web Vitals : LCP <2.5s (images WebP/AVIF, lazy loading, priority hints), INP <200ms (code splitting, defer non-critique), CLS <0.1 (dimensions explicites images, skeleton loaders). Bundle : tree shaking, code splitting par route, compression Brotli. Fonts : font-display swap, preconnect, subset. Cache : CDN edge, stale-while-revalidate. Monitoring : Web Vitals field data (RUM), Lighthouse CI en pipeline.`,
        agentIds: ["nina", "tom"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["performance", "vitals", "lcp", "lighthouse", "optimisation", "front-end"],
        sector: "tech", createdBy: "system",
      },
      {
        id: "securite-renforcee",
        name: "Sécurité Renforcée",
        description: "OWASP Top 10, bonnes pratiques sécurité",
        content: `OWASP Top 10 : injection (parameterized queries), broken auth (MFA, session management), XSS (CSP strict, sanitisation), IDOR (contrôle accès systématique), SSRF (allowlist sortante). Headers sécurité : HSTS, X-Frame-Options, CSP. Secrets : vault (HashiCorp/AWS Secrets Manager), jamais en config/env commité. Audit : dépendances (npm audit, Snyk), SAST en CI. Logs : pas de PII, rotation, alerting anomalies.`,
        agentIds: ["nina", "tom"],
        isActive: true, isTemporary: false, inheritToAll: false,
        triggerKeywords: ["sécurité", "owasp", "xss", "injection", "pentest", "vulnérabilité"],
        sector: "tech", createdBy: "system",
      },
    ],
  },
];

// ─── Pack Production Forge ────────────────────────────────────────────────────

export const FORGE_PRODUCTION_PACK: SkillPack = {
  id: "forge_production",
  name: "Production Forge",
  icon: "⚙️",
  description: "Skills de production de fichiers professionnels. Python validé (WeasyPrint, openpyxl, python-pptx, python-docx, HTML/plotly).",
  sector: "production",
  skills: [
    {
      id: "forge-pdf-weasyprint",
      name: "PDF WeasyPrint Pro",
      description: "PDFs professionnels via WeasyPrint (HTML+CSS→PDF). Source : github.com/Kozea/WeasyPrint ⭐7800+",
      agentIds: ["forge"],
      isActive: true,
      isTemporary: false,
      inheritToAll: false,
      triggerKeywords: ["pdf", "rapport pdf", "document pdf"],
      createdBy: "system",
      content: `SKILL PDF WEASYPRINT (github.com/Kozea/WeasyPrint ⭐7800+) :
packages: ["weasyprint"]

from weasyprint import HTML

html_content = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 2.5cm;
  @bottom-right { content: "Page " counter(page) " / " counter(pages); font-size: 9pt; color: #666; }
  @top-left { content: "[TITRE]"; font-size: 9pt; color: #666; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #2C2C2C; }
.cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: center;
  background: #1B3A5C; color: white; padding: 60px; page-break-after: always; }
.cover h1 { font-size: 32pt; margin-bottom: 20px; }
.cover .subtitle { font-size: 16pt; opacity: 0.8; }
.cover .meta { margin-top: 60px; font-size: 12pt; opacity: 0.7; }
h1 { font-size: 20pt; color: #1B3A5C; border-bottom: 3px solid #2E86AB; padding-bottom: 8px; margin: 30px 0 15px; }
h2 { font-size: 15pt; color: #2E86AB; margin: 20px 0 10px; }
p { margin-bottom: 10px; }
.executive-summary { background: #f0f7ff; border-left: 5px solid #2E86AB; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
.kpi-card { background: #f8f9fa; border-left: 4px solid #2E86AB; padding: 15px; border-radius: 4px; }
.kpi-card .value { font-size: 22pt; font-weight: bold; color: #1B3A5C; }
.kpi-card .label { font-size: 10pt; color: #666; margin-top: 4px; }
.kpi-card.positive { border-color: #28A745; } .kpi-card.negative { border-color: #DC3545; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
th { background: #1B3A5C; color: white; padding: 10px 8px; text-align: left; font-weight: bold; }
td { border: 1px solid #ddd; padding: 8px; }
tr:nth-child(even) { background: #f5f5f5; }
.action-item { display: flex; align-items: flex-start; gap: 15px; margin: 10px 0; padding: 12px; background: #f8f9fa; border-radius: 4px; }
.priority-badge { background: #2E86AB; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
.page-break { page-break-before: always; }
ul { padding-left: 20px; margin: 10px 0; } li { margin-bottom: 5px; }
</style></head><body>

<div class="cover">
<h1>[TITRE_RAPPORT]</h1>
<div class="subtitle">[SOUS_TITRE]</div>
<div class="meta">Préparé pour : [CLIENT]<br>Date : [DATE]</div>
</div>

<h1>Résumé Exécutif</h1>
<div class="executive-summary">[RESUME_EXECUTIF]</div>

<div class="kpi-grid">
<!-- Pour chaque KPI : -->
<div class="kpi-card [positive/negative]">
<div class="value">[VALEUR_KPI]</div>
<div class="label">[NOM_KPI]</div>
</div>
</div>

<!-- Pour chaque section : -->
<div class="page-break"></div>
<h1>[TITRE_SECTION]</h1>
<p>[CONTENU_SECTION]</p>
<table><tr><th>Col1</th><th>Col2</th></tr>
<tr><td>[val1]</td><td>[val2]</td></tr></table>

<div class="page-break"></div>
<h1>Plan d'Action</h1>
<!-- Pour chaque action : -->
<div class="action-item">
<div class="priority-badge">[N]</div>
<div><strong>[ACTION]</strong><br><small>Deadline : [DATE] — Impact : [IMPACT]</small></div>
</div>

<h1>Conclusion</h1>
<p>[CONCLUSION]</p>
</body></html>"""

HTML(string=html_content).write_pdf("rapport.pdf")
print("PDF généré : rapport.pdf")

RÈGLE : Remplace TOUS les [PLACEHOLDERS] avec les vraies données du JSON de Sam.`,
    },
    {
      id: "forge-excel-openpyxl",
      name: "Excel Dashboard Pro",
      description: "Fichiers Excel professionnels via openpyxl. Source : openpyxl.readthedocs.io",
      agentIds: ["forge"],
      isActive: true,
      isTemporary: false,
      inheritToAll: false,
      triggerKeywords: ["excel", "xlsx", "tableur", "données excel"],
      createdBy: "system",
      content: `SKILL EXCEL OPENPYXL (openpyxl.readthedocs.io) :
packages: ["openpyxl"]

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule

wb = Workbook()

header_fill = PatternFill(start_color="1B3A5C", end_color="1B3A5C", fill_type="solid")
header_font = Font(bold=True, color="FFFFFF", size=12)
center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

def style_header_row(ws, row, max_col):
    for col in range(1, max_col + 1):
        cell = ws.cell(row=row, column=col)
        cell.fill = header_fill; cell.font = header_font; cell.alignment = center_align

def auto_width(ws):
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[get_column_letter(col[0].column)].width = min(max_len + 4, 50)

# ONGLET 1 : Vue d'ensemble (KPIs)
ws_dash = wb.active
ws_dash.title = "Vue d'ensemble"

# ONGLET 2 : Données brutes
ws_data = wb.create_sheet("Données")
ws_data.freeze_panes = "A2"
ws_data.auto_filter.ref = ws_data.dimensions

# ONGLET 3 : Graphiques
ws_charts = wb.create_sheet("Graphiques")
chart = BarChart()
chart.type = "col"; chart.style = 10; chart.width = 15; chart.height = 10

# ONGLET 4 : Plan d'action
ws_plan = wb.create_sheet("Plan d'action")

auto_width(ws_dash); auto_width(ws_data)
wb.save("rapport.xlsx")
print("Excel généré : rapport.xlsx")

COULEURS STANDARD : En-têtes #1B3A5C blanc | Paires #F5F5F5 | Positif #00B050 | Négatif #FF0000 | Attention #FFC000`,
    },
    {
      id: "forge-pptx-consulting",
      name: "PowerPoint Style Consulting",
      description: "Présentations professionnelles style BCG/McKinsey via python-pptx. Source : Office-PowerPoint-MCP-Server",
      agentIds: ["forge"],
      isActive: true,
      isTemporary: false,
      inheritToAll: false,
      triggerKeywords: ["powerpoint", "pptx", "présentation", "slides"],
      createdBy: "system",
      content: `SKILL POWERPOINT CONSULTING (python-pptx) :
packages: ["python-pptx"]

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

COLORS = {
    "primary": RGBColor(0x2B, 0x57, 0x9A),
    "secondary": RGBColor(0x21, 0x73, 0x46),
    "accent": RGBColor(0xED, 0x7D, 0x31),
    "white": RGBColor(0xFF, 0xFF, 0xFF),
    "text": RGBColor(0x21, 0x21, 0x21),
}

def add_title_slide(prs, title, subtitle):
    layout = prs.slide_layouts[0]
    slide = prs.slides.add_slide(layout)
    slide.shapes.title.text = title
    if len(slide.placeholders) > 1: slide.placeholders[1].text = subtitle
    bg = slide.background.fill; bg.solid(); bg.fore_color.rgb = COLORS["primary"]
    return slide

def add_content_slide(prs, action_title, bullets):
    layout = prs.slide_layouts[1]
    slide = prs.slides.add_slide(layout)
    tf = slide.shapes.title.text_frame
    tf.text = action_title
    tf.paragraphs[0].runs[0].font.size = Pt(24)
    tf.paragraphs[0].runs[0].font.bold = True
    tf.paragraphs[0].runs[0].font.color.rgb = COLORS["primary"]
    tf2 = slide.placeholders[1].text_frame; tf2.clear()
    for i, bullet in enumerate(bullets[:5]):
        p = tf2.add_paragraph() if i > 0 else tf2.paragraphs[0]
        p.text = bullet; p.font.size = Pt(18)
    return slide

add_title_slide(prs, "[TITRE_RAPPORT]", "[CLIENT] — [DATE]")
# Slides selon sections du JSON de Sam
prs.save("presentation.pptx")
print("PowerPoint généré : presentation.pptx")

PRINCIPES BCG/McKINSEY : Action title = conclusion (NON "Analyse" OUI "Le marché représente €4M")
Maximum 5 bullets | 1 idée par slide | Appendice pour les détails`,
    },
    {
      id: "forge-word-docx",
      name: "Word Document Pro",
      description: "Documents Word professionnels via python-docx. Source : python-openxml/python-docx ⭐4400+",
      agentIds: ["forge"],
      isActive: true,
      isTemporary: false,
      inheritToAll: false,
      triggerKeywords: ["word", "docx", "document word"],
      createdBy: "system",
      content: `SKILL WORD PYTHON-DOCX (python-openxml/python-docx ⭐4400+) :
packages: ["python-docx"]

from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()
section = doc.sections[0]
section.top_margin = Inches(1); section.bottom_margin = Inches(1)
section.left_margin = Inches(1); section.right_margin = Inches(1)

doc.add_heading("[TITRE_RAPPORT]", level=0)

meta = doc.add_paragraph()
meta.add_run("Client : ").bold = True; meta.add_run("[CLIENT]")
meta.add_run("\nDate : ").bold = True; meta.add_run("[DATE]")
doc.add_page_break()

doc.add_heading("Résumé Exécutif", level=1)
doc.add_paragraph("[RESUME_EXECUTIF]")

# Pour chaque section du JSON :
# doc.add_heading(section["titre"], level=1)
# doc.add_paragraph(section["contenu"])
# if section.get("donnees"):
#     table = doc.add_table(rows=1, cols=3, style="Table Grid")
#     # ... remplir les cellules

doc.add_heading("Plan d'Action", level=1)
# Pour chaque action :
# p = doc.add_paragraph(style="List Bullet")
# p.add_run(f"[{action['priorite']}] {action['action']}").bold = True

doc.add_heading("Conclusion", level=1)
doc.add_paragraph("[CONCLUSION]")

doc.save("document.docx")
print("Word généré : document.docx")

STYLES NATIFS WORD UNIQUEMENT : "Title", "Heading 1", "Heading 2", "Normal", "List Bullet", "Table Grid"`,
    },
    {
      id: "forge-html-dashboard",
      name: "HTML Dashboard Interactif",
      description: "Dashboard HTML autonome avec plotly.js. Source : plotly.com/python/ (officiel)",
      agentIds: ["forge", "sam"],
      isActive: true,
      isTemporary: false,
      inheritToAll: false,
      triggerKeywords: ["html", "dashboard", "dashboard html", "interactif"],
      createdBy: "system",
      content: `SKILL HTML DASHBOARD (plotly.com/python/) :
Aucune bibliothèque Python requise — HTML pur avec CDN plotly

STRUCTURE HTML COMPLÈTE :
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>[TITRE]</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #0F172A; color: #F8FAFC; }
.header { background: #1E293B; padding: 24px 32px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; }
.header h1 { font-size: 1.5rem; font-weight: 700; }
.header .meta { color: #94A3B8; font-size: 0.875rem; }
.container { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.kpi-card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; border-left: 4px solid #3B82F6; }
.kpi-card.positive { border-left-color: #22C55E; } .kpi-card.negative { border-left-color: #EF4444; } .kpi-card.warning { border-left-color: #F59E0B; }
.kpi-value { font-size: 2rem; font-weight: 700; } .kpi-label { color: #94A3B8; font-size: 0.875rem; margin-top: 4px; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px; }
.chart-card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
.chart-card h3 { font-size: 1rem; color: #94A3B8; margin-bottom: 16px; }
.table-card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 20px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th { background: #0F172A; color: #94A3B8; padding: 12px 16px; text-align: left; font-weight: 600; border-bottom: 1px solid #334155; }
td { padding: 12px 16px; border-bottom: 1px solid #1E293B; color: #F8FAFC; }
tr:hover { background: #0F172A; }
</style>
</head>
<body>
<div class="header">
<div><h1>[TITRE_DASHBOARD]</h1><div class="meta">[CLIENT] — [DATE]</div></div>
</div>
<div class="container">
<div class="kpi-grid">
<div class="kpi-card positive"><div class="kpi-value">[VALEUR]</div><div class="kpi-label">[NOM_KPI]</div></div>
</div>
<div class="charts-grid">
<div class="chart-card"><h3>[TITRE_GRAPHE]</h3><div id="chart1" style="height:300px"></div></div>
</div>
<div class="table-card">
<h3 style="color:#94A3B8;margin-bottom:16px">[TITRE_TABLEAU]</h3>
<table><thead><tr><th>Col1</th><th>Col2</th></tr></thead>
<tbody><tr><td>[val1]</td><td>[val2]</td></tr></tbody></table>
</div>
</div>
<script>
Plotly.newPlot("chart1", [{type:"bar",x:[/* X data */],y:[/* Y data */],marker:{color:"#3B82F6"}}],
{paper_bgcolor:"#1E293B",plot_bgcolor:"#1E293B",font:{color:"#F8FAFC"},margin:{t:20,r:20,b:40,l:50},
xaxis:{gridcolor:"#334155"},yaxis:{gridcolor:"#334155"}},{responsive:true});
</script>
</body></html>

RÈGLE : Fichier 100% autonome. Toutes les données du JSON intégrées. Aucun placeholder visible.`,
    },
  ],
};

// Générer des IDs stables pour les skills des packs
export function materializeSkillPack(pack: SkillPack): Array<import("@/types").Skill> {
  return pack.skills.map((skill) => ({
    ...skill,
    id: skill.id || `${pack.id}-${skill.name.toLowerCase().replace(/\s+/g, "-")}`,
    createdAt: now(),
    useCount: 0,
    avgScoreImpact: 0,
  }));
}
