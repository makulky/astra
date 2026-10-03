# Astra

**Astrofísica interactiva: explora el universo construyéndolo.**

Astra es una web educativa con laboratorios visuales en 3D para entender cómo funcionan planetas, estrellas y agujeros negros. En lugar de leer fórmulas, mueves los parámetros y ves al momento qué cambia y por qué. Está disponible en español e inglés.

> Los modelos físicos están simplificados con fines didácticos. No son predicciones científicas, pero se basan en relaciones y resultados reales de la literatura.

---

## Contenido

### 🪐 Laboratorio planetario (`/planet-lab`)

Diseña un planeta y su luna en 3D, ajusta su física y descubre si podría albergar vida.

- **Estrella:** enana roja (M), enana naranja (K), tipo Sol (G) o blanco-amarilla (F).
- **Planeta:** masa, radio, distancia a la estrella, periodo de rotación, acoplamiento de marea e inclinación axial.
- **Atmósfera y superficie:** presión, agua superficial, albedo y efecto invernadero.
- **Satélite:** masa, radio y distancia orbital.
- **Datos calculados:** gravedad, densidad, velocidad de escape, temperatura de equilibrio y superficial, irradiación, duración del año, órbita de la luna, campo magnético y posición respecto a la zona habitable.
- **Probabilidad de vida:** puntuación de 0 a 100 combinando nueve factores (temperatura, agua líquida, atmósfera, tamaño, zona habitable, magnetosfera, rotación, estabilidad del eje y tipo de estrella), con un desglose que explica cada uno.
- **Plantillas:** Tierra, Marte, Venus, supertierra, mundo océano, mundo helado y planeta en torno a una enana roja.

### 🕳️ Laboratorio de agujeros negros (`/black-hole-lab`)

Un agujero negro renderizado con *ray marching* en un shader: cada rayo de luz se traza hacia atrás a través del espacio-tiempo curvado, de modo que se ven la sombra, el anillo de fotones y el disco de acreción deformado por la gravedad. Tiene cuatro modos:

| Modo | Qué haces |
| --- | --- |
| **Formar** | Eliges masa, metalicidad y rotación de una estrella masiva y la sigues a través de la secuencia principal, la fase de supergigante y el colapso del núcleo. Según los parámetros acaba como enana blanca, estrella de neutrones, agujero negro o sin remanente (inestabilidad de pares). Basado de forma aproximada en Heger et al. 2003 y Fryer et al. 2012. |
| **Laboratorio** | Ajustas masa, espín, tasa de acreción (fracción de Eddington), radio del disco y chorros relativistas. Muestra radio de Schwarzschild, horizonte, ISCO, sombra, eficiencia radiativa, luminosidad, temperatura del disco, temperatura de Hawking y tiempo de evaporación. Incluye la sección *«Si viajaras hasta allí»*: espaguetización, dilatación temporal y qué le pasaría a una estrella como el Sol. |
| **Alimentar** | Arrastras sobre el plano del disco para lanzar nubes de gas, estrellas o planetas. Su trayectoria se integra con el potencial de Paczyński–Wiita y un registro anota si se destrozan por marea, se tragan enteros o cruzan el horizonte. |
| **Fusionar** | Dos agujeros negros orbitan en espiral, se fusionan y vibran (*ringdown*). Calcula masa y espín finales, energía radiada en ondas gravitacionales, masa de chirp y frecuencias, dibuja la onda h(t) y permite **escucharla**. |

**Agujeros negros reales** como plantilla: Cygnus X-1, Sagitario A\*, M87\*, GW150914 y TON 618. La calidad de render (baja, media o alta) se puede ajustar según el equipo.

### 🔭 Próximamente

- **Mecánica orbital:** leyes de Kepler, transferencias de Hohmann y puntos de Lagrange.

---

## Tecnologías

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) para el desarrollo y el build
- [Three.js](https://threejs.org/) con [React Three Fiber](https://r3f.docs.pmnd.rs/) y [drei](https://github.com/pmndrs/drei) para las escenas 3D, con shaders GLSL propios (planetas, atmósferas, estrellas y agujero negro)
- [Zustand](https://github.com/pmndrs/zustand) para el estado
- [React Router](https://reactrouter.com/) para la navegación
- [i18next](https://www.i18next.com/) para las traducciones (español / inglés)
- [Vitest](https://vitest.dev/) para los tests de los modelos físicos

## Puesta en marcha

Necesitas [Node.js](https://nodejs.org/) instalado.

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run preview  # previsualizar el build
npm test         # ejecutar los tests
```

## Estructura del proyecto

```
src/
├── pages/                  # Inicio, laboratorio planetario y de agujeros negros
├── components/             # Cabecera, selector de idioma y controles comunes
├── features/
│   ├── planet-lab/         # Física, habitabilidad, escena 3D, shaders y UI del planeta
│   └── black-hole-lab/     # Física, formación estelar, infall, fusión, shaders y UI
├── lib/                    # Utilidades (matemáticas, formato, color de cuerpo negro…)
├── i18n/                   # Traducciones es.json / en.json
└── styles.css
```

La lógica física de cada laboratorio está separada de la interfaz (`physics.ts`, `habitability.ts`, `formation.ts`, `infall.ts`, `merger.ts`), lo que permite probarla con tests independientes del render.
