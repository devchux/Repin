export const isExpectedRuntimeDisconnect = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /disconnected port|extension context invalidated|receiving end does not exist/i.test(
    message,
  );
};

export const runPortOperation = (
  operation: string,
  action: () => void,
): boolean => {
  try {
    action();
    return true;
  } catch (error) {
    if (!isExpectedRuntimeDisconnect(error)) {
      console.warn(`Repin runtime port failed to ${operation}`, error);
    }
    return false;
  }
};
