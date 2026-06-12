import re

with open('d:/4BI8/Projet_PI_BI/deployment_ML_EVENTZELLA/frontend/src/app/globals.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace hardcoded dark colors and gold colors with theme variables
replacements = [
    (r'background:\s*rgba\(14,\s*14,\s*14,\s*0\.94\);', 'background: hsl(var(--card));\n  color: hsl(var(--card-foreground));'),
    (r'background:\s*rgba\(12,\s*12,\s*12,\s*0\.95\);', 'background: hsl(var(--muted));\n  color: hsl(var(--muted-foreground));'),
    (r'color:\s*var\(--gold-soft\);', 'color: hsl(var(--accent));'),
    (r'color:\s*var\(--text-muted\);', 'color: hsl(var(--muted-foreground));'),
    (r'color:\s*var\(--text\);', 'color: hsl(var(--foreground));'),
    (r'background:\s*var\(--bg-soft\);', 'background: hsl(var(--background));'),
    (r'background:\s*linear-gradient\(135deg,\s*#b98d29,\s*#f0c85d\);', 'background: hsl(var(--accent));'),
    (r'color:\s*#1f1a0b;', 'color: hsl(var(--accent-foreground));'),
    (r'background:\s*rgba\(216,\s*171,\s*58,\s*0\.12\);', 'background: hsl(var(--muted));'),
    (r'background:\s*rgba\(16,\s*16,\s*16,\s*0\.96\);', 'background: hsl(var(--card));\n  color: hsl(var(--card-foreground));'),
    (r'background:\s*linear-gradient\(165deg,\s*rgba\(20,\s*20,\s*20,\s*0\.96\),\s*rgba\(10,\s*10,\s*10,\s*0\.96\)\);', 'background: hsl(var(--muted));'),
    (r'border-color:\s*rgba\(216,\s*171,\s*58,\s*0\.55\);', 'border-color: hsl(var(--accent));'),
    (r'background:\s*rgba\(14,\s*14,\s*14,\s*0\.9\);', 'background: hsl(var(--background));'),
    (r'background:\s*rgba\(14,\s*14,\s*14,\s*0\.8\);', 'background: hsl(var(--background));'),
    (r'border-color:\s*rgba\(216,\s*171,\s*58,\s*0\.8\);', 'border-color: hsl(var(--accent));'),
    (r'background:\s*rgba\(216,\s*171,\s*58,\s*0\.1\);', 'background: hsl(var(--accent) / 0.1);'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.22\);', 'border: 1px solid hsl(var(--border));'),
    (r'background:\s*rgba\(15,\s*15,\s*15,\s*0\.98\);', 'background: hsl(var(--muted));'),
    (r'background:\s*rgba\(216,\s*171,\s*58,\s*0\.08\);', 'background: hsl(var(--accent) / 0.08);'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.3\);', 'border: 1px solid hsl(var(--border));'),
    (r'background:\s*rgba\(11,\s*11,\s*11,\s*0\.84\);', 'background: hsl(var(--background));'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.28\);', 'border: 1px solid hsl(var(--border));'),
    (r'background:\s*linear-gradient\(160deg,\s*rgba\(216,\s*171,\s*58,\s*0\.12\),\s*rgba\(18,\s*18,\s*18,\s*0\.88\)\);', 'background: hsl(var(--muted));'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.34\);', 'border: 1px solid hsl(var(--border));'),
    (r'background:\s*rgba\(13,\s*13,\s*13,\s*0\.86\);', 'background: hsl(var(--background));'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.24\);', 'border: 1px solid hsl(var(--border));'),
    (r'background:\s*linear-gradient\(90deg,\s*#caa03a,\s*#f3d47f\);', 'background: hsl(var(--accent));'),
    (r'background:\s*linear-gradient\(90deg,\s*#c79a35,\s*#f3d57e\);', 'background: hsl(var(--accent));'),
    (r'background:\s*rgba\(14,\s*14,\s*14,\s*0\.78\);', 'background: hsl(var(--background));'),
    (r'background:\s*linear-gradient\(160deg,\s*rgba\(18,\s*18,\s*18,\s*0\.98\),\s*rgba\(9,\s*9,\s*9,\s*0\.98\)\);', 'background: hsl(var(--card));'),
    (r'background:\s*rgba\(216,\s*171,\s*58,\s*0\.22\);', 'background: hsl(var(--accent) / 0.22);'),
    (r'background:\s*rgba\(12,\s*12,\s*12,\s*0\.8\);', 'background: hsl(var(--background));'),
    (r'border:\s*1px\s*solid\s*rgba\(216,\s*171,\s*58,\s*0\.2\);', 'border: 1px solid hsl(var(--border));'),
    (r'stroke:\s*#f0c85d;', 'stroke: hsl(var(--accent));'),
    (r'stroke:\s*rgba\(216,\s*171,\s*58,\s*0\.24\);', 'stroke: hsl(var(--border));'),
    (r'fill:\s*rgba\(216,\s*171,\s*58,\s*0\.06\);', 'fill: hsl(var(--muted));'),
]

for pattern, replacement in replacements:
    css = re.sub(pattern, replacement, css)

with open('d:/4BI8/Projet_PI_BI/deployment_ML_EVENTZELLA/frontend/src/app/globals.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS colors successfully replaced with theme variables.")
