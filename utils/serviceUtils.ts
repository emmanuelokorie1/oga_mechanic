/**
 * Checks if a string looks like a raw database identifier (UUID, numeric ID, Mongo ID, etc.)
 * rather than human-readable text.
 */
export function isIdLike(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;

  // Standard UUID format: 8-4-4-4-12 hex characters (e.g. cdd61012-9899-4a1e-8729-e1adffe14da6)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }

  // Pure integer / numeric ID
  if (/^\d+$/.test(trimmed)) {
    return true;
  }

  // 24 or 32 character hex hash (e.g. Mongo ObjectId or md5)
  if (/^[0-9a-f]{24}$/i.test(trimmed) || /^[0-9a-f]{32}$/i.test(trimmed)) {
    return true;
  }

  // Prefixed identifiers like id-xxx, uuid-xxx
  if (/^(id|uuid)[-_]/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Formats snake_case strings to Title Case (e.g. "oil_change" -> "Oil Change")
 */
export function formatServiceTypeName(name: string): string {
  if (!name || isIdLike(name)) return '';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Resolves a human-friendly service display name from a repair request or raw service value.
 * Guaranteed to NEVER return a raw UUID or database ID.
 */
export function resolveServiceDisplayName(
  requestOrValue: any,
  availableServiceTypes?: Array<{ label?: string; value?: string; name?: string }>
): string {
  if (!requestOrValue) return '';

  // If passed a simple string (e.g. service_type directly)
  if (typeof requestOrValue === 'string') {
    const raw = requestOrValue.trim();
    if (!raw) return '';
    if (!isIdLike(raw)) {
      return formatServiceTypeName(raw);
    }
    // It's an ID, search availableServiceTypes
    const found = availableServiceTypes?.find(
      (s) => s.value?.toString().toLowerCase() === raw.toLowerCase()
    );
    if (found?.name && !isIdLike(found.name)) {
      return formatServiceTypeName(found.name);
    }
    if (found?.label && !isIdLike(found.label)) {
      const cleanLabel = found.label.split(' (')[0].trim();
      if (!isIdLike(cleanLabel)) {
        return formatServiceTypeName(cleanLabel);
      }
    }
    // Unresolved ID: NEVER return raw ID
    return '';
  }

  // If passed an object (e.g. request object)
  const req = requestOrValue;

  // 1. Direct explicit name fields if the backend provides them
  const candidateNames = [
    req.service_type_name,
    req.service_name,
    req.service_title,
    req.service?.name,
    req.service_type_detail?.name,
  ];
  for (const name of candidateNames) {
    if (name && typeof name === 'string' && !isIdLike(name)) {
      return formatServiceTypeName(name);
    }
  }

  // 2. Check req.service_type
  if (req.service_type && typeof req.service_type === 'string') {
    const raw = req.service_type.trim();
    if (!isIdLike(raw)) {
      return formatServiceTypeName(raw);
    }
    const found = availableServiceTypes?.find(
      (s) => s.value?.toString().toLowerCase() === raw.toLowerCase()
    );
    if (found?.name && !isIdLike(found.name)) {
      return formatServiceTypeName(found.name);
    }
    if (found?.label && !isIdLike(found.label)) {
      const cleanLabel = found.label.split(' (')[0].trim();
      if (!isIdLike(cleanLabel)) {
        return formatServiceTypeName(cleanLabel);
      }
    }
  }

  // 3. Check service_categories / service_types arrays if present
  const categories = req.service_categories || req.service_types || req.services;
  if (Array.isArray(categories) && categories.length > 0) {
    const resolvedList: string[] = [];
    for (const item of categories) {
      if (typeof item === 'string') {
        if (!isIdLike(item)) {
          resolvedList.push(formatServiceTypeName(item));
        } else {
          const match = availableServiceTypes?.find(
            (s) => s.value?.toString().toLowerCase() === item.toLowerCase()
          );
          if (match?.name && !isIdLike(match.name)) {
            resolvedList.push(formatServiceTypeName(match.name));
          }
        }
      } else if (item && typeof item === 'object' && item.name && !isIdLike(item.name)) {
        resolvedList.push(formatServiceTypeName(item.name));
      }
    }
    if (resolvedList.length > 0) {
      return resolvedList.join(', ');
    }
  }

  // Never return an ID
  return '';
}
