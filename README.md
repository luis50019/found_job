# Telegram Job Radar

Bot privado de Telegram para buscar vacantes compatibles con el perfil de Luis, puntuarlas y notificar solo las oportunidades nuevas que superen un umbral.

## Que hace

- Consulta Remotive, Remote OK y Arbeitnow sin credenciales.
- Puede consultar vacantes de Mexico con Jooble si agregas su API key.
- Puede consultar vacantes locales de Mexico con Adzuna si agregas sus claves.
- Busca puestos DevOps, Cloud, SRE, Backend Node/TypeScript y Frontend React.
- Prioriza Junior, Intern, Trainee y Entry Level.
- Descarta puestos Senior/Lead y ubicaciones incompatibles.
- Calcula un porcentaje usando rol, tecnologias, nivel y ubicacion.
- Guarda las vacantes notificadas en PostgreSQL para no repetirlas.
- Solo permite usar el bot a los IDs de Telegram configurados.

El bot **no envia postulaciones automaticamente**. El enlace de cada aviso te lleva a la vacante para que revises los datos antes de postularte.

## Puesta en marcha

### 1. Crear el bot

1. Abre Telegram y escribe a [@BotFather](https://t.me/BotFather).
2. Ejecuta `/newbot`, elige nombre y usuario.
3. Guarda el token que te entrega.
4. Obtén tu ID numerico escribiendo a [@userinfobot](https://t.me/userinfobot).

### 2. Configurar

```bash
cp .env.example .env
nano .env
```

Como minimo cambia:

```env
TELEGRAM_BOT_TOKEN=token_entregado_por_BotFather
ALLOWED_TELEGRAM_USER_IDS=tu_id_numerico
POSTGRES_PASSWORD=una_contrasena_larga
```

Para incluir más vacantes locales de Mexico, crea claves en [Adzuna Developer](https://developer.adzuna.com/) y llena `ADZUNA_APP_ID` y `ADZUNA_APP_KEY`. El bot funciona sin ellas usando las fuentes remotas.

Para consultar Jooble, solicita una clave en [Jooble REST API](https://jooble.org/api/about) y configura:

```env
ENABLE_JOOBLE=true
JOOBLE_API_KEY=tu_clave_de_jooble
```

### 3. Levantar con Docker

```bash
docker compose up -d --build
docker compose logs -f bot
```

Después abre tu bot en Telegram y ejecuta `/start`.

## Comandos

| Comando | Funcion |
| --- | --- |
| `/start` | Registra el chat y activa los avisos |
| `/buscar` | Ejecuta una busqueda inmediatamente |
| `/estado` | Muestra umbral, horario y fuentes |
| `/perfil` | Muestra el perfil usado para comparar |
| `/prueba` | Comprueba que el bot puede responder |
| `/stop` | Desactiva los avisos para ese chat |

## Personalizacion

- Edita `src/profile.ts` para cambiar roles, tecnologias o ubicaciones.
- Cambia `MATCH_THRESHOLD` para exigir más o menos compatibilidad.
- Cambia `CHECK_CRON` para ajustar la frecuencia. `0 */6 * * *` significa cada seis horas.
- `MAX_NOTIFICATIONS_PER_RUN` evita recibir demasiados mensajes en una sola revisión.

Después de modificar código:

```bash
docker compose up -d --build
```

## Desarrollo local

Necesitas Node.js 22 y PostgreSQL:

```bash
npm install
npm run typecheck
npm test
npm run dev
```

## Seguridad y limitaciones

- No subas `.env` a Git; ya está ignorado.
- Rota el token desde BotFather si lo expones accidentalmente.
- Las fuentes públicas pueden cambiar sus APIs o limitar peticiones.
- Una puntuación alta es una recomendación automática: revisa requisitos, restricciones geográficas y legitimidad de la empresa antes de compartir información personal.
- LinkedIn e Indeed no se raspan: hacerlo suele ser frágil y puede incumplir sus condiciones. Se pueden añadir proveedores con API oficial más adelante.
