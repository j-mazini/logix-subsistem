# SP Portal React - Deployment Guide

## 🚀 Deployment para GitHub Pages

### Pré-requisitos
- GitHub repository configurado
- Node.js 20+
- npm ou yarn

### Opção 1: Deployment Automático (Recomendado)

O GitHub Actions workflow (`.github/workflows/deploy.yml`) já está configurado para fazer deploy automático.

**Funciona automaticamente quando:**
- Push para `main` branch
- Push para `feature/react-migration-sp-portal` branch
- Dispatch manual via GitHub Actions

**Passos:**
1. Faça push do código para GitHub
2. Vá para `Settings > Pages`
3. Em "Build and deployment", selecione:
   - Source: `GitHub Actions`
4. Pronto! O workflow fará deploy automático

### Opção 2: Deployment Manual

```bash
# 1. Build de produção
cd sp-portal-react
npm run build

# 2. Deploy para GitHub Pages
npm install -g gh-pages
gh-pages -d dist

# 3. Verifique em: https://<username>.github.io/logix-subsistem/
```

### Configuração do GitHub Pages

1. Vá para `Settings > Pages`
2. **Source:** GitHub Actions (automático) OU gh-pages (manual)
3. **Custom domain:** (opcional)
   - Configure se quiser domínio próprio
   - Atualize `vite.config.ts` com o novo base path

### Estrutura após Deploy

```
https://<username>.github.io/logix-subsistem/
├── index.html
├── assets/
│   ├── index-*.css (43.64 KB gzip)
│   ├── index-*.js (123.49 KB gzip)
├── 404.html (redireciona para index.html para SPA)
```

## 📊 Performance Metrics

### Bundle Size
| Arquivo | Tamanho | Gzip | Status |
|---------|---------|------|--------|
| CSS | 264.58 KB | 43.64 KB | ✅ Otimizado |
| JS | 453.97 KB | 123.49 KB | ✅ Otimizado |
| HTML | 1.04 KB | 0.50 KB | ✅ Mínimo |
| **Total** | **719 KB** | **167 KB** | ✅ Excelente |

### Build Performance
- **Time:** 168ms
- **Modules:** 89
- **Plugins:** React, Vite optimizations

### Lighthouse (Estimado)
- **Performance:** 85-90+ (Vite optimized)
- **Accessibility:** 95+ (semantic HTML, ARIA labels)
- **Best Practices:** 90+ (modern standards)
- **SEO:** 90+ (meta tags, structure)

## 🔒 Security Headers (Recomendado)

Adicione em `.github/workflows/deploy.yml` se usar domínio próprio:

```yaml
- name: Configure Security Headers
  run: |
    cat > sp-portal-react/public/_headers << 'EOF'
    /*
      X-Content-Type-Options: nosniff
      X-Frame-Options: SAMEORIGIN
      X-XSS-Protection: 1; mode=block
      Referrer-Policy: strict-origin-when-cross-origin
      Permissions-Policy: geolocation=(), microphone=(), camera=()
    EOF
```

## 🌐 URL Estrutura

Após deploy no GitHub Pages do `logix-subsistem`:

| Rota | URL |
|------|-----|
| Homepage | `https://<user>.github.io/logix-subsistem/` |
| Dashboard | `https://<user>.github.io/logix-subsistem/#/dashboard` |
| Drivers | `https://<user>.github.io/logix-subsistem/#/drivers` |
| Vehicles | `https://<user>.github.io/logix-subsistem/#/vehicles` |
| Financial | `https://<user>.github.io/logix-subsistem/#/daily-financial-insights` |

## ✅ Checklist de Deployment

- [ ] Código commitado e pushed
- [ ] GitHub Actions workflow executado com sucesso
- [ ] Build passou sem erros (89 modules)
- [ ] Páginas carregando em `https://<user>.github.io/logix-subsistem/`
- [ ] Deep-links funcionando (404.html redirect)
- [ ] CSS/JS carregando corretamente
- [ ] Mock data exibindo
- [ ] Responsive design testado em mobile
- [ ] Dark mode funcional

## 🐛 Troubleshooting

### Páginas retornam 404 no GitHub Pages
**Solução:** O arquivo `public/404.html` deve redirecionar para `index.html`
- Verifique se `.github/workflows/deploy.yml` está presente
- Verifique se `public/404.html` existe

### Assets não carregam
**Solução:** Verifique `vite.config.ts` - `base` deve ser `/logix-subsistem/`

```typescript
export default defineConfig({
  base: '/logix-subsistem/',
  // ...
})
```

### CSS/JS com hash names errados
**Solução:** Limpe cache e rebuild
```bash
rm -rf dist node_modules/.vite
npm run build
```

## 📚 Recursos Adicionais

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [React Router HashRouter](https://reactrouter.com/en/main/router-components/hash-router)

## 🎯 Next Steps

1. **Merge para main:** 
   ```bash
   git push origin feature/react-migration-sp-portal
   # Create PR e merge para main
   ```

2. **GitHub Actions executa automaticamente**
   - Checkout
   - npm install
   - npm run build
   - Deploy para GitHub Pages

3. **Verificar deployment:**
   - Vá para `https://<username>.github.io/logix-subsistem/`
   - Teste navegação entre rotas
   - Verifique dados mock carregando

4. **(Opcional) Configurar domínio customizado:**
   - Adicione CNAME em `public/CNAME`
   - Configure DNS records
   - Ative em GitHub Pages settings

---

**Pronto para produção!** 🚀
