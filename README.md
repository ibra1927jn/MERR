Harvest NZ Merr: Industrial Orchard Management Platform
Harvest NZ Merr es una solución de gestión agrícola de grado industrial diseñada para optimizar la cosecha en tiempo real. Construida como una Progressive Web App (PWA) con arquitectura Local-First, la plataforma garantiza la trazabilidad total y el control operativo incluso en entornos rurales sin conectividad.

🚀 Propuesta de Valor
Nuestra plataforma resuelve la brecha de eficiencia entre el campo y la oficina mediante tres pilares fundamentales:

Trazabilidad Total (Real-Time Ledger): Registro inmutable de cada bin y bucket recolectado mediante escaneo móvil, eliminando el error humano del papel.

Wage Shield (Protección de Cumplimiento): Sistema integrado de auditoría de salarios y bonos de producción para asegurar el cumplimiento legal y evitar disputas financieras.

Resiliencia en Campo (Offline-First): Motor de sincronización avanzado que permite a los operarios trabajar 100% desconectados, sincronizando datos automáticamente al detectar señal.

🛠️ Stack Tecnológico
Frontend: React 18 + TypeScript + Vite.

Estilos: Tailwind CSS (Diseño de alto contraste para exteriores).

Base de Datos y Auth: Supabase (PostgreSQL) con políticas de seguridad RLS.

Persistencia Local: Dexie.js (IndexedDB) con sistema de colas de sincronización y manejo de conflictos (DLQ).

PWA: Service Workers para soporte offline y tiempos de carga instantáneos.

🏗️ Arquitectura del Sistema
La plataforma utiliza una estructura de roles jerárquicos para garantizar que la información fluya correctamente por toda la cadena de valor:

Manager Dashboard: Visualización estratégica de velocidad de cosecha, mapas de calor de productividad y reportes financieros.

Team Leader Module: Gestión de asistencia, asignación de surcos y control de calidad en el punto de origen.

Runner Interface: Herramienta ágil de escaneo y logística para el movimiento de bins y recolección de buckets.

📦 Instalación y Desarrollo
Sigue estos pasos para configurar el entorno de desarrollo local:

Clonar el repositorio e instalar dependencias:

Bash
npm install
Configurar Variables de Entorno:
Crea un archivo .env en la raíz con tus credenciales de Supabase:

Fragmento de código
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
Preparar la Base de Datos:
Ejecuta los scripts de migración localizados en /supabase/migrations para establecer el esquema, las funciones de base de datos y las políticas de RLS.

Iniciar el servidor de desarrollo:

Bash
npm run dev
🛡️ Seguridad y Auditoría
Row Level Security (RLS): Los datos están protegidos a nivel de fila; cada usuario solo accede a la información de su huerto o equipo asignado.

Audit Logs: Cada cambio en los registros de cosecha genera una entrada de auditoría inmutable para análisis forense de datos.

Validation Layer: Capa de servicios dedicada (validation.service.ts) que asegura la integridad de los datos antes de la persistencia.

📈 Hoja de Ruta (Industrialización)
Actualmente el proyecto se encuentra en fase de MVP Robusto. Los siguientes pasos incluyen:

Migración de lógica crítica a Edge Functions para mayor seguridad.

Implementación de firmas digitales para cierres de jornada.

Optimización de consumo de batería para jornadas extensas en campo.

## 📊 Sprint 3: Code Quality Improvements (Feb 2026)

**Objetivo**: Zero Error Policy + Type Safety enhancements

**Resultados**:

- ✅ Lint warnings: **146 → 127** (-13%)
- ✅ Type safety: **8 `any` types** eliminados con interfaces estrictas
- ✅ Code cleanup: **65 console.log statements** removidos
- ✅ Build time: **9.32s → 9.27s** (+0.5% más rápido)
- ✅ Tests: **71/71 passing** (sin regresiones)

**Documentación Nueva**:

- [`PATTERNS.md`](./PATTERNS.md) - Patrones React y TypeScript
- [`database.types.ts`](./src/types/database.types.ts) - Sistema de tipos estrictos

Contacto e Implementación
Para soporte técnico o consultas sobre el despliegue en nuevos huertos, contactar con el equipo de operaciones de Harvest NZ Merr.
