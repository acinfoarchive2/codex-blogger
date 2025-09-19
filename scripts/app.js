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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.readAsDataURL(file);
  });

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

  let finalContent = normalizeContent(content);

  try {
    if (image && image.size > 0) {
      const imageDataUrl = await fileToDataUrl(image);
      finalContent += `\n<p><img src="${imageDataUrl}" alt="Imagen del artículo" style="max-width:100%;height:auto;" /></p>`;
    }
  } catch (error) {
    setStatus(error.message, 'error');
    return;
  }

  const payload = {
    kind: 'blogger#post',
    title,
    content: finalContent,
  };

  setStatus('Publicando artículo…', 'info');

  try {
    const response = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorResponse = await response.json().catch(() => ({}));
      const errorMessage =
        errorResponse?.error?.message || 'No se pudo publicar la entrada en Blogger.';
      throw new Error(errorMessage);
    }

    const result = await response.json();
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
