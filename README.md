# Publicador de entradas para Blogger

Aplicación web sencilla que permite redactar un artículo, añadir una imagen e
insertar la publicación en un blog de Blogger específico (ID `7027208528883466919`).

## Requisitos previos

1. **Credenciales de Google**: crea un OAuth Client ID de tipo "Web application"
   desde [Google Cloud Console](https://console.cloud.google.com/). Añade la URL
   en la que alojarás esta página a la lista de orígenes autorizados.
2. **Permisos sobre Blogger**: la cuenta que utilices debe tener permisos de
   edición en el blog indicado.

## Configuración

1. Clona o descarga este repositorio.
2. Edita el archivo [`scripts/app.js`](scripts/app.js) y reemplaza el valor de la
   constante `CLIENT_ID` por tu propio identificador OAuth generado en Google
   Cloud.
3. (Opcional) Ajusta estilos o textos según tus necesidades.

> ⚠️ Sin un Client ID válido no se podrá completar la autenticación con Google y
> por tanto no se enviarán publicaciones al blog.

## Uso

1. Abre `index.html` en un navegador moderno. Si necesitas hospedarla localmente
   puedes utilizar un servidor estático, por ejemplo:

   ```bash
   python -m http.server 8080
   ```

   y luego acceder a `http://localhost:8080`.
2. Pulsa el botón **"Conectar con Google"** y acepta los permisos solicitados.
3. Rellena el formulario con el título, contenido y (opcionalmente) una imagen.
4. Haz clic en **"Publicar en Blogger"**. Si todo va bien se mostrará un enlace a
   la entrada publicada.

## Notas técnicas

- El contenido enviado se procesa en el navegador para convertir saltos de línea
  en párrafos HTML y para incrustar la imagen seleccionada mediante un Data URL.
- La comunicación con Blogger se realiza a través de `fetch` hacia la API v3,
  utilizando el token OAuth obtenido con Google Identity Services.
- Al publicar, el formulario se restablece automáticamente para facilitar la
  creación de nuevas entradas.
