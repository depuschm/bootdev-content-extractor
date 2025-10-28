// Data Validator Utility
// Validates extracted data before processing/export

const Validator = {
  /**
   * Validate extracted content data
   * @param {Object} data - Extracted content data
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateContent(data) {
    const errors = [];

    // Check required fields
    if (!data.type) {
      errors.push('Missing content type');
    }

    if (!data.exerciseType) {
      errors.push('Missing exercise type');
    }

    if (!data.title || data.title.trim() === '') {
      errors.push('Missing or empty title');
    }

    if (!data.description || data.description.trim() === '') {
      errors.push('Missing or empty description');
    }

    // Validate exercise-specific data
    if (data.exerciseType === 'interview') {
      if (!Array.isArray(data.interviewMessages)) {
        errors.push('Interview messages should be an array');
      } else if (data.interviewMessages.length === 0) {
        errors.push('No interview messages found');
      }
    } else if (data.exerciseType === 'coding') {
      // Coding exercises should have code files
      if (!data.allFiles || data.allFiles.length === 0) {
        errors.push('No code files found');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  /**
   * Validate Notion settings
   * @param {Object} settings - Notion settings
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateNotionSettings(settings) {
    const errors = [];

    if (!settings.notionToken || settings.notionToken.trim() === '') {
      errors.push('Notion token is required');
    }

    if (!settings.notionToken.startsWith('ntn_') && !settings.notionToken.startsWith('secret_')) {
      errors.push('Notion token format appears invalid');
    }

    if (!settings.databases || settings.databases.length === 0) {
      errors.push('At least one database must be configured');
    }

    if (settings.databases) {
      const validDatabases = settings.databases.filter(db => db.type && db.id);
      if (validDatabases.length === 0) {
        errors.push('No valid database configurations found');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  /**
   * Validate database configuration
   * @param {Array} databases - Array of database configs
   * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
   */
  validateDatabases(databases) {
    const errors = [];
    const warnings = [];
    const seenTypes = new Set();

    if (!Array.isArray(databases)) {
      errors.push('Databases must be an array');
      return { valid: false, errors, warnings };
    }

    databases.forEach((db, index) => {
      if (!db.type || db.type.trim() === '') {
        errors.push(`Database ${index + 1}: Missing type`);
      }

      if (!db.id || db.id.trim() === '') {
        warnings.push(`Database ${index + 1} (${db.type || 'unnamed'}): Missing ID`);
      }

      // Check for duplicate types (still not allowed)
      const normalizedType = db.type?.toLowerCase().trim();
      if (normalizedType && seenTypes.has(normalizedType)) {
        errors.push(`Duplicate database type: "${db.type}"`);
      }
      seenTypes.add(normalizedType);

      // Validate database ID format (should be 32 chars, alphanumeric)
      const trimmedId = db.id?.trim();
      if (trimmedId && (trimmedId.length !== 32 || !/^[a-f0-9]+$/i.test(trimmedId))) {
        warnings.push(`Database ${index + 1} (${db.type}): ID format may be invalid`);
      }
    });

    // Check for fallback database
    const hasFallback = databases.some(db => db.type?.toLowerCase().trim() === 'other');
    if (!hasFallback) {
      warnings.push('No "other" fallback database configured');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Sanitize filename for download
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if on valid Boot.dev page
   * @param {string} url - Current page URL
   * @returns {boolean} True if valid
   */
  isValidBootdevPage(url) {
    return url.includes('boot.dev/challenges/') || url.includes('boot.dev/lessons/');
  },
};

// Make available to other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validator;
}
