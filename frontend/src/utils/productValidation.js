/**
 * Production-level validation utilities for product forms.
 * Used in both ProductCreate and ProductEdit.
 */

// ── Image / File constants ────────────────────────────────────────────────────
export const LOGO_MAX_SIZE_MB = 2;
export const LOGO_MAX_SIZE_BYTES = LOGO_MAX_SIZE_MB * 1024 * 1024;
export const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const LOGO_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
export const LOGO_MIN_DIMENSION = 50;   // px
export const LOGO_MAX_DIMENSION = 4096; // px

export const SCREENSHOT_MAX_SIZE_MB = 5;
export const SCREENSHOT_MAX_SIZE_BYTES = SCREENSHOT_MAX_SIZE_MB * 1024 * 1024;
export const SCREENSHOT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const SCREENSHOT_MAX_PER_SECTION = 10;

export const RESOURCE_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];
export const RESOURCE_MAX_SIZE_MB = 20;
export const RESOURCE_MAX_SIZE_BYTES = RESOURCE_MAX_SIZE_MB * 1024 * 1024;

// ── Field length limits ───────────────────────────────────────────────────────
export const LIMITS = {
  name: { min: 2, max: 100 },
  tagline: { max: 150 },
  developerName: { max: 100 },
  tag: { max: 30 },
  maxTags: 20,
  overviewTitle: { min: 2, max: 100 },
  overviewDescription: { min: 10, max: 5000 },
  featureTitle: { min: 2, max: 100 },
  featureDescription: { min: 10, max: 5000 },
  supportDescription: { max: 3000 },
  policies: { max: 5000 },
  // Custom tabs
  maxCustomTabs: 5,
  customTabName: { min: 2, max: 50 },
  maxCustomTabElements: 10,
  customTabElementTitle: { min: 2, max: 100 },
  customTabElementDescription: { min: 10, max: 5000 },
};

// ── Validate image file (type + size) ─────────────────────────────────────────
export function validateImageFile(file, opts = {}) {
  const {
    allowedTypes = LOGO_ALLOWED_TYPES,
    maxBytes = LOGO_MAX_SIZE_BYTES,
    label = 'Image',
  } = opts;

  if (!file) return { ok: false, error: 'No file selected.' };

  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: `${label}: Only ${allowedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')} files are allowed.`,
    };
  }

  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      error: `${label}: File size must be under ${mb}MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  return { ok: true };
}

// ── Validate image dimensions (returns a Promise) ─────────────────────────────
export function validateImageDimensions(file, opts = {}) {
  const {
    minW = LOGO_MIN_DIMENSION,
    minH = LOGO_MIN_DIMENSION,
    maxW = LOGO_MAX_DIMENSION,
    maxH = LOGO_MAX_DIMENSION,
    label = 'Image',
  } = opts;

  return new Promise((resolve) => {
    // SVGs don't have raster dimensions — skip dimension check
    if (file.type === 'image/svg+xml') {
      resolve({ ok: true });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w < minW || h < minH) {
        resolve({
          ok: false,
          error: `${label}: Minimum resolution is ${minW}×${minH}px (uploaded: ${w}×${h}px).`,
        });
      } else if (w > maxW || h > maxH) {
        resolve({
          ok: false,
          error: `${label}: Maximum resolution is ${maxW}×${maxH}px (uploaded: ${w}×${h}px).`,
        });
      } else {
        resolve({ ok: true, width: w, height: h });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: `${label}: Could not read image dimensions.` });
    };
    img.src = url;
  });
}

// ── Validate full logo upload ─────────────────────────────────────────────────
export async function validateLogoFile(file) {
  const typeCheck = validateImageFile(file, {
    allowedTypes: LOGO_ALLOWED_TYPES,
    maxBytes: LOGO_MAX_SIZE_BYTES,
    label: 'Logo',
  });
  if (!typeCheck.ok) return typeCheck;

  const dimCheck = await validateImageDimensions(file, {
    minW: LOGO_MIN_DIMENSION,
    minH: LOGO_MIN_DIMENSION,
    maxW: LOGO_MAX_DIMENSION,
    maxH: LOGO_MAX_DIMENSION,
    label: 'Logo',
  });
  return dimCheck;
}

// ── Validate screenshot file ──────────────────────────────────────────────────
export function validateScreenshotFile(file) {
  return validateImageFile(file, {
    allowedTypes: SCREENSHOT_ALLOWED_TYPES,
    maxBytes: SCREENSHOT_MAX_SIZE_BYTES,
    label: 'Screenshot',
  });
}

// ── Validate resource file ────────────────────────────────────────────────────
export function validateResourceFile(file) {
  if (!file) return { ok: false, error: 'No file selected.' };

  if (!RESOURCE_ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Resource: Only PDF, Word, Excel, CSV, or TXT files are allowed.' };
  }
  if (file.size > RESOURCE_MAX_SIZE_BYTES) {
    return {
      ok: false,
      error: `Resource: File size must be under ${RESOURCE_MAX_SIZE_MB}MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }
  return { ok: true };
}

