export const gzipBody = async (data: string): Promise<Blob> => {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).blob()
}
