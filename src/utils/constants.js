/**
* constants.js
* 
* Central repository for application-wide constants to ensure consistency
* across components, hooks, and services. Eliminates magic values and 
* provides a single source of truth for configurable parameters.
* 
* Categories included:
* 
* TIME CONSTANTS:
* - Define time thresholds for filtering logic (noon cutoff, refresh intervals)
* - Time format specifications for consistency
* 
* FILTER CRITERIA:
* - Standardized predicates for task categorization
* - Query parameters for Firestore requests
* 
* UI STATES:
* - Enumerated component states (loading, empty, error)
* - Animation timing values
* 
* TASK PROPERTIES:
* - Type definitions (homework, exam)
* - Status enumerations (open, completed)
* 
* SUBJECT MAPPINGS:
* - Standardized subject identifiers
* - Language localization mappings for subjects
* 
* Implementation notes:
* - Use uppercase for true constants (TIME_REFRESH_INTERVAL_MS)
* - Use camelCase for configuration objects (filterPredicates)
* - Structure related constants in nested objects for organization
* - Document units of measurement in constant names where applicable
* - Consider exporting subsets for targeted imports to reduce bundle size
*/