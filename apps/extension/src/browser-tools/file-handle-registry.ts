interface StagedFile {
  readonly dataBase64: string;
  readonly name: string;
  readonly type: string;
}

const files = new Map<string, StagedFile & { readonly expiresAt: number }>();
const HANDLE_TTL_MS = 15 * 60_000;

export const stageFiles = (
  fileIds: readonly string[],
  stagedFiles: readonly StagedFile[],
) => {
  if (fileIds.length !== stagedFiles.length || fileIds.length === 0) {
    throw new Error("Select exactly the files requested for this action");
  }
  const expiresAt = Date.now() + HANDLE_TTL_MS;
  fileIds.forEach((id, index) =>
    files.set(id, { ...stagedFiles[index]!, expiresAt }),
  );
};

export const consumeFiles = (fileIds: readonly string[]) =>
  fileIds.map((id) => {
    const file = files.get(id);
    if (!file || file.expiresAt <= Date.now())
      throw new Error("An approved file handle is unavailable or expired");
    files.delete(id);
    return {
      dataBase64: file.dataBase64,
      name: file.name,
      type: file.type,
    };
  });
