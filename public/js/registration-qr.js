(function () {
  const form = document.querySelector('[data-qr-autofill-form]');
  const panel = document.querySelector('[data-qr-autofill]');

  if (!form || !panel) {
    return;
  }

  const endpoint = panel.getAttribute('data-endpoint');
  const input = panel.querySelector('#credentialQrInputPreview');
  const button = panel.querySelector('[data-qr-fill]');
  const status = panel.querySelector('[data-qr-status]');
  const preview = panel.querySelector('[data-qr-preview]');
  const personTypeField = form.querySelector('[name="personType"]');
  const roleField = form.querySelector('[name="participantRole"]');
  const typeScopedFields = Array.from(form.querySelectorAll('[data-person-types]'));

  const hiddenCredentialInput = form.querySelector('input[name="credentialQrInput"]');
  const hiddenCredentialUrl = form.querySelector('input[name="credentialQrUrl"]');
  const hiddenCredentialToken = form.querySelector('input[name="credentialQrToken"]');
  const hiddenCredentialCurp = form.querySelector('input[name="credentialCurp"]');
  const hiddenCredentialEscuela = form.querySelector('input[name="credentialEscuela"]');
  const hiddenCredentialTurno = form.querySelector('input[name="credentialTurno"]');

  function setValue(name, value) {
    const field = form.querySelector(`[name="${name}"]`) || panel.querySelector(`[name="${name}"]`);
    if (!field) {
      return;
    }

    field.value = value || '';
  }

  function updatePersonTypeView() {
    const currentType = String(personTypeField?.value || '').toUpperCase();

    typeScopedFields.forEach((wrapper) => {
      const allowedTypes = String(wrapper.getAttribute('data-person-types') || '')
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean);
      const visible = allowedTypes.includes(currentType);
      wrapper.hidden = !visible;

      wrapper.querySelectorAll('input, select, textarea').forEach((field) => {
        if (!field.dataset.baseRequired) {
          field.dataset.baseRequired = field.required ? '1' : '0';
        }

        const shouldRequire = visible && field.dataset.baseRequired === '1';
        field.required = shouldRequire;
        field.disabled = !visible;
      });
    });

    if (roleField) {
      if (currentType === 'ALUMNO') {
        roleField.value = 'OBSERVADOR';
      }
    }
  }

  function syncHiddenFields(data) {
    if (hiddenCredentialInput) hiddenCredentialInput.value = data.credentialQrInput || input.value || '';
    if (hiddenCredentialUrl) hiddenCredentialUrl.value = data.credentialQrUrl || '';
    if (hiddenCredentialToken) hiddenCredentialToken.value = data.credentialQrToken || '';
    if (hiddenCredentialCurp) hiddenCredentialCurp.value = data.curp || '';
    if (hiddenCredentialEscuela) hiddenCredentialEscuela.value = data.school || '';
    if (hiddenCredentialTurno) hiddenCredentialTurno.value = data.turno || '';
  }

  function addChip(text) {
    if (!preview || !text) {
      return;
    }

    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = text;
    preview.appendChild(chip);
  }

  async function autofill() {
    const credentialQrInput = String(input.value || '').trim();
    if (!credentialQrInput) {
      status.textContent = 'Pega primero el enlace o token del QR.';
      return;
    }

    status.textContent = 'Leyendo credencial...';
    preview.innerHTML = '';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credentialQrInput })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'No fue posible leer la credencial.');
    }

    const data = result.data || {};
    setValue('fullName', data.fullName);
    setValue('boleta', data.boleta);
    setValue('credentialCurp', data.curp);
    setValue('carrera', data.career);
    setValue('escuela', data.school);
    setValue('turno', data.turno);
    setValue('credentialEscuela', data.school);
    setValue('credentialTurno', data.turno);
    syncHiddenFields(data);

    if (data.personTypeHint) {
      setValue('personType', data.personTypeHint);
      updatePersonTypeView();
    }

    if (data.personTypeHint === 'ALUMNO') {
      const procedenciaField = form.querySelector('[name="procedencia"]') || panel.querySelector('[name="procedencia"]');
      if (procedenciaField && !procedenciaField.value) {
        setValue('procedencia', data.school);
      }
    }

    addChip(data.fullName || 'Credencial leida');
    addChip(data.boleta ? `Boleta ${data.boleta}` : 'Sin boleta');
    addChip(data.career || 'Carrera no disponible');
    addChip(data.turno ? `Turno ${data.turno}` : 'Turno no disponible');
    status.textContent = 'Credencial cargada correctamente.';
  }

  button.addEventListener('click', async () => {
    try {
      await autofill();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  input.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      syncHiddenFields({ credentialQrInput: input.value });
      try {
        await autofill();
      } catch (error) {
        status.textContent = error.message;
      }
    }
  });

  input.addEventListener('input', () => {
    syncHiddenFields({ credentialQrInput: input.value });
  });

  if (personTypeField) {
    personTypeField.addEventListener('change', updatePersonTypeView);
  }

  updatePersonTypeView();
})();