// Helper to ensure date is in ISO 8601 format or null
export const formatDateToISO = (
  dateString: string | null | undefined,
): string | null => {
  if (!dateString) return null;
  try {
    if (
      dateString.match(
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[\+\-]\d{2}:\d{2})?)?$/,
      )
    ) {
      return new Date(dateString).toISOString();
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(
        `Could not parse date string: ${dateString}. Returning null.`,
      );
      return null;
    }
    return date.toISOString();
  } catch (e: any) {
    console.warn(
      `Error formatting date string: ${dateString}. Error: ${e.message}. Returning null.`,
    );
    return null;
  }
};
