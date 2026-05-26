/**
 * Astro Western Premium - PDF Payload Validation
 * 
 * Strict validation: No fallback, no skeleton, no fail-open.
 * If data is missing, PDF generation must FAIL.
 */

/**
 * Validate astrology PDF payload before generation
 * @param {Object} payload - PDF payload to validate
 * @returns {Object} { ok: boolean, errors: string[], warnings: string[] }
 */
export function validateAstroPdfPayload(payload) {
  const errors = [];
  const warnings = [];

  if (!payload) {
    errors.push("payload is null or undefined");
    return { ok: false, errors, warnings };
  }

  // ============================================================
  // Mode validation
  // ============================================================
  if (payload.mode !== "natal") {
    errors.push(`mode must be "natal", got "${payload.mode}"`);
  }

  // ============================================================
  // User info validation
  // ============================================================
  if (!payload.user) {
    errors.push("user object missing");
  } else {
    if (!payload.user.birthInfo) {
      errors.push("user.birthInfo missing");
    } else {
      const bi = payload.user.birthInfo;
      if (!bi.year || !bi.month || !bi.day) {
        errors.push("user.birthInfo missing year/month/day");
      }
    }
    if (!payload.user.timezone) {
      warnings.push("user.timezone missing (will use UTC)");
    }
    if (!payload.user.location) {
      warnings.push("user.location missing");
    }
  }

  // ============================================================
  // Astro data validation
  // ============================================================
  if (!payload.astro) {
    errors.push("astro object missing");
  } else {
    // Chart ID or signature
    if (!payload.astro.chartId && !payload.astro.chartSignature) {
      errors.push("astro.chartId or astro.chartSignature missing");
    }

    // Sun
    if (!payload.astro.luminaries?.sun && !payload.astro.planets?.sun) {
      errors.push("Sun data missing (required in both luminaries and planets)");
    }

    // Moon
    if (!payload.astro.luminaries?.moon && !payload.astro.planets?.moon) {
      errors.push("Moon data missing (required in both luminaries and planets)");
    }

    // Ascendant
    if (!payload.astro.angles?.ascendant) {
      errors.push("Ascendant (ASC) missing");
    }

    // Planets
    if (!payload.astro.planets || Object.keys(payload.astro.planets).length === 0) {
      errors.push("planets data missing or empty");
    } else {
      const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
      for (const planet of requiredPlanets) {
        if (!payload.astro.planets[planet]) {
          errors.push(`Missing planet: ${planet}`);
        }
      }
    }

    // Optional but recommended
    if (!payload.astro.aspects || payload.astro.aspects.length === 0) {
      warnings.push("No aspects data provided");
    }

    // Forbidden structures
    if (payload.astro.compatibility || payload.astro.partner || payload.astro.synastry || payload.astro.composite) {
      errors.push(
        "Compatibility/partner/synastry/composite data detected. " +
        "This is a personal natal chart PDF, not a compatibility report."
      );
    }
  }

  // ============================================================
  // Chapters validation
  // ============================================================
  if (!payload.chapters || !Array.isArray(payload.chapters)) {
    errors.push("chapters array missing or invalid");
  } else if (payload.chapters.length === 0) {
    errors.push("chapters array is empty");
  } else {
    for (let i = 0; i < payload.chapters.length; i++) {
      const chapter = payload.chapters[i];

      if (!chapter.id) {
        errors.push(`chapter[${i}] missing id`);
      }
      if (!chapter.title) {
        errors.push(`chapter[${i}] missing title`);
      }
      if (!chapter.categories || !Array.isArray(chapter.categories)) {
        errors.push(`chapter[${i}] categories array missing or invalid`);
      } else if (chapter.categories.length === 0) {
        errors.push(`chapter[${i}] categories array is empty`);
      } else {
        for (let j = 0; j < chapter.categories.length; j++) {
          const category = chapter.categories[j];

          if (!category.id) {
            errors.push(`chapter[${i}].categories[${j}] missing id`);
          }
          if (!category.title) {
            errors.push(`chapter[${i}].categories[${j}] missing title`);
          }
          if (!category.sourceData) {
            errors.push(
              `chapter[${i}].categories[${j}] sourceData missing. ` +
              `Cannot generate category without astrology source data.`
            );
          } else if (Object.keys(category.sourceData).length === 0) {
            errors.push(`chapter[${i}].categories[${j}] sourceData is empty`);
          }
          if (!category.writingInstruction) {
            errors.push(`chapter[${i}].categories[${j}] writingInstruction missing`);
          }
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Assert strict payload validation
 * Throws if validation fails
 */
export function assertAstroPdfPayloadValid(payload) {
  const { ok, errors, warnings } = validateAstroPdfPayload(payload);

  if (!ok) {
    const errorMessage = [
      "[AstroBook] Payload validation failed:",
      ...errors.map((e) => `  - ${e}`),
      ...(warnings.length > 0 ? ["Warnings:", ...warnings.map((w) => `  - ${w}`)] : []),
    ].join("\n");

    throw new Error(errorMessage);
  }

  if (warnings.length > 0) {
    console.warn("[AstroBook] Payload validation warnings:", warnings);
  }
}
