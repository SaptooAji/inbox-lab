/** Resolves with the Error a promise rejected with, so tests can inspect its message. */
export async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error("The promise rejected with something that is not an Error.");
  }
  throw new Error("Expected the promise to reject, but it resolved.");
}
