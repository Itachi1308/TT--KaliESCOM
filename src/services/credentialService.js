function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&aacute;/g, 'á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&eacute;/g, 'é')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&iacute;/g, 'í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&oacute;/g, 'ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&uacute;/g, 'ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&C&Oacute;MPUTO/g, 'CÓMPUTO')
    .replace(/&Iacute;A/g, 'ÍA')
    .trim();
}

function normalizeQrInput(qrInput) {
  const rawInput = String(qrInput || '').trim();
  if (!rawInput) {
    throw new Error('Captura o pega el enlace del QR de la credencial.');
  }

  try {
    const url = new URL(rawInput);
    const token = url.searchParams.get('h') || url.searchParams.get('token') || url.hash.replace('#', '') || rawInput;
    return {
      token: String(token).trim(),
      credentialUrl: url.toString()
    };
  } catch (error) {
    const token = rawInput.replace(/^h=/i, '').trim();
    return {
      token,
      credentialUrl: `https://servicios.dae.ipn.mx/vcred/?h=${encodeURIComponent(token)}`
    };
  }
}

function extractFirstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  if (!match) {
    return '';
  }

  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

function parseCredentialHtml(html) {
  const boleta = extractFirstMatch(html, /class=['"]boleta['"][^>]*>([^<]+)/i);
  const fullName = extractFirstMatch(html, /class=['"]nombre['"][^>]*>([^<]+)/i);
  const curp = extractFirstMatch(html, /class=['"]curp['"][^>]*>([^<]+)/i);
  const career = extractFirstMatch(html, /class=['"]carrera['"][^>]*>([^<]+)/i);
  const school = extractFirstMatch(html, /class=['"]escuela['"][^>]*>([^<]+)/i);
  const turno = extractFirstMatch(html, /Turno:\s*<b>([^<]+)/i);
  const status = extractFirstMatch(html, /<b>(Inscrito|No inscrito|Cancelado|Egresado)[^<]*<\/b>/i);

  return {
    boleta,
    fullName,
    curp,
    career,
    school,
    turno,
    status,
    personTypeHint: boleta ? 'ALUMNO' : 'DOCENTE'
  };
}

async function parseCredentialInput(qrInput) {
  const normalized = normalizeQrInput(qrInput);
  try {
    const response = await fetch(normalized.credentialUrl, {
      headers: {
        'user-agent': 'ESCOM-Eventos/1.0'
      }
    });

    if (!response.ok) {
      // Return minimal info instead of throwing to allow registration with token-only
      return {
        boleta: '',
        fullName: '',
        curp: '',
        career: '',
        school: '',
        turno: '',
        status: '',
        personTypeHint: null,
        credentialQrInput: String(qrInput).trim(),
        credentialQrUrl: normalized.credentialUrl,
        credentialQrToken: normalized.token
      };
    }

    const html = await response.text();
    const parsed = parseCredentialHtml(html);

    return {
      ...parsed,
      credentialQrInput: String(qrInput).trim(),
      credentialQrUrl: normalized.credentialUrl,
      credentialQrToken: normalized.token
    };
  } catch (err) {
    // Network or CORS failures — return minimal token info so registration may proceed
    return {
      boleta: '',
      fullName: '',
      curp: '',
      career: '',
      school: '',
      turno: '',
      status: '',
      personTypeHint: null,
      credentialQrInput: String(qrInput).trim(),
      credentialQrUrl: normalized.credentialUrl,
      credentialQrToken: normalized.token
    };
  }
}

function parseCurp(curp) {
  const normalized = String(curp || '').trim().toUpperCase();
  
  if (!normalized || normalized.length < 13) {
    return {
      age: null,
      gender: null,
      birthplace: null,
      birthDate: null,
      isValid: false
    };
  }

  try {
    // CURP format: 6 letters + YYMMDD + 3 state letters + 3 name consonants + 1 check digit
    // Extract date of birth: positions 4-9 (YYMMDD)
    const yearStr = normalized.substring(4, 6);
    const monthStr = normalized.substring(6, 8);
    const dayStr = normalized.substring(8, 10);

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);

    // Determine full year (19XX or 20XX)
    const fullYear = year > 30 ? 1900 + year : 2000 + year;

    // Validate date
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { age: null, gender: null, birthplace: null, birthDate: null, isValid: false };
    }

    const birthDate = new Date(fullYear, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Extract birthplace from positions 9-11 (state code)
    const birthplaceCode = normalized.substring(9, 12);

    return {
      age: age > 0 ? age : null,
      gender: null, // Gender not reliably extractable from CURP
      birthDate: birthDate,
      birthplace: birthplaceCode,
      isValid: true
    };
  } catch (e) {
    return { age: null, gender: null, birthplace: null, birthDate: null, isValid: false };
  }
}

function validateNameMatch(curpName, credentialName) {
  const normalizeName = (name) => {
    return String(name || '')
      .trim()
      .toUpperCase()
      .replace(/[ÁÉÍÓÚñ]/g, (c) => {
        const map = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'ñ': 'N' };
        return map[c] || c;
      });
  };

  const curpNameNorm = normalizeName(curpName);
  const credentialNameNorm = normalizeName(credentialName);

  // Check if the credential name contains the CURP name (allow partial matches)
  return credentialNameNorm.includes(curpNameNorm) || curpNameNorm.includes(credentialNameNorm);
}

module.exports = {
  parseCredentialInput,
  normalizeQrInput,
  parseCredentialHtml,
  parseCurp,
  validateNameMatch
};