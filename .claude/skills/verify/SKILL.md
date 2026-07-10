---
name: verify
description: Como rodar e verificar visualmente o logix-subsistem (site estático) no macOS com Chrome headless.
---

# Verificar o logix-subsistem

Site 100% estático (HTML/CSS/JS de browser), sem build. Servir e capturar com o Chrome instalado.

## Servir

```bash
cd /Users/jopitondo/Desktop/BA/logix-subsistem
python3 -m http.server 8901 &
```

## Capturar telas (animações completam com virtual time)

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --window-size=1440,900 \
  --virtual-time-budget=7000 --screenshot=out.png \
  "http://localhost:8901/dhl/dashboard/index.html"
```

Páginas que valem a pena dirigir:

- `dhl/dashboard/index.html` — admin DHL
- `dhl/vendor-admin-view/index.html` — tabela dinâmica de vendors
- `sp-portal/dashboard/index.html?sp=TBX` — portal TBX (Live Service; usar budget 9000)
- `dhl/access-select/index.html`, `sp-portal/login/index.html` — telas de entrada

## Inspecionar estado do DOM pós-JS

```bash
"$CHROME" --headless=new --disable-gpu --virtual-time-budget=7000 --dump-dom URL > dom.html
```

## Gotchas

- `--force-prefers-reduced-motion` funciona para testar o caminho de acessibilidade.
- `--blink-settings=scriptEnabled=false` NÃO grava screenshot neste Chrome (headless=new); para o caso sem JS, verificar estruturalmente (grep) que classes de estado inicial invisível não existem no HTML fonte.
- Os erros de stderr do Chrome sobre `installwebapp`/`task_policy_set` são ruído do próprio Chrome, não da página.
- Camada de motion compartilhada: `refinements-v3-motion.css/.js` (carregada por último em todas as páginas canônicas; toda animação é gated em JS + `prefers-reduced-motion`).
