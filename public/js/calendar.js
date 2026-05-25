(function () {
  const calendarElement = document.getElementById('calendar');
  if (!calendarElement) {
    return;
  }

  const detailElement = document.getElementById('eventDetail');
  const typeCheckboxes = Array.from(document.querySelectorAll('.filter-type'));
  const spaceCheckboxes = Array.from(document.querySelectorAll('.filter-space'));
  const applyButton = document.getElementById('applyFilters');
  const clearButton = document.getElementById('clearFilters');

  function selectedValues(inputs) {
    return inputs.filter((input) => input.checked).map((input) => input.value);
  }

  function buildEndpoint() {
    const typeValues = selectedValues(typeCheckboxes);
    const spaceValues = selectedValues(spaceCheckboxes);

    const params = new URLSearchParams();

    if (typeValues.length > 0) {
      params.set('types', typeValues.join(','));
    }

    if (spaceValues.length > 0) {
      params.set('spaces', spaceValues.join(','));
    }

    return `/api/events?${params.toString()}`;
  }

  const calendar = new FullCalendar.Calendar(calendarElement, {
    locale: 'es',
    timeZone: 'local',
    initialView: 'dayGridMonth',
    initialDate: new Date(),
    nowIndicator: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Dia',
      list: 'Lista'
    },
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const response = await fetch(buildEndpoint());
        const payload = await response.json();

        if (!payload.ok) {
          throw new Error(payload.message || 'Error desconocido');
        }

        successCallback(payload.data);
      } catch (error) {
        failureCallback(error);
      }
    },
    eventClick: function (info) {
      const props = info.event.extendedProps;
      detailElement.innerHTML = `
        <h4>${info.event.title}</h4>
        <p><strong>Tipo:</strong> ${props.typeName}</p>
        <p><strong>Espacio:</strong> ${props.spaceName}</p>
        <p><strong>Horario:</strong> ${new Date(info.event.start).toLocaleString('es-MX')} - ${new Date(info.event.end).toLocaleString('es-MX')}</p>
        <p><strong>Organiza:</strong> ${props.organizer}</p>
        <p><strong>Capacidad:</strong> ${props.capacity}</p>
        <p><strong>Registro previo:</strong> ${props.requiresRegistration ? 'Si' : 'No'}</p>
        <p><strong>Visitantes externos:</strong> ${props.hasExternalVisitors ? 'Si' : 'No'}</p>
        <p>${props.description || ''}</p>
      `;
    }
  });

  applyButton.addEventListener('click', function () {
    calendar.refetchEvents();
  });

  clearButton.addEventListener('click', function () {
    typeCheckboxes.forEach((input) => {
      input.checked = true;
    });

    spaceCheckboxes.forEach((input) => {
      input.checked = true;
    });

    calendar.refetchEvents();
  });

  calendar.render();
})();