// ── Validate URL string ───────────────────────────────────────────────────────
export function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Validate tag ──────────────────────────────────────────────────────────────
export function validateTag(tag, existingTags) {
  const t = tag.trim();
  if (!t) return { ok: false, error: 'Tag cannot be empty.' };
  if (t.length > LIMITS.tag.max) return { ok: false, error: `Tag must be under ${LIMITS.tag.max} characters.` };
  if (existingTags.length >= LIMITS.maxTags) return { ok: false, error: `Maximum ${LIMITS.maxTags} tags allowed.` };
  if (existingTags.includes(t)) return { ok: false, error: 'Tag already added.' };
  return { ok: true };
}

// ── Validate full form before save ───────────────────────────────────────────
export function validateProductForm(form) {
  const errors = [];

  // Name
  const name = (form.name || '').trim();
  if (!name) {
    errors.push('Product name is required.');
  } else if (name.length < LIMITS.name.min) {
    errors.push(`Product name must be at least ${LIMITS.name.min} characters.`);
  } else if (name.length > LIMITS.name.max) {
    errors.push(`Product name must be under ${LIMITS.name.max} characters.`);
  }

  // Tagline
  if (form.tagline && form.tagline.length > LIMITS.tagline.max) {
    errors.push(`Tagline must be under ${LIMITS.tagline.max} characters.`);
  }

  // Developer Name
  if (form.developerName && form.developerName.length > LIMITS.developerName.max) {
    errors.push(`Developer name must be under ${LIMITS.developerName.max} characters.`);
  }

  // Overview
  (form.overview || []).forEach((item, i) => {
    const t = (item.title || '').trim();
    const d = (item.description || '').trim();
    if (t && t.length > LIMITS.overviewTitle.max) {
      errors.push(`Overview #${i + 1} title must be under ${LIMITS.overviewTitle.max} characters.`);
    }
    if (d && d.length > LIMITS.overviewDescription.max) {
      errors.push(`Overview #${i + 1} description must be under ${LIMITS.overviewDescription.max} characters.`);
    }
    if (item.screenshots && item.screenshots.length > SCREENSHOT_MAX_PER_SECTION) {
      errors.push(`Overview #${i + 1} can have at most ${SCREENSHOT_MAX_PER_SECTION} screenshots.`);
    }
  });

  // Features
  (form.features || []).forEach((item, i) => {
    const t = (item.title || '').trim();
    const d = (item.description || '').trim();
    if (t && t.length > LIMITS.featureTitle.max) {
      errors.push(`Feature #${i + 1} title must be under ${LIMITS.featureTitle.max} characters.`);
    }
    if (d && d.length > LIMITS.featureDescription.max) {
      errors.push(`Feature #${i + 1} description must be under ${LIMITS.featureDescription.max} characters.`);
    }
    if (item.screenshots && item.screenshots.length > SCREENSHOT_MAX_PER_SECTION) {
      errors.push(`Feature #${i + 1} can have at most ${SCREENSHOT_MAX_PER_SECTION} screenshots.`);
    }
  });

  // Support & Policies
  if (form.supportDescription && form.supportDescription.length > LIMITS.supportDescription.max) {
    errors.push(`Support description must be under ${LIMITS.supportDescription.max} characters.`);
  }
  if (form.policies && form.policies.length > LIMITS.policies.max) {
    errors.push(`Policies must be under ${LIMITS.policies.max} characters.`);
  }

  // Custom Tabs
  const customTabs = form.customTabs || [];
  if (customTabs.length > LIMITS.maxCustomTabs) {
    errors.push(`Maximum ${LIMITS.maxCustomTabs} custom tabs allowed.`);
  }
  customTabs.forEach((tab, ti) => {
    const tn = (tab.tabName || '').trim();
    if (!tn) {
      errors.push(`Custom tab #${ti + 1} name is required.`);
    } else if (tn.length < LIMITS.customTabName.min) {
      errors.push(`Custom tab #${ti + 1} name must be at least ${LIMITS.customTabName.min} characters.`);
    } else if (tn.length > LIMITS.customTabName.max) {
      errors.push(`Custom tab #${ti + 1} name must be under ${LIMITS.customTabName.max} characters.`);
    }
    const elements = tab.elements || [];
    if (elements.length > LIMITS.maxCustomTabElements) {
      errors.push(`Custom tab "${tn || ti + 1}" can have at most ${LIMITS.maxCustomTabElements} elements.`);
    }
    elements.forEach((el, ei) => {
      const et = (el.title || '').trim();
      const ed = (el.description || '').trim();
      if (et && et.length > LIMITS.customTabElementTitle.max) {
        errors.push(`Custom tab "${tn}" element #${ei + 1} title must be under ${LIMITS.customTabElementTitle.max} characters.`);
      }
      if (ed && ed.length > LIMITS.customTabElementDescription.max) {
        errors.push(`Custom tab "${tn}" element #${ei + 1} description must be under ${LIMITS.customTabElementDescription.max} characters.`);
      }
      if (el.screenshots && el.screenshots.length > SCREENSHOT_MAX_PER_SECTION) {
        errors.push(`Custom tab "${tn}" element #${ei + 1} can have at most ${SCREENSHOT_MAX_PER_SECTION} screenshots.`);
      }
    });
  });

  return errors;
}
