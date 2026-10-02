# Integración de CineMax

## Ejecutar
Backend: `pnpm run start:dev` en `cineMax-Backend` (puerto 3001 por defecto).
Frontend: `pnpm run dev` en `CineMax/cinemax` (puerto 3000).

Backend requiere DATABASE_URL, DIRECT_URL, JWT_SECRET y APIKEY_RESEND.
Opcionales: PORT, FRONTEND_URL (origen permitido), EMAIL_FROM (remitente verificado).
Frontend: NEXT_PUBLIC_API_URL=http://localhost:3001.
No subir .env al repositorio.

## Primera cuenta
Definir BOOTSTRAP_ADMIN_EMAIL en el .env del backend con el correo autorizado.
Registrar ese correo en /register, verificar el código recibido e iniciar sesión.
Solo esa cuenta verificada recibe SUPER_ADMIN, y solo si no existe otro.
Se puede retirar BOOTSTRAP_ADMIN_EMAIL después del primer inicio de sesión.
Con el remitente onboarding@resend.dev, Resend limita los destinatarios a la cuenta del servicio. Para otros usuarios, configurar un dominio verificado y EMAIL_FROM.

## Orden de carga
1. Crear un cine en /administracion/cines.
2. Crear salas con nombre y capacidad.
3. Crear películas (duración en minutos; rating es puntuación, no clasificación por edad).
4. Crear funciones seleccionando película y sala del mismo cine. La fecha ingresada se interpreta en la zona horaria local del navegador y se envía en UTC.
5. Asignar administradores registrados a los cines desde Usuarios.

Los administradores de cine solo pueden gestionar su cine. SUPER_ADMIN puede seleccionar cualquiera.
Los registros relacionados impiden eliminar una película o sala: se muestra un conflicto sin borrar datos asociados.
El esquema actual permite editar únicamente el horario de una función.
Los catálogos públicos se sirven desde /catalog y /catalog/movie/:id; no requieren token.
La cartelera agrupa funciones futuras por fecha concreta y muestra horarios de Argentina.

## Pruebas
Backend: `pnpm run test:integration` y `pnpm run build`.
Frontend: `pnpm run lint` y `pnpm run build`.
Las pruebas HTTP usan una base simulada en memoria; no escriben registros de prueba en Supabase.

## Límites del esquema existente
No hay persistencia para mapas de butacas, formato/idioma de función ni clasificación por edad.
Se retiraron datos ficticios y operaciones locales de administración.
Venta de entradas, precios y consulta de tickets quedan expresamente no disponibles hasta contar con API.
La edición de perfil preexistente continúa siendo local al navegador; no forma parte de los módulos de esta integración.

## Seed de un cine y administrador de prueba
Ejecutar `pnpm run seed` desde el backend (también `pnpm exec prisma db seed`).
Crea CineMax Central y admin@cinemax.test con rol ADMIN_CINEMA, vinculado al cine y con email verificado para pruebas locales.
Genera una contraseña aleatoria y la muestra solo al crear la cuenta; guardarla en un gestor.
Las ejecuciones posteriores conservan datos y contraseña, y no duplican registros.
No modifica cuentas existentes de otro rol/cine ni reemplaza administradores.
Variables opcionales en .env: SEED_CINEMA_ID (UUID), SEED_CINEMA_NAME, SEED_CINEMA_ADDRESS, SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD.
Para otro cine utilizar un SEED_CINEMA_ID diferente y un email diferente.
Este administrador gestiona su cine; no es SUPER_ADMIN.

## Seed de películas
`pnpm run seed:movies` agrega seis películas ficticias de desarrollo al cine configurado en SEED_CINEMA_ID (por defecto CineMax Central).
Incluye título, sinopsis, duración, puntuación, géneros y fecha de estreno.
Los pósters y tráilers quedan vacíos para poder cargarlos desde administración.
Los identificadores dependen del cine y de una clave estable de película: repetir el comando no duplica ni sobrescribe registros editados.
El seed completo (`pnpm run seed`) también incluye este catálogo.
No crea salas ni funciones.
