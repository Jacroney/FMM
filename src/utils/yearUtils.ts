/**
 * Year value to display label mapping
 * Stores numeric values (1-4) for undergrad years, text for Graduate/Alumni
 */
export const YEAR_OPTIONS = [
  { value: '1', label: 'Freshman' },
  { value: '2', label: 'Sophomore' },
  { value: '3', label: 'Junior' },
  { value: '4', label: 'Senior' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Alumni', label: 'Alumni' },
] as const;

export type YearValue = '1' | '2' | '3' | '4' | 'Graduate' | 'Alumni';

/**
 * Get display label for a year value
 * @param year - The stored year value ('1', '2', '3', '4', 'Graduate', 'Alumni')
 * @returns Human-readable label (e.g., 'Freshman', 'Sophomore')
 */
export function getYearLabel(year: string | null | undefined): string {
  if (!year) return '-';
  const option = YEAR_OPTIONS.find(opt => opt.value === year);
  return option?.label || year;
}

/**
 * Get year value from label (for backward compatibility during import)
 * Accepts both numeric values and text labels
 * @param label - Either a numeric string ('1'-'4') or text label ('Freshman', etc.)
 * @returns Normalized year value or null if invalid
 */
export function getYearValue(label: string): YearValue | null {
  if (!label) return null;
  const normalizedLabel = label.trim();

  // Direct match for numeric values
  if (['1', '2', '3', '4'].includes(normalizedLabel)) {
    return normalizedLabel as YearValue;
  }

  // Direct match for Graduate/Alumni
  if (normalizedLabel === 'Graduate' || normalizedLabel === 'Alumni') {
    return normalizedLabel as YearValue;
  }

  // Match by label (case-insensitive)
  const option = YEAR_OPTIONS.find(
    opt => opt.label.toLowerCase() === normalizedLabel.toLowerCase()
  );
  return (option?.value as YearValue) || null;
}

/**
 * Dues configuration field mapping by year value
 */
export const DUES_FIELD_BY_YEAR: Record<YearValue | 'pledge' | 'default', string> = {
  '1': 'year_1_dues',
  '2': 'year_2_dues',
  '3': 'year_3_dues',
  '4': 'year_4_dues',
  'Graduate': 'graduate_dues',
  'Alumni': 'alumni_dues',
  'pledge': 'pledge_dues',
  'default': 'default_dues',
};
