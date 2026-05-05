# Paliativos Frontend

React + TypeScript frontend for the Paliativos platform. Built with Vite and a custom CSS design system.

## Requirements

- Node.js 20+
- npm 9+

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5174/

## Environment configuration

Create a .env file based on .env.example and set the API base URL:

```bash
VITE_API_BASE_URL=/api/v1
```

Use a full URL when the backend is hosted elsewhere:

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1
```

## Docker (production build)

```bash
docker build -t paliativos-frontend --build-arg VITE_API_BASE_URL=/api/v1 .
docker run --rm -p 8080:80 paliativos-frontend
```

Open http://localhost:8080/

## Docker Compose

```bash
docker compose up --build
```

The compose file reads VITE_API_BASE_URL from the local environment or .env file.

## API proxy behavior

The container uses Nginx and proxies /api/ requests to http://backend:8000. If you run a backend container on the same Docker network with the service name backend, keep VITE_API_BASE_URL=/api/v1. If you use an external API, set VITE_API_BASE_URL to the full URL so the browser calls it directly.

## Scripts

- npm run dev
- npm run build
- npm run preview

## Project structure

```
src/
   app/           application shell, layouts, providers, routes, state
   components/    shared UI and state components
   modules/       feature modules and pages
   services/      http client, endpoints, adapters, fixtures
   styles/        tokens, global styles, animations
   types/         shared contracts and API types
   utils/         formatting, permissions, validation
```
- JS: 389 KB (121 KB gzipped)
- CSS: 31.73 KB (5.32 KB gzipped)
- Total: ~127 KB gzipped

**Runtime:**
- CSS animations use GPU acceleration (`transform` + `opacity`)
- React-Query caching prevents unnecessary re-renders
- Lazy imports ready for larger components

## ✅ Checklist

- [x] Foundation complete (structure, providers, layout)
- [x] Design system (tokens, typography, colors)
- [x] 2 fully implemented screens (Patients, Billing)
- [x] 6 placeholder screens ready
- [x] Responsive design (mobile-first)
- [x] Animations (entry, hover, loading)
- [x] Mock data layer
- [x] Real API architecture
- [x] TypeScript strict mode ✓
- [x] No console errors
- [x] Build passing
- [x] Light theme (no dark mode)
- [x] Real icons (Lucide, no emojis)

## 🚀 Next Steps

1. **Implement remaining screens:**
   - Episodes: Timeline visualization
   - Finance: Income/expense split
   - Documents: Upload + metadata
   - Reports: Aggregations by doctor
   - Audit: Transaction log
   - Secretaries: CRUD management

2. **Add modals/forms:**
   - Register Episode
   - Create Invoice
   - Update Patient

3. **Backend integration:**
   - Replace fixtures with real API
   - Wire up authentication
   - Add error handling

4. **Enhancements:**
   - Search/filter functionality
   - Permission-based UI
   - Advanced filtering
   - Export functionality

## 📝 Notes

- No external component libraries (shadcn, Material UI, etc.)
- No Tailwind CSS (custom CSS with tokens)
- All components fully typed
- Design is bespoke, not templated
- Ready to scale without redesign

## 🤝 Contributing

This frontend is designed to integrate seamlessly with the Paliativos backend API. When adding new screens:

1. Create module folder in `src/modules/`
2. Define types in `src/types/contracts.ts`
3. Create endpoint module in `src/services/endpoints/`
4. Implement hooks using React-Query
5. Build components following existing patterns
6. Add responsive breakpoints
7. Include animations for consistency

---

**Built for clinical precision + financial accuracy**

Live demo: http://localhost:5174/
