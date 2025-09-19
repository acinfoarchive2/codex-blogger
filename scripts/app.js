const BLOG_ID = '7027208528883466919';
const CLIENT_ID = '729158287583-6qfobrrb9q6uufgeluic857mhlo4fbr6.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/blogger';

let accessToken = null;
let tokenClient = null;

const statusElement = document.getElementById('status');
const authorizeButton = document.getElementById('authorize');
const form = document.getElementById('postForm');

const setStatus = (message, variant = 'info', link) => {
  statusElement.className = `status status--${variant}`;
  statusElement.textContent = message;

  if (link) {
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    statusElement.append(' ', anchor);
  }
};

const normalizeContent = (text) => {
  if (!text) return '';
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) =>
      `<p>${paragraph.replace(/\n/g, '<br />')}</p>`
    );
  return paragraphs.join('');
};

const ensureGoogleClient = () => {
  if (typeof window.google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    window.setTimeout(ensureGoogleClient, 200);
    return;
  }

  if (CLIENT_ID === 'REPLACE_WITH_GOOGLE_CLIENT_ID') {
    setStatus(
      'Configura tu Google OAuth Client ID en scripts/app.js antes de continuar.',
      'warning'
    );
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      if (accessToken) {
        setStatus('Autenticación completada. Ahora puedes publicar tu entrada.', 'success');
      }
    },
  });

  authorizeButton.disabled = false;
};

const publishPost = async (event) => {
  event.preventDefault();

  if (!tokenClient || !accessToken) {
    setStatus('Debes autorizar la aplicación antes de publicar.', 'error');
    return;
  }

  const formData = new FormData(form);
  const title = formData.get('title').trim();
  const content = formData.get('content').trim();
  const image = formData.get('image');

  if (!title || !content) {
    setStatus('El título y el contenido son obligatorios.', 'error');
    return;
  }

  const normalizedContent = normalizeContent(content);

  try {
    const hasImage = image && image.size > 0;
    const basePayload = {
      kind: 'blogger#post',
      title,
      content: normalizedContent,
    };

    setStatus('Publicando artículo…', 'info');

    const endpointBase = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`;
    let fetchUrl = endpointBase;
    let fetchOptions;

    if (hasImage) {
      const boundary = `bloggerboundary-${Date.now()}`;
      const sanitizedFileName = (image.name || 'imagen').replace(/["\\]/g, '_');
      const imageBuffer = await image.arrayBuffer();
      const multipartBody = new Blob(
        [
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
            basePayload
          )}\r\n`,
          `--${boundary}\r\nContent-Type: ${
            image.type || 'application/octet-stream'
          }\r\nContent-Disposition: attachment; filename="${sanitizedFileName}"\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
          new Uint8Array(imageBuffer),
          `\r\n--${boundary}--\r\n`,
        ],
        { type: `multipart/related; boundary=${boundary}` }
      );

      fetchUrl = `${endpointBase}?uploadType=multipart`;
      fetchOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      };
    } else {
      fetchOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basePayload),
      };
    }

    const response = await fetch(fetchUrl, fetchOptions);

    if (!response.ok) {
      const errorResponse = await response.json().catch(() => ({}));
      const errorMessage =
        errorResponse?.error?.message || 'No se pudo publicar la entrada en Blogger.';
      throw new Error(errorMessage);
    }

    let result = await response.json();

    if (hasImage) {
      const extractImageSrc = (html) => {
        if (!html) return null;
        const match = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
        return match ? match[1] : null;
      };

      const existingImageSrc = extractImageSrc(result.content);
      const hostedImageUrl = existingImageSrc || result.images?.[0]?.url || null;

      if (!hostedImageUrl) {
        throw new Error('No se pudo obtener la URL alojada de la imagen subida.');
      }

      if (!existingImageSrc) {
        const updatedContent = `${normalizedContent}<p><img src="${hostedImageUrl}" alt="Imagen del artículo" style="max-width:100%;height:auto;" /></p>`;
        const patchResponse = await fetch(
          `${endpointBase}${result.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: updatedContent }),
          }
        );

        if (!patchResponse.ok) {
          const patchError = await patchResponse.json().catch(() => ({}));
          const patchMessage =
            patchError?.error?.message || 'No se pudo actualizar el contenido con la imagen alojada.';
          throw new Error(patchMessage);
        }

        result = await patchResponse.json();
      }
    }

    setStatus('Artículo publicado correctamente.', 'success', {
      url: result.url,
      label: 'Ver la entrada en Blogger',
    });
    form.reset();
  } catch (error) {
    setStatus(`Error al publicar: ${error.message}`, 'error');
  }
};

authorizeButton.addEventListener('click', () => {
  if (!tokenClient) {
    setStatus('Todavía estamos cargando la librería de autenticación de Google.', 'warning');
    return;
  }

  tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
});

form.addEventListener('submit', publishPost);

ensureGoogleClient();
